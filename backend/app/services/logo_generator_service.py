"""
Deterministic Programmatic Shop Logo Generator
Built using Python Pillow (PIL) only — NO AI image generation models.
Produces 100% correct typography, deterministic colors, and crisp artisan brand marks.
"""

import os
import sys
import hashlib
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from PIL import Image, ImageDraw, ImageFont

from app.config import UPLOADS_DIR, LAN_IP, PORT

logger = logging.getLogger("LogoGenerator")

LOGOS_DIR = UPLOADS_DIR / "logos"
LOGOS_DIR.mkdir(parents=True, exist_ok=True)

WHITE = (255, 255, 255)

# Curated craft palettes matching traditional Indian craft identities
CRAFT_PALETTES = {
    "pottery":   {"bg": (196, 106, 66),  "accent": (245, 233, 220), "name": "Terracotta"},
    "textile":   {"bg": (46, 90, 74),    "accent": (245, 233, 220), "name": "Forest Green"},
    "wood":      {"bg": (94, 66, 46),    "accent": (240, 224, 200), "name": "Wood Brown"},
    "jewelry":   {"bg": (150, 110, 30),  "accent": (255, 248, 230), "name": "Artisan Gold"},
    "art":       {"bg": (140, 46, 66),   "accent": (245, 233, 220), "name": "Heritage Maroon"},
    "metal":     {"bg": (160, 100, 35),  "accent": (255, 245, 225), "name": "Antique Brass"},
    "bamboo":    {"bg": (55, 95, 45),    "accent": (245, 240, 225), "name": "Bamboo Sage"},
    "leather":   {"bg": (115, 65, 35),   "accent": (248, 235, 215), "name": "Tanned Ochre"},
    "stone":     {"bg": (85, 90, 95),    "accent": (245, 245, 240), "name": "Granite Stone"},
    "default":   {"bg": (45, 80, 22),    "accent": (250, 248, 245), "name": "Botanical Green"},
}

CRAFT_MARKS = {
    "pottery": "vase",
    "textile": "thread",
    "wood": "leaf",
    "jewelry": "gem",
    "art": "brush",
    "metal": "lamp",
    "bamboo": "leaf",
    "leather": "shield",
    "stone": "gem",
    "default": "leaf",
}


def _get_font(size: int, bold: bool = True, serif: bool = True) -> ImageFont.ImageFont:
    """Finds available system fonts on Windows or Linux with clean fallbacks."""
    candidates = []
    if sys.platform == "win32":
        if serif:
            candidates += [
                "C:/Windows/Fonts/georgiab.ttf",
                "C:/Windows/Fonts/georgia.ttf",
                "C:/Windows/Fonts/timesbd.ttf",
                "C:/Windows/Fonts/palabi.ttf",
            ]
        else:
            candidates += [
                "C:/Windows/Fonts/segoeuib.ttf",
                "C:/Windows/Fonts/arialbd.ttf",
                "C:/Windows/Fonts/calibrib.ttf",
                "C:/Windows/Fonts/trebucbd.ttf",
            ]
    else:
        if serif:
            candidates += [
                "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
            ]
        else:
            candidates += [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            ]

    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                continue

    return ImageFont.load_default()


def craft_category(craft_type_str: Optional[str]) -> str:
    """Classifies craft string into a palette category key."""
    if not craft_type_str:
        return "default"
    s = craft_type_str.lower()
    for key in CRAFT_PALETTES:
        if key in s:
            return key
    if "weaving" in s or "saree" in s or "carpet" in s or "silk" in s:
        return "textile"
    if "clay" in s or "terracotta" in s or "ceramic" in s:
        return "pottery"
    if "carv" in s or "timber" in s:
        return "wood"
    if "gold" in s or "silver" in s or "bead" in s:
        return "jewelry"
    if "brass" in s or "dhokra" in s or "bronze" in s:
        return "metal"
    if "cane" in s or "jute" in s:
        return "bamboo"
    if "sculpt" in s or "marble" in s:
        return "stone"
    return "default"


def initials_of(shop_name: str) -> str:
    """Extracts first letters of first two words, or first two letters if 1 word."""
    if not shop_name:
        return "KU"
    words = [w for w in shop_name.split() if any(c.isalnum() for c in w)]
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    clean = "".join(c for c in shop_name if c.isalnum())
    if len(clean) >= 2:
        return clean[:2].upper()
    return (clean + "S")[:2].upper()


