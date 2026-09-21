"""
Growth Hub REST Routes
Includes Design Ideas generation, product selection, and listing conversion.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel

from app.db.database import get_db

from app.services.design_ideas_service import (
    get_design_ideas_by_product_id,
    generate_design_ideas,
    save_design_idea,
    dismiss_design_idea,
    convert_idea_to_listing,
)
from app.services.demand_forecast_service import (
    get_featured_festival,
    get_all_upcoming_festivals,
    get_demand_forecast_summary,
    get_category_demand_detail,
    get_festival_overview,
    set_category_production_goal,
    toggle_forecast_reminder,
)

logger = logging.getLogger("GrowthRoutes")

router = APIRouter(tags=["Growth"])


class GenerateIdeasPayload(BaseModel):
    product_id: str
    force_refresh: bool = False


class SetGoalPayload(BaseModel):
    category: Optional[str] = None
    target_units: int
    artisan_id: Optional[str] = None


# ── 1. List Products for Design Ideas Picker ──────────────────────────────
@router.get("/growth/products")
@router.get("/api/growth/products")
def list_growth_products(
    response: Response,
    artisan_id: Optional[str] = Query(None),
):
    """
    Returns products available for generating design ideas.
    Prioritizes the artisan's active products from their product section,
    along with showcase products.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"

    with get_db() as conn:
        cursor = conn.cursor()
        if artisan_id:
            # Only return this seller's own products — no demo products mixed in
            cursor.execute("""
            SELECT id, artisan_id, title, category, craft_type, price, image_url, status, description_en
            FROM products
            WHERE artisan_id = ?
            ORDER BY created_at DESC;
            """, (artisan_id,))
            rows = cursor.fetchall()
            return {
                "success": True,
                "products": [dict(r) for r in rows],
                "total": len(rows),
            }

        # No artisan_id provided — list all products
        cursor.execute("""
        SELECT id, artisan_id, title, category, craft_type, price, image_url, status, description_en
        FROM products
        ORDER BY created_at DESC;
        """)
        rows = cursor.fetchall()
        products = [dict(r) for r in rows]

    return {
        "success": True,
        "products": products,
        "total": len(products),
    }


# ── 2. Get Single Product for Design Detail ───────────────────────────────
@router.get("/growth/products/{product_id}")
@router.get("/api/growth/products/{product_id}")
def get_growth_product(product_id: str):
    """Returns details for a single product to display on the Product Design Detail screen."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, artisan_id, title, category, craft_type, price, image_url, status, description_en
        FROM products
        WHERE id = ?;
        """, (product_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found")
        return {
            "success": True,
            "product": dict(row),
        }


# ── 3. Fetch Existing Design Ideas for a Product ──────────────────────────
@router.get("/growth/design-ideas/{product_id}")
@router.get("/api/growth/design-ideas/{product_id}")
def get_ideas_endpoint(product_id: str):
    """Fetches generated ideas for a product."""
    ideas = get_design_ideas_by_product_id(product_id)
    return {
        "success": True,
        "product_id": product_id,
        "ideas": ideas,
        "total": len(ideas),
    }


# ── 4. Generate New Design Ideas for a Product ────────────────────────────
@router.post("/growth/design-ideas/generate")
@router.post("/api/growth/design-ideas/generate")
def generate_ideas_endpoint(payload: GenerateIdeasPayload):
    """Triggers the design innovation pipeline and returns 2-3 structured modern concepts."""
    ideas = generate_design_ideas(payload.product_id, force_refresh=payload.force_refresh)
    if not ideas:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{payload.product_id}' not found.",
        )
    return {
        "success": True,
        "product_id": payload.product_id,
        "ideas": ideas,
        "total": len(ideas),
    }


# ── 5. Save Design Idea ───────────────────────────────────────────────────
@router.post("/growth/design-ideas/{idea_id}/save")
@router.post("/api/growth/design-ideas/{idea_id}/save")
def save_idea_endpoint(idea_id: int):
    """Marks an innovation concept as saved for later."""
    result = save_design_idea(idea_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail="Design idea not found")
    return result


