"""
Telephony Webhook Routes
Handles dynamic IVR TwiML XML speech generation and DTMF keypad response callbacks from Twilio.
Supports multi-language TTS (English, Hindi, Tamil) and ngrok browser warning bypass.
"""

import logging
from fastapi import APIRouter, Request, Response, Query, HTTPException, status
from typing import Optional
from app.services.order_service import get_order_by_id
from app.services.voice_confirmation_service import handle_dtmf_response
from app.db.database import get_db
from app.config import WEBHOOK_BASE_URL

logger = logging.getLogger("TelephonyWebhooks")

router = APIRouter(prefix="/api/webhooks", tags=["Webhooks"])

# Multi-Language Voice Prompt Dictionary
LANGUAGE_PROMPTS = {
    "english": {
        "voice": "Polly.Aditi",
        "lang": "en-IN",
        "prompt": "Hello Artisan! You have a new order for {quantity} quantity of {product_title}, total amount {total_amount}. Press 1 to confirm this order. Press 2 or 0 to cancel this order.",
        "not_found": "Order details could not be found. Goodbye.",
        "no_input": "We did not receive your input. The confirmation attempt will be recorded. Goodbye.",
        "confirmed": "Thank you! Your order has been confirmed successfully. Have a great day!",
        "rejected": "Your order has been cancelled. Have a great day!"
    },
    "hindi": {
        "voice": "Polly.Aditi",
        "lang": "hi-IN",
        "prompt": "नमस्ते कारीगर! आपके पास {product_title} की {quantity} मात्रा का एक नया ऑर्डर आया है, कुल राशि {total_amount} रुपये। इस ऑर्डर की पुष्टि करने के लिए 1 दबाएं। इस ऑर्डर को रद्द करने के लिए 2 या 0 दबाएं।",
        "not_found": "ऑर्डर विवरण नहीं मिल सका। धन्यवाद।",
        "no_input": "हमें आपका इनपुट प्राप्त नहीं हुआ। धन्यवाद।",
        "confirmed": "धन्यवाद! आपका ऑर्डर सफलतापूर्वक स्वीकृत कर लिया गया है।",
        "rejected": "आपका ऑर्डर रद्द कर दिया गया है।"
    },
    "tamil": {
        "voice": "Polly.Valluvar",
        "lang": "ta-IN",
        "prompt": "வணக்கம் கைவினைஞரே! உங்களுக்கு {product_title} இன் {quantity} அளவிற்கு ஒரு புதிய ஆர்டர் வந்துள்ளது. மொத்த தொகை {total_amount}. இந்த ஆர்டரை உறுதிப்படுத்த 1 அழுத்தவும். ரத்து செய்ய 2 அல்லது 0 அழுத்தவும்.",
        "not_found": "ஆர்டர் விவரங்கள் கிடைக்கவில்லை. நன்றி.",
        "no_input": "உங்கள் பதில் கிடைக்கவில்லை. நன்றி.",
        "confirmed": "நன்றி! உங்கள் ஆர்டர் வெற்றிகரமாக உறுதி செய்யப்பட்டது.",
        "rejected": "உங்கள் ஆர்டர் ரத்து செய்யப்பட்டது."
    }
}


def _get_artisan_language(artisan_id: Optional[str]) -> str:
    """Fetch artisan preferred language from database profile (defaults to english)."""
    if not artisan_id:
        return "english"
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT language FROM profiles WHERE id = ?", (artisan_id,))
            row = cursor.fetchone()
            if row and row["language"]:
                lang_clean = str(row["language"]).strip().lower()
                if lang_clean in LANGUAGE_PROMPTS:
                    return lang_clean
    except Exception:
        pass
    return "english"


@router.api_route("/twiml", methods=["GET", "POST"])
async def twiml_voice_prompt(
    request: Request,
    order_id: str = Query(...),
    attempt: int = Query(1)
):
    """
    Returns TwiML XML response for Twilio Voice Outbound IVR call.
    Dynamically loads order details and artisan language preference.
    Gathers single digit keypad input (1 = Confirm, 2 or 0 = Cancel).
    Points gather action to /api/webhooks/dtmf-action.
    """
    headers = {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/xml; charset=utf-8"
    }

    order = get_order_by_id(order_id)
    if not order:
        xml_not_found = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi" language="en-IN">Order details could not be found. Goodbye.</Say>
    <Hangup/>