def draw_mark(d: ImageDraw.ImageDraw, kind: str, cx: float, cy: float, s: float, color: tuple):
    """Draws crisp geometric glyphs without emoji dependencies."""
    if kind == "vase":
        d.polygon([
            (cx - s * 0.16, cy - s),
            (cx + s * 0.16, cy - s),
            (cx + s * 0.36, cy - s * 0.3),
            (cx + s * 0.22, cy + s),
            (cx - s * 0.22, cy + s),
            (cx - s * 0.36, cy - s * 0.3)
        ], fill=color)
        d.ellipse([cx - s * 0.22, cy - s * 1.18, cx + s * 0.22, cy - s * 0.82], fill=color)
    elif kind == "thread":
        d.ellipse([cx - s, cy - s, cx + s, cy + s], outline=color, width=max(2, int(s * 0.14)))
        d.ellipse([cx - s * 0.42, cy - s * 0.42, cx + s * 0.42, cy + s * 0.42], outline=color, width=max(2, int(s * 0.14)))
    elif kind == "leaf":
        d.polygon([(cx, cy - s), (cx + s * 0.72, cy + s * 0.3), (cx, cy + s), (cx - s * 0.72, cy + s * 0.3)], fill=color)
        d.line([(cx, cy - s * 0.8), (cx, cy + s * 0.8)], fill=WHITE, width=max(2, int(s * 0.08)))
    elif kind == "gem":
        d.polygon([
            (cx - s, cy - s * 0.3),
            (cx - s * 0.42, cy - s),
            (cx + s * 0.42, cy - s),
            (cx + s, cy - s * 0.3),
            (cx, cy + s)
        ], fill=color)
    elif kind == "brush":
        d.rounded_rectangle([cx - s * 0.18, cy - s, cx + s * 0.18, cy + s * 0.38], radius=int(s * 0.15), fill=color)
        d.polygon([(cx - s * 0.24, cy + s * 0.35), (cx + s * 0.24, cy + s * 0.35), (cx, cy + s)], fill=color)
    elif kind == "lamp":
        d.polygon([(cx - s * 0.8, cy + s * 0.1), (cx + s * 0.8, cy + s * 0.1), (cx, cy + s)], fill=color)
        d.ellipse([cx - s * 0.25, cy - s, cx + s * 0.25, cy - s * 0.1], fill=color)
    else:
        # Default flower / seal rosette
        d.ellipse([cx - s * 0.6, cy - s * 0.6, cx + s * 0.6, cy + s * 0.6], fill=color)


def make_badge_logo(shop_name: str, craft_type: str, out_path: str, size: int = 600) -> str:
    """
    Variant 1: Circular Badge
    Circular fill + thin inner heritage ring + craft icon upper half + serif monogram lower half + shop wordmark beneath.
    """
    cat = craft_category(craft_type)
    pal = CRAFT_PALETTES[cat]
    mark = CRAFT_MARKS.get(cat, "leaf")

    badge_img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    d = ImageDraw.Draw(badge_img)
    cx, cy = size // 2, size // 2

    # Outer circle
    r = size * 0.46
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=pal["bg"])

    # Inner decorative accent ring
    r2 = r * 0.88
    ring_width = max(2, int(size * 0.008))
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], outline=pal["accent"], width=ring_width)

    # Icon mark in upper half
    draw_mark(d, mark, cx, cy - size * 0.11, size * 0.10, pal["accent"])

    # Monogram in lower half
    ini = initials_of(shop_name)
    f_ini = _get_font(int(size * 0.165), bold=True, serif=True)
    d.text((cx, cy + size * 0.10), ini, font=f_ini, fill=pal["accent"], anchor="mm")

    # Wordmark beneath
    canvas_h = int(size * 1.24)
    final_img = Image.new("RGBA", (size, canvas_h), (255, 255, 255, 255))
    final_img.paste(badge_img, (0, 0), badge_img)

    d2 = ImageDraw.Draw(final_img)
    name_up = shop_name.strip().upper()
    f_name = _get_font(int(size * 0.054), bold=True, serif=False)

    tw = d2.textlength(name_up, font=f_name)
    cur_size = int(size * 0.054)
    while tw > size * 0.90 and cur_size > 14:
        cur_size -= 2
        f_name = _get_font(cur_size, bold=True, serif=False)
        tw = d2.textlength(name_up, font=f_name)

    d2.text((cx, size * 1.09), name_up, font=f_name, fill=pal["bg"], anchor="mm")

    final_img.convert("RGB").save(out_path, format="PNG", quality=95)
    return out_path


