"""
Inquiry & Messaging Service
Handles buyer-artisan inquiries, messages, and conversation replies.
"""

import json
import time
import uuid
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone
from app.db.database import get_db

logger = logging.getLogger("InquiryService")


def _normalize_inquiry_row(row_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Parse JSON messages field and normalize inquiry response structure."""
    res = dict(row_dict)
    try:
        messages = json.loads(res.get("messages") or "[]")
    except Exception:
        messages = []

    if not messages:
        if res.get("message"):
            time_str = "Earlier"
            if res.get("created_at"):
                try:
                    dt = datetime.fromisoformat(res["created_at"].replace("Z", "+00:00"))
                    time_str = dt.strftime("%I:%M %p")
                except Exception:
                    pass
            messages.append({
                "id": f"msg-init-{res['id']}",
                "sender": "buyer",
                "sender_name": res.get("buyer_name", "Buyer"),
                "text": res["message"],
                "time": time_str,
                "timestamp": res.get("created_at") or datetime.now(timezone.utc).isoformat()
            })
        if res.get("reply"):
            time_str = "Replied"
            if res.get("replied_at"):
                try:
                    dt = datetime.fromisoformat(res["replied_at"].replace("Z", "+00:00"))
                    time_str = dt.strftime("%I:%M %p")
                except Exception:
                    pass
            messages.append({
                "id": f"msg-rep-{res['id']}",
                "sender": "seller",
                "sender_name": res.get("artisan_name", "Artisan"),
                "text": res["reply"],
                "time": time_str,
                "timestamp": res.get("replied_at") or datetime.now(timezone.utc).isoformat()
            })

    res["messages"] = messages
    return res


def create_inquiry(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new inquiry or order conversation thread."""
    inquiry_id = data.get("id") or f"inq-{int(time.time() * 1000)}-{uuid.uuid4().hex[:5]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    now_dt = datetime.now()
    time_str = now_dt.strftime("%I:%M %p")

    initial_text = data.get("message") or "Hello, I am interested in this handcrafted piece."
    initial_msg = {
        "id": f"msg-{int(time.time() * 1000)}-1",
        "sender": "buyer",
        "sender_name": data.get("buyer_name") or "Buyer",
        "text": initial_text,
        "time": time_str,
        "timestamp": now_iso
    }
    messages_json = json.dumps([initial_msg])

    status = "new_order" if data.get("order_id") else "new"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO inquiries (
            id, order_id, product_id, product_title, product_image,
            artisan_id, artisan_name, buyer_phone, buyer_name, buyer_type,
            message, reply, replied_at, last_message, status, messages,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            inquiry_id,
            data.get("order_id"),
            data.get("product_id") or "",
            data.get("product_title") or "Handcrafted Product",
            data.get("product_image") or "",
            data.get("artisan_id"),
            data.get("artisan_name") or "Master Artisan",
            data.get("buyer_phone") or "",
            data.get("buyer_name") or "Buyer",
            data.get("buyer_type") or "Individual Buyer",
            initial_text,
            None,
            None,
            initial_text,
            status,
            messages_json,
            now_iso,
            now_iso
        ))

    return get_inquiry_by_id(inquiry_id) or {}


def get_inquiry_by_id(inquiry_id: str) -> Optional[Dict[str, Any]]:
    """Fetch single inquiry by ID with parsed messages."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inquiries WHERE id = ?", (inquiry_id,))
        row = cursor.fetchone()
        if row:
            return _normalize_inquiry_row(dict(row))
    return None


def add_message_to_inquiry(inquiry_id: str, sender: str, sender_name: Optional[str], text: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """Add a new message into the inquiry conversation thread."""
    inquiry = get_inquiry_by_id(inquiry_id)
    if not inquiry:
        return None, None

    now_iso = datetime.now(timezone.utc).isoformat()
    time_str = datetime.now().strftime("%I:%M %p")
    text_clean = text.strip()

    name = sender_name or (inquiry.get("artisan_name", "Artisan") if sender == "seller" else inquiry.get("buyer_name", "Buyer"))
    new_msg = {
        "id": f"msg-{int(time.time() * 1000)}-{uuid.uuid4().hex[:4]}",
        "sender": "seller" if sender == "seller" else "buyer",
        "sender_name": name,
        "text": text_clean,
        "time": time_str,
        "timestamp": now_iso
    }

    messages = inquiry.get("messages", [])
    messages.append(new_msg)
    messages_json = json.dumps(messages)

    if sender == "seller":
        reply_val = text_clean
        replied_at_val = now_iso
        status_val = "replied"
    else:
        reply_val = inquiry.get("reply")
        replied_at_val = inquiry.get("replied_at")
        status_val = "new_order" if inquiry.get("status") == "new_order" else "buyer_replied"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE inquiries SET
            reply = ?,
            replied_at = ?,
            last_message = ?,
            status = ?,
            messages = ?,
            updated_at = ?
        WHERE id = ?
        """, (reply_val, replied_at_val, text_clean, status_val, messages_json, now_iso, inquiry_id))

    updated_inq = get_inquiry_by_id(inquiry_id)
    return updated_inq, new_msg


def reply_to_inquiry(inquiry_id: str, reply_text: str) -> Optional[Dict[str, Any]]:
    """Convenience method for seller reply."""
    updated_inq, _ = add_message_to_inquiry(inquiry_id, sender="seller", sender_name=None, text=reply_text)
    return updated_inq


def list_inquiries(
    artisan_id: Optional[str] = None,
    buyer_phone: Optional[str] = None,
    order_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """List inquiries with optional filters."""
    query = "SELECT * FROM inquiries WHERE 1=1"
    params = []

    if artisan_id:
        query += " AND (artisan_id IS NULL OR artisan_id = ?)"
        params.append(artisan_id)

    if buyer_phone:
        query += " AND buyer_phone = ?"
        params.append(buyer_phone)

    if order_id:
        query += " AND order_id = ?"
        params.append(order_id)

    query += " ORDER BY updated_at DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [_normalize_inquiry_row(dict(r)) for r in rows]
