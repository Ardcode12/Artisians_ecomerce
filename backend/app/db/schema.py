"""
Database Schema Initialization & JSON Migration
Initializes all local on-device SQLite tables and automatically seeds data from legacy JSON stores.
"""

import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from app.db.database import get_db, is_postgres
from app.config import DATA_DIR

logger = logging.getLogger("ArtisansDB")


def init_db():
    """Create all SQLite tables and seed data if tables are empty."""
    with get_db() as conn:
        cursor = conn.cursor()

        if not is_postgres():
            cursor.execute("PRAGMA foreign_keys=ON;")

        # 1. Profiles table (Artisans and unified buyer link)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            phone TEXT NOT NULL UNIQUE,
            name TEXT,
            shop_name TEXT,
            role TEXT NOT NULL DEFAULT 'artisan' CHECK (role IN ('artisan', 'buyer')),
            craft_type TEXT,
            craft_custom TEXT,
            bio TEXT,
            location TEXT,
            avatar_url TEXT,
            language TEXT DEFAULT 'English',
            scheme_id TEXT,
            is_onboarded INTEGER DEFAULT 0,
            bank_account_no TEXT,
            bank_ifsc TEXT,
            bank_holder_name TEXT,
            bank_name TEXT,
            upi_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 2. Dedicated Bank Accounts table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS bank_accounts (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            account_holder_name TEXT NOT NULL,
            account_number TEXT NOT NULL,
            ifsc_code TEXT NOT NULL,
            bank_name TEXT,
            branch_name TEXT,
            upi_id TEXT,
            is_verified INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );
        """)

        # 3. Buyer Profiles table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS buyer_profiles (
            id TEXT PRIMARY KEY,
            phone TEXT NOT NULL UNIQUE,
            name TEXT,
            buyer_type TEXT NOT NULL DEFAULT 'Individual Buyer',
            business_name TEXT,
            gstin TEXT,
            department TEXT,
            address_line TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            is_onboarded INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 4. Products table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            artisan_id TEXT,
            title TEXT NOT NULL,
            description_en TEXT DEFAULT '',
            description_hi TEXT DEFAULT '',
            description_ta TEXT DEFAULT '',
            category TEXT DEFAULT 'Handicraft',
            craft_type TEXT DEFAULT 'Handicraft',
            price TEXT NOT NULL,
            units INTEGER DEFAULT 1,
            image_url TEXT DEFAULT '',
            material_cost REAL DEFAULT 0,
            marketplaces TEXT DEFAULT '[]',
            status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'sold', 'inquiries')),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 5. Inquiries & Conversations table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS inquiries (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            product_id TEXT NOT NULL,
            product_title TEXT,
            product_image TEXT,
            artisan_id TEXT,
            artisan_name TEXT,
            buyer_phone TEXT,
            buyer_name TEXT,
            buyer_type TEXT DEFAULT 'Individual Buyer',
            message TEXT NOT NULL,
            reply TEXT,
            replied_at TEXT,
            last_message TEXT,
            status TEXT DEFAULT 'new',
            messages TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 6. Orders table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            product_title TEXT,
            product_image TEXT,
            artisan_id TEXT,
            artisan_name TEXT,
            buyer_phone TEXT NOT NULL,
            buyer_name TEXT,
            buyer_address TEXT,
            quantity INTEGER DEFAULT 1,
            total_amount TEXT NOT NULL,
            status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 7. Client Reviews table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            artisan_id TEXT,
            product_id TEXT,
            product_title TEXT,
            reviewer_name TEXT NOT NULL,
            reviewer_phone TEXT,
            rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment TEXT NOT NULL,
            reply TEXT,
            replied_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """)

        # 8. Instagram Accounts Linkage
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS instagram_accounts (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             TEXT NOT NULL UNIQUE,
            ig_user_id          TEXT NOT NULL,
            ig_username         TEXT,
            access_token        TEXT NOT NULL,
            token_expires_at    TEXT,
            account_type        TEXT,
            auto_post_enabled   INTEGER DEFAULT 0,
            consent_granted_at  TEXT,
            linked_at           TEXT DEFAULT CURRENT_TIMESTAMP,
            last_error          TEXT
        );
        """)

        # 9. Reel Generation Jobs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reel_jobs (
            id                  TEXT PRIMARY KEY,
            user_id             TEXT NOT NULL,
            product_id          TEXT NOT NULL,
            status              TEXT NOT NULL,
            stage               TEXT,
            progress            INTEGER DEFAULT 0,
            style               TEXT DEFAULT 'heritage',
            language            TEXT DEFAULT 'ta-IN',
            script_native       TEXT,
            script_english      TEXT,
            caption             TEXT,
            hashtags            TEXT,
            local_path          TEXT,
            video_url           TEXT,
            ig_creation_id      TEXT,
            ig_media_id         TEXT,
            ig_permalink        TEXT,
            error_message       TEXT,
            duration_seconds    REAL,
            created_at          TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at        TEXT
        );
        """)

        # Indexes for fast lookup
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_buyer_profiles_phone ON buyer_profiles(phone);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_artisan_id ON products(artisan_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_inquiries_artisan_id ON inquiries(artisan_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_inquiries_buyer_phone ON inquiries(buyer_phone);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_buyer_phone ON orders(buyer_phone);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_artisan_id ON orders(artisan_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reviews_artisan_id ON reviews(artisan_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user ON instagram_accounts(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reel_jobs_user ON reel_jobs(user_id, created_at DESC);")

    # Run one-time migration from existing JSON stores if tables are empty
    _migrate_json_data()


def _migrate_json_data():
    """Load records from existing json files in backend/data into SQLite."""
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Migrate profiles.json
        profiles_file = DATA_DIR / "profiles.json"
        if profiles_file.exists():
            try:
                with open(profiles_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        for phone, p in data.items():
                            pid = p.get("id") or f"11111111-2222-3333-4444-91{phone[-10:]}"
                            cursor.execute("""
                            INSERT INTO profiles (
                                id, phone, name, shop_name, role, craft_type, craft_custom,
                                bio, location, avatar_url, language, scheme_id, is_onboarded,
                                bank_account_no, bank_ifsc, bank_holder_name, bank_name, upi_id,
                                created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT DO NOTHING
                            """, (
                                pid,
                                p.get("phone") or phone,
                                p.get("name"),
                                p.get("shop_name"),
                                p.get("role", "artisan"),
                                p.get("craft_type"),
                                p.get("craft_custom"),
                                p.get("bio"),
                                p.get("location"),
                                p.get("avatar_url"),
                                p.get("language", "English"),
                                p.get("scheme_id"),
                                1 if p.get("is_onboarded", True) else 0,
                                p.get("bank_account_no"),
                                p.get("bank_ifsc"),
                                p.get("bank_holder_name"),
                                p.get("bank_name"),
                                p.get("upi_id"),
                                p.get("created_at") or now_iso,
                                p.get("updated_at") or now_iso
                            ))
            except Exception as e:
                logger.warning(f"Error migrating profiles.json: {e}")

        # 2. Migrate buyer_profiles.json
        buyer_file = DATA_DIR / "buyer_profiles.json"
        if buyer_file.exists():
            try:
                with open(buyer_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        for phone, b in data.items():
                            bid = b.get("id") or f"22222222-3333-4444-5555-91{phone[-10:]}"
                            cursor.execute("""
                            INSERT INTO buyer_profiles (
                                id, phone, name, buyer_type, business_name, gstin, department,
                                address_line, city, state, pincode, is_onboarded, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT DO NOTHING
                            """, (
                                bid,
                                b.get("phone") or phone,
                                b.get("name"),
                                b.get("buyer_type", "Individual Buyer"),
                                b.get("business_name"),
                                b.get("gstin"),
                                b.get("department"),
                                b.get("address_line"),
                                b.get("city"),
                                b.get("state"),
                                b.get("pincode"),
                                1 if b.get("is_onboarded", True) else 0,
                                b.get("created_at") or now_iso,
                                b.get("updated_at") or now_iso
                            ))
            except Exception as e:
                logger.warning(f"Error migrating buyer_profiles.json: {e}")

        # 3. Migrate products.json
        products_file = DATA_DIR / "products.json"
        if products_file.exists():
            try:
                with open(products_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for prod in data:
                            pid = prod.get("id")
                            if not pid:
                                continue
                            marketplaces_json = json.dumps(prod.get("marketplaces", []))
                            cursor.execute("""
                            INSERT INTO products (
                                id, artisan_id, title, description_en, description_hi, description_ta,
                                category, craft_type, price, units, image_url, material_cost,
                                marketplaces, status, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT DO NOTHING
                            """, (
                                pid,
                                prod.get("artisan_id"),
                                prod.get("title", "Handicraft Product"),
                                prod.get("description_en", ""),
                                prod.get("description_hi", ""),
                                prod.get("description_ta", ""),
                                prod.get("category", "Handicraft"),
                                prod.get("craft_type", prod.get("category", "Handicraft")),
                                str(prod.get("price", "₹500")),
                                int(prod.get("units", 1)),
                                prod.get("image_url", ""),
                                float(prod.get("material_cost", 0.0)),
                                marketplaces_json,
                                prod.get("status", "published"),
                                prod.get("created_at") or now_iso,
                                prod.get("updated_at") or now_iso
                            ))
            except Exception as e:
                logger.warning(f"Error migrating products.json: {e}")

        # 4. Migrate inquiries.json
        inquiries_file = DATA_DIR / "inquiries.json"
        if inquiries_file.exists():
            try:
                with open(inquiries_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for inq in data:
                            iid = inq.get("id")
                            if not iid:
                                continue
                            messages_json = json.dumps(inq.get("messages", []))
                            cursor.execute("""
                            INSERT INTO inquiries (
                                id, order_id, product_id, product_title, product_image,
                                artisan_id, artisan_name, buyer_phone, buyer_name, buyer_type,
                                message, reply, replied_at, last_message, status, messages,
                                created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT DO NOTHING
                            """, (
                                iid,
                                inq.get("order_id"),
                                inq.get("product_id", ""),
                                inq.get("product_title"),
                                inq.get("product_image"),
                                inq.get("artisan_id"),
                                inq.get("artisan_name"),
                                inq.get("buyer_phone"),
                                inq.get("buyer_name"),
                                inq.get("buyer_type", "Individual Buyer"),
                                inq.get("message", ""),
                                inq.get("reply"),
                                inq.get("replied_at"),
                                inq.get("last_message"),
                                inq.get("status", "new"),
                                messages_json,
                                inq.get("created_at") or now_iso,
                                inq.get("updated_at") or now_iso
                            ))
            except Exception as e:
                logger.warning(f"Error migrating inquiries.json: {e}")

        # 5. Migrate orders.json
        orders_file = DATA_DIR / "orders.json"
        if orders_file.exists():
            try:
                with open(orders_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        for ord_item in data:
                            oid = ord_item.get("id")
                            if not oid:
                                continue
                            cursor.execute("""
                            INSERT INTO orders (
                                id, product_id, product_title, product_image, artisan_id, artisan_name,
                                buyer_phone, buyer_name, buyer_address, quantity, total_amount,
                                status, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT DO NOTHING
                            """, (
                                oid,
                                ord_item.get("product_id", ""),
                                ord_item.get("product_title", ""),
                                ord_item.get("product_image", ""),
                                ord_item.get("artisan_id"),
                                ord_item.get("artisan_name"),
                                ord_item.get("buyer_phone", ""),
                                ord_item.get("buyer_name"),
                                ord_item.get("buyer_address"),
                                int(ord_item.get("quantity", 1)),
                                str(ord_item.get("total_amount", "₹0")),
                                ord_item.get("status", "confirmed"),
                                ord_item.get("created_at") or now_iso,
                                ord_item.get("updated_at") or now_iso
                            ))
            except Exception as e:
                logger.warning(f"Error migrating orders.json: {e}")

    logger.info("Local on-device database schema initialized and synced.")