def make_shield_logo(shop_name: str, craft_type: str, out_path: str, size: int = 600) -> str:
    """
    Variant 2: Shield / Crest
    Heritage guild shield outline + double border + icon mark + monogram + wordmark beneath.
    """
    cat = craft_category(craft_type)
    pal = CRAFT_PALETTES[cat]
    mark = CRAFT_MARKS.get(cat, "leaf")

    shield_img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    d = ImageDraw.Draw(shield_img)
    cx, cy = size // 2, size // 2

    # Shield polygon coordinates (curved crest look)
    top_w = size * 0.42
    mid_y = cy + size * 0.12
    bot_y = cy + size * 0.46
    shield_pts = [
        (cx - top_w, cy - size * 0.44),
        (cx + top_w, cy - size * 0.44),
        (cx + top_w, mid_y),
        (cx, bot_y),
        (cx - top_w, mid_y),
    ]
    d.polygon(shield_pts, fill=pal["bg"])

    # Inner shield outline
    inset = size * 0.04
    inner_pts = [
        (cx - top_w + inset, cy - size * 0.44 + inset),
        (cx + top_w - inset, cy - size * 0.44 + inset),
        (cx + top_w - inset, mid_y - inset * 0.6),
        (cx, bot_y - inset * 1.2),
        (cx - top_w + inset, mid_y - inset * 0.6),
    ]
    d.polygon(inner_pts, outline=pal["accent"], width=max(2, int(size * 0.008)))

    # Icon upper center
    draw_mark(d, mark, cx, cy - size * 0.12, size * 0.09, pal["accent"])

    # Monogram in middle
    ini = initials_of(shop_name)
    f_ini = _get_font(int(size * 0.155), bold=True, serif=True)
    d.text((cx, cy + size * 0.10), ini, font=f_ini, fill=pal["accent"], anchor="mm")

    # Wordmark beneath
    canvas_h = int(size * 1.24)
    final_img = Image.new("RGBA", (size, canvas_h), (255, 255, 255, 255))
    final_img.paste(shield_img, (0, 0), shield_img)

    d2 = ImageDraw.Draw(final_img)
    name_up = shop_name.strip().upper()
    f_name = _get_font(int(size * 0.054), bold=True, serif=False)

    tw = d2.textlength(name_up, font=f_name)
    cur_size = int(size * 0.054)
    while tw > size * 0.90 and cur_size > 14:
        cur_size -= 2
        f_name = _get_font(cur_size, bold=True, serif=False)
        tw = d2.textlength(name_up, font=f_name)

    d2.text((cx, size * 1.09), name_up, font=f_name, fill=pal["bg"], anchor="mm")

    final_img.convert("RGB").save(out_path, format="PNG", quality=95)
    return out_path


