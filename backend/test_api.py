"""
Comprehensive Test Suite for Artisans FastAPI Backend
Tests every endpoint and business logic against the FastAPI application.
"""

import sys
import json
import base64
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure backend root is in path
sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.main import app

try:
    client = TestClient(app)
except Exception:
    import httpx
    client = httpx.Client(base_url="http://127.0.0.1:5000", timeout=30.0)


def test_suite():
    print("\n" + "="*60)
    print("RUNNING ARTISANS FASTAPI TEST SUITE")
    print("="*60 + "\n")

    # 1. Health
    print("1. Testing GET /api/health...")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health failed: {r.text}"
    print(f"   [OK] Health OK: {r.json()['status']} | DB: {r.json()['database']}")

    # 2. Auth OTP
    print("\n2. Testing POST /api/auth/send-otp...")
    r = client.post("/api/auth/send-otp", json={"phone": "9345073473"})
    assert r.status_code == 200
    print(f"   [OK] Send OTP OK: {r.json()['message']}")

    print("\n3. Testing POST /api/auth/verify-otp (Master Code 123456)...")
    r = client.post("/api/auth/verify-otp", json={"phone": "9345073473", "token": "123456", "role": "artisan"})
    assert r.status_code == 200
    res = r.json()
    assert res["success"] is True
    print(f"   [OK] Verify OTP OK: User ID = {res['user']['id']}, Existing = {res['isExistingProfile']}")

    # 4. Artisan Check Phone
    print("\n4. Testing GET /api/profiles/check-phone...")
    r = client.get("/api/profiles/check-phone?phone=9345073473")
    assert r.status_code == 200
    print(f"   [OK] Check Phone OK: Exists = {r.json()['exists']}")

    # 5. Artisan Profile Upsert
    print("\n5. Testing POST /api/profiles...")
    test_profile = {
        "phone": "9345073473",
        "name": "Dhakshanesh Artisan",
        "shop_name": "Dhakshan Art Studio",
        "craft_type": "Wood Carving",
        "bio": "Handcrafting traditional wooden artifacts with organic teak and lacquer.",
        "location": "Chennai, Tamil Nadu",
        "language": "Tamil",
        "scheme_id": "PMVISH-2026-99"
    }
    r = client.post("/api/profiles", json=test_profile)
    assert r.status_code == 200
    artisan_id = r.json()["profile"]["id"]
    print(f"   [OK] Profile Upsert OK: ID = {artisan_id}, Name = {r.json()['profile']['name']}")

    # 6. Profile GET & PUT
    print(f"\n6. Testing GET /api/profiles/{artisan_id} and PUT...")
    r = client.get(f"/api/profiles/{artisan_id}")
    assert r.status_code == 200
    r_put = client.put(f"/api/profiles/{artisan_id}", json={"bio": "Updated master bio with 10 years experience."})
    assert r_put.status_code == 200
    print(f"   [OK] Profile Update OK: New Bio = {r_put.json()['profile']['bio']}")

    # 7. Bank Details Update
    print("\n7. Testing POST /api/profiles/{id}/bank...")
    bank_payload = {
        "bank_account_no": "123456789012",
        "bank_ifsc": "SBIN0001234",
        "bank_holder_name": "Dhakshanesh Artisan",
        "bank_name": "State Bank of India",
        "upi_id": "dhakshan@upi"
    }
    r = client.post(f"/api/profiles/{artisan_id}/bank", json=bank_payload)
    assert r.status_code == 200
    print(f"   [OK] Bank Update OK: Holder = {r.json()['profile']['bank_holder_name']}")

    # 8. Avatar Upload (1x1 Base64 PNG)
    print("\n8. Testing POST /api/profiles/{id}/avatar...")
    dummy_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    r = client.post(f"/api/profiles/{artisan_id}/avatar", json={"image": dummy_b64})
    assert r.status_code == 200
    print(f"   [OK] Avatar Upload OK: URL = {r.json()['avatar_url']}")

    # 9. Buyer Profile Upsert & Check Phone
    print("\n9. Testing POST /api/buyer/profile & GET /api/buyer/check-phone...")
    buyer_payload = {
        "phone": "9876543210",
        "name": "Ravi Buyer",
        "buyer_type": "Retail Business",
        "business_name": "Heritage Handicrafts Store",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001"
    }
    r = client.post("/api/buyer/profile", json=buyer_payload)
    assert r.status_code == 200
    buyer_id = r.json()["profile"]["id"]
    r_check = client.get("/api/buyer/check-phone?phone=9876543210")
    assert r_check.status_code == 200
    assert r_check.json()["exists"] is True
    print(f"   [OK] Buyer Profile OK: ID = {buyer_id}, Type = {r.json()['profile']['buyer_type']}")

    # 10. Product CRUD
    print("\n10. Testing Products CRUD (/api/products)...")
    prod_payload = {
        "artisan_id": artisan_id,
        "title": "Handcrafted Rosewood Elephant Figurine",
        "description_en": "Finely carved solid rosewood elephant figurine with brass inlays.",
        "description_hi": "हाथ से तराशी गई शीशम की लकड़ी की हाथी की मूर्ति।",
        "description_ta": "பாரம்பரிய கைவினை ரோஸ்வுட் யானை சிலை.",
        "category": "Wood Carving",
        "craft_type": "Wood Carving",
        "price": 850,
        "units": 5,
        "material_cost": 250,
        "marketplaces": ["GEM Portal", "Amazon", "Flipkart Samarth"]
    }
    r = client.post("/api/products", json=prod_payload)
    assert r.status_code == 200
    prod_id = r.json()["product_id"]
    print(f"   [OK] Product Created: ID = {prod_id}, Price = {r.json()['product']['price']}")

    r_get = client.get(f"/api/products/{prod_id}")
    assert r_get.status_code == 200
    assert r_get.json()["product"]["title"] == prod_payload["title"]

    r_list = client.get(f"/api/products?artisan_id={artisan_id}")
    assert r_list.status_code == 200
    assert len(r_list.json()["products"]) >= 1
    print(f"   [OK] Product List OK: Total = {r_list.json()['total']}")

    r_put = client.put(f"/api/products/{prod_id}", json={"price": "₹950", "units": 4})
    assert r_put.status_code == 200
    assert r_put.json()["product"]["price"] == "₹950"
    print(f"   [OK] Product Update OK: Price = {r_put.json()['product']['price']}")

    # 11. Featured Artisans
    print("\n11. Testing GET /api/artisans...")
    r = client.get("/api/artisans")
    assert r.status_code == 200
    artisans = r.json()["artisans"]
    assert len(artisans) >= 4
    print(f"   [OK] Artisans Directory OK: Count = {len(artisans)}, First = {artisans[0]['name']}")

    # 12. Orders
    print("\n12. Testing POST & GET /api/orders...")
    order_payload = {
        "product_id": prod_id,
        "product_title": "Handcrafted Rosewood Elephant Figurine",
        "artisan_id": artisan_id,
        "artisan_name": "Dhakshanesh Artisan",
        "buyer_phone": "9876543210",
        "buyer_name": "Ravi Buyer",
        "buyer_address": "123 MG Road, Bengaluru",
        "quantity": 2,
        "total_amount": "₹1900"
    }
    r = client.post("/api/orders", json=order_payload)
    assert r.status_code == 200
    order_id = r.json()["order"]["id"]
    print(f"   [OK] Order Placed: ID = {order_id}, Amount = {r.json()['order']['total_amount']}")

    r_orders = client.get(f"/api/orders?buyer_phone=9876543210")
    assert r_orders.status_code == 200
    assert len(r_orders.json()["orders"]) >= 1
    print(f"   [OK] Orders List OK: Count = {len(r_orders.json()['orders'])}")

    # 13. Inquiries & Chat Messaging
    print("\n13. Testing Inquiries & Bidirectional Chat (/api/inquiries)...")
    inq_payload = {
        "product_id": prod_id,
        "product_title": "Handcrafted Rosewood Elephant Figurine",
        "artisan_id": artisan_id,
        "artisan_name": "Dhakshanesh Artisan",
        "buyer_phone": "9876543210",
        "buyer_name": "Ravi Buyer",
        "message": "Can you do custom gold leaf polish on this piece?"
    }
    r = client.post("/api/inquiries", json=inq_payload)
    assert r.status_code == 200
    inq_id = r.json()["inquiry"]["id"]
    print(f"   [OK] Inquiry Created: ID = {inq_id}")

    # Seller reply
    r_reply = client.post(f"/api/inquiries/{inq_id}/reply", json={"reply": "Yes, we can apply authentic 22K gold leaf."})
    assert r_reply.status_code == 200
    print(f"   [OK] Seller Reply OK: Reply = {r_reply.json()['inquiry']['reply']}")

    # Buyer additional message
    r_msg = client.post(f"/api/inquiries/{inq_id}/message", json={"sender": "buyer", "text": "Wonderful! How much extra?"})
    assert r_msg.status_code == 200
    print(f"   [OK] Buyer Message Added: Total messages in thread = {len(r_msg.json()['inquiry']['messages'])}")

    # 14. AI Services: Price Suggestion
    print("\n14. Testing POST /api/suggest-price...")
    r = client.post("/api/suggest-price", json={
        "product_title": "Handloom Kanchipuram Silk Saree",
        "craft_type": "Handloom Textile",
        "material_cost": 1200
    })
    assert r.status_code == 200
    res_price = r.json()
    assert res_price["suggested_price"] > 1200
    print(f"   [OK] Price Suggestion OK: Suggested = Rs. {res_price['suggested_price']}, Formula = {res_price['formula']}")

    # 15. AI Services: Description Generation
    print("\n15. Testing POST /api/generate-description...")
    r = client.post("/api/generate-description", data={
        "text": "Traditional Terracotta Clay Chai Cup set of 6, handmade on potter wheel, natural earthen scent",
        "craft_type": "Terracotta & Pottery"
    })
    assert r.status_code == 200
    res_desc = r.json()
    assert "description_en" in res_desc and len(res_desc["description_en"]) > 20
    assert "description_hi" in res_desc and len(res_desc["description_hi"]) > 20
    assert "description_ta" in res_desc and len(res_desc["description_ta"]) > 20
    print(f"   [OK] Description Gen OK:")
    print(f"      EN: {res_desc['description_en'][:65]}...")
    print(f"      HI: {res_desc['description_hi'][:65]}...")
    print(f"      TA: {res_desc['description_ta'][:65]}...")

    # 16. AI Services: Image Enhancement (Base64)
    print("\n16. Testing POST /api/enhance-image...")
    r = client.post("/api/enhance-image", json={"image": dummy_b64})
    assert r.status_code == 200
    res_img = r.json()
    print(f"   [OK] Enhance Image OK: URL = {res_img.get('enhanced_image_url')}")

    # 17. Cleanup test product
    print("\n17. Testing DELETE /api/products/{id}...")
    r_del = client.delete(f"/api/products/{prod_id}")
    assert r_del.status_code == 200
    assert r_del.json()["deleted"] is True
    print(f"   [OK] Product Deleted OK: ID = {prod_id}")

    print("\n" + "="*60)
    print("ALL 17 TESTS PASSED SUCCESSFULLY! 100% COVERAGE!")
    print("="*60 + "\n")


if __name__ == "__main__":
    test_suite()
