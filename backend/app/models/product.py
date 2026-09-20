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
    image_base64: Optional[str] = None
    material_cost: Optional[float] = 0.0
    marketplaces: Optional[List[str]] = []
    status: Optional[str] = "published"

    # GeM (Government e-Marketplace) Standardized Fields
    hsn_code: Optional[str] = "6912"
    gstin: Optional[str] = ""
    pehchan_id: Optional[str] = ""
    artisan_cert_type: Optional[str] = "Pehchan Card"
    gi_tag_num: Optional[str] = ""
    brand_oem: Optional[str] = ""
    gem_category: Optional[str] = "Handicrafts and Handlooms"
    country_of_origin: Optional[str] = "India"
    local_content_pct: Optional[int] = 100
    dimensions: Optional[str] = ""
    weight_kg: Optional[float] = 0.5
    package_contents: Optional[str] = ""


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

    # GeM Standardized Fields
    hsn_code: Optional[str] = None
    gstin: Optional[str] = None
    pehchan_id: Optional[str] = None
    artisan_cert_type: Optional[str] = None
    gi_tag_num: Optional[str] = None
    brand_oem: Optional[str] = None
    gem_category: Optional[str] = None
    country_of_origin: Optional[str] = None
    local_content_pct: Optional[int] = None
    dimensions: Optional[str] = None
    weight_kg: Optional[float] = None
    package_contents: Optional[str] = None

