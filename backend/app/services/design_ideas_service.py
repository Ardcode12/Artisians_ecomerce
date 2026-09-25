"""
Design Ideas Innovation Service
Analyzes artisan products and generates modern innovation concepts
that preserve traditional craftsmanship while updating form for contemporary markets.
Includes AI-driven innovation prompts and a high-fidelity Redesign Image Synthesis Pipeline.
"""

import os
import json
import time
import re
import logging
import requests
import base64
import urllib.parse
from io import BytesIO
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance, ImageOps

from app.db.database import get_db
from app.config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    UPLOADS_DIR,
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
)
try:
    import cloudinary
    import cloudinary.uploader

    if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
        try:
            cloudinary.config(
                cloud_name=CLOUDINARY_CLOUD_NAME,
                api_key=CLOUDINARY_API_KEY,
                api_secret=CLOUDINARY_API_SECRET,
                secure=True,
            )
        except Exception as _c_err:
            pass
except ImportError:
    cloudinary = None

_CLOUDINARY_URL_CACHE: Dict[str, str] = {}

logger = logging.getLogger("DesignIdeasService")


def get_design_ideas_by_product_id(product_id: str) -> List[Dict[str, Any]]:
    """Fetch all design ideas generated for a specific product."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, product_id, concept_name, pitch, target_customer,
               improvements, generated_image_path, status, created_at
        FROM design_ideas
        WHERE product_id = ?
        ORDER BY id ASC;
        """, (product_id,))
        rows = cursor.fetchall()
        results = []
        for r in rows:
            d = dict(r)
            try:
                d["improvements"] = json.loads(d["improvements"])
            except Exception:
                d["improvements"] = [d["improvements"]]
            results.append(d)
        return results


def save_design_idea(idea_id: int) -> Dict[str, Any]:
    """Marks a design idea as saved."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE design_ideas
        SET status = 'saved', updated_at = ?
        WHERE id = ?;
        """, (now_iso, idea_id))
        cursor.execute("SELECT * FROM design_ideas WHERE id = ?;", (idea_id,))
        row = cursor.fetchone()
        if not row:
            return {"success": False, "error": "Idea not found"}
        res = dict(row)
        try:
            res["improvements"] = json.loads(res["improvements"])
        except Exception:
            pass
        return {"success": True, "idea": res}


def dismiss_design_idea(idea_id: int) -> Dict[str, Any]:
    """Marks a design idea as dismissed."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE design_ideas
        SET status = 'dismissed', updated_at = ?
        WHERE id = ?;
        """, (now_iso, idea_id))
        return {"success": True, "status": "dismissed"}


def convert_idea_to_listing(idea_id: int) -> Dict[str, Any]:
    """Returns pre-filled payload for the Add-Product wizard based on the design concept."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT d.*, p.price, p.category, p.craft_type
        FROM design_ideas d
        JOIN products p ON d.product_id = p.id
        WHERE d.id = ?;
        """, (idea_id,))
        row = cursor.fetchone()
        if not row:
            return {"success": False, "error": "Idea not found"}
        item = dict(row)
        try:
            improvements_list = json.loads(item.get("improvements") or "[]")
        except Exception:
            improvements_list = []

        improvements_text = "\n".join(f"• {imp}" for imp in improvements_list)
        full_description = f"{item['pitch']}\n\nModern Craft Features:\n{improvements_text}"

        return {
            "success": True,
            "listing_draft": {
                "title": item["concept_name"],
                "description_en": full_description,
                "category": item.get("category") or "Handicraft",
                "craft_type": item.get("craft_type") or "Handicraft",
                "price": item.get("price") or "₹ 850",
                "image_url": item.get("generated_image_path") or "",
                "status": "draft",
            }
        }


# ─────────────────────────────────────────────────────────────────────────────
# 1. Image Resolution & Modern Redesign Image Synthesis Pipeline
# ─────────────────────────────────────────────────────────────────────────────

def _load_source_image(image_ref: str) -> Optional[Image.Image]:
    """Resolves an image reference (local filename, relative path, or URL) to a PIL Image."""
    if not image_ref:
        return None

    trimmed = image_ref.strip()

    # Case A: Check local file in UPLOADS_DIR
    clean_filename = None
    if "/uploads/" in trimmed:
        clean_filename = trimmed.split("/uploads/")[-1].split("?")[0]
    elif trimmed.startswith("uploads/"):
        clean_filename = trimmed.replace("uploads/", "").split("?")[0]
    elif not trimmed.startswith("http://") and not trimmed.startswith("https://"):
        clean_filename = trimmed

    if clean_filename:
        local_path = UPLOADS_DIR / clean_filename
        if local_path.exists() and local_path.is_file():
            try:
                with Image.open(local_path) as raw:
                    img = ImageOps.exif_transpose(raw)
                    return img.convert("RGBA")
            except Exception as e:
                logger.warning(f"Failed to open local image {local_path}: {e}")

    # Case B: Download via HTTP if it's a URL
    if trimmed.startswith("http://") or trimmed.startswith("https://"):
        try:
            resp = requests.get(trimmed, timeout=5)
            if resp.status_code == 200:
                with Image.open(BytesIO(resp.content)) as raw:
                    img = ImageOps.exif_transpose(raw)
                    return img.convert("RGBA")
        except Exception as e:
            logger.warning(f"Failed to download image {trimmed}: {e}")

    return None


