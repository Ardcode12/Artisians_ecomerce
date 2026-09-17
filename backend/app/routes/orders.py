"""
Order Routes
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from app.models.order import OrderCreateRequest, OrderUpdateRequest
from app.models import dump_model
from app.services.order_service import (
    create_order,
    list_orders,
    get_order_by_id,
    update_order,
    delete_order,
    get_order_stats
)

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


@router.get("/stats")
def get_order_stats_endpoint(
    artisan_id: Optional[str] = Query(None),
    buyer_phone: Optional[str] = Query(None)
):
    """Return aggregated earnings stats for the Earnings screen."""
    return get_order_stats(artisan_id=artisan_id, buyer_phone=buyer_phone)


@router.get("/{id}")
def get_single_order_endpoint(id: str):
    """Get single order details by ID."""
    order = get_order_by_id(id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order '{id}' not found")
    return {
        "success": True,
        "order": order
    }


@router.put("/{id}")
@router.patch("/{id}")
def update_order_endpoint(id: str, req: OrderUpdateRequest):
    """Update order details (e.g. status or delivery address)."""
    updated = update_order(id, req.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order '{id}' not found")
    return {
        "success": True,
        "order": updated
    }


@router.delete("/{id}")
def delete_order_endpoint(id: str):
    """Delete order by ID."""
    deleted = delete_order(id)
    return {
        "success": True,
        "deleted": deleted,
        "id": id
    }
