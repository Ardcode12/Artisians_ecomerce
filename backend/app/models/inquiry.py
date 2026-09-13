"""
Inquiry & Messaging Pydantic Models
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class InquiryCreateRequest(BaseModel):
    product_id: Optional[str] = ""
    order_id: Optional[str] = None
    product_title: Optional[str] = "Handcrafted Product"
    product_image: Optional[str] = ""
    artisan_id: Optional[str] = None
    artisan_name: Optional[str] = "Master Artisan"
    buyer_phone: Optional[str] = ""
    buyer_name: Optional[str] = "Buyer"
    buyer_type: Optional[str] = "Individual Buyer"
    message: Optional[str] = None


class MessageCreateRequest(BaseModel):
    sender: Optional[str] = "buyer"
    sender_name: Optional[str] = None
    text: str


class ReplyCreateRequest(BaseModel):
    reply: str
