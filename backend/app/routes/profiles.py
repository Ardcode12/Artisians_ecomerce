import re
import time
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Request, status, File, UploadFile
from typing import Optional
from app.config import UPLOADS_DIR
from app.db.schema import get_db
from app.models.profile import (
    ProfileUpsertRequest,
    ProfileUpdateRequest,
    BankUpdateRequest,
    AvatarUpdateRequest,
)
from app.models import dump_model
from app.services.profile_service import (
    check_artisan_phone,
    get_profile_by_id_or_phone,
    upsert_artisan_profile,
    update_artisan_profile,
    update_bank_details,
    save_avatar_image,
)

router = APIRouter(prefix="/api/profiles", tags=["Artisan Profiles"])


@router.get("/check-phone")
def check_phone_endpoint(phone: str = Query(..., description="Artisan phone number")):
    """Check if artisan profile is already registered and onboarded."""
    if not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone query parameter is required")
    return check_artisan_phone(phone)


@router.get("/{id}")
def get_profile_endpoint(id: str):
    """Get artisan profile by UUID ID or phone number."""
    profile = get_profile_by_id_or_phone(id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return {"profile": profile}


@router.post("")
def upsert_profile_endpoint(req: ProfileUpsertRequest):
    """Save or update artisan onboarding profile."""
    if not req.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="phone is required")

    profile = upsert_artisan_profile(dump_model(req, exclude_unset=False))
    return {
        "success": True,
        "message": "Profile saved successfully",
        "profile": profile,
        "database": "local_sqlite"
    }


@router.put("/{id}")
@router.patch("/{id}")
def update_profile_endpoint(id: str, req: ProfileUpdateRequest):
    """Update artisan profile details."""
    updated = update_artisan_profile(id, dump_model(req, exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return {
        "success": True,
        "message": "Profile updated successfully",
        "profile": updated
    }


@router.post("/{id}/bank")
@router.put("/{id}/bank")
def update_bank_endpoint(id: str, req: BankUpdateRequest):
    """Save and verify bank account details."""
    try:
        updated = update_bank_details(id, dump_model(req))
        return {
            "success": True,
            "message": "Bank details saved successfully",
            "profile": updated
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")


@router.post("/{id}/avatar")
def upload_avatar_endpoint(id: str, req: AvatarUpdateRequest, request: Request):
    """Upload or update profile avatar image via JSON base64 or URL."""
    if not req.image:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image data or URL is required")

    base_url = str(request.base_url).rstrip("/")
    try:
        avatar_url = save_avatar_image(id, req.image, base_url)
        profile = get_profile_by_id_or_phone(id)
        return {
            "success": True,
            "avatar_url": avatar_url,
            "profile": profile
        }
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")


@router.post("/{id}/avatar/file")
async def upload_avatar_file_endpoint(id: str, file: UploadFile = File(...), request: Request = None):
    """Upload profile avatar via multipart form file."""
    existing = get_profile_by_id_or_phone(id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    sanitized_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(existing["id"]))
    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"avatar-{sanitized_id}-{int(time.time())}.{ext}"
    file_path = UPLOADS_DIR / filename

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    base_url = str(request.base_url).rstrip("/") if request else "http://localhost:5000"
    final_url = f"{base_url}/uploads/{filename}"
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE profiles SET avatar_url = ?, updated_at = ? WHERE id = ?", (final_url, now_iso, existing["id"]))

    profile = get_profile_by_id_or_phone(id)
    return {
        "success": True,
        "avatar_url": final_url,
        "profile": profile
    }

