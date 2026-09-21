"""
Voice Call Service — Automated Seller Order-Confirmation via Twilio
============================================================
Flow:
  Order arrives (GeM / ONDC / webhook)
      → Backend validates order
      → Twilio REST API places outbound call to seller
      → Seller hears order details in their preferred language
      → Seller presses 1 (confirm) or 2 (reject)
      → Twilio webhook POSTs result back to /api/calls/webhook/gather
      → Backend records result + updates order status

Supported languages (Twilio voice + BCP-47):
  en-IN  English (India)
  ta-IN  Tamil
  hi-IN  Hindi
  te-IN  Telugu
  kn-IN  Kannada
  ml-IN  Malayalam
  mr-IN  Marathi
  gu-IN  Gujarati
  bn-IN  Bengali
  pa-IN  Punjabi
"""

import os
import time
import uuid
import logging
import requests
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("VoiceCallService")

# --------------------------------------------------------------------------- #
# Configuration — loaded from environment, never hardcoded                    #
# --------------------------------------------------------------------------- #

def _twilio_credentials() -> tuple[str, str, str]:
    sid   = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_ = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
    return sid, token, from_

def _public_base_url() -> str:
    url = (os.getenv("WEBHOOK_BASE_URL") or os.getenv("PUBLIC_BASE_URL") or "").strip().rstrip("/")
    return url

# --------------------------------------------------------------------------- #
# DB helpers — all call records persisted in SQLite voice_calls table         #
# --------------------------------------------------------------------------- #

def _row_to_dict(row) -> Optional[Dict[str, Any]]:
    """Convert a sqlite3.Row or tuple to a plain dict."""
    if row is None:
        return None
    if isinstance(row, dict):
        return row
    # sqlite3.Row supports keys()
    try:
        return dict(row)
    except Exception:
        cols = [
            "call_id", "order_id", "seller_phone", "seller_name", "seller_lang",
            "product_title", "quantity", "amount", "order_source", "buyer_name",
            "delivery_address", "status", "twilio_call_sid", "seller_response",
            "created_at", "updated_at",
        ]
        return dict(zip(cols, row))


