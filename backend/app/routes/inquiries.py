"""
Inquiry & Chat Messaging Routes
"""

from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional
from app.models.inquiry import InquiryCreateRequest, MessageCreateRequest, ReplyCreateRequest
from app.services.inquiry_service import (
    create_inquiry,
    get_inquiry_by_id,
    add_message_to_inquiry,
    reply_to_inquiry,
    list_inquiries,
)

router = APIRouter(prefix="/api/inquiries", tags=["Inquiries"])


@router.post("")
def create_inquiry_endpoint(req: InquiryCreateRequest):
    """Create a new inquiry or product inquiry thread."""
    if not req.product_id and not req.order_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="product_id or order_id is required")

    inq = create_inquiry(req.model_dump())
    return {
        "success": True,
        "inquiry": inq
    }


@router.post("/{id}/message")
def add_message_endpoint(id: str, req: MessageCreateRequest):
    """Add a new message into an existing inquiry conversation thread."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message text is required")

    updated_inq, new_msg = add_message_to_inquiry(
        inquiry_id=id,
        sender=req.sender or "buyer",
        sender_name=req.sender_name,
        text=req.text
    )
    if not updated_inq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")

    return {
        "success": True,
        "inquiry": updated_inq,
        "message": new_msg
    }


@router.post("/{id}/reply")
def reply_inquiry_endpoint(id: str, req: ReplyCreateRequest):
    """Seller reply endpoint."""
    if not req.reply or not req.reply.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reply text is required")

    updated_inq = reply_to_inquiry(id, req.reply)
    if not updated_inq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")

    return {
        "success": True,
        "inquiry": updated_inq
    }


@router.get("")
def list_inquiries_endpoint(
    artisan_id: Optional[str] = Query(None),
    buyer_phone: Optional[str] = Query(None),
    order_id: Optional[str] = Query(None)
):
    """List inquiries with optional filters."""
    inquiries = list_inquiries(
        artisan_id=artisan_id,
        buyer_phone=buyer_phone,
        order_id=order_id
    )
    return {
        "success": True,
        "inquiries": inquiries
    }
