"""
GeM (Government e-Marketplace) Product Standardization & Catalog Export Service

Provides:
- Authentic Indian GST/GeM HSN Code taxonomies for Indian handicraft & handloom clusters
- GeM Category taxonomy mapping
- AI/Rule-based HSN & GeM category auto-suggestion
- GeM catalog compliance validator (Pehchan ID, GSTIN, HSN, Local Content, etc.)
- One-Click GeM Catalog Export in official GeM Bulk Upload CSV format
- One-Click GeM Catalog Export in GeM Product Ingestion JSON format
"""

import csv
import io
import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.db.database import get_db

logger = logging.getLogger("GeMService")

# ── GeM HSN Taxonomies for Artisans & Weavers ──────────────────────────────────
# Aligned with official CBIC GST HSN classifications and GeM handicraft categories
HSN_TAXONOMY = {
    "pottery & clay": {
        "hsn_code": "6912",
        "gem_category": "Decorative Pottery and Clay Artware",
        "gst_rate_pct": 12,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 0.8,
        "typical_dimensions": "20x15x15 cm",
        "sample_package": "1 Handcrafted Terracotta Piece with protective bubble wrap",
    },
    "pottery": {
        "hsn_code": "6912",
        "gem_category": "Decorative Pottery and Clay Artware",
        "gst_rate_pct": 12,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 0.8,
        "typical_dimensions": "20x15x15 cm",
        "sample_package": "1 Handcrafted Terracotta Piece with protective bubble wrap",
    },
    "terracotta": {
        "hsn_code": "6913",
        "gem_category": "Terracotta & Clay Statuettes and Artware",
        "gst_rate_pct": 12,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 1.2,
        "typical_dimensions": "25x15x15 cm",
        "sample_package": "1 Handcrafted Terracotta Art Piece with Artisan Certificate",
    },
    "handloom textile": {
        "hsn_code": "5208",
        "gem_category": "Handloom Fabrics and Traditional Apparels",
        "gst_rate_pct": 5,
        "default_cert": "Handloom Mark",
        "typical_weight_kg": 0.45,
        "typical_dimensions": "30x20x3 cm",
        "sample_package": "1 Handloom Weave with Handloom Mark Tag",
    },
    "handloom": {
        "hsn_code": "5208",
        "gem_category": "Handloom Fabrics and Traditional Apparels",
        "gst_rate_pct": 5,
        "default_cert": "Handloom Mark",
        "typical_weight_kg": 0.45,
        "typical_dimensions": "30x20x3 cm",
        "sample_package": "1 Handloom Weave with Handloom Mark Tag",
    },
    "weaving": {
        "hsn_code": "5208",
        "gem_category": "Handloom Fabrics and Traditional Apparels",
        "gst_rate_pct": 5,
        "default_cert": "Handloom Mark",
        "typical_weight_kg": 0.5,
        "typical_dimensions": "30x25x4 cm",
        "sample_package": "1 Hand-woven Textile Article with Craft Certificate",
    },
    "silk": {
        "hsn_code": "5007",
        "gem_category": "Pure Silk Sarees, Stoles and Handloom Fabrics",
        "gst_rate_pct": 5,
        "default_cert": "Silk Mark",
        "typical_weight_kg": 0.65,
        "typical_dimensions": "35x25x4 cm",
        "sample_package": "1 Pure Handloom Silk Saree with Silk Mark Hologram Tag",
    },
    "wood carving": {
        "hsn_code": "4420",
        "gem_category": "Handcrafted Wood Carvings and Decorative Articles",
        "gst_rate_pct": 12,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 1.1,
        "typical_dimensions": "25x20x15 cm",
        "sample_package": "1 Seasoned Wood Carving Piece with Natural Oil Finish",
    },
    "wood": {
        "hsn_code": "4420",
        "gem_category": "Handcrafted Wood Carvings and Decorative Articles",
        "gst_rate_pct": 12,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 1.0,
        "typical_dimensions": "25x20x15 cm",
        "sample_package": "1 Handcrafted Wood Art Piece",
    },
    "metalwork": {
        "hsn_code": "7419",
        "gem_category": "Brass, Bronze and Bell Metal Handicrafts",
        "gst_rate_pct": 18,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 1.5,
        "typical_dimensions": "20x20x20 cm",
        "sample_package": "1 Traditional Bell Metal/Brass Figurine with Lacquer Polish",
    },
    "brass": {
        "hsn_code": "7419",
        "gem_category": "Brass, Bronze and Bell Metal Handicrafts",
        "gst_rate_pct": 18,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 1.5,
        "typical_dimensions": "20x20x20 cm",
        "sample_package": "1 Handcrafted Brass Artifact with Care Guide",
    },
    "jewelry": {
        "hsn_code": "7117",
        "gem_category": "Handcrafted and Terracotta Fashion Jewellery",
        "gst_rate_pct": 3,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 0.15,
        "typical_dimensions": "12x10x4 cm",
        "sample_package": "1 Artisan Jewelry Set in Eco-friendly Pouch",
    },
    "jewellery": {
        "hsn_code": "7117",
        "gem_category": "Handcrafted and Terracotta Fashion Jewellery",
        "gst_rate_pct": 3,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 0.15,
        "typical_dimensions": "12x10x4 cm",
        "sample_package": "1 Artisan Jewelry Set in Eco-friendly Pouch",
    },
    "painting": {
        "hsn_code": "9701",
        "gem_category": "Handmade Paintings, Folk Art and Wall Murals",
        "gst_rate_pct": 12,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 0.9,
        "typical_dimensions": "45x35x3 cm",
        "sample_package": "1 Hand-painted Traditional Art Canvas in Protective Tube/Frame",
    },
    "embroidery": {
        "hsn_code": "5810",
        "gem_category": "Hand Embroidery and Applique Crafts",
        "gst_rate_pct": 5,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 0.35,
        "typical_dimensions": "25x20x3 cm",
        "sample_package": "1 Hand-embroidered Craft Article with Authentic Guild Seal",
    },
    "bamboo": {
        "hsn_code": "4602",
        "gem_category": "Cane, Bamboo and Natural Grass Basketry",
        "gst_rate_pct": 5,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 0.6,
        "typical_dimensions": "30x30x20 cm",
        "sample_package": "1 Hand-plaited Cane/Bamboo Craft with Moisture-Proof Packing",
    },
    "jute": {
        "hsn_code": "5310",
        "gem_category": "Jute & Natural Fiber Handicrafts",
        "gst_rate_pct": 5,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 0.4,
        "typical_dimensions": "35x25x5 cm",
        "sample_package": "1 Eco-friendly Handcrafted Jute Product",
    },
    "stone": {
        "hsn_code": "6802",
        "gem_category": "Worked Stone Carvings and Marble Inlay Crafts",
        "gst_rate_pct": 12,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 2.5,
        "typical_dimensions": "20x15x15 cm",
        "sample_package": "1 Hand-carved Stone Artifact with Shock-resistant Packing",
    },
    "leather": {
        "hsn_code": "4202",
        "gem_category": "Handcrafted Leather Footwear and Accessories",
        "gst_rate_pct": 12,
        "default_cert": "Pehchan Card",
        "typical_weight_kg": 0.7,
        "typical_dimensions": "32x18x12 cm",
        "sample_package": "1 Pair Handcrafted Leather Article with Cloth Dustbag",
    }
}

