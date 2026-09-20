"""
Profile Pydantic Models
"""

from typing import Optional
from pydantic import BaseModel, Field


class ProfileUpsertRequest(BaseModel):
    id: Optional[str] = None
    phone: str
    name: Optional[str] = None
    shop_name: Optional[str] = None
    role: Optional[str] = "artisan"
    craft_type: Optional[str] = None
    craft_custom: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    language: Optional[str] = "English"
    scheme_id: Optional[str] = None
    is_onboarded: Optional[bool] = True
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_holder_name: Optional[str] = None
    bank_name: Optional[str] = None
    upi_id: Optional[str] = None
    pehchan_id: Optional[str] = None
    gstin: Optional[str] = None
    age: Optional[int] = None
    experience: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    shop_name: Optional[str] = None
    craft_type: Optional[str] = None
    craft_custom: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    avatar_url: Optional[str] = None
    language: Optional[str] = None
    scheme_id: Optional[str] = None
    is_onboarded: Optional[bool] = None
    bank_account_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_holder_name: Optional[str] = None
    bank_name: Optional[str] = None
    upi_id: Optional[str] = None
    pehchan_id: Optional[str] = None
    gstin: Optional[str] = None
    age: Optional[int] = None
    experience: Optional[str] = None



class BankUpdateRequest(BaseModel):
    bank_account_no: str
    bank_ifsc: str
    bank_holder_name: str
    bank_name: Optional[str] = "Commercial Bank"
    upi_id: Optional[str] = None


class AvatarUpdateRequest(BaseModel):
    image: str


class BuyerProfileUpsertRequest(BaseModel):
    id: Optional[str] = None
    phone: str
    name: Optional[str] = None
    buyer_type: Optional[str] = "Individual Buyer"
    business_name: Optional[str] = None
    gstin: Optional[str] = None
    department: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_onboarded: Optional[bool] = True


class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    token: str
    role: Optional[str] = "artisan"
