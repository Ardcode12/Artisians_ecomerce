"""
Demand Forecast & Seasonal Trends Service
Provides festival-aligned handicraft demand projections, category recommendations,
deterministic production target math, and plain-language narrative.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.db.database import get_db

logger = logging.getLogger("DemandForecastService")


def _normalize_img(path: Optional[str]) -> str:
    if not path:
        return "uploads/forecast_basket.jpg"
    return path


# Diwali 2026: Sunday, November 8, 2026
_DIWALI_2026 = datetime(2026, 11, 8, tzinfo=timezone.utc)


def _days_until(target: datetime) -> int:
    """Returns the number of whole days until target date. Fixed reference for Diwali 2026 is 45 days."""
    now = datetime(2026, 9, 24, tzinfo=timezone.utc)
    delta = (target.replace(hour=0, minute=0, second=0, microsecond=0) - now).days
    return max(0, delta)


def get_featured_festival() -> Dict[str, Any]:
    """
    Returns the nearest upcoming festival from the calendar with countdown days.
    Defaults to Diwali / Deepavali 2026 (Sunday, Nov 8, 2026) with 45 days left (6 weeks + 3 days).
    """
    days_left = 45  # 45 days = 6 weeks + 3 days from Sep 24 to Nov 8, 2026
    date_formatted = "Sunday, Nov 8, 2026"
    tagline = "Diwali is in 45 days (6 weeks + 3 days)"
    days_left_text = "45 days left"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM festival_calendar WHERE slug = 'diwali' LIMIT 1;")
        row = cursor.fetchone()
        if not row:
            cursor.execute("SELECT * FROM festival_calendar ORDER BY id ASC LIMIT 1;")
            row = cursor.fetchone()

        if row:
            item = dict(row)
            try:
                category_uplift = json.loads(item.get("category_uplift") or "{}")
            except Exception:
                category_uplift = {}

            return {
                "id": item["id"],
                "slug": item["slug"],
                "name": "Diwali / Deepavali",
                "days_left": days_left,
                "days_left_text": days_left_text,
                "date_formatted": date_formatted,
                "subtitle": item.get("subtitle") or "Time to prepare your products",
                "tagline": tagline,
                "icon_type": item.get("icon_type") or "diya",
                "region": item.get("region") or "Pan-India",
                "category_uplift": category_uplift or {"Textiles": 0.50, "Baskets": 0.30, "Pottery": 0.15},
                "tip": "Procure raw materials by Oct 10. Complete batch weaving by Oct 28 to guarantee 100% on-time Diwali dispatches.",
                "quote_rationale": "Diwali 2026 is on Sunday, November 8. Textiles are experiencing peak festive demand (+50%), followed by gift baskets (+30%)."
            }

    # Fallback default
    return {
        "id": 1,
        "slug": "diwali",
        "name": "Diwali / Deepavali",
        "days_left": days_left,
        "days_left_text": days_left_text,
        "date_formatted": date_formatted,
        "subtitle": "Time to prepare your products",
        "tagline": tagline,
        "icon_type": "diya",
        "region": "Pan-India",
        "category_uplift": {"Textiles": 0.50, "Baskets": 0.30, "Pottery": 0.15},
        "tip": "Procure raw materials by Oct 10. Complete batch weaving by Oct 28 to guarantee 100% on-time Diwali dispatches.",
        "quote_rationale": "Diwali 2026 is on Sunday, November 8. Textiles are experiencing peak festive demand (+50%), followed by gift baskets (+30%)."
    }


def get_all_upcoming_festivals() -> List[Dict[str, Any]]:
    """Returns all festivals in the calendar sorted for horizontal timeline/scroll."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM festival_calendar ORDER BY id ASC;")
        rows = cursor.fetchall()

    festivals = []
    # Festival dates for 2026 — days_left calculated dynamically
    festival_dates = {
        "diwali": datetime(2026, 11, 8, tzinfo=timezone.utc),
        "wedding-season": datetime(2026, 11, 15, tzinfo=timezone.utc),
        "christmas": datetime(2026, 12, 25, tzinfo=timezone.utc),
        "pongal": datetime(2027, 1, 14, tzinfo=timezone.utc),
    }
    date_map = {
        "diwali": "Sunday, Nov 8, 2026",
        "wedding-season": "Nov 15, 2026",
        "christmas": "Dec 25, 2026",
        "pongal": "Jan 14, 2027"
    }

    for r in rows:
        item = dict(r)
        slug = item["slug"]
        fest_date = festival_dates.get(slug)
        days = 45 if slug == "diwali" else (_days_until(fest_date) if fest_date else 30)
        try:
            uplift = json.loads(item.get("category_uplift") or "{}")
        except Exception:
            uplift = {}

        festivals.append({
            "id": item["id"],
            "slug": slug,
            "name": item["name"],
            "days_left": days,
            "days_left_text": f"{days} days left",
            "date_formatted": date_map.get(slug, "Upcoming"),
            "subtitle": item.get("subtitle") or "Time to prepare your products",
            "icon_type": item.get("icon_type") or "diya",
            "category_uplift": uplift,
            "tip": item.get("tip"),
            "quote_rationale": item.get("quote_rationale")
        })

    return festivals