# ── 6. Dismiss Design Idea ────────────────────────────────────────────────
@router.post("/growth/design-ideas/{idea_id}/dismiss")
@router.post("/api/growth/design-ideas/{idea_id}/dismiss")
def dismiss_idea_endpoint(idea_id: int):
    """Marks an innovation concept as dismissed."""
    return dismiss_design_idea(idea_id)


# ── 7. Convert Design Idea to New Listing ─────────────────────────────────
@router.post("/growth/design-ideas/{idea_id}/convert-to-listing")
@router.post("/api/growth/design-ideas/{idea_id}/convert-to-listing")
def convert_idea_endpoint(idea_id: int):
    """Pre-fills Step 2/3 of the Add-Product wizard with title, modern features, and image."""
    result = convert_idea_to_listing(idea_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail="Design idea not found")
    return result


# ── 8. Demand Forecast Summary (Home Screen A) ───────────────────────────
@router.get("/growth/demand-forecast")
@router.get("/api/growth/demand-forecast")
def get_demand_forecast_endpoint(
    response: Response,
    artisan_id: Optional[str] = Query(None),
):
    """
    Returns Demand Forecast Home payload matching Image 1:
    - Upcoming festival banner ("Diwali is in 18 days")
    - Categories list (Baskets, Pottery, Textiles with demand badges)
    - Info value banner ("Make more. Sell more.")
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return get_demand_forecast_summary(artisan_id=artisan_id)


# ── 9. Upcoming Festivals Timeline ────────────────────────────────────────
@router.get("/growth/festivals/upcoming")
@router.get("/api/growth/festivals/upcoming")
def get_upcoming_festivals_endpoint(response: Response):
    """Returns horizontal scroll timeline of upcoming festival events sorted nearest first."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    festivals = get_all_upcoming_festivals()
    return {
        "success": True,
        "festivals": festivals,
        "total": len(festivals),
    }


# ── 10. Festival Overview (Screen C) ──────────────────────────────────────
@router.get("/growth/festivals/{slug}")
@router.get("/api/growth/festivals/{slug}")
def get_festival_overview_endpoint(slug: str, response: Response):
    """
    Returns Festival Overview matching Image 3:
    - Diya badge & date
    - Demand increase category cards (+40% Baskets, +35% Home Decor, +25% Textiles)
    - Preparation tip & AI quote rationale
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return get_festival_overview(slug=slug)


# ── 11. Category Forecast Detail (Screen B) ──────────────────────────────
@router.get("/growth/demand-forecast/{category}")
@router.get("/api/growth/demand-forecast/{category}")
def get_category_demand_endpoint(
    category: str,
    response: Response,
    artisan_id: Optional[str] = Query(None),
):
    """
    Returns full category forecast detail matching Image 2:
    - Hero product image
    - Demand alert ("High demand this Diwali")
    - Recommended production units ("Make 30 - 40 more units")
    - Why reasons (Gifting, Home decor, Last year surge)
    - Chart data & production goal state
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return get_category_demand_detail(category=category, artisan_id=artisan_id)


# ── 12. Set Production Goal ───────────────────────────────────────────────
@router.post("/growth/demand-forecast/set-goal")
@router.post("/api/growth/demand-forecast/set-goal")
@router.post("/growth/demand-forecast/{category}/set-goal")
@router.post("/api/growth/demand-forecast/{category}/set-goal")
def set_production_goal_endpoint(
    payload: SetGoalPayload,
    category: Optional[str] = None,
):
    """Saves artisan production goal and links it to inventory stock alerts."""
    target_category = category or payload.category
    if not target_category:
        raise HTTPException(status_code=400, detail="Category name is required")
    return set_category_production_goal(
        category=target_category,
        target_units=payload.target_units,
        artisan_id=payload.artisan_id,
    )


# ── 13. Pre-Festival Notification / Remind Me ─────────────────────────────
@router.post("/growth/demand-forecast/{slug}/remind-me")
@router.post("/api/growth/demand-forecast/{slug}/remind-me")
def toggle_reminder_endpoint(slug: str, category: Optional[str] = Query(None)):
    """Schedules pre-festival inventory push notification."""
    return toggle_forecast_reminder(festival_slug=slug, category=category)

