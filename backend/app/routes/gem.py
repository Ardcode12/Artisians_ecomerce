"""
GeM (Government e-Marketplace) API Routes

Provides:
- One-Click GeM Catalog Export (CSV & JSON)
- GeM Product Compliance Analysis
- HSN Code and GeM Category Auto-Suggestion & Taxonomies
"""

from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import PlainTextResponse
from typing import Optional, List
from datetime import datetime, timezone

from app.services.gem_service import (
    HSN_TAXONOMY,
    suggest_gem_metadata,
    evaluate_gem_compliance,
    export_gem_catalog_csv,
    export_gem_catalog_json,
)
from app.services.product_service import get_product_by_id

router = APIRouter(prefix="/api/gem", tags=["GeM Portal Integration"])


@router.get("/suggest")
def suggest_gem_endpoint(
    craft_type: Optional[str] = Query(None, description="Craft category or raw material"),
    title: Optional[str] = Query(None, description="Product title"),
):
    """
    Auto-suggest authentic Indian GST HSN code, GeM category, and physical specifications.
    """
    suggestion = suggest_gem_metadata(craft_type=craft_type, title=title)
    return {
        "success": True,
        "suggestion": suggestion,
    }


@router.get("/taxonomies")
def get_gem_taxonomies_endpoint():
    """
    Get full list of supported Indian Handicraft & Handloom HSN codes and GeM categories.
    """
    categories_list = []
    for craft_key, details in HSN_TAXONOMY.items():
        categories_list.append({
            "craft": craft_key.title(),
            "hsn_code": details["hsn_code"],
            "gem_category": details["gem_category"],
            "gst_rate_pct": details["gst_rate_pct"],
            "default_cert": details["default_cert"],
            "typical_weight_kg": details["typical_weight_kg"],
            "typical_dimensions": details["typical_dimensions"],
        })

    return {
        "success": True,
        "total": len(categories_list),
        "taxonomies": categories_list,
    }


@router.get("/compliance/{product_id}")
def check_compliance_endpoint(product_id: str):
    """
    Check GeM bulk listing compliance for a single product.
    """
    product = get_product_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found"
        )

    compliance = evaluate_gem_compliance(product, {
        "pehchan_id": product.get("profile_pehchan_id") or "",
        "gstin": product.get("profile_gstin") or "",
    })

    return {
        "success": True,
        "product_id": product_id,
        "title": product.get("title"),
        "compliance": compliance,
    }


@router.get("/export/csv", response_class=PlainTextResponse)
def export_gem_csv_endpoint(
    artisan_id: Optional[str] = Query(None, description="Filter export by artisan ID"),
):
    """
    One-Click GeM Catalog Export as official GeM Bulk Upload CSV file.
    Can be directly uploaded into the GeM Seller Portal product catalog.
    """
    try:
        csv_data = export_gem_catalog_csv(artisan_id=artisan_id)
        now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
        filename = f"gem_artisan_catalog_{now_str}.csv"

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/csv; charset=utf-8",
        }
        return Response(content=csv_data, media_type="text/csv", headers=headers)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate GeM CSV catalog: {str(e)}"
        )


@router.get("/export/json")
def export_gem_json_endpoint(
    artisan_id: Optional[str] = Query(None, description="Filter export by artisan ID"),
):
    """
    One-Click GeM Catalog Export in official GeM Direct API Product Ingestion schema.
    """
    try:
        catalog = export_gem_catalog_json(artisan_id=artisan_id)
        return catalog
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate GeM JSON catalog: {str(e)}"
        )
