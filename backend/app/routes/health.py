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
        cursor.execute("SELECT COUNT(*) AS artisan_count FROM profiles WHERE role='artisan'")
        artisan_count = cursor.fetchone()["artisan_count"]

        cursor.execute("SELECT COUNT(*) AS product_count FROM products")
        product_count = cursor.fetchone()["product_count"]

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "Artisans E-commerce Backend (FastAPI)",
        "database": "Local PostgreSQL",
        "port": PORT,
        "savedProfilesCount": artisan_count,
        "savedProductsCount": product_count
    }
