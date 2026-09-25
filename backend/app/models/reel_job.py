"""
Reel Job Models and Database Operations
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
from app.db.database import get_db


class ReelRequest(BaseModel):
    product_id: str
    user_id: Optional[str] = "artisan_default"
    language: str = "ta-IN"
    style: str = "heritage"          # heritage | festive | minimal
    post_to_instagram: bool = True
    image_url: Optional[str] = None
    images: Optional[List[str]] = None


class ReelJobData(BaseModel):
    id: str
    user_id: str
    product_id: str
    status: str                      # QUEUED | WRITING_SCRIPT | GENERATING_VOICE | RENDERING_VIDEO | UPLOADING | PUBLISHING_INSTAGRAM | COMPLETED | VIDEO_READY | FAILED
    stage: Optional[str] = None
    progress: int = 0
    style: Optional[str] = "heritage"
    language: Optional[str] = "ta-IN"
    script_native: Optional[str] = None
    script_english: Optional[str] = None
    caption: Optional[str] = None
    hashtags: Optional[str] = None
    local_path: Optional[str] = None
    video_url: Optional[str] = None
    ig_creation_id: Optional[str] = None
    ig_media_id: Optional[str] = None
    ig_permalink: Optional[str] = None
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None

    def as_dict(self) -> Dict[str, Any]:
        return self.dict()


def create_job(job_id: str, user_id: str, product_id: str,
               style: str = "heritage", language: str = "ta-IN") -> ReelJobData:
    """Create a new reel generation job record in SQLite."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO reel_jobs (
                id, user_id, product_id, status, stage, progress,
                style, language, created_at
            ) VALUES (?, ?, ?, 'QUEUED', 'Queued for generation...', 5, ?, ?, ?);
        """, (job_id, user_id or "artisan_default", product_id, style, language, now))

    return get_job(job_id)


def update_job(job_id: str, **kwargs):
    """Update fields on a reel job record."""
    if not kwargs:
        return
    now = datetime.now(timezone.utc).isoformat()
    fields = []
    values = []
    for k, v in kwargs.items():
        fields.append(f"{k} = ?")
        values.append(v)

    if kwargs.get("status") in ("COMPLETED", "VIDEO_READY", "FAILED"):
        fields.append("completed_at = ?")
        values.append(now)

    values.append(job_id)
    sql = f"UPDATE reel_jobs SET {', '.join(fields)} WHERE id = ?;"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, tuple(values))


def get_job(job_id: str) -> Optional[ReelJobData]:
    """Fetch single reel job by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM reel_jobs WHERE id = ? LIMIT 1;", (job_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return ReelJobData(**dict(row))


def list_jobs(user_id: Optional[str] = None, limit: int = 20) -> List[ReelJobData]:
    """List reel jobs for a user, sorted descending by creation time."""
    with get_db() as conn:
        cursor = conn.cursor()
        if user_id:
            cursor.execute("""
                SELECT * FROM reel_jobs
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?;
            """, (user_id, limit))
        else:
            cursor.execute("""
                SELECT * FROM reel_jobs
                ORDER BY created_at DESC
                LIMIT ?;
            """, (limit,))
        rows = cursor.fetchall()
        return [ReelJobData(**dict(r)) for r in rows]
