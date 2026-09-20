"""
Product Service
Handles product creation, listing, updating, and deletion with SQLite persistence.
"""

import json
import time
import uuid
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone
from app.db.database import get_db

logger = logging.getLogger("ProductService")


def _format_price(price_val: Any) -> str:
    """Ensure price is formatted with ₹ prefix."""
    s = str(price_val).strip()
    if not s:
        return "₹500"
    if s.startswith("₹"):
        return s
    clean = "".join([c for c in s if c.isdigit() or c == "."])
    return f"₹{clean}" if clean else "₹500"


def create_product(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new product record."""
    product_id = f"prod-{int(time.time() * 1000)}-{uuid.uuid4().hex[:5]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    title = data.get("title", "").strip()
    price = _format_price(data.get("price", "₹500"))
    units = int(data.get("units") or 1)
    material_cost = float(data.get("material_cost") or 0.0)
    category = data.get("category") or "Handicraft"
    craft_type = data.get("craft_type") or category or "Handicraft"
    marketplaces = json.dumps(data.get("marketplaces") or [])

    image_url = (data.get("image_url") or "").strip()
    image_b64 = data.get("image_base64") or ""
    if image_b64 and not image_url.startswith("http"):
        try:
            from app.config import UPLOADS_DIR
            import base64
            clean_b64 = image_b64.split("base64,")[-1].strip()
            img_bytes = base64.b64decode(clean_b64)
            img_filename = f"prod_{product_id}.jpg"
            img_path = UPLOADS_DIR / img_filename
            with open(img_path, "wb") as f:
                f.write(img_bytes)
            image_url = f"/uploads/{img_filename}"
            logger.info(f"[PRODUCT IMAGE SAVED] Saved offline image to {image_url}")
        except Exception as e:
            logger.warning(f"Could not save offline base64 image for {product_id}: {e}")

    # GeM Field Defaults and Auto-Suggestions
    from app.services.gem_service import suggest_gem_metadata
    suggested = suggest_gem_metadata(craft_type or category, title)

    # Check profile for pehchan_id / gstin inheritance
    artisan_id = data.get("artisan_id")
    prof_pehchan = ""
    prof_gstin = ""
    prof_brand = ""
    if artisan_id:
        try:
            with get_db() as c:
                cur = c.cursor()
                cur.execute("SELECT pehchan_id, gstin, shop_name, name FROM profiles WHERE id = ? OR phone = ?", (artisan_id, artisan_id))
                prof_row = cur.fetchone()
                if prof_row:
                    prof_pehchan = prof_row["pehchan_id"] or ""
                    prof_gstin = prof_row["gstin"] or ""
                    prof_brand = prof_row["shop_name"] or prof_row["name"] or ""
        except Exception:
            pass

    hsn_code = (data.get("hsn_code") or suggested["hsn_code"]).strip()
    gstin = (data.get("gstin") or prof_gstin or "").strip()
    pehchan_id = (data.get("pehchan_id") or prof_pehchan or "").strip()
    artisan_cert_type = (data.get("artisan_cert_type") or suggested["artisan_cert_type"]).strip()
    gi_tag_num = (data.get("gi_tag_num") or "").strip()
    brand_oem = (data.get("brand_oem") or prof_brand or "").strip()
    gem_category = (data.get("gem_category") or suggested["gem_category"]).strip()
    country_of_origin = (data.get("country_of_origin") or "India").strip()
    local_content_pct = int(data.get("local_content_pct") if data.get("local_content_pct") is not None else 100)
    dimensions = (data.get("dimensions") or suggested["dimensions"]).strip()
    weight_kg = float(data.get("weight_kg") if data.get("weight_kg") is not None else suggested["weight_kg"])
    package_contents = (data.get("package_contents") or suggested["package_contents"]).strip()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO products (
            id, artisan_id, title, description_en, description_hi, description_ta,
            category, craft_type, price, units, image_url, material_cost,
            marketplaces, status,
            hsn_code, gstin, pehchan_id, artisan_cert_type, gi_tag_num,
            brand_oem, gem_category, country_of_origin, local_content_pct,
            dimensions, weight_kg, package_contents,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            product_id,
            artisan_id,
            title,
            data.get("description_en") or "",
            data.get("description_hi") or "",
            data.get("description_ta") or "",
            category,
            craft_type,
            price,
            units,
            image_url or "",
            material_cost,
            marketplaces,
            data.get("status") or "published",
            hsn_code,
            gstin,
            pehchan_id,
            artisan_cert_type,
            gi_tag_num,
            brand_oem,
            gem_category,
            country_of_origin,
            local_content_pct,
            dimensions,
            weight_kg,
            package_contents,
            now_iso,
            now_iso
        ))

    saved = get_product_by_id(product_id)
    logger.info(f"[PRODUCT CREATED] ID: {product_id} | Title: {title} | HSN: {hsn_code} | GeM: {gem_category}")
    return saved or {}



def get_products(
    artisan_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> Tuple[List[Dict[str, Any]], int]:
    """Get paginated products with optional artisan, status, category, and search filters."""
    base_where = " WHERE 1=1"
    params = []

    if artisan_id:
        base_where += " AND p.artisan_id = ?"
        params.append(artisan_id)

    if status:
        base_where += " AND p.status = ?"
        params.append(status)

    if category:
        base_where += " AND (LOWER(p.category) LIKE ? OR LOWER(p.craft_type) LIKE ?)"
        params.extend([f"%{category.lower()}%", f"%{category.lower()}%"])

    if search:
        base_where += " AND (LOWER(p.title) LIKE ? OR LOWER(p.description_en) LIKE ? OR LOWER(p.category) LIKE ?)"
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%", f"%{search.lower()}%"])

    count_query = f"SELECT COUNT(*) AS total_count FROM products p{base_where}"
    query = f"""
    SELECT p.*,
           COALESCE(NULLIF(pr.name, ''), 'Master Artisan') AS artisan_name,
           COALESCE(NULLIF(pr.phone, ''), '+91 98765 43210') AS artisan_phone,
           pr.avatar_url AS artisan_avatar,
           pr.craft_type AS artisan_craft,
           pr.pehchan_id AS profile_pehchan_id,
           pr.gstin AS profile_gstin
    FROM products p
    LEFT JOIN profiles pr ON p.artisan_id = pr.id
    {base_where}
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    """
    params_with_paging = list(params) + [limit, offset]

    from app.services.gem_service import evaluate_gem_compliance

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(count_query, params)
        total = cursor.fetchone()["total_count"]

        cursor.execute(query, params_with_paging)
        rows = cursor.fetchall()
        products = []
        for r in rows:
            p = dict(r)
            try:
                p["marketplaces"] = json.loads(p.get("marketplaces") or "[]")
            except Exception:
                p["marketplaces"] = []

            # Attach GeM compliance metadata
            p["gem_compliance"] = evaluate_gem_compliance(p, {
                "pehchan_id": p.get("profile_pehchan_id") or "",
                "gstin": p.get("profile_gstin") or "",
            })
            products.append(p)

    return products, total


def get_product_by_id(product_id: str) -> Optional[Dict[str, Any]]:
    """Fetch single product by ID."""
    query = """
    SELECT p.*,
           COALESCE(NULLIF(pr.name, ''), 'Master Artisan') AS artisan_name,
           COALESCE(NULLIF(pr.phone, ''), '+91 98765 43210') AS artisan_phone,
           pr.avatar_url AS artisan_avatar,
           pr.craft_type AS artisan_craft,
           pr.pehchan_id AS profile_pehchan_id,
           pr.gstin AS profile_gstin
    FROM products p
    LEFT JOIN profiles pr ON p.artisan_id = pr.id
    WHERE p.id = ?
    """
    from app.services.gem_service import evaluate_gem_compliance

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, (product_id,))
        row = cursor.fetchone()
        if row:
            p = dict(row)
            try:
                p["marketplaces"] = json.loads(p.get("marketplaces") or "[]")
            except Exception:
                p["marketplaces"] = []

            p["gem_compliance"] = evaluate_gem_compliance(p, {
                "pehchan_id": p.get("profile_pehchan_id") or "",
                "gstin": p.get("profile_gstin") or "",
            })
            return p
    return None


def update_product(product_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update product fields."""
    existing = get_product_by_id(product_id)
    if not existing:
        return None

    now_iso = datetime.now(timezone.utc).isoformat()
    title = updates.get("title") if updates.get("title") is not None else existing["title"]
    price = _format_price(updates["price"]) if "price" in updates and updates["price"] is not None else existing["price"]
    desc_en = updates.get("description_en") if updates.get("description_en") is not None else existing.get("description_en", "")
    desc_hi = updates.get("description_hi") if updates.get("description_hi") is not None else existing.get("description_hi", "")
    desc_ta = updates.get("description_ta") if updates.get("description_ta") is not None else existing.get("description_ta", "")
    category = updates.get("category") if updates.get("category") is not None else existing.get("category", "Handicraft")
    craft_type = updates.get("craft_type") if updates.get("craft_type") is not None else existing.get("craft_type", category)
    units = int(updates.get("units")) if updates.get("units") is not None else existing.get("units", 1)
    status = updates.get("status") if updates.get("status") is not None else existing.get("status", "published")
    image_url = updates.get("image_url") if updates.get("image_url") is not None else existing.get("image_url", "")
    material_cost = float(updates.get("material_cost")) if updates.get("material_cost") is not None else existing.get("material_cost", 0.0)

    # GeM fields
    hsn_code = updates.get("hsn_code") if updates.get("hsn_code") is not None else existing.get("hsn_code", "6912")
    gstin = updates.get("gstin") if updates.get("gstin") is not None else existing.get("gstin", "")
    pehchan_id = updates.get("pehchan_id") if updates.get("pehchan_id") is not None else existing.get("pehchan_id", "")
    artisan_cert_type = updates.get("artisan_cert_type") if updates.get("artisan_cert_type") is not None else existing.get("artisan_cert_type", "Pehchan Card")
    gi_tag_num = updates.get("gi_tag_num") if updates.get("gi_tag_num") is not None else existing.get("gi_tag_num", "")
    brand_oem = updates.get("brand_oem") if updates.get("brand_oem") is not None else existing.get("brand_oem", "")
    gem_category = updates.get("gem_category") if updates.get("gem_category") is not None else existing.get("gem_category", "Handicrafts and Handlooms")
    country_of_origin = updates.get("country_of_origin") if updates.get("country_of_origin") is not None else existing.get("country_of_origin", "India")
    local_content_pct = int(updates.get("local_content_pct")) if updates.get("local_content_pct") is not None else existing.get("local_content_pct", 100)
    dimensions = updates.get("dimensions") if updates.get("dimensions") is not None else existing.get("dimensions", "")
    weight_kg = float(updates.get("weight_kg")) if updates.get("weight_kg") is not None else existing.get("weight_kg", 0.5)
    package_contents = updates.get("package_contents") if updates.get("package_contents") is not None else existing.get("package_contents", "")

    marketplaces = existing.get("marketplaces", [])
    if "marketplaces" in updates and updates["marketplaces"] is not None:
        marketplaces = updates["marketplaces"]

    marketplaces_json = json.dumps(marketplaces)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE products SET
            title = ?,
            price = ?,
            description_en = ?,
            description_hi = ?,
            description_ta = ?,
            category = ?,
            craft_type = ?,
            units = ?,
            status = ?,
            image_url = ?,
            material_cost = ?,
            marketplaces = ?,
            hsn_code = ?,
            gstin = ?,
            pehchan_id = ?,
            artisan_cert_type = ?,
            gi_tag_num = ?,
            brand_oem = ?,
            gem_category = ?,
            country_of_origin = ?,
            local_content_pct = ?,
            dimensions = ?,
            weight_kg = ?,
            package_contents = ?,
            updated_at = ?
        WHERE id = ?
        """, (
            title, price, desc_en, desc_hi, desc_ta, category, craft_type,
            units, status, image_url, material_cost, marketplaces_json,
            hsn_code, gstin, pehchan_id, artisan_cert_type, gi_tag_num,
            brand_oem, gem_category, country_of_origin, local_content_pct,
            dimensions, weight_kg, package_contents,
            now_iso, product_id
        ))

    logger.info(f"[PRODUCT UPDATED] ID: {product_id} | Title: {title} | HSN: {hsn_code} | GeM: {gem_category}")
    return get_product_by_id(product_id)



def delete_product(product_id: str) -> bool:
    """Delete a product by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        deleted = cursor.rowcount > 0
    logger.info(f"[PRODUCT DELETED] ID: {product_id} | Deleted: {deleted}")
    return deleted
