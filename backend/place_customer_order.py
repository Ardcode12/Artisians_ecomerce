"""
Place Customer Order & Trigger Artisan Voice Call
Simulates a real customer placing an order via POST /api/orders.
The system auto-triggers a Twilio IVR voice call to the artisan phone.
"""

import sys
import requests
from datetime import datetime, timezone
from app.db.database import get_db

ARTISAN_PHONE = "+919080176624"
API_BASE = "http://localhost:5000/api"


def setup_artisan_profile():
    """Create/update artisan profile with correct phone number."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        # Find by phone (may already exist under a different id)
        cursor.execute("SELECT id FROM profiles WHERE phone = ?", (ARTISAN_PHONE,))
        row = cursor.fetchone()
        if row:
            artisan_id = row["id"]
            cursor.execute("UPDATE profiles SET name = ?, shop_name = ?, language = ? WHERE id = ?", (
                "Meenakshi Handloom Artisan",
                "Meenakshi Weavers Kanchipuram",
                "english",
                artisan_id
            ))
            print(f"[SETUP] Using existing artisan profile id={artisan_id} for {ARTISAN_PHONE}")
        else:
            artisan_id = "art-9080176624-demo"
            cursor.execute("""
            INSERT INTO profiles (id, phone, name, shop_name, role, craft_type, language, bio, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                artisan_id,
                ARTISAN_PHONE,
                "Meenakshi Handloom Artisan",
                "Meenakshi Weavers Kanchipuram",
                "artisan",
                "Handloom Silk Saree",
                "english",
                "Master handloom weaver with 20 years experience in Kanchipuram silk sarees.",
                now_iso,
                now_iso
            ))
            print(f"[SETUP] Created artisan profile id={artisan_id} for {ARTISAN_PHONE}")
    return artisan_id


def place_customer_order(artisan_id: str):
    """Place a real customer order — automatically triggers IVR call to artisan."""
    order_payload = {
        "artisan_id": artisan_id,
        "buyer_id": "buyer-customer-demo-001",
        "product_id": "prod-kanchipuram-silk-001",
        "product_title": "Kanchipuram Pure Silk Saree",
        "quantity": 2,
        "unit_price": "Rs. 5,500",
        "total_amount": "Rs. 11,000",
        "delivery_address": "12 Anna Nagar, Chennai - 600040",
        "buyer_phone": "+919876543210",
        "buyer_name": "Kavitha Suresh"
    }

    print("\n============================================================")
    print("CUSTOMER PLACING NEW ORDER")
    print(f"Product  : {order_payload['product_title']}")
    print(f"Quantity : {order_payload['quantity']}")
    print(f"Amount   : {order_payload['total_amount']}")
    print(f"Buyer    : {order_payload['buyer_name']}")
    print(f"Artisan Phone: {ARTISAN_PHONE}")
    print("============================================================\n")

    try:
        res = requests.post(f"{API_BASE}/orders", json=order_payload, timeout=15)
        if res.status_code == 200:
            data = res.json()
            if data.get("success"):
                order_id = data["order"]["id"]
                print(f"[SUCCESS] Order created: {order_id}")
                print(f"[CALL QUEUED] Twilio IVR call dispatched to: {ARTISAN_PHONE}")
                print(f"\nWhen phone rings on {ARTISAN_PHONE}:")
                print("  1. Answer the call")
                print("  2. Press ANY key to pass Twilio trial intro")
                print("  3. Listen: 'Hello Artisan! You have a new order for 2 quantity")
                print("     of Kanchipuram Pure Silk Saree, total Rs. 11,000...'")
                print("  4. Press 1 to CONFIRM or 0 to CANCEL")
                return order_id
            else:
                print(f"[FAILED] {data}")
        else:
            print(f"[HTTP ERROR] Status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"[ERROR] {e}")
    return None


if __name__ == "__main__":
    artisan_id = setup_artisan_profile()
    place_customer_order(artisan_id)
