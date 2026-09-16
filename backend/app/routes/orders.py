"""
Order Routes
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from app.models.order import OrderCreateRequest
from app.models import dump_model
from app.services.order_service import create_order, list_orders

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("")
def create_order_endpoint(req: OrderCreateRequest):
    """Place a new order and create linked communication thread."""
    order = create_order(dump_model(req))
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
