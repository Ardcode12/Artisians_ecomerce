"""
Profile Service
Handles Artisan and Buyer profiles, bank accounts, and avatar image uploads.
"""

import re
import os
import time
import base64
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.db.database import get_db
from app.config import UPLOADS_DIR, PORT
from app.services.auth_service import normalize_phone

logger = logging.getLogger("ProfileService")


def check_artisan_phone(phone: str) -> Dict[str, Any]:
    """Check if artisan profile exists by phone number."""
    clean_phone = normalize_phone(phone)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM profiles WHERE phone = ?", (clean_phone,))
        row = cursor.fetchone()
        if row:
            p = dict(row)
            if p.get("name"):
                return {
                    "exists": True,
                    "isOnboarded": bool(p.get("is_onboarded", 1)),
                    "profile": p,
                    "source": "local_sqlite"
                }
    return {"exists": False, "isOnboarded": False, "profile": None}


def get_profile_by_id_or_phone(id_or_phone: str) -> Optional[Dict[str, Any]]:
    """Find artisan profile by either UUID ID or phone number."""
    if not id_or_phone:
        return None
    with get_db() as conn:
        cursor = conn.cursor()
        # Direct check by id or exact match
        cursor.execute("SELECT * FROM profiles WHERE id = ? OR phone = ?", (id_or_phone, id_or_phone))
        row = cursor.fetchone()
        if row:
            return dict(row)
        # Normalized phone check
        clean_phone = normalize_phone(id_or_phone)
        cursor.execute("SELECT * FROM profiles WHERE phone = ?", (clean_phone,))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None


