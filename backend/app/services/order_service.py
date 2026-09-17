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


def update_order(order_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Update order status or address."""
    existing = get_order_by_id(order_id)
    if not existing:
        return None

    status = updates.get("status") or existing.get("status")
    buyer_address = updates.get("buyer_address") or existing.get("buyer_address")
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE orders SET
            status = ?,
            buyer_address = ?,
            updated_at = ?
        WHERE id = ?
        """, (status, buyer_address, now_iso, order_id))

    return get_order_by_id(order_id)


def delete_order(order_id: str) -> bool:
    """Delete an order by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        return cursor.rowcount > 0


def get_order_stats(artisan_id: Optional[str] = None, buyer_phone: Optional[str] = None) -> Dict[str, Any]:
    """Compute earnings statistics from real orders for the Earnings screen."""
    query = "SELECT * FROM orders WHERE 1=1"
    params: List[Any] = []

    if artisan_id:
        query += " AND artisan_id = ?"
        params.append(artisan_id)
    if buyer_phone:
        query += " AND buyer_phone = ?"
        params.append(buyer_phone)

    query += " ORDER BY created_at ASC"

    orders = []
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        orders = [dict(r) for r in cursor.fetchall()]

    PLATFORM_FEE_RATE = 0.10  # 10% platform commission

    total_revenue = 0.0
    total_fees = 0.0
    monthly: Dict[str, float] = {}
    transactions = []

    for o in orders:
        # Parse numeric amount from strings like "₹1,200" or "1200"
        raw = str(o.get("total_amount", "0")).replace("₹", "").replace(",", "").strip()
        try:
            amount = float(raw)
        except ValueError:
            amount = 0.0

        total_revenue += amount

        fee = round(amount * PLATFORM_FEE_RATE, 2)
        total_fees += fee

        # Monthly bucketing (year-month key)
        created = o.get("created_at", "")
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            month_key = dt.strftime("%b")
        except Exception:
            month_key = "?"

        monthly[month_key] = monthly.get(month_key, 0.0) + amount

        transactions.append({
            "id": o.get("id", ""),
            "product": o.get("product_title", "Handcrafted Item"),
            "buyer": o.get("buyer_name", "Buyer"),
            "amount": amount,
            "date": created[:10] if created else "",
            "type": "bulk" if amount >= 5000 else "sale",
            "status": o.get("status", "confirmed"),
        })
        # Add fee row
        transactions.append({
            "id": f"fee-{o.get('id','')}",
            "product": "Platform commission (10%)",
            "buyer": "",
            "amount": -fee,
            "date": created[:10] if created else "",
            "type": "fee",
            "status": "deducted",
        })

    net_earnings = total_revenue - total_fees

    # Build monthly chart data (last 6 months present in data)
    monthly_chart = [{"month": k, "amount": v} for k, v in monthly.items()]

    return {
        "success": True,
        "total_orders": len(orders),
        "total_revenue": round(total_revenue, 2),
        "total_fees": round(total_fees, 2),
        "net_earnings": round(net_earnings, 2),
        "monthly_chart": monthly_chart,
        "transactions": transactions,
    }


