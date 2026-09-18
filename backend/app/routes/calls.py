"""
Voice Call Routes — Automated Seller Order-Confirmation System
==============================================================
Endpoints:
  POST /api/calls/trigger          → Trigger outbound confirmation call to seller
  GET  /api/calls/{call_id}        → Poll call status
  GET  /api/calls                  → List all calls (admin/test)
  POST /api/calls/webhook/voice    → TwiML voice script (Twilio hits this on connect)
  POST /api/calls/webhook/gather   → Handle seller DTMF input (1=confirm, 2=reject)
  POST /api/calls/webhook/status   → Twilio call-status event callback
  GET  /api/calls/languages        → Supported language list for UI
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
from app.services.voice_call_service import (
    trigger_seller_confirmation_call,
    handle_voice_webhook,
    handle_gather_webhook,
    handle_status_webhook,
    get_call_status,
    list_calls,
    supported_languages,
)

logger = logging.getLogger("CallRoutes")

router = APIRouter(prefix="/api/calls", tags=["Voice Calls"])


# --------------------------------------------------------------------------- #
# Request / Response Models                                                   #
# --------------------------------------------------------------------------- #

class TriggerCallRequest(BaseModel):
    order_id:         str  = Field(..., description="Unique order identifier from external portal (GeM/ONDC/etc.)")
    seller_phone:     str  = Field(..., description="Seller's registered phone number (E.164 format: +91XXXXXXXXXX)")
    seller_name:      str  = Field("Seller", description="Seller's name")
    seller_lang:      str  = Field("en-IN", description="BCP-47 language code for the call voice (e.g. ta-IN, hi-IN)")
    product_title:    str  = Field(..., description="Product name as listed on the portal")
    quantity:         int  = Field(1, description="Units ordered")
    amount:           str  = Field(..., description="Total order value (e.g. ₹1,250)")
    order_source:     str  = Field("GeM", description="Source portal: GeM | ONDC | Flipkart | Amazon | Other")
    buyer_name:       str  = Field("", description="Buyer's name (optional, shown to seller)")
    delivery_address: str  = Field("", description="Delivery address (optional)")


# --------------------------------------------------------------------------- #
# Trigger Call                                                                 #
# --------------------------------------------------------------------------- #

@router.post("/trigger")
def trigger_call_endpoint(req: TriggerCallRequest):
    """
    Accepts order details and places a Twilio outbound voice call to the seller.
    The seller hears order details and confirms or rejects by pressing 1 or 2.
    """
    if not req.seller_phone.startswith("+"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="seller_phone must be in E.164 format (e.g. +919080176624)"
        )

    result = trigger_seller_confirmation_call(
        order_id=req.order_id,
        seller_phone=req.seller_phone,
        seller_name=req.seller_name,
        seller_lang=req.seller_lang,
        product_title=req.product_title,
        quantity=req.quantity,
        amount=req.amount,
        order_source=req.order_source,
        buyer_name=req.buyer_name,
        delivery_address=req.delivery_address,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.get("error", "Failed to trigger call")
        )
    return result


# --------------------------------------------------------------------------- #
# Status Polling                                                               #
# --------------------------------------------------------------------------- #

@router.get("/languages")
def get_languages_endpoint():
    """Return list of supported languages for the call system."""
    return {"success": True, "languages": supported_languages()}


@router.get("")
def list_calls_endpoint():
    """List all call records (most recent first). For admin/test use."""
    return {"success": True, "calls": list_calls()}


@router.get("/{call_id}")
def get_call_status_endpoint(call_id: str):
    """Poll the status of a specific call."""
    record = get_call_status(call_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Call '{call_id}' not found")
    return {"success": True, "call": record}


# --------------------------------------------------------------------------- #
# Twilio Webhooks (must return TwiML XML with Content-Type: text/xml)         #
# --------------------------------------------------------------------------- #

@router.post("/webhook/voice")
@router.get("/webhook/voice")
async def voice_webhook_endpoint(
    call_id:  str = Query(""),
    lang:     str = Query("en-IN"),
    product:  str = Query("Handicraft Item"),
    qty:      int = Query(1),
    amount:   str = Query(""),
    source:   str = Query("External Portal"),
):
    """
    Twilio calls this URL when the seller picks up.
    Returns TwiML: greet seller, read order details, ask to press 1 or 2.
    """
    twiml = handle_voice_webhook(
        call_id=call_id,
        lang=lang,
        product=product,
        qty=qty,
        amount=amount,
        source=source,
    )
    return Response(content=twiml, media_type="text/xml")


@router.post("/webhook/gather")
async def gather_webhook_endpoint(
    request: Request,
    call_id: str = Query(""),
):
    """
    Twilio posts the digit the seller pressed after the Gather prompt.
    digit=1 → confirmed, digit=2 → rejected.
    """
    form_data = await request.form()
    digit = form_data.get("Digits", "")
    logger.info(f"[GATHER WEBHOOK] call_id={call_id} | Digits={digit!r}")
    twiml = handle_gather_webhook(call_id=call_id, digit=digit or None)
    return Response(content=twiml, media_type="text/xml")


@router.post("/webhook/status")
async def status_webhook_endpoint(
    request: Request,
    call_id: str = Query(""),
):
    """
    Twilio posts call-status updates: ringing, answered, completed, failed, etc.
    This records the raw Twilio status even when no digit was pressed.
    """
    form_data = await request.form()
    call_status = form_data.get("CallStatus", "")
    twilio_sid  = form_data.get("CallSid", "")
    logger.info(f"[STATUS WEBHOOK] call_id={call_id} | CallStatus={call_status} | SID={twilio_sid}")
    handle_status_webhook(call_id=call_id, call_status=call_status, twilio_sid=twilio_sid)
    return Response(content="<?xml version='1.0'?><Response/>", media_type="text/xml")