def upsert_artisan_profile(data: Dict[str, Any]) -> Dict[str, Any]:
    """Upsert artisan profile details into SQLite."""
    phone = data.get("phone", "")
    clean_phone = normalize_phone(phone)
    last10 = clean_phone.replace("+91", "")
    profile_id = data.get("id") or f"11111111-2222-3333-4444-91{last10}"

    now_iso = datetime.now(timezone.utc).isoformat()
    existing = get_profile_by_id_or_phone(clean_phone) or {}

    # Protect existing custom name: if incoming name is empty or default 'Artisan' while existing has a custom name, preserve it!
    incoming_name = (data.get("name") or "").strip()
    existing_name = (existing.get("name") or "").strip()
    if incoming_name and incoming_name != "Artisan":
        name = incoming_name
    elif existing_name:
        name = existing_name
    else:
        name = incoming_name or "Artisan"

    shop_name = data.get("shop_name") or existing.get("shop_name") or f"{name}'s Studio"
    craft_type = data.get("craft_type") if data.get("craft_type") is not None else existing.get("craft_type", "Handicraft & Art")
    craft_custom = data.get("craft_custom") if data.get("craft_custom") is not None else existing.get("craft_custom")
    bio = data.get("bio") if data.get("bio") is not None else existing.get("bio", "")
    location = data.get("location") if data.get("location") is not None else existing.get("location", "")
    avatar_url = data.get("avatar_url") if data.get("avatar_url") is not None else existing.get("avatar_url", "")
    language = data.get("language") if data.get("language") is not None else existing.get("language", "English")
    scheme_id = data.get("scheme_id") if data.get("scheme_id") is not None else existing.get("scheme_id")
    is_onboarded = 1 if data.get("is_onboarded", True) else 0

    bank_account_no = data.get("bank_account_no") if data.get("bank_account_no") is not None else existing.get("bank_account_no")
    bank_ifsc = data.get("bank_ifsc") if data.get("bank_ifsc") is not None else existing.get("bank_ifsc")
    bank_holder_name = data.get("bank_holder_name") if data.get("bank_holder_name") is not None else existing.get("bank_holder_name")
    bank_name = data.get("bank_name") if data.get("bank_name") is not None else existing.get("bank_name")
    upi_id = data.get("upi_id") if data.get("upi_id") is not None else existing.get("upi_id")
    pehchan_id = data.get("pehchan_id") if data.get("pehchan_id") is not None else existing.get("pehchan_id", "")
    gstin = data.get("gstin") if data.get("gstin") is not None else existing.get("gstin", "")
    age = data.get("age") if data.get("age") is not None else existing.get("age")
    experience = data.get("experience") if data.get("experience") is not None else existing.get("experience", "")
    shop_logo_url = data.get("shop_logo_url") if data.get("shop_logo_url") is not None else existing.get("shop_logo_url")
    shop_logo_style = data.get("shop_logo_style") if data.get("shop_logo_style") is not None else existing.get("shop_logo_style", "badge")

    # Silently generate deterministic shop logo if shop_name is present but logo is not yet set
    if shop_name and not shop_logo_url:
        try:
            from app.services.logo_generator_service import generate_shop_logo_variants
            logo_gen = generate_shop_logo_variants(shop_name, craft_type or "Handicraft", artisan_id=profile_id)
            shop_logo_url = logo_gen.get("default_logo_url")
            shop_logo_style = "badge"
        except Exception as e:
            logger.warning(f"Could not auto-generate logo for {shop_name}: {e}")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO profiles (
            id, phone, name, shop_name, role, craft_type, craft_custom,
            bio, location, avatar_url, language, scheme_id, is_onboarded,
            bank_account_no, bank_ifsc, bank_holder_name, bank_name, upi_id,
            pehchan_id, gstin, age, experience, shop_logo_url, shop_logo_style,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(phone) DO UPDATE SET
            name=excluded.name,
            shop_name=excluded.shop_name,
            craft_type=excluded.craft_type,
            craft_custom=excluded.craft_custom,
            bio=excluded.bio,
            location=excluded.location,
            avatar_url=excluded.avatar_url,
            language=excluded.language,
            scheme_id=excluded.scheme_id,
            is_onboarded=excluded.is_onboarded,
            bank_account_no=COALESCE(excluded.bank_account_no, profiles.bank_account_no),
            bank_ifsc=COALESCE(excluded.bank_ifsc, profiles.bank_ifsc),
            bank_holder_name=COALESCE(excluded.bank_holder_name, profiles.bank_holder_name),
            bank_name=COALESCE(excluded.bank_name, profiles.bank_name),
            upi_id=COALESCE(excluded.upi_id, profiles.upi_id),
            pehchan_id=COALESCE(NULLIF(excluded.pehchan_id, ''), profiles.pehchan_id),
            gstin=COALESCE(NULLIF(excluded.gstin, ''), profiles.gstin),
            age=COALESCE(excluded.age, profiles.age),
            experience=COALESCE(NULLIF(excluded.experience, ''), profiles.experience),
            shop_logo_url=COALESCE(excluded.shop_logo_url, profiles.shop_logo_url),
            shop_logo_style=COALESCE(excluded.shop_logo_style, profiles.shop_logo_style),
            updated_at=excluded.updated_at;
        """, (
            profile_id, clean_phone, name, shop_name, "artisan", craft_type, craft_custom,
            bio, location, avatar_url, language, scheme_id, is_onboarded,
            bank_account_no, bank_ifsc, bank_holder_name, bank_name, upi_id,
            pehchan_id, gstin, age, experience, shop_logo_url, shop_logo_style,
            existing.get("created_at") or now_iso, now_iso
        ))

    saved = get_profile_by_id_or_phone(clean_phone)
    logger.info(f"[PROFILE SAVED] Phone: {clean_phone} | Name: {name} | Shop: {shop_name} | Logo: {shop_logo_url}")
    return saved or {}


def update_artisan_profile(id_or_phone: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update specific fields of an artisan profile."""
    existing = get_profile_by_id_or_phone(id_or_phone)
    if not existing:
        return None

    merged = {**existing, **updates}
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE profiles SET
            name = ?,
            shop_name = ?,
            craft_type = ?,
            craft_custom = ?,
            bio = ?,
            location = ?,
            avatar_url = ?,
            language = ?,
            scheme_id = ?,
            is_onboarded = ?,
            bank_account_no = ?,
            bank_ifsc = ?,
            bank_holder_name = ?,
            bank_name = ?,
            upi_id = ?,
            pehchan_id = ?,
            gstin = ?,
            shop_logo_url = ?,
            shop_logo_style = ?,
            updated_at = ?
        WHERE id = ? OR phone = ?
        """, (
            merged.get("name"),
            merged.get("shop_name"),
            merged.get("craft_type"),
            merged.get("craft_custom"),
            merged.get("bio"),
            merged.get("location"),
            merged.get("avatar_url"),
            merged.get("language"),
            merged.get("scheme_id"),
            1 if merged.get("is_onboarded") else 0,
            merged.get("bank_account_no"),
            merged.get("bank_ifsc"),
            merged.get("bank_holder_name"),
            merged.get("bank_name"),
            merged.get("upi_id"),
            merged.get("pehchan_id") or "",
            merged.get("gstin") or "",
            merged.get("shop_logo_url"),
            merged.get("shop_logo_style") or "badge",
            merged.get("updated_at"),
            existing["id"],
            existing["phone"]
        ))

    return get_profile_by_id_or_phone(existing["id"])



def update_bank_details(id_or_phone: str, bank_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and update bank details."""
    account_no = str(bank_data.get("bank_account_no", "")).strip()
    clean_account = re.sub(r"[^0-9]", "", account_no)
    ifsc = str(bank_data.get("bank_ifsc", "")).strip().upper()
    holder_name = str(bank_data.get("bank_holder_name", "")).strip()
    bank_name = str(bank_data.get("bank_name", "Commercial Bank")).strip()
    upi_id = str(bank_data.get("upi_id", "")).strip()

    if not (9 <= len(clean_account) <= 18):
        raise ValueError("Bank account number must be between 9 and 18 digits")

    if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", ifsc):
        raise ValueError("Invalid IFSC code format (e.g., SBIN0001234)")

    existing = get_profile_by_id_or_phone(id_or_phone)
    if not existing:
        raise KeyError("Profile not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        # 1. Update profiles table
        cursor.execute("""
        UPDATE profiles SET
            bank_account_no = ?,
            bank_ifsc = ?,
            bank_holder_name = ?,
            bank_name = ?,
            upi_id = ?,
            updated_at = ?
        WHERE id = ?
        """, (clean_account, ifsc, holder_name, bank_name, upi_id, now_iso, existing["id"]))

        # 2. Upsert bank_accounts table
        bank_id = f"bank-{existing['id'][:12]}-{int(time.time())}"
        cursor.execute("""
        INSERT INTO bank_accounts (
            id, profile_id, phone, account_holder_name, account_number, ifsc_code,
            bank_name, branch_name, upi_id, is_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(profile_id) DO UPDATE SET
            account_holder_name=excluded.account_holder_name,
            account_number=excluded.account_number,
            ifsc_code=excluded.ifsc_code,
            bank_name=excluded.bank_name,
            upi_id=excluded.upi_id,
            is_verified=1,
            updated_at=excluded.updated_at;
        """, (
            bank_id, existing["id"], existing["phone"], holder_name, clean_account, ifsc,
            bank_name, "", upi_id, now_iso, now_iso
        ))

    return get_profile_by_id_or_phone(existing["id"]) or {}


def save_avatar_image(id_or_phone: str, image_data: str, base_url: str) -> str:
    """Save base64 image data to local uploads folder and update profile."""
    existing = get_profile_by_id_or_phone(id_or_phone)
    if not existing:
        raise KeyError("Profile not found")

    final_url = image_data
    if image_data.startswith("data:image"):
        match = re.match(r"^data:image/([a-zA-Z0-9+]+);base64,(.+)$", image_data)
        if match:
            ext = match.group(1).lower()
            if ext == "jpeg":
                ext = "jpg"
            b64_str = match.group(2)
            sanitized_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(existing["id"]))
            filename = f"avatar-{sanitized_id}-{int(time.time())}.{ext}"
            file_path = UPLOADS_DIR / filename

            with open(file_path, "wb") as f:
                f.write(base64.b64decode(b64_str))

            final_url = f"{base_url}/uploads/{filename}"
    elif len(image_data) > 200 and not image_data.startswith(("http://", "https://")):
        try:
            b64_str = image_data.strip()
            sanitized_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(existing["id"]))
            filename = f"avatar-{sanitized_id}-{int(time.time())}.jpg"
            file_path = UPLOADS_DIR / filename
            with open(file_path, "wb") as f:
                f.write(base64.b64decode(b64_str))
            final_url = f"{base_url}/uploads/{filename}"
        except Exception:
            pass

    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE profiles SET avatar_url = ?, updated_at = ? WHERE id = ?
        """, (final_url, now_iso, existing["id"]))

    return final_url


# ── Buyer Profiles ────────────────────────────────────────────────────────────

def check_buyer_phone(phone: str) -> Dict[str, Any]:
    """Check if buyer profile exists by phone number."""
    clean_phone = normalize_phone(phone)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM buyer_profiles WHERE phone = ?", (clean_phone,))
        row = cursor.fetchone()
        if row:
            b = dict(row)
            if b.get("buyer_type") or b.get("address_line") or b.get("name"):
                return {
                    "exists": True,
                    "isOnboarded": bool(b.get("is_onboarded", 1)),
                    "profile": b,
                    "source": "local_sqlite"
                }
    return {"exists": False, "isOnboarded": False, "profile": None}


def get_buyer_profile_by_id_or_phone(id_or_phone: str) -> Optional[Dict[str, Any]]:
    """Get buyer profile by UUID ID or phone number."""
    clean_phone = normalize_phone(id_or_phone)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM buyer_profiles WHERE id = ? OR phone = ?", (id_or_phone, clean_phone))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None


def upsert_buyer_profile(data: Dict[str, Any]) -> Dict[str, Any]:
    """Upsert buyer profile details into SQLite and sync with unified profiles."""
    phone = data.get("phone", "")
    clean_phone = normalize_phone(phone)
    last10 = clean_phone.replace("+91", "")
    buyer_id = data.get("id") or f"22222222-3333-4444-5555-91{last10}"

    now_iso = datetime.now(timezone.utc).isoformat()
    existing = get_buyer_profile_by_id_or_phone(clean_phone) or {}

    name = data.get("name") if data.get("name") is not None else existing.get("name", "Shopper")
    buyer_type = data.get("buyer_type") or existing.get("buyer_type", "Individual Buyer")
    business_name = data.get("business_name") if data.get("business_name") is not None else existing.get("business_name")
    gstin = data.get("gstin") if data.get("gstin") is not None else existing.get("gstin")
    department = data.get("department") if data.get("department") is not None else existing.get("department")
    address_line = data.get("address_line") if data.get("address_line") is not None else existing.get("address_line")
    city = data.get("city") if data.get("city") is not None else existing.get("city")
    state = data.get("state") if data.get("state") is not None else existing.get("state")
    pincode = data.get("pincode") if data.get("pincode") is not None else existing.get("pincode")
    is_onboarded = 1 if data.get("is_onboarded", True) else 0

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO buyer_profiles (
            id, phone, name, buyer_type, business_name, gstin, department,
            address_line, city, state, pincode, is_onboarded, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(phone) DO UPDATE SET
            name=excluded.name,
            buyer_type=excluded.buyer_type,
            business_name=excluded.business_name,
            gstin=excluded.gstin,
            department=excluded.department,
            address_line=excluded.address_line,
            city=excluded.city,
            state=excluded.state,
            pincode=excluded.pincode,
            is_onboarded=excluded.is_onboarded,
            updated_at=excluded.updated_at;
        """, (
            buyer_id, clean_phone, name, buyer_type, business_name, gstin, department,
            address_line, city, state, pincode, is_onboarded,
            existing.get("created_at") or now_iso, now_iso
        ))

        # Also sync to unified profiles table
        loc = ", ".join(filter(None, [city, state]))
        cursor.execute("""
        INSERT INTO profiles (
            id, phone, name, role, location, is_onboarded, created_at, updated_at
        ) VALUES (?, ?, ?, 'buyer', ?, 1, ?, ?)
        ON CONFLICT(phone) DO UPDATE SET
            name=excluded.name,
            location=excluded.location,
            is_onboarded=1,
            updated_at=excluded.updated_at;
        """, (buyer_id, clean_phone, name, loc, existing.get("created_at") or now_iso, now_iso))

    saved = get_buyer_profile_by_id_or_phone(clean_phone)
    logger.info(f"[BUYER PROFILE SAVED] Phone: {clean_phone} | Type: {buyer_type} | City: {city or 'N/A'}")
    return saved or {}
