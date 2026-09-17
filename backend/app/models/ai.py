"""
AI Services Pydantic Models
"""

from typing import Optional
from pydantic import BaseModel


class PriceSuggestRequest(BaseModel):
    product_title: Optional[str] = None
    craft_type: Optional[str] = "Handicraft"
    material_cost: Optional[float] = 0.0


class DescriptionGenRequest(BaseModel):
    text: Optional[str] = None
    raw_text: Optional[str] = None
    craft_type: Optional[str] = "Handicraft"
    audio_base64: Optional[str] = None
    image_base64: Optional[str] = None


class EnhanceImageBase64Request(BaseModel):
    image: Optional[str] = None
    base64: Optional[str] = None
    filename: Optional[str] = None
