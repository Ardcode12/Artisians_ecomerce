"""
Order Routes
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, status
from typing import Optional, Dict, Any
from app.models.order import OrderCreateRequest
from app.services.order_service import create_order, list_orders, get_order_by_id, update_order_status
from app.services.voice_confirmation_service import trigger_confirmation_call, get_call_logs_for_order
from app.config import ENABLE_VOICE_CONFIRMATION

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("")
def create_order_endpoint(req: OrderCreateRequest, background_tasks: BackgroundTasks):
    """Place a new order and enqueue async Voice Confirmation IVR call."""
    order = create_order(req.model_dump())
    
    if ENABLE_VOICE_CONFIRMATION and order and order.get("id"):
        background_tasks.add_task(trigger_confirmation_call, order["id"], 1)

    return {
        "success": True,
        "order": order
    }


@router.get("")
def list_orders_endpoint(
    buyer_phone: Optional[str] = Query(None),
    artisan_id: Optional[str] = Query(None)
):
    """List orders with filters."""
    orders = list_orders(buyer_phone=buyer_phone, artisan_id=artisan_id)
    return {
        "success": True,
        "orders": orders
    }


@router.patch("/{order_id}/status")
def patch_order_status_endpoint(order_id: str, body: Dict[str, Any]):
    """Manually update order status (Confirm / Reject fallback)."""
    new_status = body.get("status")
    if not new_status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status field is required")

    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    update_order_status(order_id, new_status)
    updated_order = get_order_by_id(order_id)
    return {
        "success": True,
        "order": updated_order
    }


@router.post("/{order_id}/retry-call")
def retry_confirmation_call_endpoint(order_id: str, background_tasks: BackgroundTasks):
    """Manually trigger / retry Voice Confirmation call for an order."""
    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    next_attempt = int(order.get("confirmation_attempts") or 0) + 1
    background_tasks.add_task(trigger_confirmation_call, order_id, next_attempt)

    return {
        "success": True,
        "message": f"Confirmation call retry attempt {next_attempt} enqueued for order {order_id}",
        "order_id": order_id,
        "attempt": next_attempt
    }


@router.get("/{order_id}/call-logs")
def get_order_call_logs_endpoint(order_id: str):
    """Retrieve full call attempt history logs for an order."""
    order = get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    logs = get_call_logs_for_order(order_id)
    return {
        "success": True,
        "order_id": order_id,
        "call_logs": logs
    }