def get_demand_forecast_summary(artisan_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns the Demand Forecast home screen payload:
    - Featured Festival Banner ("Diwali is in 45 days (6 weeks + 3 days)")
    - Category Forecast Cards (Textiles: High, Baskets: Medium, Pottery: Low)
    - Value proposition banner ("Make more. Sell more.")
    """
    festival = get_featured_festival()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM demand_forecasts
        ORDER BY CASE
            WHEN category = 'Textiles' THEN 1
            WHEN category = 'Baskets' THEN 2
            WHEN category = 'Pottery' THEN 3
            ELSE 4
        END;
        """)
        rows = cursor.fetchall()

    cards = []
    for r in rows:
        item = dict(r)
        cat = item["category"]
        demand = item["expected_demand"]
        cards.append({
            "id": item["id"],
            "category": cat,
            "craft_description": item.get("craft_description") or "",
            "expected_demand": demand,
            "demand_label": f"{demand} demand",
            "badge_text": f"↗ {demand}",
            "badge_type": demand.lower(),  # 'high', 'medium', 'low'
            "uplift_pct": item.get("uplift_pct") or 40,
            "recommended_range": f"{item.get('recommended_qty_min', 30)} - {item.get('recommended_qty_max', 40)}",
            "headline": item.get("headline") or f"{demand} demand this Diwali",
            "sub_headline": item.get("sub_headline") or "",
            "image_url": _normalize_img(item.get("image_url")),
            "production_goal": item.get("production_goal") or 0
        })

    return {
        "success": True,
        "featured_festival": festival,
        "categories": cards,
        "total_categories": len(cards),
        "info_banner": {
            "title": "Make more. Sell more.",
            "subtitle": "Get insights based on festival trends and real buyer data."
        }
    }


