"""
Review Pydantic Models
"""

from typing import Optional
from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    artisan_id: Optional[str] = None
    product_id: Optional[str] = None
    product_title: Optional[str] = None
    reviewer_name: str
    reviewer_phone: Optional[str] = None
    rating: int = Field(default=5, ge=1, le=5)
    comment: str


class ReviewReplyRequest(BaseModel):
    reply: str
