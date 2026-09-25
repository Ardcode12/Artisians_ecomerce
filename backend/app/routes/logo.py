"""
Logo Routes
Handles deterministic shop logo generation, variant selection, and custom logo uploads.
"""

import uuid
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel

from app.config import UPLOADS_DIR, LAN_IP, PORT
from app.services.logo_generator_service import (
    generate_shop_logo_variants,
    make_badge_logo,
    make_shield_logo,
    make_wordmark_logo,
)
from app.services.profile_service import (
    get_profile_by_id_or_phone,
    update_artisan_profile,
)

logger = logging.getLogger("LogoRoutes")
router = APIRouter(prefix="/api/logo", tags=["Shop Logo Generator"])

LOGOS_DIR = UPLOADS_DIR / "logos"
LOGOS_DIR.mkdir(parents=True, exist_ok=True)


class GenerateLogoRequest(BaseModel):
    shop_name: str
    craft_type: Optional[str] = "Handicraft"
    artisan_id: Optional[str] = None
    artisan_name: Optional[str] = None


class SelectLogoRequest(BaseModel):
    artisan_id_or_phone: str
    logo_url: str
    style: Optional[str] = "badge"


@router.post("/generate")
def generate_logos(req: GenerateLogoRequest):
    """
    Deterministically generates 3 distinct style variants (Badge, Shield, Wordmark)
    from shop name and craft type using Python Pillow only.
    """
    if not req.shop_name or not req.shop_name.strip():
        raise HTTPException(status_code=400, detail="shop_name is required")

    try:
        result = generate_shop_logo_variants(
            shop_name=req.shop_name.strip(),
            craft_type=req.craft_type or "Handicraft",
            artisan_id=req.artisan_id
        )
        return result
    except Exception as e:
        logger.error(f"Failed to generate logo variants: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/select")
def select_logo(req: SelectLogoRequest):
    """
    Saves chosen logo variant and style onto the artisan profile.
    """
    if not req.artisan_id_or_phone or not req.logo_url:
        raise HTTPException(status_code=400, detail="artisan_id_or_phone and logo_url are required")

    profile = get_profile_by_id_or_phone(req.artisan_id_or_phone)
    if not profile:
        raise HTTPException(status_code=404, detail="Artisan profile not found")

    updated = update_artisan_profile(profile["id"], {
        "shop_logo_url": req.logo_url,
        "shop_logo_style": req.style or "badge",
    })

    return {
        "success": True,
        "message": "Shop logo updated successfully",
        "shop_logo_url": req.logo_url,
        "shop_logo_style": req.style or "badge",
        "profile": updated
    }


@router.post("/upload")
async def upload_custom_logo(
    file: UploadFile = File(...),
    artisan_id_or_phone: str = Form(...)
):
    """
    Allows artisan to upload their own hand-drawn or custom mark instead of auto-generated ones.
    """
    profile = get_profile_by_id_or_phone(artisan_id_or_phone)
    if not profile:
        raise HTTPException(status_code=404, detail="Artisan profile not found")

    ext = Path(file.filename).suffix.lower() if file.filename else ".png"
    if ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        ext = ".png"

    filename = f"custom_logo_{uuid.uuid4().hex[:12]}{ext}"
    dest_path = LOGOS_DIR / filename

    content = await file.read()
    with open(dest_path, "wb") as f:
        f.write(content)

    base_url = f"http://{LAN_IP}:{PORT}"
    logo_url = f"{base_url}/uploads/logos/{filename}"

    updated = update_artisan_profile(profile["id"], {
        "shop_logo_url": logo_url,
        "shop_logo_style": "custom",
    })

    return {
        "success": True,
        "message": "Custom logo uploaded successfully",
        "shop_logo_url": logo_url,
        "shop_logo_style": "custom",
        "profile": updated
    }


@router.get("/current")
def get_current_logo(artisan_id_or_phone: str):
    """
    Returns current logo and available variants for an artisan.
    """
    profile = get_profile_by_id_or_phone(artisan_id_or_phone)
    if not profile:
        raise HTTPException(status_code=404, detail="Artisan profile not found")

    shop_name = profile.get("shop_name") or profile.get("name") or "Artisan Shop"
    craft_type = profile.get("craft_type") or "Handicraft"

    variants_data = generate_shop_logo_variants(shop_name, craft_type, artisan_id=profile["id"])

    return {
        "success": True,
        "current_logo_url": profile.get("shop_logo_url") or variants_data["default_logo_url"],
        "current_style": profile.get("shop_logo_style") or "badge",
        "shop_name": shop_name,
        "craft_type": craft_type,
        "variants": variants_data["variants"]
    }
