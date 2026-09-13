"""
Health Check Route
"""

from fastapi import APIRouter
from datetime import datetime, timezone
from app.db.database import get_db
from app.config import PORT

router = APIRouter(tags=["Health"])


@router.get("/api/health")
def health_check():
    """Returns backend system status and database record statistics."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM profiles WHERE role='artisan'")
        artisan_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM products")
        product_count = cursor.fetchone()[0]

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "Artisans E-commerce Backend (FastAPI)",
        "database": "Local SQLite (On-Device)",
        "port": PORT,
        "savedProfilesCount": artisan_count,
        "savedProductsCount": product_count
    }
