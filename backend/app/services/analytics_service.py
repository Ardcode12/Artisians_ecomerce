"""
Analytics & Business Insights Service
Provides metrics, revenue trend curves, top performing product funnels,
price histories, and chronologically grouped activity timeline.
"""

import logging
from typing import Any, Dict, List, Optional
from app.db.database import get_db

logger = logging.getLogger("AnalyticsService")


def safe_float_price(p: Any, default: float = 1100.0) -> float:
    if p is None:
        return default
    if isinstance(p, (int, float)):
        return float(p)
    try:
        cleaned = str(p).replace("₹", "").replace(",", "").strip()
        return float(cleaned)
    except Exception:
        return default


def get_business_insights(artisan_id: Optional[str] = "demo_artisan", period: str = "30_days") -> Dict[str, Any]:
    """
    Returns aggregated metrics and charts matching Screen 1 (Analytics Home).
    Filters metrics by period: 7_days, 30_days, 90_days, 1_year, all_time.
    """
    # Period multipliers for demo responsiveness
    p_norm = (period or "30_days").lower().replace(" ", "_")
    mult = 1.0
    period_label = "30 Days"
    if "7" in p_norm:
        mult = 0.28
        period_label = "7 Days"
    elif "90" in p_norm:
        mult = 2.85
        period_label = "90 Days"
    elif "1_year" in p_norm or "year" in p_norm:
        mult = 9.8
        period_label = "1 Year"
    elif "all" in p_norm:
        mult = 12.4
        period_label = "All Time"

    revenue_val = int(round(8450 * mult))
    orders_val = max(1, int(round(12 * mult)))
    views_val = int(round(340 * mult))
    conversion_val = 3.5

    # Spline points across the month (matching image 1 curve with peak at Sep 11 with ₹2,100)
    trend_points = [
        {"day": "Sep 1", "val": int(320 * mult)},
        {"day": "Sep 3", "val": int(410 * mult)},
        {"day": "Sep 6", "val": int(680 * mult)},
        {"day": "Sep 8", "val": int(1200 * mult)},
        {"day": "Sep 11", "val": int(2100 * mult)},  # Peak
        {"day": "Sep 15", "val": int(1650 * mult)},
        {"day": "Sep 18", "val": int(780 * mult)},
        {"day": "Sep 22", "val": int(620 * mult)},
        {"day": "Sep 26", "val": int(840 * mult)},
        {"day": "Sep 30", "val": int(1150 * mult)},
    ]

    best_week_text = "Your best week was Sept 8 – 14"
    best_sales_text = f"with ₹{int(2100 * mult):,} in sales"

    # Query real top products if present in SQLite
    top_products = [
        {
            "id": "prod_vase",
            "title": "Terracotta Vase",
            "price": 1100,
            "category": "Hand-thrown clay vase",
            "image_url": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=500&q=80",
            "views": 84,
            "inquiries": 6,
            "sold": 3,
        },
        {
            "id": "prod_basket",
            "title": "Woven Basket",
            "price": 950,
            "category": "Sabai grass woven basket",
            "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80",
            "views": 56,
            "inquiries": 4,
            "sold": 2,
        },
    ]

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, title, price, category, image_url
        FROM products
        WHERE artisan_id = ? OR artisan_id = 'demo_artisan'
        LIMIT 3;
        """, (artisan_id,))
        rows = cursor.fetchall()
        if len(rows) >= 2:
            real_top = []
            v_counts = [84, 56, 32]
            i_counts = [6, 4, 2]
            s_counts = [3, 2, 1]
            for idx, r in enumerate(rows):
                p_id, p_title, p_price, p_cat, p_img = r
                real_top.append({
                    "id": p_id,
                    "title": p_title,
                    "price": safe_float_price(p_price, 1100.0),
                    "category": p_cat or "Handicraft",
                    "image_url": p_img or "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=500&q=80",
                    "views": v_counts[idx % len(v_counts)],
                    "inquiries": i_counts[idx % len(i_counts)],
                    "sold": s_counts[idx % len(s_counts)],
                })
            top_products = real_top

    best_sales_num = int(2100 * mult)
    top_prod_name = top_products[0]['title'] if top_products[0].get('title') and top_products[0]['title'] != 'title' else 'Terracotta Vase'

    # Multilingual plain text summaries for voice readout (EN, HI, TA)
    speech_summary_en = (
        f"Your business insights: Total revenue is ₹{revenue_val:,}, up 18%. "
        f"You have received {orders_val} orders and {views_val} listing views. "
        f"{best_week_text} {best_sales_text}. "
        f"Your top performing product is {top_prod_name} with {top_products[0]['sold']} units sold. "
        f"To grow your craft business, maintain active listings and answer customer messages promptly."
    )
    speech_summary_hi = (
        f"आपकी व्यापार रिपोर्ट: आपकी कुल कमाई {revenue_val:,} रुपये है, जो 18 प्रतिशत बढ़ी है। "
        f"आपको {orders_val} ऑर्डर और {views_val} बार उत्पादों को देखा गया है। "
        f"आपका सबसे सफल सप्ताह रहा जिसमें {best_sales_num:,} रुपये की बिक्री हुई। "
        f"आपका सबसे लोकप्रिय उत्पाद {top_prod_name} है जिसकी {top_products[0]['sold']} इकाइयाँ बिकी हैं। "
        f"बिक्री बढ़ाने के लिए स्पष्ट तस्वीरें अपलोड करें और ग्राहकों से तुरंत संपर्क करें।"
    )
    speech_summary_ta = (
        f"உங்கள் வணிக அறிக்கை: உங்கள் மொத்த வருமானம் {revenue_val:,} ரூபாய், இது 18 சதவீதம் அதிகரித்துள்ளது. "
        f"உங்களுக்கு {orders_val} ஆர்டர்களும் {views_val} பார்வைகளும் கிடைத்துள்ளன. "
        f"உங்கள் அதிக விற்பனை வாரத்தில் {best_sales_num:,} ரூபாய் விற்பனை ஆனது. "
        f"உங்கள் சிறந்த தயாரிப்பு {top_prod_name}, இதில் {top_products[0]['sold']} பொருட்கள் விற்கப்பட்டுள்ளன. "
        f"விற்பனையை மேலும் அதிகரிக்க தரமான படங்களை பதிவேற்றி வாடிக்கையாளர் கேள்விகளுக்கு உடனே பதிலளிக்கவும்."
    )
    speech_summary = speech_summary_en

    return {
        "success": True,
        "period": period_label,
        "hero_stats": {
            "revenue": {
                "value": f"₹{revenue_val:,}",
                "raw_value": revenue_val,
                "label": "Revenue",
                "trend": "↑ 18%",
                "trend_positive": True,
            },
            "orders": {
                "value": f"{orders_val}",
                "raw_value": orders_val,
                "label": "Orders",
                "trend": "↑ 3 more",
                "trend_positive": True,
            },
            "listing_views": {
                "value": f"{views_val}",
                "raw_value": views_val,
                "label": "Listing Views",
                "trend": "↑ 22%",
                "trend_positive": True,
            },
            "conversion_rate": {
                "value": f"{conversion_val}%",
                "label": "Conversion",
                "subtext": "views → orders",
            },
        },
        "revenue_chart": {
            "headline": best_week_text,
            "sub_headline": best_sales_text,
            "peak_value": f"₹{int(2100 * mult):,}",
            "points": trend_points,
            "x_labels": ["Sep 1", "Sep 8", "Sep 15", "Sep 22", "Sep 30"],
        },
        "top_products": top_products,
        "price_performance": {
            "show": True,
            "headline": "Your AI-suggested prices are working",
            "body": "Listings published at the AI-suggested price sold 40% faster than manually-priced listings",
        },
        "social_reach": {
            "show": True,
            "headline": "Your reels are being seen",
            "views": "1,240",
            "likes": "38",
            "comments": "4",
        },
        "buyer_locations": [
            {"city": "Chennai", "orders": 5},
            {"city": "Bengaluru", "orders": 3},
            {"city": "Coimbatore", "orders": 2},
            {"city": "Madurai", "orders": 2},
        ],
        "speech_summary": speech_summary,
        "speech_summary_en": speech_summary_en,
        "speech_summary_hi": speech_summary_hi,
        "speech_summary_ta": speech_summary_ta,
    }


def get_product_performance(product_id: str) -> Dict[str, Any]:
    """
    Returns funnel interaction and price history for Screen 2 (Product Performance Detail).
    """
    # Defaults matching Screenshot 2
    title = "Terracotta Vase"
    price = 1100.0
    category = "Hand-thrown clay vase"
    image_url = "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=500&q=80"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT title, price, category, image_url
        FROM products
        WHERE id = ?;
        """, (product_id,))
        row = cursor.fetchone()
        if row:
            title = row[0] or title
            price = safe_float_price(row[1], price)
            category = row[2] or category
            image_url = row[3] or image_url

        # Check price history
        cursor.execute("""
        SELECT price, is_ai_suggested, note, changed_at
        FROM product_price_history
        WHERE product_id = ? OR product_id = 'prod_vase'
        ORDER BY rowid ASC;
        """, (product_id,))
        p_rows = cursor.fetchall()

    price_history = []
    if p_rows:
        for r in p_rows:
            price_history.append({
                "price": safe_float_price(r[0], 950.0),
                "is_ai_suggested": bool(r[1]),
                "note": r[2],
                "date": r[3],
            })
    else:
        price_history = [
            {"price": 1100.0, "is_ai_suggested": True, "note": "Published at ₹1,100 (AI suggested)", "date": "Aug 28, 2024"},
            {"price": 950.0, "is_ai_suggested": False, "note": "Changed to ₹950", "date": "Sept 10, 2024"},
        ]

    return {
        "success": True,
        "product": {
            "id": product_id,
            "title": title,
            "price": price,
            "status": "Active",
            "category": category,
            "image_url": image_url,
        },
        "funnel": {
            "views": 84,
            "inquiries": 6,
            "orders": 3,
            "conversion_pct": 7,
            "average_pct": 4,
            "headline": "7% of people who viewed this bought it",
            "subtext": "That's above your average (4%).",
        },
        "price_history": price_history,
        "category_comparison": {
            "headline": "This listing gets 2x more views",
            "subtext": f"than your average {category.split()[0] if category else 'Pottery'} listing.",
        },
    }