def _get_source_image_b64(image_ref: str) -> Optional[str]:
    """Resolves an image reference to base64 JPEG data for Gemini multimodal vision."""
    if not image_ref:
        return None
    trimmed = image_ref.strip()
    clean_filename = None
    if "/uploads/" in trimmed:
        clean_filename = trimmed.split("/uploads/")[-1].split("?")[0]
    elif trimmed.startswith("uploads/"):
        clean_filename = trimmed.replace("uploads/", "").split("?")[0]
    elif not trimmed.startswith("http://") and not trimmed.startswith("https://"):
        clean_filename = trimmed

    if clean_filename:
        local_path = UPLOADS_DIR / clean_filename
        if local_path.exists() and local_path.is_file():
            try:
                with Image.open(local_path) as raw:
                    img = ImageOps.exif_transpose(raw).convert("RGB")
                    img.thumbnail((1024, 1024))
                    buf = BytesIO()
                    img.save(buf, format="JPEG", quality=85)
                    return base64.b64encode(buf.getvalue()).decode("utf-8")
            except Exception as e:
                logger.warning(f"Failed to encode local image {local_path} to base64: {e}")

    if trimmed.startswith("http://") or trimmed.startswith("https://"):
        try:
            resp = requests.get(trimmed, timeout=8)
            if resp.status_code == 200:
                with Image.open(BytesIO(resp.content)) as raw:
                    img = ImageOps.exif_transpose(raw).convert("RGB")
                    img.thumbnail((1024, 1024))
                    buf = BytesIO()
                    img.save(buf, format="JPEG", quality=85)
                    return base64.b64encode(buf.getvalue()).decode("utf-8")
        except Exception as e:
            logger.warning(f"Failed to download image {trimmed} for base64: {e}")

    return None


def _ensure_cloudinary_public_url(image_ref: str) -> Optional[str]:
    """Uploads a local product image to Cloudinary to provide a publicly accessible HTTPS reference for AI image-to-image synthesis."""
    if not image_ref:
        return None
    trimmed = image_ref.strip()
    if trimmed in _CLOUDINARY_URL_CACHE:
        return _CLOUDINARY_URL_CACHE[trimmed]
    if trimmed.startswith("https://res.cloudinary.com/") or trimmed.startswith("https://images.unsplash.com/"):
        return trimmed

    clean_filename = None
    if "/uploads/" in trimmed:
        clean_filename = trimmed.split("/uploads/")[-1].split("?")[0]
    elif trimmed.startswith("uploads/"):
        clean_filename = trimmed.replace("uploads/", "").split("?")[0]
    elif not trimmed.startswith("http://") and not trimmed.startswith("https://"):
        clean_filename = trimmed

    if clean_filename:
        local_path = UPLOADS_DIR / clean_filename
        if local_path.exists() and local_path.is_file():
            try:
                res = cloudinary.uploader.upload(str(local_path), folder="artisan_redesigns")
                pub_url = res.get("secure_url")
                if pub_url:
                    _CLOUDINARY_URL_CACHE[trimmed] = pub_url
                    logger.info(f"Uploaded product image to Cloudinary for AI visual reference: {pub_url}")
                    return pub_url
            except Exception as e:
                logger.warning(f"Failed to upload {clean_filename} to Cloudinary: {e}")

    return None


