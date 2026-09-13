"""
Order Service
Handles buyer orders and automated conversation thread generation.
"""

import time
import uuid
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.db.database import get_db
from app.services.inquiry_service import create_inquiry

logger = logging.getLogger("OrderService")


def create_order(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new order and automatically create a linked inquiry conversation thread."""
    order_id = f"ord-{int(time.time() * 1000)}-{uuid.uuid4().hex[:5]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    product_id = data.get("product_id") or ""
    product_title = data.get("product_title") or "Handcrafted Item"
    product_image = data.get("product_image") or ""
    artisan_id = data.get("artisan_id")
    artisan_name = data.get("artisan_name") or "Artisan"
    buyer_phone = data.get("buyer_phone") or ""
    buyer_name = data.get("buyer_name") or "Buyer"
    buyer_address = data.get("buyer_address") or ""
    quantity = int(data.get("quantity") or 1)
    total_amount = str(data.get("total_amount") or "₹650")
    status = "confirmed"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO orders (
            id, product_id, product_title, product_image, artisan_id, artisan_name,
            buyer_phone, buyer_name, buyer_address, quantity, total_amount,
            status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id, product_id, product_title, product_image, artisan_id, artisan_name,
            buyer_phone, buyer_name, buyer_address, quantity, total_amount,
            status, now_iso, now_iso
        ))

    # Auto-link inquiry thread
    try:
        inquiry_text = (
            f"Hello! I have placed an order for {quantity}x \"{product_title}\". "
            f"Total amount: {total_amount}. Shipping to: {buyer_address or 'Address on file'}. "
            f"Looking forward to it!"
        )
        create_inquiry({
            "id": f"inq-order-{order_id}",
            "order_id": order_id,
            "product_id": product_id,
            "product_title": product_title,
            "product_image": product_image,
            "artisan_id": artisan_id,
            "artisan_name": artisan_name,
            "buyer_phone": buyer_phone,
            "buyer_name": buyer_name,
            "buyer_type": "Order Confirmed",
            "message": inquiry_text,
        })
    except Exception as e:
        logger.warning(f"Failed to auto-create order inquiry: {e}")

    logger.info(f"[ORDER CREATED] ID: {order_id} | Product: {product_title} | Buyer: {buyer_phone}")
    return get_order_by_id(order_id) or {}


def get_order_by_id(order_id: str) -> Optional[Dict[str, Any]]:
    """Fetch single order by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None


def list_orders(buyer_phone: Optional[str] = None, artisan_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """List orders filtered by buyer phone or artisan ID."""
    query = "SELECT * FROM orders WHERE 1=1"
    params = []

    if buyer_phone:
        query += " AND buyer_phone = ?"
        params.append(buyer_phone)

    if artisan_id:
        query += " AND artisan_id = ?"
        params.append(artisan_id)

    query += " ORDER BY created_at DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
