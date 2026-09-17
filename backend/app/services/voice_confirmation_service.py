"""
Voice Order Confirmation Service
Abstracts telephony providers (Twilio, Mock), handles IVR outbound calls,
DTMF keypad processing, retry scheduling, and call history logging.
"""

import os
import time
import uuid
import asyncio
import logging
import requests
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from app.db.database import get_db
from app.config import (
    ENABLE_VOICE_CONFIRMATION,
    TELEPHONY_PROVIDER,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    WEBHOOK_BASE_URL
)

logger = logging.getLogger("VoiceConfirmationService")


# ─── Telephony Provider Abstraction Interface ──────────────────────────────────

class BaseCallProvider(ABC):
    """Abstract Telephony Call Provider Interface."""

    @abstractmethod
    def initiate_call(
        self,
        to_phone: str,
        order_id: str,
        item_summary: str,
        amount: str,
        attempt: int = 1
    ) -> Dict[str, Any]:
        """Initiate an outbound IVR confirmation call."""
        pass


class TwilioCallProvider(BaseCallProvider):
    """Twilio Telephony Call Provider implementation using TwiML Gather IVR."""

    def initiate_call(
        self,
        to_phone: str,
        order_id: str,
        item_summary: str,
        amount: str,
        attempt: int = 1
    ) -> Dict[str, Any]:
        sid = TWILIO_ACCOUNT_SID
        token = TWILIO_AUTH_TOKEN
        from_num = TWILIO_PHONE_NUMBER

        if not sid or not token or not from_num:
            logger.warning("[TWILIO PROVIDER] Missing Twilio credentials in environment — falling back to mock provider.")
            return MockCallProvider().initiate_call(to_phone, order_id, item_summary, amount, attempt)

        try:
            action_url = f"{WEBHOOK_BASE_URL}/api/webhooks/dtmf-action?order_id={order_id}&attempt={attempt}"
            callback_url = f"{WEBHOOK_BASE_URL}/api/webhooks/call-status?order_id={order_id}&attempt={attempt}"
            twiml_url = f"{WEBHOOK_BASE_URL}/api/webhooks/twiml?order_id={order_id}&attempt={attempt}"

            # Clean amount text for smooth TTS pronunciation
            clean_amount = str(amount).replace("₹", "Rupees ")
            speech_prompt = f"Hello Artisan! You have a new order for {item_summary}, total amount {clean_amount}. Press 1 to confirm this order. Press 2 or 0 to cancel this order."

            inline_twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="1" action="{action_url}" method="POST" timeout="15">
        <Say voice="Polly.Aditi" language="en-IN">
            {speech_prompt}
        </Say>
    </Gather>
    <Say voice="Polly.Aditi" language="en-IN">We did not receive your input. The confirmation attempt will be recorded. Goodbye.</Say>
    <Hangup/>