def _synthesize_pil_composite(
    product_id: str,
    original_image_ref: str,
    concept: Dict[str, Any],
    concept_index: int,
) -> str:
    """
    Synthesizes a distinct, high-aesthetic modern redesigned visual for an artisan concept.
    Produces a 1000x1000 professional studio composition with contemporary aesthetics:
    - Concept 0: Modern Minimalist Edition (Warm contemporary architectural studio, refined lighting)
    - Concept 1: Contemporary Lifestyle Fusion (Scandinavian warm aesthetic, soft natural contrast)
    - Concept 2: Luxury Heritage Edition (Deep warm charcoal/emerald luxury backdrop, gold rim accent)
    Saves to backend/data/uploads and returns relative 'uploads/...' path.
    """
    CANVAS_SIZE = 1000
    theme_styles = [
        {
            # 0: Modern Minimalist
            "top_color": (248, 246, 240),
            "bottom_color": (236, 230, 219),
            "accent_color": (30, 78, 44),        # Forest green
            "pill_bg": (235, 246, 238),
            "pill_border": (198, 226, 207),
            "tag_text": "✨ MODERN MINIMALIST EDITION",
            "border_color": (210, 204, 192),
            "warmth": 1.08,
            "contrast": 1.06,
        },
        {
            # 1: Contemporary Lifestyle Fusion
            "top_color": (245, 241, 235),
            "bottom_color": (224, 218, 206),
            "accent_color": (180, 83, 9),         # Warm amber
            "pill_bg": (253, 245, 237),
            "pill_border": (252, 230, 210),
            "tag_text": "✨ CONTEMPORARY FUSION DESIGN",
            "border_color": (220, 210, 196),
            "warmth": 1.05,
            "contrast": 1.08,
        },
        {
            # 2: Luxury Heritage Edition
            "top_color": (40, 44, 46),
            "bottom_color": (22, 24, 25),
            "accent_color": (217, 119, 6),        # Artisan Gold
            "pill_bg": (52, 58, 60),
            "pill_border": (90, 98, 102),
            "tag_text": "✨ LUXURY HERITAGE EDITION",
            "border_color": (80, 86, 90),
            "warmth": 1.04,
            "contrast": 1.12,
        },
    ]

    style = theme_styles[concept_index % len(theme_styles)]
    source_img = _load_source_image(original_image_ref)

    # 1. Create Base Canvas with Vertical Gradient
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE))
    top_c = style["top_color"]
    bot_c = style["bottom_color"]

    # Generate vertical gradient
    gradient_img = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE))
    draw_grad = ImageDraw.Draw(gradient_img)
    for y in range(CANVAS_SIZE):
        ratio = y / float(CANVAS_SIZE)
        r = int(top_c[0] * (1.0 - ratio) + bot_c[0] * ratio)
        g = int(top_c[1] * (1.0 - ratio) + bot_c[1] * ratio)
        b = int(top_c[2] * (1.0 - ratio) + bot_c[2] * ratio)
        draw_grad.line([(0, y), (CANVAS_SIZE, y)], fill=(r, g, b, 255))
    canvas.paste(gradient_img, (0, 0))

    # 2. Add Architectural Studio Pedestal / Surface Ellipse
    surface_layer = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    draw_surf = ImageDraw.Draw(surface_layer)
    pedestal_w = int(CANVAS_SIZE * 0.88)
    pedestal_h = int(CANVAS_SIZE * 0.32)
    pedestal_x = (CANVAS_SIZE - pedestal_w) // 2
    pedestal_y = int(CANVAS_SIZE * 0.62)

    surf_col = (
        int(bot_c[0] * 0.94),
        int(bot_c[1] * 0.94),
        int(bot_c[2] * 0.94),
        160
    )
    draw_surf.ellipse(
        [pedestal_x, pedestal_y, pedestal_x + pedestal_w, pedestal_y + pedestal_h],
        fill=surf_col
    )
    blurred_surf = surface_layer.filter(ImageFilter.GaussianBlur(radius=8))
    canvas.alpha_composite(blurred_surf)

    # 3. Product Placement & Shadow
    if source_img:
        # Subtle color & contrast tuning to impart modern studio quality
        rgb_part = source_img.convert("RGB")
        enh_color = ImageEnhance.Color(rgb_part).enhance(style["warmth"])
        enh_contrast = ImageEnhance.Contrast(enh_color).enhance(style["contrast"])
        enh_sharp = ImageEnhance.Sharpness(enh_contrast).enhance(1.15)
        processed_prod = enh_sharp.convert("RGBA")
        if "A" in source_img.getbands():
            processed_prod.putalpha(source_img.getchannel("A"))

        # Scale product to fit elegantly in center
        max_dim = int(CANVAS_SIZE * 0.64)
        pw, ph = processed_prod.size
        scale = min(max_dim / max(pw, 1), max_dim / max(ph, 1))
        nw, nh = max(int(pw * scale), 20), max(int(ph * scale), 20)
        resized_prod = processed_prod.resize((nw, nh), Image.Resampling.LANCZOS)

        pos_x = (CANVAS_SIZE - nw) // 2
        pos_y = int((CANVAS_SIZE - nh) * 0.44)

        # Soft Contact Ground Shadow
        shadow_layer = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        draw_sh = ImageDraw.Draw(shadow_layer)
        sh_w = int(nw * 0.82)
        sh_h = max(int(nh * 0.12), 24)
        sh_x = (CANVAS_SIZE - sh_w) // 2
        sh_y = pos_y + nh - int(sh_h * 0.45)
        draw_sh.ellipse([sh_x, sh_y, sh_x + sh_w, sh_y + sh_h], fill=(20, 22, 25, 95))
        blurred_sh = shadow_layer.filter(ImageFilter.GaussianBlur(radius=max(int(sh_h * 0.65), 2)))
        canvas.alpha_composite(blurred_sh)

        # Composite product
        canvas.alpha_composite(resized_prod, (pos_x, pos_y))
    else:
        # Graceful studio graphic handcrafted vessel silhouette if no source photo
        prod_layer = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
        draw_p = ImageDraw.Draw(prod_layer)
        cx, cy = CANVAS_SIZE // 2, int(CANVAS_SIZE * 0.48)
        # Ground shadow
        draw_p.ellipse([cx - 180, cy + 90, cx + 180, cy + 140], fill=(20, 22, 25, 75))
        # Body
        draw_p.ellipse([cx - 150, cy - 110, cx + 150, cy + 110], fill=(*style["accent_color"], 235))
        # Neck & rim
        draw_p.rounded_rectangle([cx - 55, cy - 185, cx + 55, cy - 85], radius=16, fill=(*style["accent_color"], 250))
        draw_p.ellipse([cx - 70, cy - 200, cx + 70, cy - 170], fill=(*style["accent_color"], 255))
        # Subtle metallic accent band
        draw_p.rectangle([cx - 55, cy - 155, cx + 55, cy - 145], fill=(217, 119, 6, 220))
        canvas.alpha_composite(prod_layer)

    # 4. Minimalist Modern Frame & Innovation Badge
    draw_frame = ImageDraw.Draw(canvas)
    frame_pad = 28
    draw_frame.rectangle(
        [frame_pad, frame_pad, CANVAS_SIZE - frame_pad, CANVAS_SIZE - frame_pad],
        outline=(*style["border_color"], 180),
        width=2
    )

    # Corner accents
    corner_len = 36
    corners = [
        ((frame_pad, frame_pad), (frame_pad + corner_len, frame_pad), (frame_pad, frame_pad + corner_len)),
        ((CANVAS_SIZE - frame_pad, frame_pad), (CANVAS_SIZE - frame_pad - corner_len, frame_pad), (CANVAS_SIZE - frame_pad, frame_pad + corner_len)),
        ((frame_pad, CANVAS_SIZE - frame_pad), (frame_pad + corner_len, CANVAS_SIZE - frame_pad), (frame_pad, CANVAS_SIZE - frame_pad - corner_len)),
        ((CANVAS_SIZE - frame_pad, CANVAS_SIZE - frame_pad), (CANVAS_SIZE - frame_pad - corner_len, CANVAS_SIZE - frame_pad), (CANVAS_SIZE - frame_pad, CANVAS_SIZE - frame_pad - corner_len)),
    ]
    for origin, p1, p2 in corners:
        draw_frame.line([origin, p1], fill=(*style["accent_color"], 230), width=4)
        draw_frame.line([origin, p2], fill=(*style["accent_color"], 230), width=4)

    # Header Badge Pill [ ✨ MODERN MINIMALIST EDITION ]
    badge_w = 460
    badge_h = 44
    badge_x = (CANVAS_SIZE - badge_w) // 2
    badge_y = 48
    draw_frame.rounded_rectangle(
        [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
        radius=22,
        fill=(*style["pill_bg"], 240),
        outline=(*style["pill_border"], 255),
        width=1
    )
    # Badge text
    draw_frame.text(
        (badge_x + 36, badge_y + 12),
        style["tag_text"],
        fill=style["accent_color"]
    )

    # Footer Concept Name Bar
    concept_name = concept.get("name") or "Modern Craft Concept"
    footer_text = f"CONCEPT {concept_index + 1}: {concept_name.upper()}"
    footer_w = min(len(footer_text) * 12 + 60, CANVAS_SIZE - 100)
    footer_h = 40
    footer_x = (CANVAS_SIZE - footer_w) // 2
    footer_y = CANVAS_SIZE - 88
    draw_frame.rounded_rectangle(
        [footer_x, footer_y, footer_x + footer_w, footer_y + footer_h],
        radius=20,
        fill=(255, 255, 255, 220),
        outline=(*style["border_color"], 200),
        width=1
    )
    draw_frame.text(
        (footer_x + 24, footer_y + 11),
        footer_text,
        fill=(15, 37, 55)
    )

    # 5. Save Output
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "", product_id)[:32]
    filename = f"redesign-{clean_id}-{concept_index}-{int(time.time() * 1000)}.jpg"
    output_path = UPLOADS_DIR / filename

    final_rgb = canvas.convert("RGB")
    final_rgb.save(output_path, "JPEG", quality=92, optimize=True)
    logger.info(f"Synthesized redesigned image: {filename}")

    return f"uploads/{filename}"


