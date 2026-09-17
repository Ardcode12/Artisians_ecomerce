"""
Analytics Routes
Provides sales and catalog statistics for artisan dashboard.
"""

from fastapi import APIRouter, Query
from typing import Optional
from app.db.database import get_db

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview")
def get_analytics_overview(artisan_id: Optional[str] = Query(None)):
    """Compute live dashboard metrics for an artisan."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Count products
        if artisan_id:
            cursor.execute("SELECT COUNT(*) FROM products WHERE artisan_id = ?", (artisan_id,))
        else:
            cursor.execute("SELECT COUNT(*) FROM products")
        total_products = cursor.fetchone()[0]

        # Total sales calculation
        if artisan_id:
            cursor.execute("SELECT total_amount FROM orders WHERE artisan_id = ? AND status IN ('CONFIRMED', 'confirmed')", (artisan_id,))
        else:
            cursor.execute("SELECT total_amount FROM orders WHERE status IN ('CONFIRMED', 'confirmed')")
        order_rows = cursor.fetchall()

        total_sales_val = 0
        import re
        for r in order_rows:
            digits = re.sub(r"[^\d]", "", str(r[0]))
            if digits:
                total_sales_val += int(digits)

        # Count inquiries
        if artisan_id:
            cursor.execute("SELECT COUNT(*) FROM inquiries WHERE artisan_id = ?", (artisan_id,))
        else:
            cursor.execute("SELECT COUNT(*) FROM inquiries")
        total_inquiries = cursor.fetchone()[0]

    return {
        "success": True,
        "total_sales": f"₹{total_sales_val:,}",
        "total_sales_numeric": total_sales_val,
        "total_products": total_products,
        "total_inquiries": total_inquiries,
        "pending_confirmations": 0
    }