DEFAULT_GEM_INFO = {
    "hsn_code": "6912",
    "gem_category": "Handicrafts and Handlooms",
    "gst_rate_pct": 12,
    "default_cert": "Pehchan Card",
    "typical_weight_kg": 0.5,
    "typical_dimensions": "20x15x10 cm",
    "sample_package": "1 Handcrafted Artisan Product with Authenticity Certificate",
}


def suggest_gem_metadata(craft_type: Optional[str] = None, title: Optional[str] = None) -> Dict[str, Any]:
    """Suggest GeM HSN Code, GeM Category, and specs based on craft and title."""
    search_text = f"{craft_type or ''} {title or ''}".lower()

    for key, data in HSN_TAXONOMY.items():
        if key in search_text:
            return {
                "matched_key": key,
                "hsn_code": data["hsn_code"],
                "gem_category": data["gem_category"],
                "gst_rate_pct": data["gst_rate_pct"],
                "artisan_cert_type": data["default_cert"],
                "country_of_origin": "India",
                "local_content_pct": 100,
                "dimensions": data["typical_dimensions"],
                "weight_kg": data["typical_weight_kg"],
                "package_contents": data["sample_package"],
            }

    return {
        "matched_key": "default",
        "hsn_code": DEFAULT_GEM_INFO["hsn_code"],
        "gem_category": DEFAULT_GEM_INFO["gem_category"],
        "gst_rate_pct": DEFAULT_GEM_INFO["gst_rate_pct"],
        "artisan_cert_type": DEFAULT_GEM_INFO["default_cert"],
        "country_of_origin": "India",
        "local_content_pct": 100,
        "dimensions": DEFAULT_GEM_INFO["typical_dimensions"],
        "weight_kg": DEFAULT_GEM_INFO["typical_weight_kg"],
        "package_contents": DEFAULT_GEM_INFO["sample_package"],
    }


