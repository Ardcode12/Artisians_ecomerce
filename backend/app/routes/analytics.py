"""
Analytics & Business Insights Routes
Endpoints for Screen 1 (Insights Home), Screen 2 (Product Performance Funnel),
Screen 3 (Activity History Timeline), and Voice Readout.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Response, status

from app.services.analytics_service import (
    get_business_insights,
    get_product_performance,
    get_activity_history,
)

logger = logging.getLogger("AnalyticsRoutes")

router = APIRouter(tags=["Analytics & Insights"])


@router.get("/analytics/insights")
@router.get("/api/analytics/insights")
def get_insights_endpoint(
    response: Response,
    period: str = Query("30_days", description="Period filter: 7_days, 30_days, 90_days, 1_year, all_time"),
    artisan_id: Optional[str] = Query("demo_artisan"),
):
    """
    Returns aggregated metrics, revenue trend curve points, top products,
    and business recommendations matching Screen 1.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return get_business_insights(artisan_id=artisan_id, period=period)


@router.get("/analytics/products/{product_id}")
@router.get("/api/analytics/products/{product_id}")
def get_product_performance_endpoint(
    product_id: str,
    response: Response,
):
    """
    Returns product funnel metrics (views -> inquiries -> orders),
    conversion callout, and price history timeline matching Screen 2.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    data = get_product_performance(product_id=product_id)
    return data


@router.get("/analytics/history")
@router.get("/api/analytics/history")
def get_activity_history_endpoint(
    response: Response,
    filter: str = Query("All", description="Filter: All, Orders, Listings, Inquiries, Payments"),
    q: Optional[str] = Query(None, description="Search query"),
    artisan_id: Optional[str] = Query("demo_artisan"),
):
    """
    Returns chronologically grouped activity timeline matching Screen 3.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return get_activity_history(artisan_id=artisan_id, filter_type=filter, search_q=q)


@router.get("/analytics/speech-summary")
@router.get("/api/analytics/speech-summary")
def get_speech_summary_endpoint(
    response: Response,
    artisan_id: Optional[str] = Query("demo_artisan"),
    lang: Optional[str] = Query("en"),
):
    """
    Returns plain text summary for voice synthesis ('Read my stats aloud') in requested language.
    """
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    insights = get_business_insights(artisan_id=artisan_id, period="30_days")
    l = (lang or "en").lower()
    if l.startswith("hi"):
        chosen_text = insights.get("speech_summary_hi") or insights.get("speech_summary", "")
    elif l.startswith("ta"):
        chosen_text = insights.get("speech_summary_ta") or insights.get("speech_summary", "")
    else:
        chosen_text = insights.get("speech_summary_en") or insights.get("speech_summary", "")

    return {
        "success": True,
        "summary_text": chosen_text,
        "speech_summary_en": insights.get("speech_summary_en", ""),
        "speech_summary_hi": insights.get("speech_summary_hi", ""),
        "speech_summary_ta": insights.get("speech_summary_ta", ""),
    }


@router.get("/analytics/speech-audio")
@router.get("/api/analytics/speech-audio")
def get_speech_audio_endpoint(
    artisan_id: Optional[str] = Query("demo_artisan"),
    period: str = Query("30_days"),
):
    """
    Synthesizes and streams spoken voice audio using Sarvam AI Bulbul (with multi-tier fallback).
    """
    from fastapi.responses import FileResponse, JSONResponse
    from pathlib import Path
    from app.services.reel.voiceover import synthesize_with_fallback

    insights = get_business_insights(artisan_id=artisan_id, period=period)
    text = insights.get("speech_summary", "")
    if not text:
        text = "Your business insights: Total revenue is 8,450 rupees, up 18 percent. You received 12 orders and 340 views."

    clean_text = (
        text.replace("₹", "")
        .replace("%", " percent")
        .replace("↑", "up ")
        .replace("↓", "down ")
        .replace("–", " to ")
        .replace("—", " to ")
    )

    out_dir = Path("data/cache/speech")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = str(out_dir / f"speech_{artisan_id}_{period}.wav")

    try:
        synthesize_with_fallback(clean_text, "en-IN", out_path)
        return FileResponse(out_path, media_type="audio/wav")
    except Exception as e:
        logger.error(f"Failed to synthesize audio: {e}")
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

