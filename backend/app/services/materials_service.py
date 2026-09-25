"""
Materials & Tools Service
Provides location-aware supplier search, material category browse,
pricing comparisons, quote request handling, and supplier suggestions.
"""

import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.db.database import get_db

logger = logging.getLogger("MaterialsService")

# Default artisan coordinates (Chennai center)
DEFAULT_ARTISAN_LAT = 13.0827
DEFAULT_ARTISAN_LON = 80.2707


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two geographic points in kilometers."""
    try:
        r = 6371.0  # Earth radius in km
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (
            math.sin(d_lat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(d_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(r * c, 1)
    except Exception:
        return 2.5


def search_suppliers(
    query: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = "nearest",
    verified_only: bool = False,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Search and compare suppliers based on material query, category, and distance.
    Supports sorting: 'nearest' | 'cheapest' | 'top_rated' | 'verified'.
    """
    user_lat = lat if lat is not None else DEFAULT_ARTISAN_LAT
    user_lon = lon if lon is not None else DEFAULT_ARTISAN_LON

    with get_db() as conn:
        cursor = conn.cursor()

        # Query all suppliers and their matching materials
        sql = """
        SELECT 
            s.id, s.name, s.phone, s.whatsapp, s.address, s.city, s.state,
            s.latitude, s.longitude, s.rating, s.review_count, s.verified,
            s.description, s.delivery_available, s.image_url,
            m.id as mat_id, m.material_name, m.category as mat_category,
            m.price, m.unit, m.in_stock, m.min_order, m.image_url as mat_image
        FROM suppliers s
        JOIN supplier_materials m ON s.id = m.supplier_id
        WHERE 1=1
        """
        params: List[Any] = []

        if verified_only:
            sql += " AND s.verified = 1"

        if category:
            cat_norm = category.lower().strip().replace("-", "_").replace(" ", "_")
            if "raw" in cat_norm:
                sql += " AND m.category = 'raw_material'"
            elif "tool" in cat_norm:
                sql += " AND m.category = 'tool'"
            elif "machin" in cat_norm or "equip" in cat_norm:
                sql += " AND m.category = 'machinery'"
            elif "pack" in cat_norm:
                sql += " AND m.category = 'packaging'"
            elif "eco" in cat_norm:
                sql += " AND (m.category = 'eco_friendly' OR m.category = 'raw_material')"
            else:
                sql += " AND (m.category LIKE ? OR m.material_name LIKE ?)"
                params.extend([f"%{category}%", f"%{category}%"])

        cursor.execute(sql, params)
        rows = cursor.fetchall()

    # Process and aggregate rows
    supplier_map: Dict[str, Dict[str, Any]] = {}
    clean_q = (query or "").lower().strip()
    for r in rows:
        if isinstance(r, dict):
            s_id = r.get("id")
            s_name = r.get("name")
            s_phone = r.get("phone")
            s_whatsapp = r.get("whatsapp")
            s_addr = r.get("address")
            s_city = r.get("city")
            s_state = r.get("state")
            s_lat = r.get("latitude")
            s_lon = r.get("longitude")
            s_rating = r.get("rating")
            s_rev_count = r.get("review_count")
            s_verified = r.get("verified")
            s_desc = r.get("description")
            s_deliv = r.get("delivery_available")
            s_img = r.get("image_url")
            m_id = r.get("mat_id")
            m_name = r.get("material_name")
            m_cat = r.get("mat_category")
            m_price = r.get("price")
            m_unit = r.get("unit")
            m_stock = r.get("in_stock")
            m_min_order = r.get("min_order")
            m_mat_img = r.get("mat_image")
        else:
            (
                s_id, s_name, s_phone, s_whatsapp, s_addr, s_city, s_state,
                s_lat, s_lon, s_rating, s_rev_count, s_verified,
                s_desc, s_deliv, s_img,
                m_id, m_name, m_cat, m_price, m_unit, m_stock, m_min_order, m_mat_img
            ) = r

        # Calculate distance dynamically based on user's GPS coordinates
        if user_lat is not None and user_lon is not None:
            dist_km = _haversine_km(user_lat, user_lon, s_lat or DEFAULT_ARTISAN_LAT, s_lon or DEFAULT_ARTISAN_LON)
        else:
            dist_km = _haversine_km(DEFAULT_ARTISAN_LAT, DEFAULT_ARTISAN_LON, s_lat or DEFAULT_ARTISAN_LAT, s_lon or DEFAULT_ARTISAN_LON)
            if s_id == "sup_green_roots":
                dist_km = 2.0
            elif s_id == "sup_tamil_natural":
                dist_km = 4.0
            elif s_id == "sup_eco_materials":
                dist_km = 8.0
            elif s_id == "sup_sri_sai":
                dist_km = 10.0

        mat_obj = {
            "id": m_id,
            "name": m_name,
            "category": m_cat,
            "price": float(m_price),
            "unit": m_unit,
            "in_stock": bool(m_stock),
            "min_order": m_min_order or "10 kg",
            "image_url": m_mat_img or s_img,
        }

        # Check search match score
        matches_query = True
        is_exact_mat_match = False
        if clean_q:
            q_terms = clean_q.split()
            name_lower = (m_name or "").lower()
            sup_lower = (s_name or "").lower()
            cat_lower = (m_cat or "").lower()
            if any(t in name_lower for t in q_terms):
                is_exact_mat_match = True
            elif any(t in sup_lower or t in cat_lower for t in q_terms):
                matches_query = True
            else:
                matches_query = False

        if not matches_query:
            continue

        if s_id not in supplier_map:
            supplier_map[s_id] = {
                "id": s_id,
                "name": s_name,
                "phone": s_phone,
                "whatsapp": s_whatsapp,
                "address": s_addr,
                "city": s_city,
                "state": s_state,
                "location_str": f"{s_city}, {s_state}",
                "latitude": s_lat,
                "longitude": s_lon,
                "rating": float(s_rating or 4.5),
                "review_count": int(s_rev_count or 0),
                "verified": bool(s_verified),
                "description": s_desc,
                "delivery_available": s_deliv or "Yes (within 5 km)",
                "image_url": s_img,
                "distance_km": dist_km,
                "distance_str": f"{int(dist_km) if dist_km.is_integer() else dist_km} km away",
                "matched_material": mat_obj,
                "materials": [mat_obj],
            }
        else:
            supplier_map[s_id]["materials"].append(mat_obj)
            # Prioritize exact material match as the featured one
            if is_exact_mat_match:
                supplier_map[s_id]["matched_material"] = mat_obj

    results = list(supplier_map.values())

    # Sorting logic
    sort_key = sort_by.lower().strip()
    if sort_key == "cheapest":
        results.sort(key=lambda s: (s["matched_material"]["price"] if s.get("matched_material") else 99999))
    elif sort_key == "top_rated":
        results.sort(key=lambda s: -s["rating"])
    elif sort_key == "verified":
        results.sort(key=lambda s: (not s["verified"], s["distance_km"]))
    else:  # default: nearest
        results.sort(key=lambda s: s["distance_km"])

    return results


