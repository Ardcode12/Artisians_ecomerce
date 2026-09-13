"""
Authentication Routes
"""

from fastapi import APIRouter, HTTPException, status
from app.models.profile import SendOtpRequest, VerifyOtpRequest
from app.services.auth_service import generate_otp, verify_otp

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/send-otp")
def send_otp_endpoint(req: SendOtpRequest):
    """Generate and send SMS OTP for a phone number."""
    if not req.phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number is required")
    return generate_otp(req.phone)


@router.post("/verify-otp")
def verify_otp_endpoint(req: VerifyOtpRequest):
    """Verify phone OTP token."""
    if not req.phone or not req.token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone and token are required")

    result = verify_otp(phone=req.phone, token=req.token, role=req.role or "artisan")
    if not result.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error", "Verification failed"))

    return result
