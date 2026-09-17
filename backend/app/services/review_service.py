"""
Review Service
Handles persistent storage of client reviews and artisan replies in SQLite.
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.db.database import get_db

logger = logging.getLogger("ReviewService")


def create_review(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new client review."""
    review_id = f"rev-{int(time.time() * 1000)}-{uuid.uuid4().hex[:5]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    artisan_id = data.get("artisan_id")
    product_id = data.get("product_id") or ""
    product_title = data.get("product_title") or ""
    reviewer_name = (data.get("reviewer_name") or "Client").strip()
    reviewer_phone = data.get("reviewer_phone") or ""
    rating = int(data.get("rating") or 5)
    rating = max(1, min(5, rating))
    comment = (data.get("comment") or "").strip()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO reviews (
            id, artisan_id, product_id, product_title, reviewer_name,
            reviewer_phone, rating, comment, reply, replied_at,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
        """, (
            review_id, artisan_id, product_id, product_title, reviewer_name,
            reviewer_phone, rating, comment, now_iso, now_iso
        ))

    logger.info(f"[REVIEW CREATED] ID: {review_id} | Client: {reviewer_name} | Rating: {rating}")
    return get_review_by_id(review_id) or {}


def get_review_by_id(review_id: str) -> Optional[Dict[str, Any]]:
    """Fetch single review by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reviews WHERE id = ?", (review_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None


def list_reviews(artisan_id: Optional[str] = None, product_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """List reviews filtered by artisan_id or product_id."""
    query = "SELECT * FROM reviews WHERE 1=1"
    params = []

    if artisan_id:
        query += " AND (artisan_id = ? OR artisan_id IS NULL)"
        params.append(artisan_id)

    if product_id:
        query += " AND product_id = ?"
        params.append(product_id)

    query += " ORDER BY created_at DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def reply_to_review(review_id: str, reply: str) -> Optional[Dict[str, Any]]:
    """Add seller reply to client review."""
    now_iso = datetime.now(timezone.utc).isoformat()
    clean_reply = reply.strip()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE reviews SET
            reply = ?,
            replied_at = ?,
            updated_at = ?
        WHERE id = ?
        """, (clean_reply, now_iso, now_iso, review_id))

    return get_review_by_id(review_id)