_GEMINI_IMAGE_QUOTA_EXHAUSTED = False


def generate_redesigned_product_image(
    product_id: str,
    original_image_ref: str,
    concept: Dict[str, Any],
    concept_index: int,
) -> str:
    """
    Synthesizes a realistic, high-fidelity modern redesigned visual for an artisan concept
    using the Gemini API and AI image synthesis pipeline.
    
    Pipeline:
    1. Extracts or crafts a dedicated visual prompt from the Gemini concept.
    2. Probes Gemini Native Image Generation if quota is available.
    3. If Gemini native image is on free tier (limit 0), immediately routes to high-speed AI image synthesis
       using the Gemini-crafted visual prompt.
    4. Falls back to aesthetic studio compositing if network is completely unavailable.
    Saves image to backend/data/uploads/ and returns 'uploads/...' relative path.
    """
    global _GEMINI_IMAGE_QUOTA_EXHAUSTED
    clean_id = re.sub(r"[^a-zA-Z0-9_-]", "", product_id)[:32]
    filename = f"redesign-{clean_id}-{concept_index}-{int(time.time() * 1000)}.jpg"
    output_path = UPLOADS_DIR / filename

    concept_name = concept.get("name") or "Modern Handcrafted Product"
    improvements = ", ".join(concept.get("improvements") or ["contemporary minimalist aesthetic", "refined craftsmanship"])

    # 1. Resolve or construct high-detail visual prompt
    visual_prompt = (concept.get("image_prompt") or "").strip()
    if not visual_prompt:
        theme_names = [
            "Modern Minimalist Edition with clean Scandinavian lines and architectural simplicity",
            "Contemporary Lifestyle Edition with organic warm tones and functional everyday elegance",
            "Luxury Heritage Edition with subtle metallic accents and premium museum-grade finishing",
        ]
        theme_str = theme_names[concept_index % len(theme_names)]
        visual_prompt = (
            f"Professional commercial studio product photography of {concept_name}, {theme_str}. "
            f"Crafted with {improvements}. Displayed elegantly on a warm travertine stone pedestal in an architecturally "
            f"minimalist interior, soft cinematic directional lighting, sharp 8k focus, ultra-refined luxury artisan catalog, "
            f"no text, no watermark, no labels."
        )

    # 2. Try Gemini Image Generation API directly if key is configured and quota not exhausted
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here" and not _GEMINI_IMAGE_QUOTA_EXHAUSTED:
        gemini_img_models = ["gemini-2.5-flash-image", "gemini-3.1-flash-image"]
        for img_model in gemini_img_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{img_model}:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": visual_prompt}]}],
                    "generationConfig": {
                        "responseModalities": ["IMAGE"]
                    }
                }
                resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        for p in parts:
                            if "inlineData" in p and p["inlineData"].get("data"):
                                raw_bytes = base64.b64decode(p["inlineData"]["data"])
                                with open(output_path, "wb") as f:
                                    f.write(raw_bytes)
                                logger.info(f"Generated redesigned image via Gemini {img_model}: {filename}")
                                return f"uploads/{filename}"
                elif resp.status_code == 429:
                    _GEMINI_IMAGE_QUOTA_EXHAUSTED = True
                    logger.info("Gemini native image endpoint returned 429 quota limit. Routing to high-speed AI image synthesis.")
                    break
            except Exception as g_err:
                logger.debug(f"Gemini image check notice ({img_model}): {g_err}")
                break

    # 3. High-Speed AI Image Synthesis using the Gemini-crafted visual prompt
    try:
        clean_prompt = re.sub(r'[\r\n\t]+', ' ', visual_prompt)
        clean_prompt = re.sub(r'[^a-zA-Z0-9, -]', '', clean_prompt)[:240].strip()
        encoded_prompt = urllib.parse.quote(clean_prompt)
        seed = int(time.time()) + (concept_index * 1337)
        ai_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=768&height=768&nologo=true&seed={seed}"
        resp = requests.get(ai_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}, timeout=14)
        if resp.status_code == 200 and len(resp.content) > 3000:
            with Image.open(BytesIO(resp.content)) as im:
                w, h = im.size
                # Clean watermark band at the very bottom
                clean_im = im.crop((0, 0, w, h - 35)).resize((w, h), Image.Resampling.LANCZOS)
                clean_im.save(output_path, "JPEG", quality=92)
            logger.info(f"Synthesized photorealistic redesigned image via Gemini prompt: {filename}")
            return f"uploads/{filename}"
    except Exception as ai_err:
        logger.warning(f"AI image synthesis engine notice: {ai_err}")

    # 4. Fallback to PIL aesthetic studio composite
    return _synthesize_pil_composite(
        product_id=product_id,
        original_image_ref=original_image_ref,
        concept=concept,
        concept_index=concept_index
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2. Dynamic Gemini AI Innovation Concept Generator
# ─────────────────────────────────────────────────────────────────────────────

def _generate_concepts_with_gemini(
    title: str,
    category: str,
    craft_type: str,
    description: str,
    image_ref: str = "",
) -> Optional[List[Dict[str, Any]]]:
    """Uses Gemini to produce 3 tailored modern fusion concepts visually grounded in the artisan's actual product photo."""
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return None

    b64_img = _get_source_image_b64(image_ref) if image_ref else None

    if b64_img:
        prompt = f"""You are an elite contemporary product designer and Indian handicraft innovator.
Carefully examine the attached photograph of the artisan's actual current product.
- Product Title: "{title}"
- Category: "{category}"
- Craft Type: "{craft_type}"
- Notes / Description: "{description}"

Task:
1. Closely analyze the EXACT physical product, materials, colors, textures, and shape shown in the photograph.
2. Generate exactly 3 modern, marketable redesign concepts that directly and faithfully EVOLVE THIS EXACT OBJECT into contemporary high-end editions for modern buyers (urban homes, luxury lifestyle, modern interior decor, boutique gifting).
CRITICAL REQUIREMENT: The redesigned concepts MUST clearly and unmistakably be an evolution of the EXACT item shown in the photo (preserving its recognizable subject, form, and craft character, but elevating materials, craftsmanship, and aesthetic execution). Do not invent an unrelated item.

Format requirements:
- Concept 1: Modern Minimalist Edition (refined functional edition of this exact item suited for modern city living).
- Concept 2: Contemporary Lifestyle or Home Décor Fusion (contemporary aesthetic adaptation of this exact item).
- Concept 3: Luxury Heritage Edition (premium edition of this exact item with metallic/refined touches suited for high-ticket gifting).

Return ONLY valid JSON (no markdown fences, no explanation) with this exact schema:
[
  {{
    "name": "Concise Attractive Concept Title",
    "pitch": "1-2 sentences explaining why modern buyers will love and purchase this.",
    "target": "Target customer demographic",
    "improvements": [
      "Concrete craft improvement 1",
      "Concrete craft improvement 2",
      "Concrete craft improvement 3",
      "Concrete craft improvement 4"
    ],
    "image_prompt": "Ultra-detailed photographic visual prompt for generating a commercial product photograph of this modernized edition of the exact item in the photo. Explicitly specify the recognizable core features, colors, and form of the item from the original photo, along with its upgraded contemporary textures, soft directional studio lighting, clean architectural background, 8k resolution, no text, no watermark"
  }},
  {{
    "name": "...",
    "pitch": "...",
    "target": "...",
    "improvements": ["...", "...", "...", "..."],
    "image_prompt": "..."
  }},
  {{
    "name": "...",
    "pitch": "...",
    "target": "...",
    "improvements": ["...", "...", "...", "..."],
    "image_prompt": "..."
  }}
]"""
    else:
        prompt = f"""You are an elite contemporary product designer and Indian handicraft innovator.
Analyze this traditional artisan product:
- Title: "{title}"
- Category: "{category}"
- Craft Type: "{craft_type}"
- Notes / Description: "{description}"

Task:
Generate exactly 3 distinct, highly marketable, modern innovation product concepts that directly modernize this artisan craft for contemporary buyers (urban millennials, boutique cafes, export fashion, modern home interiors, sustainable corporate gifting).

Format requirements:
- Concept 1: Modern Minimalist Edition
- Concept 2: Contemporary Lifestyle or Home Décor Fusion
- Concept 3: Luxury Heritage Edition

Return ONLY valid JSON (no markdown fences, no explanation) with this exact schema:
[
  {{
    "name": "Concise Attractive Concept Title",
    "pitch": "1-2 sentences explaining why modern buyers will love and purchase this.",
    "target": "Target customer demographic",
    "improvements": [
      "Concrete craft improvement 1",
      "Concrete craft improvement 2",
      "Concrete craft improvement 3",
      "Concrete craft improvement 4"
    ],
    "image_prompt": "Ultra-detailed photographic visual prompt for generating a commercial product photograph of this modernized product on an architectural studio plinth, specifying textures, lighting, modern accents, clean interior background, 8k resolution, no text, no watermark"
  }},
  {{
    "name": "...",
    "pitch": "...",
    "target": "...",
    "improvements": ["...", "...", "...", "..."],
    "image_prompt": "..."
  }},
  {{
    "name": "...",
    "pitch": "...",
    "target": "...",
    "improvements": ["...", "...", "...", "..."],
    "image_prompt": "..."
  }}
]"""

    models_to_try = [
        "gemini-3-flash-preview",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        GEMINI_MODEL,
    ]
    seen = set()
    models_to_try = [m for m in models_to_try if m and not (m in seen or seen.add(m))]

    for model_name in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
            if b64_img:
                parts = [
                    {"inlineData": {"mimeType": "image/jpeg", "data": b64_img}},
                    {"text": prompt}
                ]
            else:
                parts = [{"text": prompt}]

            payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 2500,
                    "response_mime_type": "application/json"
                }
            }
            resp = requests.post(url, json=payload, timeout=12)
            if resp.status_code == 200:
                cand = resp.json().get("candidates", [])
                if cand and "content" in cand[0]:
                    parts = cand[0]["content"].get("parts", [])
                    if parts:
                        text_val = parts[0].get("text", "[]").strip()
                        parsed = json.loads(text_val)
                        if isinstance(parsed, list) and len(parsed) >= 2:
                            logger.info(f"Generated {len(parsed)} concepts visually grounded via Gemini model: {model_name}")
                            return parsed[:3]
            elif resp.status_code != 429:
                logger.debug(f"Gemini concept attempt with {model_name} status: {resp.status_code}")
        except Exception as e:
            logger.warning(f"Gemini attempt with {model_name} note: {e}")

    return None