def make_wordmark_logo(shop_name: str, craft_type: str, out_path: str, size: int = 600) -> str:
    """
    Variant 3: Wordmark-Only / Typographic Seal
    Clean serif monogram inside a delicate geometric medallion, flanked by decorative divider rules,
    with the full shop name in a prominent serif wordmark and craft subtitle.
    """
    cat = craft_category(craft_type)
    pal = CRAFT_PALETTES[cat]

    canvas_h = int(size * 1.24)
    final_img = Image.new("RGBA", (size, canvas_h), (255, 255, 255, 255))
    d = ImageDraw.Draw(final_img)
    cx, cy = size // 2, int(size * 0.42)

    # Octagonal / circular seal
    seal_r = size * 0.28
    d.ellipse([cx - seal_r, cy - seal_r, cx + seal_r, cy + seal_r], outline=pal["bg"], width=int(size * 0.012))
    d.ellipse([cx - seal_r * 0.88, cy - seal_r * 0.88, cx + seal_r * 0.88, cy + seal_r * 0.88], outline=pal["bg"], width=max(1, int(size * 0.003)))

    # Large serif monogram
    ini = initials_of(shop_name)
    f_ini = _get_font(int(size * 0.22), bold=True, serif=True)
    d.text((cx, cy), ini, font=f_ini, fill=pal["bg"], anchor="mm")

    # Flourish divider lines flanking the seal
    line_y = cy
    d.line([(size * 0.06, line_y), (cx - seal_r - size * 0.04, line_y)], fill=pal["bg"], width=2)
    d.line([(cx + seal_r + size * 0.04, line_y), (size * 0.94, line_y)], fill=pal["bg"], width=2)

    # Small diamond accents on lines
    for diamond_x in [size * 0.06, size * 0.94]:
        d.polygon([
            (diamond_x, line_y - 4),
            (diamond_x + 4, line_y),
            (diamond_x, line_y + 4),
            (diamond_x - 4, line_y),
        ], fill=pal["bg"])

    # Full shop name in prominent elegant serif
    name_up = shop_name.strip().upper()
    f_name = _get_font(int(size * 0.062), bold=True, serif=True)
    tw = d.textlength(name_up, font=f_name)
    cur_size = int(size * 0.062)
    while tw > size * 0.90 and cur_size > 14:
        cur_size -= 2
        f_name = _get_font(cur_size, bold=True, serif=True)
        tw = d.textlength(name_up, font=f_name)

    name_y = int(size * 0.88)
    d.text((cx, name_y), name_up, font=f_name, fill=pal["bg"], anchor="mm")

    # Accent underline
    line_w = min(tw * 0.7, size * 0.5)
    d.line([(cx - line_w / 2, name_y + 22), (cx + line_w / 2, name_y + 22)], fill=pal["bg"], width=2)

    # Craft category subtitle
    craft_sub = (craft_type or "Handmade Craft").upper()
    f_sub = _get_font(int(size * 0.032), bold=False, serif=False)
    d.text((cx, name_y + 45), craft_sub, font=f_sub, fill=(120, 120, 120), anchor="mm")

    final_img.convert("RGB").save(out_path, format="PNG", quality=95)
    return out_path


def _get_base_url() -> str:
    """Returns accessible base URL for static images."""
    return f"http://{LAN_IP}:{PORT}"


def generate_shop_logo_variants(
    shop_name: str,
    craft_type: str,
    artisan_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates all 3 logo style variants for a shop and saves them as PNGs.
    Returns complete variant info with web-accessible URLs.
    """
    clean_name = shop_name.strip() if shop_name else "Artisan Shop"
    clean_craft = craft_type.strip() if craft_type else "Handicraft"

    # Deterministic hash for caching and consistent filenames
    slug = "".join(c for c in clean_name.lower() if c.isalnum())[:16] or "shop"
    seed = f"{clean_name}_{clean_craft}".lower()
    h = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:8]

    badge_filename = f"logo_{slug}_{h}_badge.png"
    shield_filename = f"logo_{slug}_{h}_shield.png"
    wordmark_filename = f"logo_{slug}_{h}_wordmark.png"

    badge_path = LOGOS_DIR / badge_filename
    shield_path = LOGOS_DIR / shield_filename
    wordmark_path = LOGOS_DIR / wordmark_filename

    # Generate if not exists or if requested
    try:
        make_badge_logo(clean_name, clean_craft, str(badge_path))
        make_shield_logo(clean_name, clean_craft, str(shield_path))
        make_wordmark_logo(clean_name, clean_craft, str(wordmark_path))
    except Exception as e:
        logger.error(f"Error generating logo variants for '{clean_name}': {e}", exc_info=True)
        raise

    base_url = _get_base_url()
    badge_url = f"{base_url}/uploads/logos/{badge_filename}"
    shield_url = f"{base_url}/uploads/logos/{shield_filename}"
    wordmark_url = f"{base_url}/uploads/logos/{wordmark_filename}"

    variants = [
        {
            "style": "badge",
            "label": "Classic Badge",
            "description": "Circular heritage badge with craft mark & monogram",
            "url": badge_url,
            "filename": badge_filename,
            "relative_url": f"/uploads/logos/{badge_filename}",
        },
        {
            "style": "shield",
            "label": "Heritage Shield",
            "description": "Traditional guild crest outline with craft symbol",
            "url": shield_url,
            "filename": shield_filename,
            "relative_url": f"/uploads/logos/{shield_filename}",
        },
        {
            "style": "wordmark",
            "label": "Artisan Wordmark",
            "description": "Refined typographic seal with serif lettering",
            "url": wordmark_url,
            "filename": wordmark_filename,
            "relative_url": f"/uploads/logos/{wordmark_filename}",
        },
    ]

    return {
        "success": True,
        "shop_name": clean_name,
        "craft_type": clean_craft,
        "category": craft_category(clean_craft),
        "default_logo_url": badge_url,
        "default_style": "badge",
        "variants": variants,
    }
