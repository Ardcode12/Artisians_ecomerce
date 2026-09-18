"""
Materials & Tools Router
Endpoints for discovering suppliers, comparing prices, browsing raw materials,
requesting wholesale quotes, and community supplier suggestions.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel

from app.services.materials_service import (
    search_suppliers,
    get_supplier_detail,
    get_category_materials_list,
    create_quote_request,
    suggest_supplier,
)

logger = logging.getLogger("MaterialsRoutes")

router = APIRouter(tags=["Materials & Tools"])


class QuotePayload(BaseModel):
    supplier_id: str
    material_name: str
    quantity: str
    unit: str
    notes: Optional[str] = None
    artisan_id: Optional[str] = "demo_artisan"
    artisan_phone: Optional[str] = None


class SuggestSupplierPayload(BaseModel):
    name: str
    phone: Optional[str] = None
    material_type: Optional[str] = None
    city: Optional[str] = None
    suggested_by: Optional[str] = "demo_artisan"


@router.get("/materials/suppliers")
@router.get("/api/materials/suppliers")
def list_suppliers_endpoint(
    response: Response,
    q: Optional[str] = Query(None, description="Search term, e.g. Sabai Grass, bamboo, clay"),
    category: Optional[str] = Query(None, description="Category filter"),
    sort: Optional[str] = Query("nearest", description="Sort option: nearest, cheapest, top_rated, verified"),
    verified: Optional[bool] = Query(False, description="Show verified only"),
    lat: Optional[float] = Query(None, description="User latitude"),
    lon: Optional[float] = Query(None, description="User longitude"),
):
    """
    Search and compare raw material & equipment suppliers.
    Matches Screen 3: Search Results (Suppliers) with distance, star rating, and price.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    suppliers = search_suppliers(
        query=q,
        category=category,
        sort_by=sort or "nearest",
        verified_only=bool(verified),
        lat=lat,
        lon=lon,
    )
    return {
        "success": True,
        "query": q,
        "category": category,
        "sort": sort,
        "total": len(suppliers),
        "suppliers": suppliers,
    }


@router.get("/materials/suppliers/{supplier_id}")
@router.get("/api/materials/suppliers/{supplier_id}")
def get_supplier_endpoint(
    supplier_id: str,
    response: Response,
    material: Optional[str] = Query(None, description="Highlighted material name"),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
):
    """
    Returns full supplier detail for Screen 4:
    - Hero photo banner
    - Distance, rating, address
    - Featured material info (price, in stock, minimum order, delivery availability)
    - Full material catalog
    - Direct Call & WhatsApp contact endpoints
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    supplier = get_supplier_detail(
        supplier_id=supplier_id,
        selected_material=material,
        lat=lat,
        lon=lon,
    )
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {
        "success": True,
        "supplier": supplier,
    }


@router.get("/materials/categories/{category}")
@router.get("/api/materials/categories/{category}")
def get_category_materials_endpoint(
    category: str,
    response: Response,
):
    """
    Returns material list under a category for Screen 2: Category Browse.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    materials = get_category_materials_list(category=category)
    return {
        "success": True,
        "category": category,
        "materials": materials,
    }


@router.post("/materials/quotes", status_code=status.HTTP_201_CREATED)
@router.post("/api/materials/quotes", status_code=status.HTTP_201_CREATED)
def submit_quote_endpoint(payload: QuotePayload):
    """
    Submits an artisan quote request for Screen 5 (Request Quote).
    """
    result = create_quote_request(
        supplier_id=payload.supplier_id,
        material_name=payload.material_name,
        quantity=payload.quantity,
        unit=payload.unit,
        notes=payload.notes,
        artisan_id=payload.artisan_id,
        artisan_phone=payload.artisan_phone,
    )
    return result


@router.post("/materials/suggest", status_code=status.HTTP_201_CREATED)
@router.post("/api/materials/suggest", status_code=status.HTTP_201_CREATED)
def suggest_supplier_endpoint(payload: SuggestSupplierPayload):
    """
    Artisan community supplier recommendation (Screen 3 fallback button).
    """
    result = suggest_supplier(
        name=payload.name,
        phone=payload.phone,
        material_type=payload.material_type,
        city=payload.city,
        suggested_by=payload.suggested_by,
    )
    return result