def _upsert_call(record: Dict[str, Any]) -> None:
    """Insert or replace a full call record in the DB (PostgreSQL + SQLite compatible)."""
    from app.db.database import get_db
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO voice_calls (
            call_id, order_id, seller_phone, seller_name, seller_lang,
            product_title, quantity, amount, order_source, buyer_name,
            delivery_address, status, twilio_call_sid, seller_response,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (call_id) DO UPDATE SET
            order_id = excluded.order_id,
            seller_phone = excluded.seller_phone,
            seller_name = excluded.seller_name,
            seller_lang = excluded.seller_lang,
            product_title = excluded.product_title,
            quantity = excluded.quantity,
            amount = excluded.amount,
            order_source = excluded.order_source,
            buyer_name = excluded.buyer_name,
            delivery_address = excluded.delivery_address,
            status = excluded.status,
            twilio_call_sid = excluded.twilio_call_sid,
            seller_response = excluded.seller_response,
            updated_at = excluded.updated_at
        """, (
            record.get("call_id"), record.get("order_id"),
            record.get("seller_phone"), record.get("seller_name"),
            record.get("seller_lang"), record.get("product_title"),
            record.get("quantity", 1), record.get("amount"),
            record.get("order_source"), record.get("buyer_name"),
            record.get("delivery_address"), record.get("status"),
            record.get("twilio_call_sid"), record.get("seller_response"),
            record.get("created_at"), record.get("updated_at"),
        ))


def _update_call_fields(call_id: str, **fields) -> Optional[Dict[str, Any]]:
    """Update specific columns of a call record and return updated record."""
    from app.db.database import get_db
    if not fields:
        return _get_call(call_id)
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [call_id]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE voice_calls SET {set_clause} WHERE call_id = ?",
            values
        )
        cursor.execute(
            "SELECT * FROM voice_calls WHERE call_id = ?", (call_id,)
        )
        row = cursor.fetchone()
        return _row_to_dict(row)


def _get_call(call_id: str) -> Optional[Dict[str, Any]]:
    """Fetch a call record by call_id."""
    from app.db.database import get_db
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM voice_calls WHERE call_id = ?", (call_id,)
        )
        row = cursor.fetchone()
        return _row_to_dict(row)

# --------------------------------------------------------------------------- #
# Language Configuration                                                       #
# --------------------------------------------------------------------------- #
LANGUAGE_CONFIG: Dict[str, Dict[str, Any]] = {
    "ta-IN": {
        "label":   "Tamil (தமிழ்)",
        "voice":   "Polly.Aditi",          # Twilio Amazon Polly voice
        "lang":    "ta-IN",
        "greeting": "வணக்கம்.",
        "new_order": "உங்களுக்கு ஒரு புதிய ஆர்டர் வந்துள்ளது.",
        "product_label": "தயாரிப்பு",
        "qty_label":     "அளவு",
        "amount_label":  "மொத்த தொகை",
        "source_label":  "ஆர்டர் மூலம்",
        "confirm_ask":   "இந்த ஆர்டரை ஏற்கிறீர்களா? ஏற்க 1 அழுத்துங்கள், நிராகரிக்க 2 அழுத்துங்கள்.",
        "confirmed":     "நன்றி. ஆர்டர் உறுதிப்படுத்தப்பட்டது.",
        "rejected":      "சரி. ஆர்டர் நிராகரிக்கப்பட்டதாகப் பதிவு செய்யப்படுகிறது.",
        "invalid":       "தவறான உள்ளீடு. மீண்டும் முயற்சிக்கவும்.",
        "no_response":   "பதில் இல்லை. பின்னர் மீண்டும் அழைப்போம்.",
    },
    "hi-IN": {
        "label":   "Hindi (हिंदी)",
        "voice":   "Polly.Aditi",
        "lang":    "hi-IN",
        "greeting": "नमस्ते।",
        "new_order": "आपके लिए एक नया ऑर्डर आया है।",
        "product_label": "उत्पाद",
        "qty_label":     "मात्रा",
        "amount_label":  "कुल राशि",
        "source_label":  "ऑर्डर स्रोत",
        "confirm_ask":   "क्या आप इस ऑर्डर को स्वीकार करते हैं? स्वीकार करने के लिए 1 दबाएं, अस्वीकार करने के लिए 2 दबाएं।",
        "confirmed":     "धन्यवाद। ऑर्डर की पुष्टि हो गई है।",
        "rejected":      "ठीक है। ऑर्डर अस्वीकार के रूप में दर्ज किया गया है।",
        "invalid":       "गलत इनपुट। कृपया फिर से प्रयास करें।",
        "no_response":   "कोई प्रतिक्रिया नहीं। हम बाद में फिर से कॉल करेंगे।",
    },
    "en-IN": {
        "label":   "English (India)",
        "voice":   "Polly.Raveena",
        "lang":    "en-IN",
        "greeting": "Hello.",
        "new_order": "You have received a new order.",
        "product_label": "Product",
        "qty_label":     "Quantity",
        "amount_label":  "Total Amount",
        "source_label":  "Order Source",
        "confirm_ask":   "Do you confirm this order? Press 1 to confirm, or press 2 to reject.",
        "confirmed":     "Thank you. Your order has been confirmed.",
        "rejected":      "Understood. The order has been recorded as rejected.",
        "invalid":       "Invalid input. Please try again.",
        "no_response":   "No response received. We will call again later.",
    },
    "te-IN": {
        "label":   "Telugu (తెలుగు)",
        "voice":   "Polly.Aditi",
        "lang":    "te-IN",
        "greeting": "నమస్కారం.",
        "new_order": "మీకు కొత్త ఆర్డర్ వచ్చింది.",
        "product_label": "ఉత్పత్తి",
        "qty_label":     "పరిమాణం",
        "amount_label":  "మొత్తం",
        "source_label":  "ఆర్డర్ మూలం",
        "confirm_ask":   "ఈ ఆర్డర్‌ను నిర్ధారించాలా? నిర్ధారించడానికి 1 నొక్కండి, తిరస్కరించడానికి 2 నొక్కండి.",
        "confirmed":     "ధన్యవాదాలు. ఆర్డర్ నిర్ధారించబడింది.",
        "rejected":      "సరే. ఆర్డర్ తిరస్కరించబడినట్లు నమోదు చేయబడింది.",
        "invalid":       "చెల్లని ఇన్‌పుట్. దయచేసి మళ్లీ ప్రయత్నించండి.",
        "no_response":   "స్పందన లేదు. తర్వాత మళ్లీ కాల్ చేస్తాం.",
    },
    "kn-IN": {
        "label":   "Kannada (ಕನ್ನಡ)",
        "voice":   "Polly.Aditi",
        "lang":    "kn-IN",
        "greeting": "ನಮಸ್ಕಾರ.",
        "new_order": "ನಿಮಗೆ ಹೊಸ ಆರ್ಡರ್ ಬಂದಿದೆ.",
        "product_label": "ಉತ್ಪನ್ನ",
        "qty_label":     "ಪ್ರಮಾಣ",
        "amount_label":  "ಒಟ್ಟು ಮೊತ್ತ",
        "source_label":  "ಆರ್ಡರ್ ಮೂಲ",
        "confirm_ask":   "ಈ ಆರ್ಡರ್ ದೃಢೀಕರಿಸುತ್ತೀರಾ? ದೃಢೀಕರಿಸಲು 1 ಒತ್ತಿ, ತಿರಸ್ಕರಿಸಲು 2 ಒತ್ತಿ.",
        "confirmed":     "ಧನ್ಯವಾದ. ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ.",
        "rejected":      "ಸರಿ. ಆರ್ಡರ್ ತಿರಸ್ಕರಿಸಲಾಗಿದೆ ಎಂದು ದಾಖಲಾಗಿದೆ.",
        "invalid":       "ತಪ್ಪು ಇನ್‌ಪುಟ್. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        "no_response":   "ಪ್ರತಿಕ್ರಿಯೆ ಇಲ್ಲ. ನಂತರ ಮತ್ತೆ ಕರೆ ಮಾಡುತ್ತೇವೆ.",
    },
    "ml-IN": {
        "label":   "Malayalam (മലയാളം)",
        "voice":   "Polly.Aditi",
        "lang":    "ml-IN",
        "greeting": "നമസ്കാരം.",
        "new_order": "നിങ്ങൾക്ക് ഒരു പുതിയ ഓർഡർ വന്നിട്ടുണ്ട്.",
        "product_label": "ഉൽപ്പന്നം",
        "qty_label":     "അളവ്",
        "amount_label":  "മൊത്തം തുക",
        "source_label":  "ഓർഡർ ഉറവിടം",
        "confirm_ask":   "ഈ ഓർഡർ സ്ഥിരീകരിക്കണമോ? സ്ഥിരീകരിക്കാൻ 1 അമർത്തുക, നിരസിക്കാൻ 2 അമർത്തുക.",
        "confirmed":     "നന്ദി. ഓർഡർ സ്ഥിരീകരിച്ചു.",
        "rejected":      "ശരി. ഓർഡർ നിരസിച്ചതായി രേഖപ്പെടുത്തി.",
        "invalid":       "തെറ്റായ ഇൻപുട്ട്. വീണ്ടും ശ്രമിക്കുക.",
        "no_response":   "പ്രതികരണം ഇല്ല. പിന്നീട് വീണ്ടും വിളിക്കും.",
    },
}

DEFAULT_LANGUAGE = "en-IN"


def get_lang_config(lang_code: str) -> Dict[str, Any]:
    """Return language config, falling back to English."""
    return LANGUAGE_CONFIG.get(lang_code, LANGUAGE_CONFIG[DEFAULT_LANGUAGE])


def supported_languages() -> list[Dict[str, str]]:
    """Return list of supported language options for UI dropdown."""
    return [{"code": k, "label": v["label"]} for k, v in LANGUAGE_CONFIG.items()]


# --------------------------------------------------------------------------- #
# TwiML Builder — builds the voice script for the outbound call               #
# --------------------------------------------------------------------------- #

def _say_or_play(text: str, lang_code: str, base: str, lc: dict) -> str:
    """
    Returns a TwiML fragment: <Play> (Sarvam audio) for regional languages,
    or <Say> (Polly) for English and Hindi.
    """
    from app.services.sarvam_tts_service import needs_sarvam, get_audio_url
    if needs_sarvam(lang_code) and base.startswith("https://"):
        audio_url = get_audio_url(text, lang_code, base)
        if audio_url:
            return f'<Play>{audio_url}</Play>'
    # Fallback to Polly Say (always works for en-IN / hi-IN)
    return f'<Say voice="{lc["voice"]}" language="{lc["lang"]}">{text}</Say>'


def build_twiml_greeting(call_id: str, lang_code: str, product: str, quantity: int,
                          amount: str, order_source: str) -> str:
    """
    Build TwiML XML that Twilio executes when seller picks up.
    Uses Sarvam TTS <Play> for Tamil/Telugu/Kannada/Malayalam,
    and Amazon Polly <Say> for English/Hindi.
    """
    lc = get_lang_config(lang_code)
    base = _public_base_url()

    message = (
        f"{lc['greeting']} "
        f"{lc['new_order']} "
        f"{lc['product_label']}: {product}. "
        f"{lc['qty_label']}: {quantity}. "
        f"{lc['amount_label']}: {amount}. "
        f"{lc['source_label']}: {order_source}. "
        f"{lc['confirm_ask']}"
    )

    audio_fragment = _say_or_play(message, lang_code, base, lc)

    if base.startswith(("http://", "https://")) and not ("localhost" in base or "127.0.0.1" in base):
        gather_attr = f'action="{base}/api/calls/webhook/gather?call_id={call_id}" method="POST"'
    else:
        gather_attr = ""

    no_response_fragment = _say_or_play(lc['no_response'], lang_code, base, lc)

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" {gather_attr} timeout="10" finishOnKey="">
    {audio_fragment}
  </Gather>
  {no_response_fragment}
</Response>"""
    return twiml


def build_twiml_confirmed(lang_code: str) -> str:
    lc = get_lang_config(lang_code)
    base = _public_base_url()
    fragment = _say_or_play(lc['confirmed'], lang_code, base, lc)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  {fragment}
  <Hangup/>
</Response>"""


def build_twiml_rejected(lang_code: str) -> str:
    lc = get_lang_config(lang_code)
    base = _public_base_url()
    fragment = _say_or_play(lc['rejected'], lang_code, base, lc)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  {fragment}
  <Hangup/>
</Response>"""


def build_twiml_invalid(call_id: str, lang_code: str, product: str, quantity: int,
                         amount: str, order_source: str) -> str:
    """Re-prompt once on invalid input."""
    lc = get_lang_config(lang_code)
    base = _public_base_url()
    if base.startswith(("http://", "https://")) and not ("localhost" in base or "127.0.0.1" in base):
        gather_attr = f'action="{base}/api/calls/webhook/gather?call_id={call_id}" method="POST"'
    else:
        gather_attr = ""

    invalid_msg = f"{lc['invalid']} {lc['confirm_ask']}"
    audio_fragment    = _say_or_play(invalid_msg, lang_code, base, lc)
    no_resp_fragment  = _say_or_play(lc['no_response'], lang_code, base, lc)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" {gather_attr} timeout="10" finishOnKey="">
    {audio_fragment}
  </Gather>
  {no_resp_fragment}
</Response>"""


# --------------------------------------------------------------------------- #
# Core Call Trigger                                                            #
# --------------------------------------------------------------------------- #

def trigger_seller_confirmation_call(
    order_id: str,
    seller_phone: str,
    seller_name: str,
    seller_lang: str,
    product_title: str,
    quantity: int,
    amount: str,
    order_source: str,
    buyer_name: str = "",
    delivery_address: str = "",
) -> Dict[str, Any]:
    """
    Place an outbound Twilio voice call to the seller to confirm the order.

    Returns a call record dict with call_id, twilio_call_sid, and initial status.
    """
    sid, token, from_num = _twilio_credentials()

    if not sid or not token or not from_num:
        logger.error("[VOICE CALL] Twilio credentials not configured in .env")
        return {
            "success": False,
            "error": "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in .env",
            "call_id": None,
        }

    call_id = f"call-{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}"
    base = _public_base_url()

    now_iso = datetime.now(timezone.utc).isoformat()
    call_record = {
        "call_id":         call_id,
        "order_id":        order_id,
        "seller_phone":    seller_phone,
        "seller_name":     seller_name,
        "seller_lang":     seller_lang,
        "product_title":   product_title,
        "quantity":        quantity,
        "amount":          amount,
        "order_source":    order_source,
        "buyer_name":      buyer_name,
        "delivery_address": delivery_address,
        "status":          "triggering",
        "twilio_call_sid": None,
        "seller_response": None,   # "confirmed" | "rejected" | "no_response" | "failed"
        "created_at":      now_iso,
        "updated_at":      now_iso,
    }
    _upsert_call(call_record)

    try:
        twiml = build_twiml_greeting(
            call_id=call_id,
            lang_code=seller_lang,
            product=product_title,
            quantity=quantity,
            amount=amount,
            order_source=order_source,
        )

        call_url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Calls.json"
        data_fields = [
            ("To", seller_phone),
            ("From", from_num),
            ("Twiml", twiml),
            ("Timeout", "30"),
        ]

        if base.startswith(("http://", "https://")) and not ("localhost" in base or "127.0.0.1" in base):
            data_fields.append(("StatusCallback", f"{base}/api/calls/webhook/status?call_id={call_id}"))
            data_fields.append(("StatusCallbackMethod", "POST"))
            for _ev in ["initiated", "ringing", "answered", "completed"]:
                data_fields.append(("StatusCallbackEvent", _ev))

        res = requests.post(call_url, data=data_fields, auth=(sid, token), timeout=10)
        res_data = res.json()

        if res.status_code in (200, 201) and "sid" in res_data:
            twilio_sid = res_data["sid"]
            _update_call_fields(call_id,
                twilio_call_sid=twilio_sid,
                status="call_initiated",
                updated_at=datetime.now(timezone.utc).isoformat()
            )
            logger.info(f"[VOICE CALL] Call placed → seller={seller_phone} | SID={twilio_sid} | call_id={call_id}")
            return {
                "success":         True,
                "call_id":         call_id,
                "twilio_call_sid": twilio_sid,
                "status":          "call_initiated",
                "seller_phone":    seller_phone,
                "message":         f"Call initiated to {seller_name} ({seller_phone})",
            }
        else:
            err_msg = res_data.get("message") or res_data.get("code") or str(res_data)
            _update_call_fields(call_id, status="call_failed", seller_response="failed")
            logger.error(f"[VOICE CALL] Twilio error: {err_msg}")
            return {
                "success": False,
                "call_id": call_id,
                "error":   f"Twilio API error: {err_msg}",
                "status":  "call_failed",
            }

    except Exception as e:
        _update_call_fields(call_id, status="call_failed", seller_response="failed")
        logger.exception(f"[VOICE CALL] Exception during call trigger: {e}")
        return {
            "success": False,
            "call_id": call_id,
            "error":   str(e),
            "status":  "call_failed",
        }


# --------------------------------------------------------------------------- #
# Webhook Handlers                                                             #
# --------------------------------------------------------------------------- #

def handle_voice_webhook(call_id: str, lang: str, product: str, qty: int,
                          amount: str, source: str) -> str:
    """Return TwiML for the initial voice greeting (Twilio calls this URL)."""
    record = _get_call(call_id)
    if record:
        _update_call_fields(call_id, status="ringing",
                            updated_at=datetime.now(timezone.utc).isoformat())
    return build_twiml_greeting(call_id, lang, product, qty, amount, source)


def handle_gather_webhook(call_id: str, digit: Optional[str]) -> str:
    """
    Called by Twilio after seller presses a digit.
    digit=1 → confirmed, digit=2 → rejected, else → invalid/retry
    """
    record = _get_call(call_id)
    now_iso = datetime.now(timezone.utc).isoformat()

    lang = record.get("seller_lang", DEFAULT_LANGUAGE) if record else DEFAULT_LANGUAGE
    product  = record.get("product_title", "") if record else ""
    quantity = record.get("quantity", 1) if record else 1
    amount   = record.get("amount", "") if record else ""
    source   = record.get("order_source", "") if record else ""

    if digit == "1":
        if record:
            _update_call_fields(call_id, status="seller_confirmed",
                                seller_response="confirmed", updated_at=now_iso)
        logger.info(f"[VOICE CALL] {call_id} → Seller CONFIRMED")
        return build_twiml_confirmed(lang)

    elif digit == "2":
        if record:
            _update_call_fields(call_id, status="seller_rejected",
                                seller_response="rejected", updated_at=now_iso)
        logger.info(f"[VOICE CALL] {call_id} → Seller REJECTED")
        return build_twiml_rejected(lang)

    else:
        logger.warning(f"[VOICE CALL] {call_id} → Invalid digit: {digit!r}")
        return build_twiml_invalid(call_id, lang, product, quantity, amount, source)


def handle_status_webhook(call_id: str, call_status: str, twilio_sid: str = "") -> None:
    """
    Twilio posts call status events: initiated, ringing, answered, completed, failed, etc.
    """
    record = _get_call(call_id)
    if not record:
        return

    now_iso = datetime.now(timezone.utc).isoformat()

    status_map = {
        "initiated":  "call_initiated",
        "ringing":    "ringing",
        "answered":   "answered",
        "in-progress": "in_progress",
        "completed":  "completed",
        "busy":       "seller_busy",
        "no-answer":  "no_response",
        "failed":     "call_failed",
        "canceled":   "call_cancelled",
    }

    mapped = status_map.get(call_status.lower(), call_status.lower())
    updates: Dict[str, Any] = {"updated_at": now_iso}

    # Only overwrite terminal status if seller hasn't already responded
    if record.get("seller_response") not in ("confirmed", "rejected"):
        if call_status.lower() in ("completed", "no-answer", "failed", "busy", "canceled"):
            if not record.get("seller_response"):
                updates["seller_response"] = (
                    "no_response" if call_status.lower() in ("no-answer", "busy") else "failed"
                )
        updates["status"] = mapped

    if twilio_sid:
        updates["twilio_call_sid"] = twilio_sid

    _update_call_fields(call_id, **updates)
    logger.info(f"[VOICE CALL STATUS] call_id={call_id} | twilio_status={call_status} | mapped={mapped}")


# --------------------------------------------------------------------------- #
# Query helpers                                                               #
# --------------------------------------------------------------------------- #

def get_call_status(call_id: str) -> Optional[Dict[str, Any]]:
    """Fetch call record from SQLite (survives restarts)."""
    return _get_call(call_id)


def list_calls() -> list[Dict[str, Any]]:
    """List all call records from DB, most recent first."""
    from app.db.database import get_db
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM voice_calls ORDER BY created_at DESC LIMIT 200"
        )
        rows = cursor.fetchall()
        return [_row_to_dict(r) for r in rows if r]
