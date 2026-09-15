import re
import os
import time
import random
import logging
import requests
from typing import Dict, Any, Optional
from app.db.database import get_db

logger = logging.getLogger("AuthService")

# In-memory storage for generated OTPs: { phone_number: {"otp": "123456", "sessionInfo": "...", "expires_at": timestamp} }
OTP_STORE: Dict[str, Dict[str, Any]] = {}


def normalize_phone(phone: Optional[str]) -> str:
    """Normalize any phone input into +91XXXXXXXXXX format."""
    digits = re.sub(r"[^0-9]", "", phone or "")
    last10 = digits[-10:] if len(digits) >= 10 else digits
    return f"+91{last10}"


def send_firebase_sms(phone: str) -> Optional[str]:
    """
    Sends real SMS OTP via Firebase Identity Toolkit API.
    Returns sessionInfo string on success, or None on failure.
    """
    firebase_key = os.getenv("FIREBASE_API_KEY", "").strip()
    if not firebase_key:
        return None

    try:
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key={firebase_key}"
        res = requests.post(url, json={"phoneNumber": phone}, timeout=3)
        data = res.json()
        if "sessionInfo" in data:
            logger.info(f"[FIREBASE SMS] SMS OTP dispatched via Firebase to {phone}")
            return data["sessionInfo"]
        else:
            err_msg = data.get("error", {}).get("message", "Unknown error")
            logger.warning(f"[FIREBASE SMS NOTICE] {err_msg}")
    except Exception as e:
        logger.error(f"[FIREBASE SMS EXCEPTION] {e}")

    return None


def verify_firebase_code(session_info: str, code: str) -> bool:
    """Verifies Firebase SMS OTP code using Firebase signInWithPhoneNumber REST API."""
    firebase_key = os.getenv("FIREBASE_API_KEY", "").strip()
    if not firebase_key or not session_info:
        return False

    try:
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key={firebase_key}"
        res = requests.post(url, json={"sessionInfo": session_info, "code": code}, timeout=3)
        data = res.json()
        if "idToken" in data or "phoneNumber" in data:
            logger.info(f"[FIREBASE VERIFIED] Successfully verified OTP code via Firebase")
            return True
        else:
            logger.warning(f"[FIREBASE VERIFY ERROR] {data.get('error', {}).get('message')}")
    except Exception as e:
        logger.error(f"[FIREBASE VERIFY EXCEPTION] {e}")

    return False


def send_twilio_sms(phone: str, otp: str) -> bool:
    """
    Sends real SMS OTP using Twilio Messages REST API.
    Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env
    """
    sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_num = os.getenv("TWILIO_PHONE_NUMBER", "").strip()

    if not sid or not token or not from_num:
        return False

    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
        data = {
            "To": phone,
            "From": from_num,
            "Body": f"Your Artisans E-Commerce verification code is: {otp}. Valid for 5 minutes."
        }
        res = requests.post(url, data=data, auth=(sid, token), timeout=3)
        res_data = res.json()
        if res.status_code in [200, 201] and "sid" in res_data:
            logger.info(f"[TWILIO SMS] Real SMS OTP dispatched to {phone} via Twilio! (SID: {res_data.get('sid')})")
            return True
        else:
            logger.warning(f"[TWILIO SMS ERROR] {res_data.get('message') or res_data}")
    except Exception as e:
        logger.error(f"[TWILIO SMS EXCEPTION] {e}")

    return False


def generate_otp(phone: str) -> Dict[str, Any]:
    """Generate a unique random 6-digit OTP and send SMS via Twilio or Firebase."""
    clean_phone = normalize_phone(phone)
    
    # 1. Generate unique random 6-digit OTP
    real_otp = str(random.randint(100000, 999999))

    # 2. Try sending SMS via Twilio first
    twilio_sent = send_twilio_sms(clean_phone, real_otp)

    # 3. Try Firebase SMS API if Twilio not used
    session_info = None if twilio_sent else send_firebase_sms(clean_phone)
    
    # 4. Save to OTP_STORE with 5-minute expiration
    OTP_STORE[clean_phone] = {
        "otp": real_otp,
        "sessionInfo": session_info,
        "expires_at": time.time() + 300
    }
    
    if twilio_sent:
        sms_status = "sent via Twilio SMS"
    elif session_info:
        sms_status = "sent via Firebase SMS"
    else:
        sms_status = "generated locally"

    logger.info(f"[OTP GENERATED] Phone: {clean_phone} | Status: {sms_status} | Generated OTP: {real_otp}")

    return {
        "success": True,
        "phone": clean_phone,
        "message": f"OTP verification code sent to {clean_phone}",
        "smsSent": twilio_sent or bool(session_info),
        "provider": "twilio" if twilio_sent else ("firebase" if session_info else "local"),
        "debug_otp": real_otp
    }



def verify_otp(phone: str, token: str, role: str = "artisan") -> Dict[str, Any]:
    """Verify the user-entered OTP against generated random OTP or master test code 123456."""
    clean_phone = normalize_phone(phone)
    clean_token = token.strip()
    
    is_valid_otp = False
    
    # 1. Master code support for testing / fallback (123456 or 000000)
    if clean_token in ["123456", "000000"]:
        is_valid_otp = True
        if clean_phone in OTP_STORE:
            del OTP_STORE[clean_phone]
    # 2. Check generated real OTP record in store
    elif clean_phone in OTP_STORE:
        record = OTP_STORE[clean_phone]
        
        # Verify via Firebase session if active
        if record.get("sessionInfo") and verify_firebase_code(record["sessionInfo"], clean_token):
            is_valid_otp = True
            del OTP_STORE[clean_phone]
        # Verify exact generated 6-digit random OTP
        elif time.time() <= record["expires_at"] and record["otp"] == clean_token:
            is_valid_otp = True
            del OTP_STORE[clean_phone]  # Consume OTP once used

    if not is_valid_otp:
        return {
            "success": False,
            "error": "Invalid or expired OTP code. Please enter the exact 6-digit code sent to your number."
        }

    last10 = clean_phone.replace("+91", "")
    prefix = "22222222-3333-4444-5555-91" if role == "buyer" else "11111111-2222-3333-4444-91"
    user_id = f"{prefix}{last10}"

    authenticated_user = {
        "id": user_id,
        "phone": clean_phone,
        "role": "authenticated"
    }

    is_existing = False
    existing_profile = None

    with get_db() as conn:
        cursor = conn.cursor()
        if role == "buyer":
            cursor.execute("SELECT * FROM buyer_profiles WHERE phone = ?", (clean_phone,))
            row = cursor.fetchone()
            if row:
                existing_profile = dict(row)
                if existing_profile.get("buyer_type") or existing_profile.get("address_line") or existing_profile.get("name"):
                    is_existing = True
        else:
            cursor.execute("SELECT * FROM profiles WHERE phone = ?", (clean_phone,))
            row = cursor.fetchone()
            if row:
                existing_profile = dict(row)
                if existing_profile.get("name"):
                    is_existing = True

    logger.info(f"[OTP VERIFIED] Phone: {clean_phone} | Role: {role} | Existing: {is_existing}")
    return {
        "success": True,
        "user": authenticated_user,
        "role": role,
        "isExistingProfile": is_existing,
        "profile": existing_profile
    }



