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

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO products (
            id, artisan_id, title, description_en, description_hi, description_ta,
            category, craft_type, price, units, image_url, material_cost,
            marketplaces, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            product_id,
            data.get("artisan_id"),
            title,
            data.get("description_en") or "",
            data.get("description_hi") or "",
            data.get("description_ta") or "",
            category,
            craft_type,
            price,
            units,
            data.get("image_url") or "",
            material_cost,
            marketplaces,
            data.get("status") or "published",
            now_iso,
            now_iso
        ))

    saved = get_product_by_id(product_id)
    logger.info(f"[PRODUCT CREATED] ID: {product_id} | Title: {title} | Price: {price}")
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
    query = "SELECT * FROM products WHERE 1=1"
    params = []

    if artisan_id:
        query += " AND artisan_id = ?"
        params.append(artisan_id)

    if status:
        query += " AND status = ?"
        params.append(status)

    if category:
        query += " AND (LOWER(category) LIKE ? OR LOWER(craft_type) LIKE ?)"
        params.extend([f"%{category.lower()}%", f"%{category.lower()}%"])

    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(description_en) LIKE ? OR LOWER(category) LIKE ?)"
        params.extend([f"%{search.lower()}%", f"%{search.lower()}%", f"%{search.lower()}%"])

    count_query = query.replace("SELECT *", "SELECT COUNT(*) AS total_count")

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params_with_paging = list(params) + [limit, offset]


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
            products.append(p)

    return products, total


def get_product_by_id(product_id: str) -> Optional[Dict[str, Any]]:
    """Fetch single product by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        row = cursor.fetchone()
        if row:
            p = dict(row)
            try:
                p["marketplaces"] = json.loads(p.get("marketplaces") or "[]")
            except Exception:
                p["marketplaces"] = []
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
            updated_at = ?
        WHERE id = ?
        """, (
            title, price, desc_en, desc_hi, desc_ta, category, craft_type,
            units, status, image_url, material_cost, marketplaces_json, now_iso, product_id
        ))

    logger.info(f"[PRODUCT UPDATED] ID: {product_id} | Title: {title} | Price: {price}")
    return get_product_by_id(product_id)


def delete_product(product_id: str) -> bool:
    """Delete a product by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        deleted = cursor.rowcount > 0
    logger.info(f"[PRODUCT DELETED] ID: {product_id} | Deleted: {deleted}")
    return deleted
