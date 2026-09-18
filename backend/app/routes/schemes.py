"""
Government Schemes API Routes
Provides verified central & state welfare schemes, personalized artisan matching,
interactive checklist progress tracking, and crawler operations.
"""

import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from pydantic import BaseModel

from app.db.database import get_db
from app.services.schemes.storage import (
    get_all_schemes,
    get_scheme_by_id,
    get_recent_crawl_logs,
    get_user_scheme_progress,
    save_user_scheme_progress,
)
from app.services.schemes.matcher import get_matched_schemes
from app.services.schemes.scheduler import run_full_refresh, is_refresh_in_progress
from app.services.profile_service import get_profile_by_id_or_phone

logger = logging.getLogger("SchemesRoute")

router = APIRouter(tags=["Schemes"])


class ProgressPayload(BaseModel):
    user_id: Optional[str] = None
    phone: Optional[str] = None
    checked_conditions: Optional[List[int]] = None
    checked: Optional[List[int]] = None  # alias from spec
    documents_gathered: Optional[List[str]] = None
    docs: Optional[List[str]] = None  # alias from spec
    bookmarked: Optional[int] = None
    applied: Optional[int] = None


def _resolve_profile(
    user_id: Optional[str] = None,
    phone: Optional[str] = None,
    craft_type: Optional[str] = None,
    state: Optional[str] = None,
    request: Optional[Request] = None
) -> Dict[str, Any]:
    """Helper to resolve artisan profile from params, headers, or active session."""
    # 1. Try explicit craft/state override
    profile: Dict[str, Any] = {}
    if craft_type:
        profile["craft_type"] = craft_type
    if state:
        profile["state"] = state

    # 2. Check headers if request provided
    if request:
        h_uid = request.headers.get("x-user-id") or request.headers.get("user-id")
        h_phone = request.headers.get("x-user-phone") or request.headers.get("phone")
        if not user_id and h_uid:
            user_id = h_uid
        if not phone and h_phone:
            phone = h_phone

    # 3. Look up in profiles DB
    lookup_key = user_id or phone
    if lookup_key:
        found = get_profile_by_id_or_phone(lookup_key)
        if found:
            for k, v in found.items():
                if k not in profile or not profile[k]:
                    profile[k] = v

    # 4. Fallback to latest active profile in DB
    if not profile.get("craft_type"):
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM profiles WHERE craft_type IS NOT NULL AND craft_type != '' ORDER BY updated_at DESC LIMIT 1;")
            row = cursor.fetchone()
            if row:
                fallback_p = dict(row)
                for k, v in fallback_p.items():
                    if k not in profile or not profile[k]:
                        profile[k] = v

    # Defaults if completely empty
    if not profile.get("craft_type"):
        profile["craft_type"] = "Pottery"
    if not profile.get("state") and not profile.get("location"):
        profile["location"] = "Tamil Nadu"

    return profile


# ── 1. List Schemes Endpoint ────────────────────────────────────────────────
@router.get("/schemes")
@router.get("/api/schemes")
def list_schemes(
    response: Response,
    category: Optional[str] = Query(None, description="Filter by category (loans, training, recognition, registration, marketing)"),
    keyword: Optional[str] = Query(None, description="Search keyword"),
    q: Optional[str] = Query(None, description="Search query alias"),
    search: Optional[str] = Query(None, description="Search query alias"),
    provider_type: Optional[str] = Query(None, description="Filter: government / ngo"),
    is_active: bool = Query(True, description="Active status"),
):
    """Returns schemes directory filtered by category and search keyword."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    effective_kw = keyword or q or search
    schemes = get_all_schemes(
        provider_type=provider_type,
        category=category,
        keyword=effective_kw,
        is_active=is_active,
    )
    return {
        "success": True,
        "schemes": schemes or [],
        "total": len(schemes) if schemes else 0,
    }


# ── 2. Matched Schemes (Personalized for Artisan) ───────────────────────────
@router.get("/schemes/matched")
@router.get("/api/schemes/matched")
def matched_schemes(
    request: Request,
    user_id: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    craft_type: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
):
    """
    Ranks schemes against the artisan's craft category and state.
    Surfaces the top 1-3 schemes they qualify for with match badges.
    """
    profile = _resolve_profile(user_id=user_id, phone=phone, craft_type=craft_type, state=state, request=request)
    all_schemes = get_all_schemes(is_active=True)
    matched = get_matched_schemes(profile, all_schemes)
    return {
        "success": True,
        "profile_used": {
            "craft_type": profile.get("craft_type"),
            "location": profile.get("location") or profile.get("state"),
        },
        "schemes": matched,
    }


# ── 3. Crawl Status (Audit & Health) ─────────────────────────────────────────
@router.get("/schemes/crawl-status")
@router.get("/api/schemes/crawl-status")
def get_crawl_status():
    """Live verification and crawler log status per official data source."""
    logs = get_recent_crawl_logs(limit=25)
    return {
        "success": True,
        "is_refreshing": is_refresh_in_progress(),
        "crawl_logs": logs,
        "total_logs": len(logs),
    }


# ── 4. Trigger Refresh Pipeline ─────────────────────────────────────────────
@router.post("/schemes/refresh")
@router.post("/api/schemes/refresh")
def refresh_schemes(days_threshold: int = Query(90)):
    """Triggers background crawler refresh for official government schemes."""
    return run_full_refresh(days_threshold=days_threshold)


# ── 5. Single Scheme Details ────────────────────────────────────────────────
@router.get("/schemes/{scheme_id}")
@router.get("/api/schemes/{scheme_id}")
def scheme_detail(scheme_id: str):
    """Returns full scheme specification and checklist data by scheme ID or slug."""
    scheme = get_scheme_by_id(scheme_id)
    if not scheme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Scheme '{scheme_id}' not found")
    
    # Return directly so it matches both `{ ...scheme }` and `{ "scheme": scheme }`
    res = dict(scheme)
    res["success"] = True
    res["scheme"] = scheme
    return res


# ── 6. Scheme Progress & Self-Assessment ─────────────────────────────────────
@router.get("/schemes/{scheme_id}/progress")
@router.get("/api/schemes/{scheme_id}/progress")
def get_progress(scheme_id: str, user_id: Optional[str] = Query(None), phone: Optional[str] = Query(None)):
    """Fetches artisan's checked eligibility and collected documents for a scheme."""
    uid = user_id or phone or "guest_artisan"
    progress = get_user_scheme_progress(uid, scheme_id)
    return {
        "success": True,
        "progress": progress or {
            "user_id": uid,
            "scheme_id": scheme_id,
            "checked_conditions": [],
            "documents_gathered": [],
            "bookmarked": 0,
            "applied": 0,
        },
    }


@router.post("/schemes/{scheme_id}/progress")
@router.post("/api/schemes/{scheme_id}/progress")
def save_progress(scheme_id: str, payload: ProgressPayload):
    """Saves artisan's checklist progress, gathered documents, and application status."""
    uid = payload.user_id or payload.phone or "guest_artisan"
    checked = payload.checked_conditions if payload.checked_conditions is not None else payload.checked
    docs = payload.documents_gathered if payload.documents_gathered is not None else payload.docs

    saved = save_user_scheme_progress(
        user_id=uid,
        scheme_id=scheme_id,
        checked_conditions=checked,
        documents_gathered=docs,
        bookmarked=payload.bookmarked,
        applied=payload.applied,
    )
    return {
        "success": True,
        "progress": saved,
    }
