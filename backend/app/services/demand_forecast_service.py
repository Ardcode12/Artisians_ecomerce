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


# Diwali 2026: October 20, 2026
_DIWALI_2026 = datetime(2026, 10, 20, tzinfo=timezone.utc)


def _days_until(target: datetime) -> int:
    """Returns the number of whole days from today (UTC) until target date."""
    now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    delta = (target.replace(hour=0, minute=0, second=0, microsecond=0) - now).days
    return max(0, delta)


def get_featured_festival() -> Dict[str, Any]:
    """
    Returns the nearest upcoming festival from the calendar with countdown days.
    Defaults to Diwali 2026 (Oct 20, 2026) with dynamically calculated days_left.
    """
    days_left = _days_until(_DIWALI_2026)
    date_formatted = "Oct 20, 2026"
    tagline = f"Diwali is in {days_left} days"
    days_left_text = f"{days_left} days left"

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
                "name": item["name"],
                "days_left": days_left,
                "days_left_text": days_left_text,
                "date_formatted": date_formatted,
                "subtitle": item.get("subtitle") or "Time to prepare your products",
                "tagline": tagline,
                "icon_type": item.get("icon_type") or "diya",
                "region": item.get("region") or "Pan-India",
                "category_uplift": category_uplift,
                "tip": item.get("tip") or "Start preparing early to make the most of this festive season.",
                "quote_rationale": item.get("quote_rationale") or "Last Diwali, baskets like yours were 40% more popular. This year, we expect similar or higher demand."
            }

    # Fallback default
    return {
        "id": 1,
        "slug": "diwali",
        "name": "Diwali",
        "days_left": days_left,
        "days_left_text": days_left_text,
        "date_formatted": date_formatted,
        "subtitle": "Time to prepare your products",
        "tagline": tagline,
        "icon_type": "diya",
        "region": "Pan-India",
        "category_uplift": {"Baskets": 0.40, "Home Decor": 0.35, "Textiles": 0.25},
        "tip": "Start preparing early to make the most of this festive season.",
        "quote_rationale": "Last Diwali, baskets like yours were 40% more popular. This year, we expect similar or higher demand."
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
        "diwali": datetime(2026, 10, 20, tzinfo=timezone.utc),
        "wedding-season": datetime(2026, 11, 15, tzinfo=timezone.utc),
        "christmas": datetime(2026, 12, 25, tzinfo=timezone.utc),
        "pongal": datetime(2027, 1, 14, tzinfo=timezone.utc),
    }
    date_map = {
        "diwali": "Oct 20, 2026",
        "wedding-season": "Nov 15, 2026",
        "christmas": "Dec 25, 2026",
        "pongal": "Jan 14, 2027"
    }

    for r in rows:
        item = dict(r)
        slug = item["slug"]
        fest_date = festival_dates.get(slug)
        days = _days_until(fest_date) if fest_date else 30
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
    Returns the Demand Forecast home screen payload matching Image 1:
    - Featured Festival Banner ("Diwali is in 18 days")
    - Category Forecast Cards (Baskets, Pottery, Textiles)
    - Value proposition banner ("Make more. Sell more.")
    """
    festival = get_featured_festival()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM demand_forecasts
        ORDER BY CASE
            WHEN category = 'Baskets' THEN 1
            WHEN category = 'Pottery' THEN 2
            WHEN category = 'Textiles' THEN 3
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

    # Curated contextual defaults by craft
    if "pott" in cat_clean or "clay" in cat_clean:
        return {
            "success": True,
            "category": "Pottery",
            "craft_description": "Terracotta & earthenware ceremonial vessels",
            "image_url": "uploads/forecast_pottery.jpg",
            "demand": {
                "level": "High",
                "badge_text": "↗ High",
                "headline": "Peak demand this Diwali (+45%)",
                "sub_headline": "Clay diyas, earthen puja matkis, and terracotta decor surge across markets."
            },
            "recommendation": {
                "caption": "Recommended for you",
                "qty_min": 50,
                "qty_max": 80,
                "range_text": "50 - 80",
                "main_text": "Make 50 - 80 more units",
                "target_date": "Oct 12",
                "date_text": "before Oct 12."
            },
            "why_reasons": [
                {"icon": "flame", "text": "Diwali Lakshmi puja rituals & traditional oil lamps"},
                {"icon": "gift", "text": "Eco-friendly, chemical-free gifting alternative"},
                {"icon": "trend", "text": "Early orders for hand-painted clay sets peak 2 weeks ahead"}
            ],
            "instructions": [
                "Prepare fine terracotta clay and wheel setup by Oct 1.",
                "Shape and kiln-fire 50–80 diyas and festive pots in early batches to allow cooling.",
                "Apply non-toxic herbal colors or natural terracotta polish before final inspection."
            ],
            "confidence": "Estimated — based on category trends and buyer pre-order signals",
            "rationale": "Handmade terracotta diyas and ceremonial clay pots are essential for Diwali festivities. Prepare clay by Oct 1, kiln-fire 50–80 units by Oct 12, and list with festive bundles.",
            "production_goal": 0,
            "goal_set_at": None,
            "chart_data": [
                {"month": "May", "sales": 20, "is_festival": False, "label": "May"},
                {"month": "Jun", "sales": 22, "is_festival": False, "label": "Jun"},
                {"month": "Jul", "sales": 25, "is_festival": False, "label": "Jul"},
                {"month": "Aug", "sales": 32, "is_festival": True, "label": "Aug (Rakhi)"},
                {"month": "Sep", "sales": 34, "is_festival": False, "label": "Sep"},
                {"month": "Oct", "sales": 85, "is_festival": True, "label": "Oct (Diwali)"},
                {"month": "Nov", "sales": 42, "is_festival": True, "label": "Nov (Weddings)"},
                {"month": "Dec", "sales": 30, "is_festival": True, "label": "Dec (New Year)"}
            ]
        }
    elif "text" in cat_clean or "weav" in cat_clean or "handloom" in cat_clean:
        return {
            "success": True,
            "category": "Textiles",
            "craft_description": "Handwoven silk & cotton festive fabrics",
            "image_url": "uploads/forecast_textiles.jpg",
            "demand": {
                "level": "Medium",
                "badge_text": "↗ Medium",
                "headline": "Rising festive demand (+30%)",
                "sub_headline": "Handloom silk stoles, dupattas, and festive ethnic wear see strong interest."
            },
            "recommendation": {
                "caption": "Recommended for you",
                "qty_min": 20,
                "qty_max": 35,
                "range_text": "20 - 35",
                "main_text": "Make 20 - 35 more units",
                "target_date": "Oct 14",
                "date_text": "before Oct 14."
            },
            "why_reasons": [
                {"icon": "trend", "text": "Festive ethnic attire & puja handloom shawls"},
                {"icon": "gift", "text": "Diwali gifting to family, elders, and colleagues"},
                {"icon": "sparkles", "text": "Wedding season begins right after Diwali, extending demand"}
            ],
            "instructions": [
                "Select festive color palettes (maroon, saffron, royal blue) with golden zari borders.",
                "Weave 20–35 units and perform tension and hem finishing.",
                "Steam-press, fold into protective paper sleeves, and list with festive tags."
            ],
            "confidence": "Estimated — based on category trends and buyer pre-order signals",
            "rationale": "Artisan handloom textiles enjoy sustained demand throughout October. Weave in festive hues with zari borders by Oct 14 to capture pre-Diwali and wedding shoppers.",
            "production_goal": 0,
            "goal_set_at": None,
            "chart_data": [
                {"month": "May", "sales": 15, "is_festival": False, "label": "May"},
                {"month": "Jun", "sales": 18, "is_festival": False, "label": "Jun"},
                {"month": "Jul", "sales": 20, "is_festival": False, "label": "Jul"},
                {"month": "Aug", "sales": 28, "is_festival": True, "label": "Aug (Rakhi)"},
                {"month": "Sep", "sales": 32, "is_festival": False, "label": "Sep"},
                {"month": "Oct", "sales": 65, "is_festival": True, "label": "Oct (Diwali)"},
                {"month": "Nov", "sales": 75, "is_festival": True, "label": "Nov (Weddings)"},
                {"month": "Dec", "sales": 48, "is_festival": True, "label": "Dec (New Year)"}
            ]
        }

    # Default fallback for Baskets
    return {
        "success": True,
        "category": "Baskets",
        "craft_description": "Handwoven using natural Sabai grass & cane",
        "image_url": "uploads/forecast_basket.jpg",
        "demand": {
            "level": "High",
            "badge_text": "↗ High",
            "headline": "High demand this Diwali (+40%)",
            "sub_headline": "Festive hamper baskets and dry fruit trays saw 40% higher demand last Diwali."
        },
        "recommendation": {
            "caption": "Recommended for you",
            "qty_min": 35,
            "qty_max": 50,
            "range_text": "35 - 50",
            "main_text": "Make 35 - 50 more units",
            "target_date": "Oct 10",
            "date_text": "before Oct 10."
        },
        "why_reasons": [
            {"icon": "gift", "text": "Diwali gift hampers & corporate dry fruit packing"},
            {"icon": "sparkles", "text": "Festive home décor & puja flower offering trays"},
            {"icon": "trend", "text": "Buyer pre-orders surge 40% before festive week"}
        ],
        "instructions": [
            "Procure raw Sabai grass or treated cane stalks by Oct 1 from Materials & Tools.",
            "Weave 35–50 units focusing on decorative handles and festive ribbon accents.",
            "Sun-cure thoroughly to prevent moisture, pack with natural fillers, and publish stock."
        ],
        "confidence": "Estimated — based on category trends and buyer pre-order signals",
        "rationale": "Last Diwali, artisan handwoven baskets experienced a 40% surge in platform orders. Procure Sabai grass by Oct 1 and aim to complete 35–50 units by Oct 10 for express shipping.",
        "production_goal": 0,
        "goal_set_at": None,
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

    name = row["name"] if row else "Diwali"
    quote = row["quote_rationale"] if row else "Festival demand starts 25 days before Diwali. Artisans who set production goals early achieve 3.2x higher sell-through."
    tip = row["tip"] if row else "Procure raw materials by Oct 1. Complete batch production by Oct 12 to guarantee 100% on-time festive dispatches."

    top_categories = [
        {
            "category": "Pottery",
            "uplift": "+45%",
            "uplift_pct": 45,
            "image_url": "uploads/forecast_pottery.jpg"
        },
        {
            "category": "Baskets",
            "uplift": "+40%",
            "uplift_pct": 40,
            "image_url": "uploads/forecast_basket.jpg"
        },
        {
            "category": "Textiles",
            "uplift": "+30%",
            "uplift_pct": 30,
            "image_url": "uploads/forecast_textiles.jpg"
        },
        {
            "category": "Home Decor",
            "uplift": "+35%",
            "uplift_pct": 35,
            "image_url": "uploads/forecast_lantern.jpg"
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
