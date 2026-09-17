"""
Trigger Test IVR Confirmation Call to Specified Phone Number
Inserts test order into DB so Twilio TwiML handler fetches valid details.
"""

import sys
import time
import logging
from pathlib import Path
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import (
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    WEBHOOK_BASE_URL
)
from app.db.database import get_db
from app.db.schema import init_db
from app.services.voice_confirmation_service import TwilioCallProvider

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TestCall")


def seed_test_order(order_id: str):
    """Seed test order into SQLite database so TwiML webhook reads valid details."""
    init_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        cursor.execute("""
        INSERT INTO orders (
            id, product_id, product_title, product_image, artisan_id, artisan_name,
            buyer_phone, buyer_name, buyer_address, quantity, total_amount,
            status, confirmation_attempts, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            order_id,
            "prod-tanjore-001",
            "Royal Tanjore Painting",
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2",
            "artisan-001",
            "Master Artisan",
            "9025874624",
            "Buyer Dhakshan",
            "Chennai, Tamil Nadu",
            2,
            "₹4,500",
            "PENDING_CONFIRMATION",
            1,
            now_iso,
            now_iso
        ))
    logger.info(f"[TEST SEED] Seeded test order '{order_id}' into SQLite DB.")


def run_test_call(target_phone: str):
    order_id = "ord-test-demo-9025"
    seed_test_order(order_id)

    print("="*60)
    print(f"MAKING TEST VOICE CONFIRMATION CALL TO: {target_phone}")
    print(f"Twilio From Number : {TWILIO_PHONE_NUMBER}")
    print(f"Webhook Base URL   : {WEBHOOK_BASE_URL}")
    print("="*60 + "\n")

    # Clean phone format
    import re
    clean = re.sub(r"[^\d]", "", target_phone)
    if len(clean) == 10:
        formatted_phone = f"+91{clean}"
    elif clean.startswith("91") and len(clean) == 12:
        formatted_phone = f"+{clean}"
    else:
        formatted_phone = f"+{clean}"

    provider = TwilioCallProvider()
    res = provider.initiate_call(
        to_phone=formatted_phone,
        order_id=order_id,
        item_summary="2x Royal Tanjore Painting",
        amount="₹4,500",
        attempt=1
    )

    print("\n" + "="*60)
    print("CALL INITIATION RESULT:")
    print(res)
    print("="*60)


if __name__ == "__main__":
    phone_arg = sys.argv[1] if len(sys.argv) > 1 else "9025874624"
    run_test_call(phone_arg)