def _get_curated_fallback_concepts(title: str, category: str, craft_type: str) -> List[Dict[str, Any]]:
    """High-value craft innovation template fallback when AI service is offline."""
    title_lower = title.lower()
    cat_lower = (category + " " + craft_type).lower()

    if "basket" in title_lower or "weave" in cat_lower or "cane" in cat_lower or "bamboo" in cat_lower:
        return [
            {
                "name": "Handcrafted Handbag & Tote",
                "pitch": "Turn your traditional weave into a stylish, eco-friendly bag for everyday city use.",
                "target": "Urban working women, eco-conscious fashion buyers",
                "improvements": [
                    "Add inner fabric lining and secure brass zip",
                    "Introduce contemporary dual-tone earth colors",
                    "Add durable genuine shoulder straps",
                    "Retain signature regional weave pattern"
                ],
            },
            {
                "name": "Contemporary Pendant Lamp Shade",
                "pitch": "Use your weaving skill to create ambient geometric lamps for modern homes and boutique cafes.",
                "target": "Interior decorators, boutique café owners, festive home buyers",
                "improvements": [
                    "Tighten weave structure for electrical safety",
                    "Apply natural fire-retardant beeswax seal",
                    "Incorporate modern ceiling pendant ring",
                    "Target booming urban home decor market"
                ],
            },
            {
                "name": "Modular Minimalist Organizer Set",
                "pitch": "A multipurpose nesting storage system for contemporary desk and wardrobe organization.",
                "target": "Minimalist home organizers, Scandinavian aesthetics",
                "improvements": [
                    "Standardize uniform dimensions for modular stacking",
                    "Add washable cotton canvas lining",
                    "Offer nesting set of 3 practical sizes",
                    "High re-order demand from corporate offices"
                ],
            },
        ]

    if "pot" in title_lower or "clay" in cat_lower or "ceramic" in cat_lower or "terracotta" in cat_lower:
        return [
            {
                "name": "Minimalist Matte Planter with Brass Tray",
                "pitch": "Contemporary ribbed terracotta planters tailored for indoor succulent and balcony gardens.",
                "target": "Urban plant parents, modern apartment dwellers",
                "improvements": [
                    "Add precision drainage hole with removable brass tray",
                    "Smooth matte finish without artificial gloss varnish",
                    "Geometric vertical ribbing for ergonomic grip",
                    "Offer 3 calibrated nesting tabletop sizes"
                ],
            },
            {
                "name": "Artisanal Pour-Over Coffee Dripper",
                "pitch": "Transform unglazed clay into an artisanal slow-coffee kit for specialty brew lovers.",
                "target": "Specialty coffee connoisseurs, premium gifting buyers",
                "improvements": [
                    "Calibrated 60-degree cone angle for standard V60 paper filters",
                    "Leverage natural heat-insulating porous clay properties",
                    "Comfortable ergonomic side grip handle",
                    "Food-safe glazed interior channel"
                ],
            },
            {
                "name": "Terracotta Aromatherapy Diffuser",
                "pitch": "Natural porous clay diffuser that gently releases essential oils with ambient candlelight.",
                "target": "Wellness centers, yoga studios, festive corporate gifting",
                "improvements": [
                    "Carved top dish engineered for essential oils and water",
                    "Intricate jali lattice cutouts for warm candle glow",
                    "Stable, heat-resistant weighted base",
                    "Compact modern bedside form factor"
                ],
            },
        ]

    if "saree" in title_lower or "textile" in cat_lower or "silk" in cat_lower or "handloom" in cat_lower:
        return [
            {
                "name": "Contemporary Fusion Stole & Shawl",
                "pitch": "Re-engineer classic handloom borders onto lightweight pastel stoles for everyday formal wear.",
                "target": "Corporate professionals, export fashion buyers",
                "improvements": [
                    "Lighter weave density for all-season breathability",
                    "Pastel modern colorway (raw ecru, sage, dusty rose)",
                    "Subtle selvedge fringe finish",
                    "Compact travel-friendly packaging"
                ],
            },
            {
                "name": "Heritage Cushion Cover Set",
                "pitch": "Repurpose signature loom motifs into luxury home living accents with high profit margins.",
                "target": "Interior designers, boutique hotel buyers",
                "improvements": [
                    "Add concealed zipper closure and heavy cotton backing",
                    "Square 16x16 and 18x18 standard modern pillow dimensions",
                    "Pre-shrunk fabric treatment for easy machine washing",
                    "Limited-edition artisan cluster story tag"
                ],
            },
            {
                "name": "Handloom Laptop Sleeve & Folio",
                "pitch": "Blend royal hand-woven heritage fabric with protective padded tech organizers.",
                "target": "University students, creative professionals, tech executives",
                "improvements": [
                    "Shock-absorbent high-density foam internal padding",
                    "Water-resistant microfiber inner lining",
                    "Sleek magnetic envelope snap closure",
                    "Premium leather trim accents on edges"
                ],
            },
        ]

    # Universal High-Value Modernization Template
    clean_title = title.strip() or "Handicraft"
    return [
        {
            "name": f"Modern Minimalist {clean_title}",
            "pitch": "Refined contemporary edition with minimalist lines and functional ergonomics suited for city living.",
            "target": "Urban millennials and contemporary home decorators",
            "improvements": [
                "Refined compact proportions for modern apartment living",
                "Neutral earthy color palette with matte natural finish",
                "Enhanced protective, wipeable eco-friendly seal",
                "QR-code artisan heritage story tag"
            ],
        },
        {
            "name": f"Multipurpose Functional {clean_title}",
            "pitch": "Dual-utility design that seamlessly serves both daily everyday use and artistic decorative display.",
            "target": "Practical modern homeowners and eco-lifestyle shoppers",
            "improvements": [
                "Ergonomic everyday handle / grip optimization",
                "Modular stackable structure for easy transport and storage",
                "Reinforced joinery and stress-point durability",
                "Eco-friendly zero-plastic gift packaging"
            ],
        },
        {
            "name": f"Luxury Heritage {clean_title}",
            "pitch": "Collector's premium edition featuring subtle metallic accents and master craftsman signatures.",
            "target": "Luxury hotels, export collectors, and premium wedding gifting",
            "improvements": [
                "Subtle brass / metallic inlay highlights",
                "Numbered limited artisan studio edition",
                "Custom protective cotton dust bag",
                "Certificate of authenticity with artisan bio"
            ],
        },
    ]