def evaluate_gem_compliance(product: Dict[str, Any], profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Evaluate product readiness for GeM (Government e-Marketplace) bulk listing.
    Returns compliance score (0-100), missing fields, and status.
    """
    profile = profile or {}

    hsn_code = str(product.get("hsn_code") or "").strip()
    pehchan_id = str(product.get("pehchan_id") or profile.get("pehchan_id") or "").strip()
    gstin = str(product.get("gstin") or profile.get("gstin") or "").strip()
    brand_oem = str(product.get("brand_oem") or profile.get("shop_name") or profile.get("name") or "Indian Artisan Guild").strip()
    country_of_origin = str(product.get("country_of_origin") or "India").strip()
    local_content = int(product.get("local_content_pct") or 100)
    dimensions = str(product.get("dimensions") or "").strip()
    weight_kg = float(product.get("weight_kg") or 0.0)
    package_contents = str(product.get("package_contents") or "").strip()
    title = str(product.get("title") or "").strip()
    price = str(product.get("price") or "").strip()
    image_url = str(product.get("image_url") or "").strip()

    missing = []
    points = 0
    total_points = 100

    # 1. Product Title (10 pts)
    if title and len(title) >= 4:
        points += 10
    else:
        missing.append("Product Title (min 4 characters)")

    # 2. HSN Code (20 pts)
    if hsn_code and re.match(r"^\d{4,8}$", hsn_code):
        points += 20
    else:
        missing.append("Valid 4 to 8-digit HSN Code")

    # 3. Pehchan ID or GSTIN (20 pts)
    if pehchan_id:
        points += 20
    elif gstin:
        points += 15
    else:
        missing.append("Ministry of Textiles Pehchan ID or GSTIN (for Artisan verification)")

    # 4. Make in India Local Content >= 50% (10 pts)
    if country_of_origin.lower() == "india" and local_content >= 50:
        points += 10
    else:
        missing.append("Make in India Local Content (>= 50%)")

    # 5. Dimensions & Packaging (15 pts)
    if dimensions:
        points += 10
    else:
        missing.append("Product Dimensions (e.g., 25x15x15 cm)")

    if package_contents:
        points += 5
    else:
        missing.append("Package Contents description")

    # 6. Weight (10 pts)
    if weight_kg > 0:
        points += 10
    else:
        missing.append("Product Weight in kg")

    # 7. Price & Product Image (15 pts)
    if price and price != "₹0":
        points += 8
    else:
        missing.append("Selling Price")

    if image_url:
        points += 7
    else:
        missing.append("Clear Product Image URL")

    readiness_score = min(100, max(0, points))
    is_gem_ready = readiness_score >= 75 and len([m for m in missing if "HSN" in m or "Pehchan" in m]) == 0

    if readiness_score >= 90:
        grade = "GeM Certified Ready ✅"
    elif readiness_score >= 70:
        grade = "GeM Compliant (Minor details recommended)"
    else:
        grade = "Needs GeM Mandatory Fields"

    return {
        "is_gem_ready": is_gem_ready,
        "readiness_score": readiness_score,
        "compliance_grade": grade,
        "missing_fields": missing,
        "effective_fields": {
            "hsn_code": hsn_code or "6912",
            "pehchan_id": pehchan_id or "Unset (Inheritable from Profile)",
            "gstin": gstin or "Exempted / URP",
            "brand_oem": brand_oem,
            "country_of_origin": country_of_origin,
            "local_content_pct": local_content,
            "dimensions": dimensions or "20x15x10 cm",
            "weight_kg": weight_kg or 0.5,
            "package_contents": package_contents or f"1 N {title}",
        }
    }


def get_products_for_gem(artisan_id: Optional[str] = None, product_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """Fetch enriched products with their artisan profile data for GeM export."""
    where_clauses = ["1=1"]
    params = []

    if artisan_id:
        where_clauses.append("p.artisan_id = ?")
        params.append(artisan_id)

    if product_ids:
        placeholders = ",".join(["?"] * len(product_ids))
        where_clauses.append(f"p.id IN ({placeholders})")
        params.extend(product_ids)

    where_sql = " AND ".join(where_clauses)
    query = f"""
    SELECT p.*,
           pr.name AS artisan_name,
           pr.shop_name AS artisan_shop,
           pr.phone AS artisan_phone,
           pr.location AS artisan_location,
           pr.pehchan_id AS profile_pehchan_id,
           pr.gstin AS profile_gstin
    FROM products p
    LEFT JOIN profiles pr ON p.artisan_id = pr.id
    WHERE {where_sql}
    ORDER BY p.created_at DESC
    """

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def export_gem_catalog_csv(artisan_id: Optional[str] = None, product_ids: Optional[List[str]] = None) -> str:
    """
    Generates a standardized GeM (Government e-Marketplace) Product Bulk Upload CSV.
    Formatted to meet GeM Seller Portal catalog ingestion requirements.
    """
    products = get_products_for_gem(artisan_id=artisan_id, product_ids=product_ids)

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Official GeM Standard Column Headers
    headers = [
        "Product Title",
        "GeM Category",
        "HSN Code",
        "Model / Item SKU",
        "Selling Price (INR)",
        "Brand / OEM Name",
        "Country of Origin",
        "Make In India Local Content (%)",
        "Pehchan ID",
        "GSTIN",
        "Artisan Certification Type",
        "GI Tag / Registration No",
        "Available Stock Quantity",
        "Product Dimensions (LxWxH cm)",
        "Weight (kg)",
        "Package Contents",
        "Primary Image URL",
        "Material / Craft Type",
        "Product Description (English)",
        "Regional Language Description",
        "GeM Readiness Status",
    ]
    writer.writerow(headers)

    for p in products:
        # Fallbacks for GeM fields
        suggested = suggest_gem_metadata(p.get("craft_type") or p.get("category"), p.get("title"))

        hsn = (p.get("hsn_code") or suggested["hsn_code"]).strip()
        gem_cat = (p.get("gem_category") or suggested["gem_category"]).strip()
        pehchan = (p.get("pehchan_id") or p.get("profile_pehchan_id") or "").strip()
        gstin = (p.get("gstin") or p.get("profile_gstin") or "URP").strip()
        cert_type = (p.get("artisan_cert_type") or suggested["artisan_cert_type"]).strip()
        gi_tag = (p.get("gi_tag_num") or "").strip()
        brand = (p.get("brand_oem") or p.get("artisan_shop") or p.get("artisan_name") or "Artisan Direct").strip()
        coo = (p.get("country_of_origin") or "India").strip()
        local_content = p.get("local_content_pct") if p.get("local_content_pct") is not None else 100
        dims = (p.get("dimensions") or suggested["dimensions"]).strip()
        weight = p.get("weight_kg") if p.get("weight_kg") is not None else suggested["weight_kg"]
        pkg = (p.get("package_contents") or suggested["package_contents"]).strip()

        # Clean price (digits only)
        raw_price = str(p.get("price") or "₹500")
        price_clean = "".join([c for c in raw_price if c.isdigit() or c == "."]) or "500"

        # Check compliance
        compliance = evaluate_gem_compliance(p, {
            "pehchan_id": pehchan,
            "gstin": gstin,
            "shop_name": brand,
        })
        gem_status = "READY" if compliance["is_gem_ready"] else f"PENDING ({compliance['readiness_score']}%)"

        regional_desc = (p.get("description_hi") or p.get("description_ta") or "").strip()

        row = [
            p.get("title") or "Artisan Craft",
            gem_cat,
            hsn,
            p.get("id"),
            price_clean,
            brand,
            coo,
            f"{local_content}%",
            pehchan or "Pending Verification",
            gstin,
            cert_type,
            gi_tag or "N/A",
            p.get("units") or 1,
            dims,
            f"{weight} kg",
            pkg,
            p.get("image_url") or "",
            p.get("craft_type") or p.get("category") or "Handicraft",
            p.get("description_en") or p.get("description") or "",
            regional_desc,
            gem_status,
        ]
        writer.writerow(row)

    return output.getvalue()


def export_gem_catalog_json(artisan_id: Optional[str] = None, product_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Generates a GeM Product API ingestion JSON schema payload.
    Conforms to GeM Direct API catalog specifications.
    """
    products = get_products_for_gem(artisan_id=artisan_id, product_ids=product_ids)

    catalog_items = []
    gem_ready_count = 0
    total_units = 0
    total_val = 0.0

    for p in products:
        suggested = suggest_gem_metadata(p.get("craft_type") or p.get("category"), p.get("title"))

        hsn = (p.get("hsn_code") or suggested["hsn_code"]).strip()
        gem_cat = (p.get("gem_category") or suggested["gem_category"]).strip()
        pehchan = (p.get("pehchan_id") or p.get("profile_pehchan_id") or "").strip()
        gstin = (p.get("gstin") or p.get("profile_gstin") or "URP").strip()
        cert_type = (p.get("artisan_cert_type") or suggested["artisan_cert_type"]).strip()
        gi_tag = (p.get("gi_tag_num") or "").strip()
        brand = (p.get("brand_oem") or p.get("artisan_shop") or p.get("artisan_name") or "Artisan Direct").strip()
        coo = (p.get("country_of_origin") or "India").strip()
        local_content = int(p.get("local_content_pct") or 100)
        dims = (p.get("dimensions") or suggested["dimensions"]).strip()
        weight = float(p.get("weight_kg") or suggested["weight_kg"])
        pkg = (p.get("package_contents") or suggested["package_contents"]).strip()

        raw_price = str(p.get("price") or "₹500")
        price_num = float("".join([c for c in raw_price if c.isdigit() or c == "."]) or 500.0)
        units = int(p.get("units") or 1)

        total_units += units
        total_val += (price_num * units)

        compliance = evaluate_gem_compliance(p, {
            "pehchan_id": pehchan,
            "gstin": gstin,
            "shop_name": brand,
        })
        if compliance["is_gem_ready"]:
            gem_ready_count += 1

        item = {
            "item_id": p.get("id"),
            "product_title": p.get("title"),
            "gem_category": gem_cat,
            "hsn_code": hsn,
            "selling_price_inr": price_num,
            "currency": "INR",
            "stock_quantity": units,
            "brand_oem": brand,
            "country_of_origin": coo,
            "make_in_india_compliance": {
                "is_class_1_local_supplier": local_content >= 50,
                "local_content_percentage": local_content,
                "declaration": f"Self-certified {local_content}% Indian artisan value addition under Public Procurement (Preference to Make in India) Order",
            },
            "artisan_credentials": {
                "pehchan_id": pehchan or None,
                "gstin": gstin,
                "certification_type": cert_type,
                "gi_registered": bool(gi_tag),
                "gi_registration_number": gi_tag or None,
            },
            "physical_specifications": {
                "dimensions_lxwxh_cm": dims,
                "weight_kg": weight,
                "package_contents": pkg,
            },
            "media": {
                "primary_image_url": p.get("image_url") or "",
            },
            "descriptions": {
                "en": p.get("description_en") or p.get("description") or "",
                "hi": p.get("description_hi") or "",
                "ta": p.get("description_ta") or "",
            },
            "gem_validation": compliance,
        }
        catalog_items.append(item)

    artisan_meta = {}
    if products:
        first = products[0]
        artisan_meta = {
            "artisan_id": artisan_id or first.get("artisan_id"),
            "name": first.get("artisan_name") or "Artisan",
            "shop_name": first.get("artisan_shop") or "Artisan Studio",
            "phone": first.get("artisan_phone") or "",
            "location": first.get("artisan_location") or "",
            "default_pehchan_id": first.get("profile_pehchan_id") or "",
            "default_gstin": first.get("profile_gstin") or "",
        }

    return {
        "gem_schema_version": "2.4-IN-ARTISAN",
        "platform": "Government e-Marketplace (GeM)",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "artisan": artisan_meta,
        "catalog_summary": {
            "total_products": len(catalog_items),
            "gem_ready_count": gem_ready_count,
            "total_stock_units": total_units,
            "total_inventory_value_inr": total_val,
        },
        "items": catalog_items,
    }
