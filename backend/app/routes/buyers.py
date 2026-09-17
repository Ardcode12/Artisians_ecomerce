"""
Buyer Profile Routes
"""

from fastapi import APIRouter, HTTPException, Query, status
from app.models.profile import BuyerProfileUpsertRequest
from app.models import dump_model
from app.services.profile_service import (
    check_buyer_phone,
    get_buyer_profile_by_id_or_phone,
    upsert_buyer_profile,
)

router = APIRouter(prefix="/api/buyer", tags=["Buyer Profiles"])


@router.get("/check-phone")
def check_buyer_phone_endpoint(phone: str = Query(..., description="Buyer phone number")):
    """Check if buyer profile exists and is onboarded."""
    if not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone query parameter is required")
    return check_buyer_phone(phone)


@router.post("/profile")
def upsert_buyer_profile_endpoint(req: BuyerProfileUpsertRequest):
    """Save or update buyer profile details."""
    if not req.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="phone is required")

    profile = upsert_buyer_profile(dump_model(req, exclude_unset=False))
    return {
        "success": True,
        "message": "Buyer profile saved successfully",
        "profile": profile,
        "database": "local_sqlite"
    }


@router.get("/profile/{id}")
def get_buyer_profile_endpoint(id: str):
    """Get buyer profile by UUID ID or phone number."""
    profile = get_buyer_profile_by_id_or_phone(id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer profile not found")
    return {"profile": profile}
