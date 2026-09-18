"""
Schemes Discovery Routes (Step 4).
Exposes stored government & NGO schemes to web and mobile clients.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import JSONResponse

from app.services.schemes.storage import (
    get_all_schemes,
    get_scheme_by_id,
    get_recent_crawl_logs,
    save_schemes,
    log_crawl_results,
)
from app.services.schemes.collector import collect_all_sources
from app.services.schemes.extractor import extract_all

from app.services.schemes.scheduler import run_full_refresh, is_refresh_in_progress

logger = logging.getLogger("SchemesRoute")

router = APIRouter(prefix="/api/schemes", tags=["Schemes"])


@router.get("")
def list_schemes_endpoint(
    response: Response,
    provider_type: Optional[str] = Query(None, description="Filter by provider type: government, ngo, private"),
    category: Optional[str] = Query(None, description="Filter by category: financial aid, market access, training, etc."),
    keyword: Optional[str] = Query(None, description="Keyword search over name, category, benefits, eligibility"),
    q: Optional[str] = Query(None, description="Search query alias for keyword"),
    search: Optional[str] = Query(None, description="Search query alias for keyword"),
    is_active: bool = Query(True, description="Filter active schemes"),
):
    """
    Returns active schemes with optional filtering by provider_type, category, and keyword search.
    Returns clean empty list if no schemes match or database is empty.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    effective_keyword = keyword or q or search
    try:
        schemes = get_all_schemes(
            provider_type=provider_type,
            category=category,
            keyword=effective_keyword,
            is_active=is_active,
        )
        return {
            "success": True,
            "schemes": schemes or [],
            "total": len(schemes) if schemes else 0,
        }
    except Exception as e:
        logger.error(f"Error fetching schemes: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch schemes: {str(e)}",
        )


@router.get("/crawl-status")
def get_crawl_status_endpoint():
    """
    Returns the most recent crawl log entries from the scheme_crawl_log table,
    enabling the UI to display live ✓ / ✗ status per data source.
    """
    try:
        recent_logs = get_recent_crawl_logs(limit=25)

        # Build map of the most recent crawl status per unique source name
        sources_status: Dict[str, Dict[str, Any]] = {}
        for log in recent_logs:
            s_name = log.get("source_name")
            if s_name and s_name not in sources_status:
                sources_status[s_name] = {
                    "source_name": s_name,
                    "source_url": log.get("source_url"),
                    "status": log.get("status"),
                    "schemes_found": log.get("schemes_found", 0),
                    "error_message": log.get("error_message"),
                    "crawled_at": log.get("crawled_at"),
                }

        return {
            "success": True,
            "is_refreshing": is_refresh_in_progress(),
            "crawl_logs": recent_logs,
            "sources_status": list(sources_status.values()),
            "total_logs": len(recent_logs),
        }
    except Exception as e:
        logger.error(f"Error fetching crawl status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch crawl status: {str(e)}",
        )


@router.get("/{id}")
def get_scheme_detail_endpoint(id: str):
    """
    Returns full details for a single scheme by its unique ID.
    """
    try:
        scheme = get_scheme_by_id(id)
        if not scheme:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Scheme with ID '{id}' not found.",
            )
        return {
            "success": True,
            "scheme": scheme,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching scheme by ID {id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch scheme: {str(e)}",
        )


@router.post("/refresh")
def refresh_schemes_endpoint(days_threshold: int = Query(90, description="Threshold in days to mark older schemes stale")):
    """
    Triggers the full discovery pipeline:
    collect_all_sources() -> extract_all() -> save_schemes() -> log_crawl_results() -> mark_stale_schemes().
    Includes locking to prevent concurrent overlapping executions.
    """
    result = run_full_refresh(days_threshold=days_threshold)
    if not result.get("success") and result.get("status") == "already_running":
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=result
        )
    elif not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Pipeline execution failed.")
        )
    return result
