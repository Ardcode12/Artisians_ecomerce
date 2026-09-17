"""
Order Pydantic Models
"""

from typing import Optional, Any
from pydantic import BaseModel


class OrderCreateRequest(BaseModel):
    product_id: Optional[str] = ""
    product_title: Optional[str] = "Handcrafted Item"
    product_image: Optional[str] = ""
    artisan_id: Optional[str] = None
    artisan_name: Optional[str] = "Artisan"
    buyer_phone: Optional[str] = ""
    buyer_name: Optional[str] = "Buyer"
    buyer_address: Optional[str] = ""
    quantity: Optional[int] = 1
    total_amount: Optional[Any] = "₹650"


class OrderUpdateRequest(BaseModel):
    status: Optional[str] = None
    buyer_address: Optional[str] = None