</Response>"""
        return Response(content=xml_not_found, media_type="application/xml", headers=headers)

    artisan_id = order.get("artisan_id")
    lang_key = _get_artisan_language(artisan_id)
    lang_config = LANGUAGE_PROMPTS.get(lang_key, LANGUAGE_PROMPTS["english"])

    product_title = order.get("product_title") or "Handicraft item"
    quantity = order.get("quantity") or 1
    total_amount = order.get("total_amount") or "₹650"

    # Clean amount text for smooth TTS pronunciation
    clean_amount = str(total_amount).replace("₹", "Rupees ")

    speech_prompt = lang_config["prompt"].format(
        quantity=quantity,
        product_title=product_title,
        total_amount=clean_amount
    )

    action_url = f"{WEBHOOK_BASE_URL}/api/webhooks/dtmf-action?order_id={order_id}&attempt={attempt}"

    twiml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather numDigits="1" action="{action_url}" method="POST" timeout="15">
        <Say voice="{lang_config['voice']}" language="{lang_config['lang']}">
            {speech_prompt}
        </Say>
    </Gather>
    <Say voice="{lang_config['voice']}" language="{lang_config['lang']}">{lang_config['no_input']}</Say>
    <Hangup/>
</Response>"""

    logger.info(f"[TWIML GENERATED] Order: {order_id} | Language: {lang_key} | Action: {action_url}")
    return Response(content=twiml_content, media_type="application/xml", headers=headers)


@router.api_route("/dtmf-action", methods=["GET", "POST"])
async def process_dtmf_keypad_action(
    request: Request,
    order_id: Optional[str] = Query(None),
    attempt: Optional[int] = Query(1)
):
    """
    Handles DTMF keypad entry callback (Gather Action) when artisan presses 1 (Confirm) or 2/0 (Reject).
    Updates DB order status, notifies customer & artisan, and speaks confirmation response TwiML.
    """
    headers = {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/xml; charset=utf-8"
    }

    try:
        form_data = await request.form()
        payload = dict(form_data)
    except Exception:
        try:
            payload = await request.json()
        except Exception:
            payload = {}

    target_order_id = order_id or payload.get("order_id") or payload.get("orderId")
    if not target_order_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="order_id is required")

    digits_raw = payload.get("Digits") or payload.get("dtmf") or payload.get("dtmf_response") or "1"
    dtmf = str(digits_raw).strip()
    call_sid = payload.get("CallSid") or payload.get("call_sid")

    # Process order status update & notifications
    res = handle_dtmf_response(
        order_id=target_order_id,
        dtmf=dtmf,
        call_sid=call_sid,
        attempt=int(attempt or 1)
    )

    # Load language for spoken TwiML feedback
    order = get_order_by_id(target_order_id)
    artisan_id = order.get("artisan_id") if order else None
    lang_key = _get_artisan_language(artisan_id)
    lang_config = LANGUAGE_PROMPTS.get(lang_key, LANGUAGE_PROMPTS["english"])

    is_confirmed = (dtmf == "1")
    action_speech = lang_config["confirmed"] if is_confirmed else lang_config["rejected"]

    twiml_feedback = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{lang_config['voice']}" language="{lang_config['lang']}">{action_speech}</Say>
    <Hangup/>
</Response>"""

    logger.info(f"[DTMF KEYPAD ACTION] Order: {target_order_id} | Digits: '{dtmf}' | Confirmed: {is_confirmed}")

    # Return XML if called by Twilio or browser
    if not request.headers.get("accept", "").startswith("application/json"):
        return Response(content=twiml_feedback, media_type="application/xml", headers=headers)

    return {"success": True, "result": res, "twiml": twiml_feedback}


@router.api_route("/call-status", methods=["GET", "POST"])
async def process_call_status_callback(
    request: Request,
    order_id: Optional[str] = Query(None),
    attempt: Optional[int] = Query(1)
):
    """
    Pure StatusCallback lifecycle listener (initiated, ringing, answered, completed).
    MUST NOT return <Hangup/> or speech tags to avoid cancelling the live call flow!
    """
    headers = {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/xml; charset=utf-8"
    }

    try:
        form_data = await request.form()
        payload = dict(form_data)
    except Exception:
        payload = {}

    target_order_id = order_id or payload.get("order_id")
    call_status = payload.get("CallStatus") or payload.get("status") or "received"

    logger.info(f"[CALL STATUS CALLBACK] Order: {target_order_id} | CallStatus: {call_status}")

    # Return empty TwiML XML response for Twilio StatusCallback requests
    empty_twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response/>"""

    return Response(content=empty_twiml, media_type="application/xml", headers=headers)
