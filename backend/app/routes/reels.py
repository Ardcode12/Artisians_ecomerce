"""
Reel Generation & Auto-Publish Endpoints
"""

import uuid
import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Query, status

from app.models.reel_job import (
    ReelRequest,
    create_job,
    get_job,
    list_jobs,
)
from app.services.product_service import get_product_by_id
from app.services.reel.pipeline import run_reel_pipeline

logger = logging.getLogger("ReelsRouter")

router = APIRouter(prefix="/reels", tags=["AI Ad-Reels"])


def _extract_user_id(req: Request) -> str:
    """Helper to extract user ID."""
    u = req.headers.get("x-user-id")
    if u:
        return u
    auth = req.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        token = auth.split(" ")[1]
        if token and len(token) > 5:
            return token
    return "artisan_default"


@router.post("/generate")
def generate_reel_endpoint(
    req: ReelRequest,
    bg: BackgroundTasks,
    request: Request,
):
    """
    Triggers generation of a 15-20s vertical AI Ad-Reel for a product,
    with voiceover narration, animated photo motion, and Instagram publication.
    """
    user_id = req.user_id or _extract_user_id(request)

    # 1. Verify product exists
    product = get_product_by_id(req.product_id)
    if not product:
        # Check if product_id is in request body or temp
        logger.warning(f"Product {req.product_id} not found in DB, using fallback mock product.")
        product = {
            "id": req.product_id,
            "title": "Authentic Handcrafted Product",
            "name": "Authentic Handcrafted Product",
            "category": "Handicraft",
            "craft_type": "Handicraft",
            "price": "650",
            "description": "Handmade with generational heritage craftsmanship.",
            "image_url": "",
            "artisan_name": "Local Artisan",
            "location": "India",
        }

    # 2. Extract images
    image_paths = []
    if product.get("image_url"):
        image_paths.append(product.get("image_url"))
    if product.get("images"):
        for img in product.get("images"):
            if img:
                image_paths.append(img)

    job_id = f"reel-{uuid.uuid4().hex[:12]}"

    # 3. Create job in SQLite
    create_job(
        job_id=job_id,
        user_id=user_id,
        product_id=req.product_id,
        style=req.style or "heritage",
        language=req.language or "ta-IN",
    )

    logger.info(f"Enqueuing Reel generation job {job_id} for product {req.product_id} (lang: {req.language}, style: {req.style})")

    # 4. Kick off background execution
    bg.add_task(
        run_reel_pipeline,
        job_id=job_id,
        user_id=user_id,
        product=product,
        image_paths=image_paths,
        language=req.language or "ta-IN",
        style=req.style or "heritage",
        post_to_instagram=req.post_to_instagram,
    )

    return {
        "success": True,
        "job_id": job_id,
        "status": "QUEUED",
        "stage": "Starting generation...",
        "progress": 5,
    }


@router.get("/job/{job_id}")
def get_job_status_endpoint(job_id: str):
    """Poll job status, progress, stage, video URL, and Instagram permalink."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reel job with ID '{job_id}' was not found"
        )

    return {
        "success": True,
        "job_id": job.id,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "video_url": job.video_url,
        "ig_permalink": job.ig_permalink,
        "caption": job.caption,
        "script": job.script_native,
        "script_english": job.script_english,
        "duration": job.duration_seconds,
        "error": job.error_message,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
    }


@router.get("/my-reels")
def list_my_reels_endpoint(
    request: Request,
    user_id: Optional[str] = Query(None),
    limit: int = Query(20),
):
    """List recent Reel generation jobs for the artisan."""
    uid = user_id or _extract_user_id(request)
    jobs = list_jobs(user_id=uid, limit=limit)
    return {
        "success": True,
        "reels": [j.as_dict() for j in jobs]
    }


@router.post("/job/{job_id}/retry")
def retry_job_endpoint(job_id: str, bg: BackgroundTasks, request: Request):
    """Retry a failed or incomplete Reel generation job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    product = get_product_by_id(job.product_id) or {
        "id": job.product_id,
        "title": "Artisan Craft",
        "category": "Handicraft",
        "price": "650"
    }
    image_paths = [product.get("image_url")] if product.get("image_url") else []

    bg.add_task(
        run_reel_pipeline,
        job_id=job.id,
        user_id=job.user_id,
        product=product,
        image_paths=image_paths,
        language=job.language or "ta-IN",
        style=job.style or "heritage",
        post_to_instagram=True,
    )
    return {"success": True, "job_id": job.id, "status": "QUEUED"}