def get_activity_history(
    artisan_id: Optional[str] = "demo_artisan",
    filter_type: str = "All",
    search_q: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Returns grouped chronological timeline events matching Screen 3 (Activity History).
    Filters: All | Orders | Listings | Inquiries | Payments
    """
    with get_db() as conn:
        cursor = conn.cursor()
        sql = "SELECT id, event_type, title, subtitle, detail_id, time_str, date_group, created_at FROM activity_events WHERE 1=1"
        params: List[Any] = []

        f_norm = (filter_type or "all").lower().strip()
        if f_norm == "orders":
            sql += " AND event_type = 'order'"
        elif f_norm == "listings":
            sql += " AND event_type = 'listing'"
        elif f_norm == "inquiries":
            sql += " AND event_type = 'inquiry'"
        elif f_norm == "payments":
            sql += " AND event_type = 'payment'"

        if search_q and search_q.strip():
            sql += " AND (title LIKE ? OR subtitle LIKE ?)"
            params.extend([f"%{search_q}%", f"%{search_q}%"])

        sql += " ORDER BY rowid ASC;"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    # Group by date_group
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        e_id, e_type, e_title, e_sub, e_det, e_time, e_date, e_created = r
        item = {
            "id": e_id,
            "type": e_type,
            "title": e_title,
            "subtitle": e_sub,
            "detail_id": e_det,
            "time": e_time,
        }
        if e_date not in grouped:
            grouped[e_date] = []
        grouped[e_date].append(item)

    # Format as list of groups
    groups_list = [{"date": k, "events": v} for k, v in grouped.items()]

    return {
        "success": True,
        "filter": filter_type,
        "search": search_q,
        "total_events": len(rows),
        "groups": groups_list,
    }
