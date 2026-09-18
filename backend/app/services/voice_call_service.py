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
    url = os.getenv("PUBLIC_BASE_URL", "http://localhost:5000").rstrip("/")
    return url

# --------------------------------------------------------------------------- #
# In-memory call store (replace with DB table in production)                  #
# --------------------------------------------------------------------------- #
# Key: call_sid  → value: call record dict
CALL_STORE: Dict[str, Dict[str, Any]] = {}

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

def build_twiml_greeting(call_id: str, lang_code: str, product: str, quantity: int,
                          amount: str, order_source: str) -> str:
    """
    Build TwiML XML that Twilio executes when seller picks up.
    The seller hears order details and presses 1 or 2 to respond.
    """
    lc = get_lang_config(lang_code)
    base = _public_base_url()
    gather_url = f"{base}/api/calls/webhook/gather"

    message = (
        f"{lc['greeting']} "
        f"{lc['new_order']} "
        f"{lc['product_label']}: {product}. "
        f"{lc['qty_label']}: {quantity}. "
        f"{lc['amount_label']}: {amount}. "
        f"{lc['source_label']}: {order_source}. "
        f"{lc['confirm_ask']}"
    )

    # Polly voices handle romanized Tamil/Hindi reasonably; for better output
    # use a neural TTS (Sarvam/Krutrim) piped through a custom TwiML <Play>.
    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="{gather_url}?call_id={call_id}" method="POST" timeout="10" finishOnKey="">
    <Say voice="{lc['voice']}" language="{lc['lang']}">{message}</Say>
  </Gather>
  <Say voice="{lc['voice']}" language="{lc['lang']}">{lc['no_response']}</Say>
</Response>"""
    return twiml


def build_twiml_confirmed(lang_code: str) -> str:
    lc = get_lang_config(lang_code)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="{lc['voice']}" language="{lc['lang']}">{lc['confirmed']}</Say>
  <Hangup/>
</Response>"""


def build_twiml_rejected(lang_code: str) -> str:
    lc = get_lang_config(lang_code)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="{lc['voice']}" language="{lc['lang']}">{lc['rejected']}</Say>
  <Hangup/>
</Response>"""


def build_twiml_invalid(call_id: str, lang_code: str, product: str, quantity: int,
                         amount: str, order_source: str) -> str:
    """Re-prompt once on invalid input."""
    lc = get_lang_config(lang_code)
    base = _public_base_url()
    gather_url = f"{base}/api/calls/webhook/gather"

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="{gather_url}?call_id={call_id}" method="POST" timeout="10" finishOnKey="">
    <Say voice="{lc['voice']}" language="{lc['lang']}">{lc['invalid']} {lc['confirm_ask']}</Say>
  </Gather>
  <Say voice="{lc['voice']}" language="{lc['lang']}">{lc['no_response']}</Say>
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
    twiml_url = f"{base}/api/calls/webhook/voice?call_id={call_id}&lang={seller_lang}&product={requests.utils.quote(product_title)}&qty={quantity}&amount={requests.utils.quote(amount)}&source={requests.utils.quote(order_source)}"
    status_url = f"{base}/api/calls/webhook/status?call_id={call_id}"

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
    CALL_STORE[call_id] = call_record

    try:
        call_url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Calls.json"
        payload = {
            "To":         seller_phone,
            "From":       from_num,
            "Url":        twiml_url,
            "StatusCallback": status_url,
            "StatusCallbackMethod": "POST",
            "StatusCallbackEvent": "initiated ringing answered completed",
            "Timeout":    30,
        }
        res = requests.post(call_url, data=payload, auth=(sid, token), timeout=10)
        res_data = res.json()

        if res.status_code in (200, 201) and "sid" in res_data:
            twilio_sid = res_data["sid"]
            call_record["twilio_call_sid"] = twilio_sid
            call_record["status"] = "call_initiated"
            call_record["updated_at"] = datetime.now(timezone.utc).isoformat()
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
            call_record["status"] = "call_failed"
            call_record["seller_response"] = "failed"
            logger.error(f"[VOICE CALL] Twilio error: {err_msg}")
            return {
                "success": False,
                "call_id": call_id,
                "error":   f"Twilio API error: {err_msg}",
                "status":  "call_failed",
            }

    except Exception as e:
        call_record["status"] = "call_failed"
        call_record["seller_response"] = "failed"
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
    record = CALL_STORE.get(call_id)
    if record:
        record["status"] = "ringing"
        record["updated_at"] = datetime.now(timezone.utc).isoformat()
    return build_twiml_greeting(call_id, lang, product, qty, amount, source)


def handle_gather_webhook(call_id: str, digit: Optional[str]) -> str:
    """
    Called by Twilio after seller presses a digit.
    digit=1 → confirmed, digit=2 → rejected, else → invalid/retry
    """
    record = CALL_STORE.get(call_id)
    now_iso = datetime.now(timezone.utc).isoformat()

    lang = record.get("seller_lang", DEFAULT_LANGUAGE) if record else DEFAULT_LANGUAGE
    product  = record.get("product_title", "") if record else ""
    quantity = record.get("quantity", 1) if record else 1
    amount   = record.get("amount", "") if record else ""
    source   = record.get("order_source", "") if record else ""

    if digit == "1":
        if record:
            record["status"] = "seller_confirmed"
            record["seller_response"] = "confirmed"
            record["updated_at"] = now_iso
        logger.info(f"[VOICE CALL] {call_id} → Seller CONFIRMED")
        return build_twiml_confirmed(lang)

    elif digit == "2":
        if record:
            record["status"] = "seller_rejected"
            record["seller_response"] = "rejected"
            record["updated_at"] = now_iso
        logger.info(f"[VOICE CALL] {call_id} → Seller REJECTED")
        return build_twiml_rejected(lang)

    else:
        logger.warning(f"[VOICE CALL] {call_id} → Invalid digit: {digit!r}")
        return build_twiml_invalid(call_id, lang, product, quantity, amount, source)


def handle_status_webhook(call_id: str, call_status: str, twilio_sid: str = "") -> None:
    """
    Twilio posts call status events: initiated, ringing, answered, completed, failed, etc.
    """
    record = CALL_STORE.get(call_id)
    if not record:
        return

    now_iso = datetime.now(timezone.utc).isoformat()
    record["updated_at"] = now_iso

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

    # Only overwrite terminal status if seller hasn't already responded
    if record.get("seller_response") not in ("confirmed", "rejected"):
        if call_status.lower() in ("completed", "no-answer", "failed", "busy", "canceled"):
            if not record.get("seller_response"):
                record["seller_response"] = "no_response" if call_status.lower() in ("no-answer", "busy") else "failed"
        record["status"] = mapped

    if twilio_sid:
        record["twilio_call_sid"] = twilio_sid

    logger.info(f"[VOICE CALL STATUS] call_id={call_id} | twilio_status={call_status} | mapped={mapped}")


# --------------------------------------------------------------------------- #
# Query helpers                                                               #
# --------------------------------------------------------------------------- #

def get_call_status(call_id: str) -> Optional[Dict[str, Any]]:
    return CALL_STORE.get(call_id)


def list_calls() -> list[Dict[str, Any]]:
    return sorted(CALL_STORE.values(), key=lambda x: x.get("created_at", ""), reverse=True)