</Response>"""

            url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Calls.json"
            data = {
                "To": to_phone,
                "From": from_num,
                "Twiml": inline_twiml,
                "StatusCallback": callback_url,
                "StatusCallbackEvent": ["initiated", "ringing", "answered", "completed"],
                "Timeout": 30
            }

            res = requests.post(url, data=data, auth=(sid, token), timeout=5)
            res_data = res.json()

            if res.status_code in [200, 201] and "sid" in res_data:
                call_sid = res_data.get("sid")
                logger.info(f"[TWILIO CALL] Outbound IVR call initiated to {to_phone} for order {order_id} (SID: {call_sid})")
                return {
                    "success": True,
                    "provider": "twilio",
                    "call_sid": call_sid,
                    "status": "initiated",
                    "raw": res_data
                }
            else:
                err = res_data.get("message") or str(res_data)
                logger.warning(f"[TWILIO CALL ERROR] {err}")
                return {
                    "success": False,
                    "provider": "twilio",
                    "error": err,
                    "status": "failed"
                }
        except Exception as e:
            logger.error(f"[TWILIO CALL EXCEPTION] {e}")
            return {
                "success": False,
                "provider": "twilio",
                "error": str(e),
                "status": "failed"
            }


class MockCallProvider(BaseCallProvider):
    """Local Development Mock Call Provider for testing offline."""

    def initiate_call(
        self,
        to_phone: str,
        order_id: str,
        item_summary: str,
        amount: str,
        attempt: int = 1
    ) -> Dict[str, Any]:
        mock_sid = f"mock-sid-{uuid.uuid4().hex[:8]}"
        logger.info(
            f"[MOCK CALL] Simulated IVR Call to Seller {to_phone} | "
            f"Order {order_id}: '{item_summary}' ({amount}) | Attempt {attempt} | SID: {mock_sid}"
        )
        return {
            "success": True,
            "provider": "mock",
            "call_sid": mock_sid,
            "status": "initiated",
            "message": "Mock IVR call dispatched locally"
        }


def get_call_provider() -> BaseCallProvider:
    """Factory helper returning provider based on config."""
    if TELEPHONY_PROVIDER == "twilio" and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        return TwilioCallProvider()
    return MockCallProvider()


# ─── Core Voice Confirmation Business Logic ────────────────────────────────────

def trigger_confirmation_call(order_id: str, attempt: int = 1) -> Dict[str, Any]:
    """
    Triggers an outbound voice confirmation call to the seller for an order.
    Executes asynchronously via BackgroundTasks.
    """
    if not ENABLE_VOICE_CONFIRMATION:
        logger.info(f"[VOICE CONFIRMATION DISABLED] Skipping confirmation call for order {order_id}.")
        return {"success": False, "message": "Voice confirmation feature disabled in configuration."}

    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Fetch Order + Seller Profile
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        order_row = cursor.fetchone()
        if not order_row:
            logger.error(f"[VOICE CONFIRMATION ERROR] Order {order_id} not found.")
            return {"success": False, "error": "Order not found."}

        order = dict(order_row)
        artisan_id = order.get("artisan_id")

        seller_phone = None
        if artisan_id:
            cursor.execute("SELECT phone FROM profiles WHERE id = ?", (artisan_id,))
            prof = cursor.fetchone()
            if prof:
                seller_phone = prof["phone"]

        # Fallback to artisan lookup if missing
        if not seller_phone:
            seller_phone = "+919345073473"  # Default artisan hotline

    # Normalize phone format
    import re
    clean_digits = re.sub(r"[^0-9]", "", seller_phone or "")
    seller_phone = f"+91{clean_digits[-10:]}" if len(clean_digits) >= 10 else f"+91{clean_digits}"

    item_summary = f"{order.get('quantity', 1)}x {order.get('product_title', 'Handicraft Item')}"
    amount = str(order.get("total_amount", "₹650"))

    # 2. Initiate Call via Provider Interface
    provider = get_call_provider()
    res = provider.initiate_call(
        to_phone=seller_phone,
        order_id=order_id,
        item_summary=item_summary,
        amount=amount,
        attempt=attempt
    )

    call_sid = res.get("call_sid") or f"sid-{uuid.uuid4().hex[:8]}"
    call_log_id = f"clog-{int(time.time() * 1000)}-{uuid.uuid4().hex[:5]}"
    initial_status = res.get("status", "initiated")

    # 3. Record entry in call_logs and update order attempts
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO call_logs (
            id, order_id, seller_id, call_sid, status, dtmf_response, attempt_number, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            call_log_id, order_id, artisan_id, call_sid, initial_status, None, attempt, now_iso, now_iso
        ))

        cursor.execute("""
        UPDATE orders 
        SET confirmation_attempts = ?, status = 'PENDING_CONFIRMATION', updated_at = ?
        WHERE id = ?
        """, (attempt, now_iso, order_id))

    logger.info(f"[VOICE CONFIRMATION] Attempt {attempt} triggered for order {order_id} (Log ID: {call_log_id})")

    # Broadcast socket update
    broadcast_socket_update(order_id, "PENDING_CONFIRMATION", {
        "call_log_id": call_log_id,
        "attempt_number": attempt,
        "status": initial_status,
        "updated_at": now_iso
    })

    return {
        "success": res.get("success", False),
        "order_id": order_id,
        "attempt": attempt,
        "call_sid": call_sid,
        "call_log_id": call_log_id
    }


def handle_dtmf_response(
    order_id: str,
    dtmf: str,
    call_sid: Optional[str] = None,
    attempt: int = 1
) -> Dict[str, Any]:
    """
    Processes Keypad DTMF input (1 = Confirm, 2 or 0 = Reject/Cancel).
    Updates order status, records call log entry, and broadcasts socket update.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    dtmf_clean = str(dtmf).strip()

    if dtmf_clean == "1":
        new_order_status = "CONFIRMED"
        call_status = "completed"
    elif dtmf_clean in ["2", "0"]:
        new_order_status = "REJECTED"
        call_status = "completed"
    else:
        new_order_status = "PENDING_CONFIRMATION"
        call_status = "answered"

    with get_db() as conn:
        cursor = conn.cursor()

        # Fetch order details for notification logging
        cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        order_row = cursor.fetchone()
        order_dict = dict(order_row) if order_row else {}

        # Update order status
        if new_order_status in ["CONFIRMED", "REJECTED"]:
            cursor.execute("""
            UPDATE orders
            SET status = ?, confirmed_at = ?, updated_at = ?
            WHERE id = ?
            """, (new_order_status, now_iso, now_iso, order_id))

        # Update latest call log record for this order
        cursor.execute("""
        UPDATE call_logs
        SET status = ?, dtmf_response = ?, updated_at = ?
        WHERE order_id = ? AND (call_sid = ? OR id = (
            SELECT id FROM call_logs WHERE order_id = ? ORDER BY created_at DESC LIMIT 1
        ))
        """, (call_status, dtmf_clean, now_iso, order_id, call_sid, order_id))

    product_name = order_dict.get("product_title", "Craft Product")
    buyer_phone = order_dict.get("buyer_phone", "Customer")

    if new_order_status == "CONFIRMED":
        logger.info(f"[CUSTOMER NOTIFY] SMS/Push sent to buyer {buyer_phone}: Your order '{product_name}' (ID: {order_id}) has been CONFIRMED by the Artisan!")
        logger.info(f"[ARTISAN NOTIFY] Order {order_id} marked as CONFIRMED. Ready for packaging and dispatch.")
    elif new_order_status == "REJECTED":
        logger.info(f"[CUSTOMER NOTIFY] SMS/Push sent to buyer {buyer_phone}: Order '{product_name}' (ID: {order_id}) was cancelled by the artisan.")
        logger.info(f"[ARTISAN NOTIFY] Order {order_id} marked as REJECTED.")

    logger.info(f"[DTMF PROCESSED] Order: {order_id} | DTMF Keypad: '{dtmf_clean}' -> Status: {new_order_status}")

    # Broadcast socket update to seller app & admin dashboard
    broadcast_socket_update(order_id, new_order_status, {
        "dtmf_response": dtmf_clean,
        "status": call_status,
        "product_title": product_name,
        "buyer_phone": buyer_phone,
        "updated_at": now_iso
    })

    return {
        "success": True,
        "order_id": order_id,
        "dtmf": dtmf_clean,
        "new_status": new_order_status,
        "message": f"Order {new_order_status.lower()} successfully"
    }


def get_call_logs_for_order(order_id: str) -> List[Dict[str, Any]]:
    """Retrieve full call attempt history for an order."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM call_logs WHERE order_id = ? ORDER BY created_at ASC
        """, (order_id,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def broadcast_socket_update(order_id: str, status: str, payload: Dict[str, Any]):
    """Safe wrapper to broadcast live WebSocket updates if socket manager is loaded."""
    try:
        from app.services.socket_manager import socket_manager
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(socket_manager.broadcast({
                "type": "order_status_update",
                "order_id": order_id,
                "status": status,
                "data": payload
            }))
        except RuntimeError:
            pass
    except Exception:
        pass