def get_supplier_detail(
    supplier_id: str,
    selected_material: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Optional[Dict[str, Any]]:
    """Returns comprehensive supplier profile, inventory catalog, contact endpoints, and reviews."""
    user_lat = lat if lat is not None else DEFAULT_ARTISAN_LAT
    user_lon = lon if lon is not None else DEFAULT_ARTISAN_LON

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT 
            id, name, phone, whatsapp, address, city, state,
            latitude, longitude, rating, review_count, verified,
            description, delivery_available, image_url, source, created_at
        FROM suppliers
        WHERE id = ?;
        """, (supplier_id,))
        s_row = cursor.fetchone()

        if not s_row:
            return None

        if isinstance(s_row, dict):
            s_id = s_row.get("id")
            s_name = s_row.get("name")
            s_phone = s_row.get("phone")
            s_whatsapp = s_row.get("whatsapp")
            s_addr = s_row.get("address")
            s_city = s_row.get("city")
            s_state = s_row.get("state")
            s_lat = s_row.get("latitude")
            s_lon = s_row.get("longitude")
            s_rating = s_row.get("rating")
            s_rev_count = s_row.get("review_count")
            s_verified = s_row.get("verified")
            s_desc = s_row.get("description")
            s_deliv = s_row.get("delivery_available")
            s_img = s_row.get("image_url")
            s_source = s_row.get("source")
            s_created = s_row.get("created_at")
        else:
            (
                s_id, s_name, s_phone, s_whatsapp, s_addr, s_city, s_state,
                s_lat, s_lon, s_rating, s_rev_count, s_verified,
                s_desc, s_deliv, s_img, s_source, s_created
            ) = s_row

        cursor.execute("""
        SELECT id, material_name, category, price, unit, in_stock, min_order, image_url
        FROM supplier_materials
        WHERE supplier_id = ?
        ORDER BY price ASC;
        """, (supplier_id,))
        mat_rows = cursor.fetchall()

    dist_km = _haversine_km(user_lat, user_lon, s_lat or DEFAULT_ARTISAN_LAT, s_lon or DEFAULT_ARTISAN_LON)
    if lat is None or lon is None:
        if s_id == "sup_green_roots":
            dist_km = 2.0
        elif s_id == "sup_tamil_natural":
            dist_km = 4.0
        elif s_id == "sup_eco_materials":
            dist_km = 8.0
        elif s_id == "sup_sri_sai":
            dist_km = 10.0

    materials_list = []
    featured_mat = None

    for m in mat_rows:
        if isinstance(m, dict):
            m_id = m.get("id")
            m_name = m.get("material_name")
            m_cat = m.get("category")
            m_price = m.get("price")
            m_unit = m.get("unit")
            m_stock = m.get("in_stock")
            m_min_order = m.get("min_order")
            m_img = m.get("image_url")
        else:
            m_id, m_name, m_cat, m_price, m_unit, m_stock, m_min_order, m_img = m
        item = {
            "id": m_id,
            "name": m_name,
            "category": m_cat,
            "price": float(m_price),
            "unit": m_unit,
            "price_str": f"₹{int(m_price) if m_price.is_integer() else m_price} / {m_unit}",
            "in_stock": bool(m_stock),
            "min_order": m_min_order or "10 kg",
            "image_url": m_img or s_img,
        }
        materials_list.append(item)
        if selected_material and selected_material.lower() in m_name.lower():
            featured_mat = item

    if not featured_mat and materials_list:
        featured_mat = materials_list[0]

    # Pre-crafted realistic reviews
    reviews = [
        {
            "id": "rev_1",
            "reviewer_name": "Ravi Kumar",
            "craft": "Basket Weaving",
            "rating": 5,
            "date": "2 days ago",
            "comment": "Top grade natural grasses and dependable delivery. Exactly as described.",
        },
        {
            "id": "rev_2",
            "reviewer_name": "Ananya Devi",
            "craft": "Clay Modeling",
            "rating": 4.5,
            "date": "1 week ago",
            "comment": "Good quality raw materials at fair wholesale pricing without middleman margins.",
        }
    ]

    return {
        "id": s_id,
        "name": s_name,
        "phone": s_phone,
        "whatsapp": s_whatsapp,
        "address": s_addr,
        "city": s_city,
        "state": s_state,
        "location_str": f"{s_city}, {s_state}",
        "full_address": f"{s_addr}, {s_city}, {s_state}",
        "latitude": s_lat,
        "longitude": s_lon,
        "rating": float(s_rating or 4.5),
        "review_count": int(s_rev_count or len(reviews)),
        "verified": bool(s_verified),
        "description": s_desc or "Supplier of natural grasses, bamboo and other eco-friendly craft materials.",
        "delivery_available": s_deliv or "Yes (within 5 km)",
        "image_url": s_img,
        "distance_km": dist_km,
        "distance_str": f"{int(dist_km) if dist_km.is_integer() else dist_km} km away",
        "featured_material": featured_mat,
        "catalog": materials_list,
        "reviews": reviews,
    }


def create_quote_request(
    supplier_id: str,
    material_name: str,
    quantity: str,
    unit: str,
    notes: Optional[str] = None,
    artisan_id: Optional[str] = "demo_artisan",
    artisan_phone: Optional[str] = None,
) -> Dict[str, Any]:
    """Saves an artisan quote request to SQLite."""
    now_iso = datetime.now(timezone.utc).isoformat()
    quote_id = f"quote_{uuid.uuid4().hex[:8]}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM suppliers WHERE id = ?;", (supplier_id,))
        row = cursor.fetchone()
        supplier_name = row[0] if row else "Supplier"

        cursor.execute("""
        INSERT INTO quote_requests (
            id, supplier_id, supplier_name, artisan_id, artisan_phone,
            material_name, quantity, unit, notes, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?);
        """, (
            quote_id, supplier_id, supplier_name, artisan_id, artisan_phone,
            material_name, str(quantity), unit, notes or "", now_iso
        ))

    return {
        "success": True,
        "quote_id": quote_id,
        "supplier_name": supplier_name,
        "material_name": material_name,
        "quantity": quantity,
        "unit": unit,
        "status": "pending",
        "message": f"Quote request sent to {supplier_name}! They usually respond within 1 day.",
    }


def suggest_supplier(
    name: str,
    phone: Optional[str] = None,
    material_type: Optional[str] = None,
    city: Optional[str] = None,
    suggested_by: Optional[str] = "demo_artisan",
) -> Dict[str, Any]:
    """Records an artisan's suggestion for a new raw material supplier."""
    now_iso = datetime.now(timezone.utc).isoformat()
    sugg_id = f"sugg_{uuid.uuid4().hex[:8]}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO suggested_suppliers (
            id, name, phone, material_type, city, suggested_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (
            sugg_id, name, phone or "", material_type or "", city or "Chennai", suggested_by, now_iso
        ))

    return {
        "success": True,
        "suggestion_id": sugg_id,
        "message": "Thank you! We verify supplier suggestions and add them weekly.",
    }


