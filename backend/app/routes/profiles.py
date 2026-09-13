"""
Artisan Profile Routes
"""

from fastapi import APIRouter, HTTPException, Query, Request, status
from typing import Optional
from app.models.profile import ProfileUpsertRequest, ProfileUpdateRequest, BankUpdateRequest, AvatarUpdateRequest
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

    profile = upsert_artisan_profile(req.model_dump(exclude_unset=False))
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
    updated = update_artisan_profile(id, req.model_dump(exclude_unset=True))
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
        updated = update_bank_details(id, req.model_dump())
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
    """Upload or update profile avatar image."""
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
