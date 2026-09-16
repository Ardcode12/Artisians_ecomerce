"""
Authentication Service
Handles phone normalization and OTP verification with master code support.
"""

import re
import logging
from typing import Dict, Any, Optional
from app.db.database import get_db

logger = logging.getLogger("AuthService")


def normalize_phone(phone: Optional[str]) -> str:
    """Normalize any phone input into +91XXXXXXXXXX format."""
    digits = re.sub(r"[^0-9]", "", phone or "")
    last10 = digits[-10:] if len(digits) >= 10 else digits
    return f"+91{last10}"


def generate_otp(phone: str) -> Dict[str, Any]:
    """Generate and return OTP details."""
    clean_phone = normalize_phone(phone)
    logger.info(f"[OTP GENERATED] Code for {clean_phone} (Test code: 123456)")
    return {
        "success": True,
        "phone": clean_phone,
        "message": "Code sent successfully",
        "hint": "Use 123456 for testing"
    }


def verify_otp(phone: str, token: str, role: str = "artisan") -> Dict[str, Any]:
    """Verify OTP token and fetch existing profile."""
    clean_phone = normalize_phone(phone)
    clean_token = token.strip()
    is_master_code = (clean_token == "123456")

    if not is_master_code:
        return {
            "success": False,
            "error": "That code didn't work — enter 123456 to continue"
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
            cursor.execute("SELECT * FROM buyer_profiles WHERE phone = ? OR phone = ?", (clean_phone, phone))
            row = cursor.fetchone()
            if row:
                existing_profile = dict(row)
                if existing_profile.get("buyer_type") or existing_profile.get("address_line") or existing_profile.get("name"):
                    is_existing = True
        else:
            cursor.execute("SELECT * FROM profiles WHERE phone = ? OR phone = ?", (clean_phone, phone))
            row = cursor.fetchone()
            if row:
                existing_profile = dict(row)
                if existing_profile.get("name") and existing_profile.get("name").strip():
                    is_existing = True

    logger.info(f"[OTP VERIFIED] Phone: {clean_phone} | Role: {role} | Existing: {is_existing}")
    return {
        "success": True,
        "user": authenticated_user,
        "role": role,
        "isExistingProfile": is_existing,
        "profile": existing_profile
    }