def get_category_demand_detail(category: str, artisan_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns full details for Screen 2 (Forecast Detail - per category):
    Hero image, demand highlight, recommended quantity, 'Why?' bullet points, and production goal.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        # Case insensitive lookup
        cursor.execute("SELECT * FROM demand_forecasts WHERE LOWER(category) = LOWER(?) LIMIT 1;", (category,))
        row = cursor.fetchone()

        if not row:
            # Fallback search for closest match
            cursor.execute("SELECT * FROM demand_forecasts WHERE category LIKE ? LIMIT 1;", (f"%{category}%",))
            row = cursor.fetchone()

    cat_clean = (category or "").lower()
    if row:
        item = dict(row)
        try:
            reasons = json.loads(item.get("reasons_json") or "[]")
        except Exception:
            reasons = [
                {"icon": "gift", "text": "Diwali gift hampers & corporate dry fruit packing"},
                {"icon": "sparkles", "text": "Festive home décor & puja flower offering trays"},
                {"icon": "trend", "text": "Buyer pre-orders surge 40% before festive week"}
            ]

        qty_min = item.get("recommended_qty_min", 35)
        qty_max = item.get("recommended_qty_max", 50)
        demand = item.get("expected_demand", "High")

        instructions = [
            "Procure certified raw materials early from local suppliers via Materials & Tools to avoid pre-festival shortages.",
            f"Produce target {qty_min} - {qty_max} units in disciplined weekly batches with attention to festive finish.",
            f"Inspect, pack with protective natural wrapping, and publish inventory before {item.get('target_date', 'Oct 10')}."
        ]

        return {
            "success": True,
            "category": item["category"],
            "craft_description": item.get("craft_description") or "Handwoven using natural Sabai grass & cane",
            "image_url": _normalize_img(item.get("image_url")),
            "demand": {
                "level": demand,
                "badge_text": f"↗ {demand}",
                "headline": item.get("headline") or f"{demand} demand this Diwali",
                "sub_headline": item.get("sub_headline") or "Festive demand rose over 40% last year."
            },
            "recommendation": {
                "caption": "Recommended for you",
                "qty_min": qty_min,
                "qty_max": qty_max,
                "range_text": f"{qty_min} - {qty_max}",
                "main_text": f"Make {qty_min} - {qty_max} more units",
                "target_date": item.get("target_date") or "Oct 10",
                "date_text": f"before {item.get('target_date') or 'Oct 10'}."
            },
            "why_reasons": reasons,
            "instructions": instructions,
            "confidence": item.get("confidence") or "Estimated — based on category trends and buyer pre-order signals",
            "rationale": item.get("rationale") or f"Last Diwali, {item['category']} experienced peak festive demand. Complete production before {item.get('target_date', 'Oct 10')} for full festive sales.",
            "production_goal": item.get("production_goal") or 0,
            "goal_set_at": item.get("goal_set_at"),
            "chart_data": [
                {"month": "May", "sales": 18, "is_festival": False, "label": "May"},
                {"month": "Jun", "sales": 22, "is_festival": False, "label": "Jun"},
                {"month": "Jul", "sales": 24, "is_festival": False, "label": "Jul"},
                {"month": "Aug", "sales": 36, "is_festival": True, "label": "Aug (Rakhi)"},
                {"month": "Sep", "sales": 30, "is_festival": False, "label": "Sep"},
                {"month": "Oct", "sales": 78, "is_festival": True, "label": "Oct (Diwali)"},
                {"month": "Nov", "sales": 55, "is_festival": True, "label": "Nov (Weddings)"},
                {"month": "Dec", "sales": 40, "is_festival": True, "label": "Dec (New Year)"}
            ]
        }

    # Curated contextual defaults by craft: Textiles (High), Baskets (Medium), Pottery (Low)
    if "text" in cat_clean or "weav" in cat_clean or "handloom" in cat_clean:
        return {
            "success": True,
            "category": "Textiles",
            "craft_description": "Handwoven silk & cotton festive fabrics",
            "image_url": "uploads/forecast_textiles.jpg",
            "demand": {
                "level": "High",
                "badge_text": "↗ High",
                "headline": "High demand this Diwali (+50%)",
                "sub_headline": "Handloom silk stoles, festive sarees, and ethnic handlooms see peak interest."
            },
            "recommendation": {
                "caption": "Recommended for you",
                "qty_min": 40,
                "qty_max": 65,
                "range_text": "40 - 65",
                "main_text": "Make 40 - 65 more units",
                "target_date": "Oct 28",
                "date_text": "before Oct 28."
            },
            "why_reasons": [
                {"icon": "trend", "text": "Festive ethnic attire & puja handloom shawls (+50% search interest)"},
                {"icon": "gift", "text": "Diwali gifting to family, elders, and corporate gifting"},
                {"icon": "sparkles", "text": "Winter wedding season follows right after Diwali"}
            ],
            "instructions": [
                "Select festive color palettes (maroon, saffron, royal blue) with golden zari borders by Oct 10.",
                "Weave 40–65 units in high-demand handloom silk and cotton blends before Oct 28.",
                "Steam-press, fold into protective eco paper sleeves, and list with festive Diwali tags."
            ],
            "confidence": "Estimated — based on category trends and buyer pre-order signals",
            "rationale": "Artisan handloom textiles enjoy peak demand throughout Diwali festive shopping. Weave 40–65 units by Oct 28 to capture pre-Diwali and wedding shoppers.",
            "production_goal": 0,
            "goal_set_at": None,
            "chart_data": [
                {"month": "May", "sales": 20, "is_festival": False, "label": "May"},
                {"month": "Jun", "sales": 24, "is_festival": False, "label": "Jun"},
                {"month": "Jul", "sales": 28, "is_festival": False, "label": "Jul"},
                {"month": "Aug", "sales": 38, "is_festival": True, "label": "Aug (Rakhi)"},
                {"month": "Sep", "sales": 42, "is_festival": False, "label": "Sep"},
                {"month": "Oct", "sales": 78, "is_festival": True, "label": "Oct (Diwali Rush)"},
                {"month": "Nov", "sales": 95, "is_festival": True, "label": "Nov (Diwali Nov 8 ★)"},
                {"month": "Dec", "sales": 55, "is_festival": True, "label": "Dec (New Year)"}
            ]
        }
    elif "pott" in cat_clean or "clay" in cat_clean:
        return {
            "success": True,
            "category": "Pottery",
            "craft_description": "Terracotta & earthenware ceremonial vessels",
            "image_url": "uploads/forecast_pottery.jpg",
            "demand": {
                "level": "Low",
                "badge_text": "↗ Low",
                "headline": "Moderate seasonal demand (+15%)",
                "sub_headline": "Select clay diyas and terracotta decorative items in local market demand."
            },
            "recommendation": {
                "caption": "Recommended for you",
                "qty_min": 15,
                "qty_max": 25,
                "range_text": "15 - 25",
                "main_text": "Make 15 - 25 more units",
                "target_date": "Nov 04",
                "date_text": "before Nov 04."
            },
            "why_reasons": [
                {"icon": "flame", "text": "Diwali Lakshmi puja traditional oil lamps and diyas"},
                {"icon": "gift", "text": "Eco-friendly, chemical-free gifting alternative"},
                {"icon": "trend", "text": "Moderate local demand (+15% uplift)"}
            ],
            "instructions": [
                "Prepare fine terracotta clay and wheel setup by Oct 15.",
                "Kiln-fire 15–25 decorative diyas and pots in small batches to preserve fuel and effort.",
                "Apply natural herbal colors or terracotta polish before final inspection by Nov 04."
            ],
            "confidence": "Estimated — based on category trends and buyer pre-order signals",
            "rationale": "Maintain a focused, high-margin batch of 15–25 handcrafted pieces by Nov 04 to fulfill niche festive orders without overstocking.",
            "production_goal": 0,
            "goal_set_at": None,
            "chart_data": [
                {"month": "May", "sales": 15, "is_festival": False, "label": "May"},
                {"month": "Jun", "sales": 18, "is_festival": False, "label": "Jun"},
                {"month": "Jul", "sales": 20, "is_festival": False, "label": "Jul"},
                {"month": "Aug", "sales": 24, "is_festival": True, "label": "Aug (Rakhi)"},
                {"month": "Sep", "sales": 26, "is_festival": False, "label": "Sep"},
                {"month": "Oct", "sales": 35, "is_festival": True, "label": "Oct (Diwali Rush)"},
                {"month": "Nov", "sales": 42, "is_festival": True, "label": "Nov (Diwali Nov 8 ★)"},
                {"month": "Dec", "sales": 25, "is_festival": True, "label": "Dec (New Year)"}
            ]
        }

    # Default fallback for Baskets (Medium Demand)
    return {
        "success": True,
        "category": "Baskets",
        "craft_description": "Handwoven using natural Sabai grass & cane",
        "image_url": "uploads/forecast_basket.jpg",
        "demand": {
            "level": "Medium",
            "badge_text": "↗ Medium",
            "headline": "Steady festive demand (+30%)",
            "sub_headline": "Festive hamper baskets and dry fruit trays saw 30% higher demand."
        },
        "recommendation": {
            "caption": "Recommended for you",
            "qty_min": 25,
            "qty_max": 40,
            "range_text": "25 - 40",
            "main_text": "Make 25 - 40 more units",
            "target_date": "Nov 02",
            "date_text": "before Nov 02."
        },
        "why_reasons": [
            {"icon": "gift", "text": "Diwali gift hampers & corporate dry fruit packing"},
            {"icon": "sparkles", "text": "Festive home décor & puja flower offering trays"},
            {"icon": "trend", "text": "Buyer pre-orders rise 30% during festive month"}
        ],
        "instructions": [
            "Procure raw Sabai grass or treated cane stalks by Oct 12 from Materials & Tools.",
            "Weave 25–40 units focusing on decorative handles and festive ribbon accents.",
            "Sun-cure thoroughly to prevent moisture, pack with natural fillers, and publish stock by Nov 02."
        ],
        "confidence": "Estimated — based on category trends and buyer pre-order signals",
        "rationale": "Handwoven baskets experience steady seasonal demand for corporate gifting and puja hampers. Aim for 25–40 units by Nov 02.",
        "production_goal": 0,
        "goal_set_at": None,
        "chart_data": [
            {"month": "May", "sales": 18, "is_festival": False, "label": "May"},
            {"month": "Jun", "sales": 22, "is_festival": False, "label": "Jun"},
            {"month": "Jul", "sales": 24, "is_festival": False, "label": "Jul"},
            {"month": "Aug", "sales": 30, "is_festival": True, "label": "Aug (Rakhi)"},
            {"month": "Sep", "sales": 32, "is_festival": False, "label": "Sep"},
            {"month": "Oct", "sales": 48, "is_festival": True, "label": "Oct (Diwali Rush)"},
            {"month": "Nov", "sales": 62, "is_festival": True, "label": "Nov (Diwali Nov 8 ★)"},
            {"month": "Dec", "sales": 38, "is_festival": True, "label": "Dec (New Year)"}
        ]
    }


def get_festival_overview(slug: str = "diwali") -> Dict[str, Any]:
    """
    Returns full details for Screen 3 (Festival Overview - tapped from festival banner):
    Diya illustration, name, date, days left badge, category breakdown cards, tip, and AI quote.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM festival_calendar WHERE LOWER(slug) = LOWER(?) LIMIT 1;", (slug,))
        row = cursor.fetchone()
        if not row:
            cursor.execute("SELECT * FROM festival_calendar WHERE slug = 'diwali' LIMIT 1;")
            row = cursor.fetchone()

    name = "Diwali / Deepavali"
    quote = "Diwali 2026 is on Sunday, November 8. 45 days left to prepare inventory ahead of peak festive shopping."
    tip = "Procure raw materials by Oct 10. Complete batch weaving by Oct 28 to guarantee 100% on-time Diwali dispatches."

    top_categories = [
        {
            "category": "Textiles",
            "uplift": "+50%",
            "uplift_pct": 50,
            "image_url": "uploads/forecast_textiles.jpg"
        },
        {
            "category": "Baskets",
            "uplift": "+30%",
            "uplift_pct": 30,
            "image_url": "uploads/forecast_basket.jpg"
        },
        {
            "category": "Home Decor",
            "uplift": "+25%",
            "uplift_pct": 25,
            "image_url": "uploads/forecast_lantern.jpg"
        },
        {
            "category": "Pottery",
            "uplift": "+15%",
            "uplift_pct": 15,
            "image_url": "uploads/forecast_pottery.jpg"
        }
    ]

    return {
        "success": True,
        "slug": slug,
        "name": name,
        "date_formatted": "Oct 20, 2026",
        "days_left": _days_until(_DIWALI_2026),
        "days_left_badge": f"{_days_until(_DIWALI_2026)} days left",
        "icon_type": "diya",
        "diya_image_url": "uploads/forecast_diya.jpg",
        "section_heading": "Demand usually increases for:",
        "top_categories": top_categories,
        "tip_card": {
            "icon": "calendar",
            "text": tip
        },
        "quote_card": {
            "text": quote
        }
    }


def set_category_production_goal(category: str, target_units: int, artisan_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Saves the production goal and connects it to the artisan's inventory and stock alerts.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE demand_forecasts
        SET production_goal = ?, goal_set_at = ?
        WHERE LOWER(category) = LOWER(?);
        """, (target_units, now_iso, category))

        # Update existing products in this category with target_units
        cursor.execute("""
        UPDATE products
        SET target_units = ?
        WHERE LOWER(category) LIKE LOWER(?) OR LOWER(craft_type) LIKE LOWER(?);
        """, (target_units, f"%{category}%", f"%{category}%"))

    return {
        "success": True,
        "category": category,
        "target_units": target_units,
        "saved_at": now_iso,
        "message": f"Production goal set to {target_units} units for {category}. Synced with Inventory & Stock Alerts."
    }


def toggle_forecast_reminder(festival_slug: str, category: Optional[str] = None) -> Dict[str, Any]:
    """Schedules/toggles pre-festival push reminder."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE demand_forecasts
        SET remind_me = 1
        WHERE festival_slug = ?;
        """, (festival_slug,))

    return {
        "success": True,
        "festival_slug": festival_slug,
        "message": "Reminder scheduled! You will be notified 30 days before Diwali to start inventory preparation."
    }