# ─────────────────────────────────────────────────────────────────────────────
# 3. Core Generation Pipeline
# ─────────────────────────────────────────────────────────────────────────────

def generate_design_ideas(product_id: str, force_refresh: bool = False) -> List[Dict[str, Any]]:
    """
    Generates 3 innovative modernized product concepts for an artisan's product.
    If ideas already exist with valid redesigned images and force_refresh is False,
    returns them directly (cached).
    """
    existing = get_design_ideas_by_product_id(product_id)

    # Check if existing ideas already have dedicated redesigned images that exist on disk
    if existing and not force_refresh:
        def _img_exists(path_str: str) -> bool:
            if not path_str:
                return False
            fname = path_str.replace("uploads/", "").split("?")[0]
            return (UPLOADS_DIR / fname).is_file()

        has_valid_images = len(existing) >= 2 and all(
            _img_exists(idea.get("generated_image_path")) for idea in existing
        )
        if has_valid_images:
            logger.info(f"Returning {len(existing)} existing cached design ideas for {product_id}")
            return existing

    # Look up original product
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE id = ?;", (product_id,))
        prod_row = cursor.fetchone()

    if not prod_row:
        logger.warning(f"Product {product_id} not found for design generation.")
        return existing or []

    product = dict(prod_row)
    title = (product.get("title") or "").strip()
    category = (product.get("category") or product.get("craft_type") or "Handicraft").strip()
    craft_type = (product.get("craft_type") or category).strip()
    description = (product.get("description_en") or "").strip()
    image_url = product.get("image_url") or ""

    # 1. Generate Concepts (AI first, then craft fallback)
    raw_concepts = _generate_concepts_with_gemini(
        title=title,
        category=category,
        craft_type=craft_type,
        description=description,
        image_ref=image_url,
    )
    if not raw_concepts or len(raw_concepts) < 2:
        raw_concepts = _get_curated_fallback_concepts(title, category, craft_type)

    # 2. Synthesize Distinct Redesigned Images for Each Concept
    concepts_with_images = []
    for idx, c in enumerate(raw_concepts[:3]):
        try:
            assigned_img = generate_redesigned_product_image(
                product_id=product_id,
                original_image_ref=image_url,
                concept=c,
                concept_index=idx,
            )
        except Exception as e:
            logger.error(f"Failed to synthesize image for concept {idx}: {e}")
            assigned_img = image_url

        concepts_with_images.append({
            "name": c["name"],
            "pitch": c["pitch"],
            "target": c.get("target") or "Contemporary lifestyle and home decor buyers",
            "improvements": c.get("improvements") or [],
            "image": assigned_img,
        })

    # 3. Clean up older/stale ideas for this product and insert new
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM design_ideas WHERE product_id = ?;", (product_id,))

        for c in concepts_with_images:
            cursor.execute("""
            INSERT INTO design_ideas (
                product_id, concept_name, pitch, target_customer,
                improvements, generated_image_path, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'generated', ?, ?);
            """, (
                product_id,
                c["name"],
                c["pitch"],
                c["target"],
                json.dumps(c["improvements"]),
                c["image"],
                now_iso,
                now_iso
            ))

    return get_design_ideas_by_product_id(product_id)
