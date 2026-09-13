"""
Product Pydantic Models
"""

from typing import Optional, List, Any
from pydantic import BaseModel


class ProductCreateRequest(BaseModel):
    artisan_id: Optional[str] = None
    title: str
    description_en: Optional[str] = ""
    description_hi: Optional[str] = ""
    description_ta: Optional[str] = ""
    category: Optional[str] = "Handicraft"
    craft_type: Optional[str] = None
    price: Any
    units: Optional[int] = 1
    image_url: Optional[str] = ""
    material_cost: Optional[float] = 0.0
    marketplaces: Optional[List[str]] = []
    status: Optional[str] = "published"


class ProductUpdateRequest(BaseModel):
    title: Optional[str] = None
    description_en: Optional[str] = None
    description_hi: Optional[str] = None
    description_ta: Optional[str] = None
    category: Optional[str] = None
    craft_type: Optional[str] = None
    price: Optional[Any] = None
    units: Optional[int] = None
    image_url: Optional[str] = None
    material_cost: Optional[float] = None
    marketplaces: Optional[List[str]] = None
    status: Optional[str] = None