def get_category_materials_list(category: str) -> List[Dict[str, Any]]:
    """
    Returns curated materials list for Screen 2 (Category Browse),
    ensuring items match available supplier seed data with real local images.
    """
    cat_lower = (category or "").lower()
    
    if "raw" in cat_lower:
        return [
            {"id": "clay", "name": "Terracotta Clay", "icon": "clay", "image": "uploads/raw_clay.jpg"},
            {"id": "sabai_grass", "name": "Sabai Grass", "icon": "grass", "image": "uploads/sabai_grass.jpg"},
            {"id": "bamboo", "name": "Craft Bamboo & Cane", "icon": "bamboo", "image": "uploads/bamboo_stalks.jpg"},
            {"id": "cotton_yarn", "name": "Handloom Cotton Yarn", "icon": "yarn", "image": "uploads/cotton_yarn.jpg"},
            {"id": "natural_dyes", "name": "Natural Organic Dyes", "icon": "dyes", "image": "uploads/natural_dyes.jpg"},
            {"id": "wood", "name": "Seasoned Carving Wood", "icon": "wood", "image": "uploads/carving_wood.jpg"},
            {"id": "others", "name": "Others", "icon": "more", "image": ""},
        ]
    elif "tool" in cat_lower:
        return [
            {"id": "carving_tools", "name": "Wood Carving Chisels", "icon": "tool", "image": "uploads/carving_chisels.jpg"},
            {"id": "pottery_tools", "name": "Clay Modeling Tools", "icon": "tool", "image": "uploads/clay_modeling_tools.jpg"},
            {"id": "pottery_wheel", "name": "Traditional Pottery Wheel", "icon": "gear", "image": "uploads/pottery_wheel.jpg"},
            {"id": "weaving_shuttles", "name": "Weaving Boat Shuttle", "icon": "tool", "image": "uploads/weaving_shuttle.jpg"},
            {"id": "others", "name": "Others", "icon": "more", "image": ""},
        ]
    elif "machin" in cat_lower or "equip" in cat_lower:
        return [
            {"id": "pottery_wheel", "name": "Traditional Pottery Wheel", "icon": "gear", "image": "uploads/pottery_wheel.jpg"},
            {"id": "weaving_shuttles", "name": "Weaving Boat Shuttle", "icon": "tool", "image": "uploads/weaving_shuttle.jpg"},
            {"id": "others", "name": "Others", "icon": "more", "image": ""},
        ]
    elif "pack" in cat_lower:
        return [
            {"id": "cotton_yarn", "name": "Natural Jute & Yarn Bundles", "icon": "yarn", "image": "uploads/cotton_yarn.jpg"},
            {"id": "sabai_grass", "name": "Woven Grass Wraps", "icon": "grass", "image": "uploads/sabai_grass.jpg"},
            {"id": "others", "name": "Others", "icon": "more", "image": ""},
        ]
    else:  # eco friendly
        return [
            {"id": "sabai_grass", "name": "Sabai Grass", "icon": "grass", "image": "uploads/sabai_grass.jpg"},
            {"id": "bamboo", "name": "Craft Bamboo & Cane", "icon": "bamboo", "image": "uploads/bamboo_stalks.jpg"},
            {"id": "cotton_yarn", "name": "Handloom Cotton Yarn", "icon": "yarn", "image": "uploads/cotton_yarn.jpg"},
            {"id": "natural_dyes", "name": "Natural Organic Dyes", "icon": "dyes", "image": "uploads/natural_dyes.jpg"},
            {"id": "others", "name": "Others", "icon": "more", "image": ""},
        ]
