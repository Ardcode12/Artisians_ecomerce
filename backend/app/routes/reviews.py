"""
Client Reviews Routes
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from app.models.review import ReviewCreateRequest, ReviewReplyRequest
from app.models import dump_model
from app.services.review_service import (
    create_review,
    list_reviews,
    reply_to_review,
    get_review_by_id,
)

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.get("")
def list_reviews_endpoint(
    artisan_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None)
):
    """List client reviews with optional artisan or product filtering."""
    reviews = list_reviews(artisan_id=artisan_id, product_id=product_id)
    return {
        "success": True,
        "reviews": reviews
    }


@router.post("")
def create_review_endpoint(req: ReviewCreateRequest):
    """Create a new client review."""
    if not req.comment or not req.comment.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Review comment is required")

    review = create_review(dump_model(req))
    return {
        "success": True,
        "review": review
    }


@router.post("/{id}/reply")
def reply_review_endpoint(id: str, req: ReviewReplyRequest):
    """Artisan reply to a client review."""
    if not req.reply or not req.reply.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reply text is required")

    updated = reply_to_review(id, req.reply)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    return {
        "success": True,
        "review": updated
    }
