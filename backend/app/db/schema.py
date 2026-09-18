"""
Database Schema Initialization & JSON Migration
Initializes all local on-device SQLite tables and automatically seeds data from legacy JSON stores.
"""

import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from app.db.database import get_db
from app.config import DATA_DIR

logger = logging.getLogger("ArtisansDB")


def init_db():
    """Create all SQLite tables and seed data if tables are empty."""
    with get_db() as conn:
        cursor = conn.cursor()

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

        # 10. Government Schemes Directory Table (MoSJE & MSME Support)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS schemes (
            id                  TEXT PRIMARY KEY,
            name                TEXT NOT NULL,
            short_summary       TEXT NOT NULL,
            category            TEXT NOT NULL,
            level               TEXT NOT NULL,
            state               TEXT,
            ministry            TEXT NOT NULL,
            max_benefit_amount  TEXT,
            interest_rate       TEXT,
            processing_cost     TEXT DEFAULT 'Free',
            benefits_json       TEXT NOT NULL,
            eligibility_json    TEXT NOT NULL,
            eligible_trades_json TEXT,
            documents_json      TEXT NOT NULL,
            apply_steps_json    TEXT NOT NULL,
            after_apply_note    TEXT,
            official_url        TEXT NOT NULL,
            helpline            TEXT,
            related_scheme_ids  TEXT,
            last_verified_at    DATE NOT NULL,
            is_active           INTEGER DEFAULT 1,
            scheme_name         TEXT,
            provider_name       TEXT,
            provider_type       TEXT DEFAULT 'government',
            scheme_category     TEXT,
            eligibility_summary TEXT,
            benefits_offered    TEXT,
            application_process TEXT,
            application_deadline TEXT,
            official_source_url TEXT,
            source_type         TEXT DEFAULT 'official',
            review_flagged      INTEGER DEFAULT 0,
            last_verified_date  TEXT,
            simple_summary      TEXT,
            created_at          TEXT,
            updated_at          TEXT
        );
        """)

        # 11. Artisan Scheme Progress & Checklists Tracking
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS artisan_scheme_progress (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             TEXT NOT NULL,
            scheme_id           TEXT NOT NULL,
            checked_conditions  TEXT,
            documents_gathered  TEXT,
            bookmarked          INTEGER DEFAULT 0,
            applied             INTEGER DEFAULT 0,
            applied_at          TIMESTAMP,
            created_at          TEXT,
            updated_at          TEXT,
            UNIQUE(user_id, scheme_id)
        );
        """)

        # 12. Scheme Crawl Logs (for background refresh status)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS scheme_crawl_log (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            source_name         TEXT NOT NULL,
            source_url          TEXT NOT NULL,
            status              TEXT NOT NULL,
            schemes_found       INTEGER DEFAULT 0,
            error_message       TEXT,
            crawled_at          TEXT NOT NULL
        );
        """)

        # 13. Design Ideas Table (Growth Hub Innovation Concepts)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS design_ideas (
            id                      INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id              TEXT NOT NULL,
            concept_name            TEXT NOT NULL,
            pitch                   TEXT NOT NULL,
            target_customer         TEXT,
            improvements            TEXT NOT NULL,
            generated_image_path    TEXT,
            status                  TEXT DEFAULT 'generated',
            created_at              TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at              TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
        );
        """)

        # 14. Festival Calendar Table (Growth Hub Demand Forecasting)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS festival_calendar (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            slug                TEXT UNIQUE NOT NULL,
            name                TEXT NOT NULL,
            start_month         INTEGER NOT NULL,
            start_day           INTEGER NOT NULL,
            end_month           INTEGER,
            end_day             INTEGER,
            region              TEXT DEFAULT 'Pan-India',
            icon_type           TEXT DEFAULT 'diya',
            category_uplift     TEXT NOT NULL,
            subtitle            TEXT,
            quote_rationale     TEXT,
            tip                 TEXT,
            prep_lead_days      INTEGER DEFAULT 30,
            created_at          TEXT DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 15. Category Demand Forecasts Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS demand_forecasts (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            artisan_id          TEXT DEFAULT 'demo_artisan',
            category            TEXT NOT NULL,
            craft_description   TEXT,
            festival_id         INTEGER,
            festival_slug       TEXT,
            expected_demand     TEXT NOT NULL,
            uplift_pct          INTEGER DEFAULT 40,
            recommended_qty_min INTEGER DEFAULT 30,
            recommended_qty_max INTEGER DEFAULT 40,
            target_date         TEXT,
            confidence          TEXT DEFAULT 'Estimated — based on category trends',
            headline            TEXT,
            sub_headline        TEXT,
            reasons_json        TEXT,
            rationale           TEXT,
            image_url           TEXT,
            production_goal     INTEGER DEFAULT 0,
            goal_set_at         TEXT,
            remind_me           INTEGER DEFAULT 0,
            generated_at        TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(festival_id) REFERENCES festival_calendar(id) ON DELETE SET NULL
        );
        """)

        # Optional: Add target_units column to products table if missing
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN target_units INTEGER DEFAULT 0;")
        except Exception:
            pass

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
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_schemes_category ON schemes(category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_schemes_active ON schemes(is_active);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_artisan_scheme_progress_user ON artisan_scheme_progress(user_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_design_ideas_product ON design_ideas(product_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_design_ideas_status ON design_ideas(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_festival_calendar_slug ON festival_calendar(slug);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_demand_forecasts_category ON demand_forecasts(category);")

    # Run one-time migration from existing JSON stores if tables are empty
    _migrate_json_data()
    _seed_schemes_data()
    _seed_design_ideas()
    _seed_demand_forecasts()


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
                            INSERT OR IGNORE INTO profiles (
                                id, phone, name, shop_name, role, craft_type, craft_custom,
                                bio, location, avatar_url, language, scheme_id, is_onboarded,
                                bank_account_no, bank_ifsc, bank_holder_name, bank_name, upi_id,
                                created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                            INSERT OR IGNORE INTO buyer_profiles (
                                id, phone, name, buyer_type, business_name, gstin, department,
                                address_line, city, state, pincode, is_onboarded, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                            INSERT OR IGNORE INTO products (
                                id, artisan_id, title, description_en, description_hi, description_ta,
                                category, craft_type, price, units, image_url, material_cost,
                                marketplaces, status, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                            INSERT OR IGNORE INTO inquiries (
                                id, order_id, product_id, product_title, product_image,
                                artisan_id, artisan_name, buyer_phone, buyer_name, buyer_type,
                                message, reply, replied_at, last_message, status, messages,
                                created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                            INSERT OR IGNORE INTO orders (
                                id, product_id, product_title, product_image, artisan_id, artisan_name,
                                buyer_phone, buyer_name, buyer_address, quantity, total_amount,
                                status, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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


def _seed_schemes_data():
    """Load core artisan welfare schemes from schemes_seed.json into SQLite table."""
    now_iso = datetime.now(timezone.utc).isoformat()
    seed_file = DATA_DIR / "schemes_seed.json"

    if not seed_file.exists():
        logger.warning("schemes_seed.json not found in DATA_DIR.")
        return

    try:
        with open(seed_file, "r", encoding="utf-8") as f:
            schemes_list = json.load(f)

        if not isinstance(schemes_list, list):
            return

        with get_db() as conn:
            cursor = conn.cursor()
            for s in schemes_list:
                sid = s.get("id")
                if not sid:
                    continue

                cursor.execute("""
                INSERT INTO schemes (
                    id, name, short_summary, category, level, state, ministry,
                    max_benefit_amount, interest_rate, processing_cost,
                    benefits_json, eligibility_json, eligible_trades_json,
                    documents_json, apply_steps_json, after_apply_note,
                    official_url, helpline, related_scheme_ids, last_verified_at,
                    is_active, scheme_name, provider_name, provider_type,
                    scheme_category, eligibility_summary, benefits_offered,
                    official_source_url, source_type, review_flagged, simple_summary,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?
                )
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    short_summary = excluded.short_summary,
                    category = excluded.category,
                    level = excluded.level,
                    state = excluded.state,
                    ministry = excluded.ministry,
                    max_benefit_amount = excluded.max_benefit_amount,
                    interest_rate = excluded.interest_rate,
                    processing_cost = excluded.processing_cost,
                    benefits_json = excluded.benefits_json,
                    eligibility_json = excluded.eligibility_json,
                    eligible_trades_json = excluded.eligible_trades_json,
                    documents_json = excluded.documents_json,
                    apply_steps_json = excluded.apply_steps_json,
                    after_apply_note = excluded.after_apply_note,
                    official_url = excluded.official_url,
                    helpline = excluded.helpline,
                    related_scheme_ids = excluded.related_scheme_ids,
                    last_verified_at = excluded.last_verified_at,
                    is_active = excluded.is_active,
                    scheme_name = excluded.scheme_name,
                    provider_name = excluded.provider_name,
                    simple_summary = excluded.simple_summary,
                    updated_at = excluded.updated_at
                """, (
                    sid,
                    s.get("name"),
                    s.get("short_summary"),
                    s.get("category"),
                    s.get("level"),
                    s.get("state"),
                    s.get("ministry"),
                    s.get("max_benefit_amount"),
                    s.get("interest_rate"),
                    s.get("processing_cost", "Free"),
                    s.get("benefits_json", "[]"),
                    s.get("eligibility_json", "[]"),
                    s.get("eligible_trades_json"),
                    s.get("documents_json", "[]"),
                    s.get("apply_steps_json", "[]"),
                    s.get("after_apply_note"),
                    s.get("official_url"),
                    s.get("helpline"),
                    s.get("related_scheme_ids"),
                    s.get("last_verified_at", "2026-09-17"),
                    s.get("is_active", 1),
                    s.get("scheme_name", s.get("name")),
                    s.get("provider_name", s.get("ministry")),
                    s.get("provider_type", "government"),
                    s.get("scheme_category", s.get("category")),
                    s.get("eligibility_summary", s.get("short_summary")),
                    s.get("benefits_offered", s.get("short_summary")),
                    s.get("official_source_url", s.get("official_url")),
                    s.get("source_type", "official"),
                    0,
                    s.get("simple_summary", s.get("short_summary")),
                    s.get("created_at") or now_iso,
                    s.get("updated_at") or now_iso
                ))
            logger.info(f"Seeded {len(schemes_list)} verified government schemes successfully.")
    except Exception as e:
        logger.error(f"Error seeding schemes: {e}")


def _seed_design_ideas():
    """Seed the 4 reference showcase products and 3 design innovation concepts."""
    now_iso = datetime.now(timezone.utc).isoformat()

    showcase_products = [
        {
            "id": "prod-woven-basket",
            "title": "Woven Basket",
            "category": "Baskets & Storage",
            "craft_type": "Baskets & Weaving",
            "price": "₹ 850",
            "description_en": "Handwoven basket made with natural grass. Traditional design from our region.",
            "image_url": "uploads/woven_basket_product.jpg",
            "status": "published",
        },
        {
            "id": "prod-clay-pot",
            "title": "Clay Pot",
            "category": "Pottery & Clay",
            "craft_type": "Pottery & Clay",
            "price": "₹ 650",
            "description_en": "Handcrafted earthenware clay pot for natural water cooling and cooking.",
            "image_url": "uploads/clay_pot.jpg",
            "status": "published",
        },
        {
            "id": "prod-wooden-elephant",
            "title": "Wooden Elephant",
            "category": "Woodcraft",
            "craft_type": "Woodcraft",
            "price": "₹ 1,200",
            "description_en": "Intricately hand-carved rosewood elephant figurine with royal heritage motifs.",
            "image_url": "uploads/wooden_elephant.jpg",
            "status": "published",
        },
        {
            "id": "prod-woven-mat",
            "title": "Woven Mat",
            "category": "Handicraft",
            "craft_type": "Textiles & Mats",
            "price": "₹ 900",
            "description_en": "Traditional natural fiber floor cushion and meditation mat with heritage texture.",
            "image_url": "uploads/woven_mat.jpg",
            "status": "published",
        },
    ]

    woven_basket_ideas = [
        {
            "concept_name": "Handcrafted Handbag",
            "pitch": "Turn your traditional weave into a stylish bag for everyday use.",
            "target_customer": "Urban working women, eco-conscious shoppers",
            "improvements": json.dumps([
                "Add inner lining and zip",
                "Use modern colours",
                "Add shoulder strap",
                "Keep your traditional weave"
            ]),
            "generated_image_path": "uploads/woven_handbag.jpg",
        },
        {
            "concept_name": "Decorative Lamp",
            "pitch": "Use your weaving skill to create beautiful home décor lamps.",
            "target_customer": "Interior decorators, festive gifting, modern homes",
            "improvements": json.dumps([
                "Use tighter weave for safety",
                "Try warm natural tones",
                "Add hanging option",
                "Good for home décor market"
            ]),
            "generated_image_path": "uploads/decorative_lamp.jpg",
        },
        {
            "concept_name": "Modern Storage Basket",
            "pitch": "A multipurpose storage basket for modern homes.",
            "target_customer": "Minimalist home organizers, Scandinavian aesthetics",
            "improvements": json.dumps([
                "Use uniform shape and finish",
                "Add fabric lining",
                "Explore different sizes",
                "Good demand in urban homes"
            ]),
            "generated_image_path": "uploads/woven_storage_basket.jpg",
        },
    ]

    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Upsert showcase products
        for p in showcase_products:
            cursor.execute("""
            INSERT INTO products (
                id, artisan_id, title, description_en, description_hi, description_ta,
                category, craft_type, price, units, image_url, material_cost,
                marketplaces, status, created_at, updated_at
            ) VALUES (?, 'demo_artisan', ?, ?, '', '', ?, ?, ?, 5, ?, 100.0, '[]', ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                category = excluded.category,
                craft_type = excluded.craft_type,
                price = excluded.price,
                description_en = excluded.description_en,
                image_url = excluded.image_url,
                status = excluded.status;
            """, (
                p["id"],
                p["title"],
                p["description_en"],
                p["category"],
                p["craft_type"],
                p["price"],
                p["image_url"],
                p["status"],
                now_iso,
                now_iso
            ))

        # 2. Check and insert showcase design ideas for Woven Basket if not already existing
        cursor.execute("SELECT count(*) FROM design_ideas WHERE product_id = 'prod-woven-basket';")
        count = cursor.fetchone()[0]
        if count == 0:
            for idea in woven_basket_ideas:
                cursor.execute("""
                INSERT INTO design_ideas (
                    product_id, concept_name, pitch, target_customer,
                    improvements, generated_image_path, status, created_at, updated_at
                ) VALUES ('prod-woven-basket', ?, ?, ?, ?, ?, 'generated', ?, ?);
                """, (
                    idea["concept_name"],
                    idea["pitch"],
                    idea["target_customer"],
                    idea["improvements"],
                    idea["generated_image_path"],
                    now_iso,
                    now_iso
                ))
            logger.info("Seeded 3 showcase design innovation concepts for Woven Basket.")


def _seed_demand_forecasts():
    """Seed festival calendar reference data and initial category demand forecasts."""
    with get_db() as conn:
        cursor = conn.cursor()

        festivals = [
            {
                "slug": "diwali",
                "name": "Diwali",
                "start_month": 10,
                "start_day": 31,
                "region": "Pan-India",
                "icon_type": "diya",
                "category_uplift": json.dumps({
                    "Baskets": 0.40,
                    "Home Decor": 0.35,
                    "Textiles": 0.25,
                    "Pottery": 0.30
                }),
                "subtitle": "Time to prepare your products",
                "quote_rationale": "Last Diwali, baskets like yours were 40% more popular. This year, we expect similar or higher demand.",
                "tip": "Start preparing early to make the most of this festive season.",
                "prep_lead_days": 30
            },
            {
                "slug": "pongal",
                "name": "Pongal & Makar Sankranti",
                "start_month": 1,
                "start_day": 14,
                "region": "South & Central India",
                "icon_type": "pottery",
                "category_uplift": json.dumps({
                    "Pottery": 0.40,
                    "Baskets": 0.30,
                    "Textiles": 0.25
                }),
                "subtitle": "Harvest festival demand for terracotta & baskets",
                "quote_rationale": "Traditional earthenware and cane storage baskets see massive regional demand for harvest offerings.",
                "tip": "Ensure adequate baking time and dry storage before the winter festive rush.",
                "prep_lead_days": 25
            },
            {
                "slug": "wedding-season",
                "name": "Winter Wedding Season",
                "start_month": 11,
                "start_day": 15,
                "region": "Pan-India",
                "icon_type": "sparkles",
                "category_uplift": json.dumps({
                    "Textiles": 0.50,
                    "Jewelry": 0.55,
                    "Baskets": 0.35,
                    "Home Decor": 0.40
                }),
                "subtitle": "Surge in gifting and bridal handlooms",
                "quote_rationale": "Wedding return gifts and festive handloom sarees drive over half of annual artisan textile orders.",
                "tip": "Prepare pre-assembled gift bundles and festive packaging options early.",
                "prep_lead_days": 40
            },
            {
                "slug": "christmas",
                "name": "Christmas & New Year",
                "start_month": 12,
                "start_day": 25,
                "region": "Pan-India",
                "icon_type": "gift",
                "category_uplift": json.dumps({
                    "Baskets": 0.35,
                    "Home Decor": 0.30,
                    "Woodcraft": 0.35
                }),
                "subtitle": "Holiday gifting & home accessories",
                "quote_rationale": "Corporate holiday hampers and modern lifestyle gifts peak during December.",
                "tip": "Position handwoven baskets as sustainable, reusable packaging for corporate orders.",
                "prep_lead_days": 20
            }
        ]

        for f in festivals:
            cursor.execute("""
            INSERT INTO festival_calendar (
                slug, name, start_month, start_day, region, icon_type,
                category_uplift, subtitle, quote_rationale, tip, prep_lead_days
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET
                name = excluded.name,
                category_uplift = excluded.category_uplift,
                subtitle = excluded.subtitle,
                quote_rationale = excluded.quote_rationale,
                tip = excluded.tip;
            """, (
                f["slug"], f["name"], f["start_month"], f["start_day"],
                f["region"], f["icon_type"], f["category_uplift"],
                f["subtitle"], f["quote_rationale"], f["tip"], f["prep_lead_days"]
            ))

        cursor.execute("SELECT id FROM festival_calendar WHERE slug = 'diwali';")
        diwali_row = cursor.fetchone()
        diwali_id = diwali_row["id"] if diwali_row else 1

        forecasts = [
            {
                "category": "Baskets",
                "craft_description": "Handwoven using natural grass",
                "festival_id": diwali_id,
                "festival_slug": "diwali",
                "expected_demand": "High",
                "uplift_pct": 40,
                "recommended_qty_min": 30,
                "recommended_qty_max": 40,
                "target_date": "Oct 15",
                "confidence": "Estimated — based on category trends across the platform",
                "headline": "High demand this Diwali",
                "sub_headline": "Basket sales rose 40% last year.",
                "reasons_json": json.dumps([
                    {"icon": "gift", "text": "Popular for gifting"},
                    {"icon": "home", "text": "High demand for home décor"},
                    {"icon": "trend", "text": "Sold 40% more last Diwali"}
                ]),
                "rationale": "Last Diwali, baskets like yours were 40% more popular. This year, we expect similar or higher demand.",
                "image_url": "uploads/forecast_basket.jpg"
            },
            {
                "category": "Pottery",
                "craft_description": "Terracotta & earthenware vessels",
                "festival_id": diwali_id,
                "festival_slug": "diwali",
                "expected_demand": "Medium",
                "uplift_pct": 30,
                "recommended_qty_min": 20,
                "recommended_qty_max": 30,
                "target_date": "Oct 18",
                "confidence": "Estimated — based on category trends",
                "headline": "Medium demand this Diwali",
                "sub_headline": "Clay pots and festive diyas see steady pre-orders.",
                "reasons_json": json.dumps([
                    {"icon": "home", "text": "Festive puja rituals and traditional decor"},
                    {"icon": "gift", "text": "Eco-friendly natural gift containers"},
                    {"icon": "trend", "text": "Consistent 30% surge in pre-festive weeks"}
                ]),
                "rationale": "Artisanal clay pottery is widely sought for puja setups and eco-friendly corporate hampers.",
                "image_url": "uploads/forecast_pottery.jpg"
            },
            {
                "category": "Textiles",
                "craft_description": "Handwoven silk & cotton fabrics",
                "festival_id": diwali_id,
                "festival_slug": "diwali",
                "expected_demand": "Low",
                "uplift_pct": 20,
                "recommended_qty_min": 10,
                "recommended_qty_max": 15,
                "target_date": "Oct 22",
                "confidence": "Estimated — based on category trends",
                "headline": "Moderate demand this Diwali",
                "sub_headline": "Peak textile demand expected closer to Wedding Season.",
                "reasons_json": json.dumps([
                    {"icon": "trend", "text": "Steady demand for puja shawls & dupattas"},
                    {"icon": "gift", "text": "Specialty handloom gifting"},
                    {"icon": "home", "text": "Textile runners and cushion accents"}
                ]),
                "rationale": "While festive handloom sales remain steady, the primary textile surge aligns with the post-Diwali wedding calendar.",
                "image_url": "uploads/forecast_textiles.jpg"
            }
        ]

        cursor.execute("SELECT count(*) FROM demand_forecasts;")
        count = cursor.fetchone()[0]
        if count == 0:
            for fc in forecasts:
                cursor.execute("""
                INSERT INTO demand_forecasts (
                    artisan_id, category, craft_description, festival_id, festival_slug,
                    expected_demand, uplift_pct, recommended_qty_min, recommended_qty_max,
                    target_date, confidence, headline, sub_headline, reasons_json,
                    rationale, image_url, production_goal
                ) VALUES ('demo_artisan', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);
                """, (
                    fc["category"], fc["craft_description"], fc["festival_id"], fc["festival_slug"],
                    fc["expected_demand"], fc["uplift_pct"], fc["recommended_qty_min"], fc["recommended_qty_max"],
                    fc["target_date"], fc["confidence"], fc["headline"], fc["sub_headline"],
                    fc["reasons_json"], fc["rationale"], fc["image_url"]
                ))
            logger.info("Seeded category demand forecasts for Baskets, Pottery, and Textiles.")

        # 21. Materials & Tools — Suppliers table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            whatsapp TEXT NOT NULL,
            address TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            latitude REAL DEFAULT 13.0827,
            longitude REAL DEFAULT 80.2707,
            rating REAL DEFAULT 4.5,
            review_count INTEGER DEFAULT 12,
            verified INTEGER DEFAULT 0,
            description TEXT,
            delivery_available TEXT DEFAULT 'Yes (within 5 km)',
            image_url TEXT,
            source TEXT DEFAULT 'self_registered',
            created_at TEXT NOT NULL
        );
        """)

        # 22. Supplier Materials catalog table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS supplier_materials (
            id TEXT PRIMARY KEY,
            supplier_id TEXT NOT NULL,
            material_name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            unit TEXT NOT NULL,
            in_stock INTEGER DEFAULT 1,
            min_order TEXT DEFAULT '10 kg',
            image_url TEXT,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
        );
        """)

        # 23. Quote Requests table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quote_requests (
            id TEXT PRIMARY KEY,
            supplier_id TEXT NOT NULL,
            supplier_name TEXT,
            artisan_id TEXT,
            artisan_phone TEXT,
            material_name TEXT NOT NULL,
            quantity TEXT NOT NULL,
            unit TEXT NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL
        );
        """)

        # 24. Suggested Suppliers table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS suggested_suppliers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            material_type TEXT,
            city TEXT,
            suggested_by TEXT,
            created_at TEXT NOT NULL
        );
        """)

        # Seed Suppliers and Materials if empty
        cursor.execute("SELECT count(*) FROM suppliers;")
        sup_count = cursor.fetchone()[0]
        if sup_count == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            import uuid
            seeded_suppliers = [
                {
                    "id": "sup_green_roots",
                    "name": "Green Roots Supplies",
                    "phone": "+91 98401 23456",
                    "whatsapp": "+919840123456",
                    "address": "Main Road, Sector 4",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "latitude": 13.0850,
                    "longitude": 80.2750,
                    "rating": 4.8,
                    "review_count": 32,
                    "verified": 1,
                    "description": "Supplier of natural grasses, bamboo and other eco-friendly craft materials.",
                    "delivery_available": "Yes (within 5 km)",
                    "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80",
                    "materials": [
                        {"name": "Sabai Grass", "category": "raw_material", "price": 110.0, "unit": "kg", "in_stock": 1, "min_order": "10 kg", "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80"},
                        {"name": "Bamboo", "category": "raw_material", "price": 80.0, "unit": "kg", "in_stock": 1, "min_order": "15 kg", "image_url": "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&q=80"},
                        {"name": "Bamboo (treated)", "category": "raw_material", "price": 150.0, "unit": "kg", "in_stock": 1, "min_order": "10 kg", "image_url": "https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600&q=80"},
                        {"name": "Jute", "category": "eco_friendly", "price": 95.0, "unit": "kg", "in_stock": 1, "min_order": "5 kg", "image_url": "https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=600&q=80"},
                    ]
                },
                {
                    "id": "sup_tamil_natural",
                    "name": "Tamil Natural Crafts",
                    "phone": "+91 98402 34567",
                    "whatsapp": "+919840234567",
                    "address": "Anna Nagar 2nd Avenue",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "latitude": 13.0900,
                    "longitude": 80.2850,
                    "rating": 4.6,
                    "review_count": 24,
                    "verified": 0,
                    "description": "Specialist wholesale dealer in traditional raw materials, sabai grass, and palm leaves.",
                    "delivery_available": "Yes (within 10 km)",
                    "image_url": "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80",
                    "materials": [
                        {"name": "Sabai Grass", "category": "raw_material", "price": 120.0, "unit": "kg", "in_stock": 1, "min_order": "5 kg", "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80"},
                        {"name": "Wood", "category": "raw_material", "price": 180.0, "unit": "kg", "in_stock": 1, "min_order": "20 kg", "image_url": "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&q=80"},
                        {"name": "Resin", "category": "raw_material", "price": 350.0, "unit": "kg", "in_stock": 1, "min_order": "2 kg", "image_url": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80"},
                    ]
                },
                {
                    "id": "sup_eco_materials",
                    "name": "Eco Materials Hub",
                    "phone": "+91 98403 45678",
                    "whatsapp": "+919840345678",
                    "address": "Guindy Industrial Estate",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "latitude": 13.0100,
                    "longitude": 80.2100,
                    "rating": 4.3,
                    "review_count": 19,
                    "verified": 1,
                    "description": "Certified organic and sustainable raw materials for artisans, weavers, and craftspeople.",
                    "delivery_available": "Yes (Tamil Nadu state-wide)",
                    "image_url": "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80",
                    "materials": [
                        {"name": "Sabai Grass", "category": "raw_material", "price": 125.0, "unit": "kg", "in_stock": 1, "min_order": "10 kg", "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80"},
                        {"name": "Cotton Yarn", "category": "raw_material", "price": 240.0, "unit": "kg", "in_stock": 1, "min_order": "5 kg", "image_url": "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=600&q=80"},
                        {"name": "Natural Dyes", "category": "raw_material", "price": 280.0, "unit": "kg", "in_stock": 1, "min_order": "2 kg", "image_url": "https://images.unsplash.com/photo-1596541223130-5d31a73fb6c6?w=600&q=80"},
                        {"name": "Packaging Boxes", "category": "packaging", "price": 15.0, "unit": "box", "in_stock": 1, "min_order": "50 boxes", "image_url": "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&q=80"},
                    ]
                },
                {
                    "id": "sup_sri_sai",
                    "name": "Sri Sai Traders",
                    "phone": "+91 98404 56789",
                    "whatsapp": "+919840456789",
                    "address": "George Town, Broadway",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "latitude": 13.0950,
                    "longitude": 80.2900,
                    "rating": 4.2,
                    "review_count": 45,
                    "verified": 0,
                    "description": "Direct wholesale distributor of craft clays, minerals, glazes, and raw grasses.",
                    "delivery_available": "Pickup & Local Delivery",
                    "image_url": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
                    "materials": [
                        {"name": "Sabai Grass", "category": "raw_material", "price": 130.0, "unit": "kg", "in_stock": 1, "min_order": "20 kg", "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80"},
                        {"name": "Clay", "category": "raw_material", "price": 45.0, "unit": "kg", "in_stock": 1, "min_order": "25 kg", "image_url": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80"},
                        {"name": "Glaze", "category": "raw_material", "price": 320.0, "unit": "kg", "in_stock": 1, "min_order": "2 kg", "image_url": "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80"},
                        {"name": "Metal", "category": "raw_material", "price": 450.0, "unit": "kg", "in_stock": 1, "min_order": "5 kg", "image_url": "https://images.unsplash.com/photo-1535813547-99c456a41d4a?w=600&q=80"},
                    ]
                },
                {
                    "id": "sup_pottery_crafts",
                    "name": "Kumbhar Craft & Pottery Equipment",
                    "phone": "+91 98405 67890",
                    "whatsapp": "+919840567890",
                    "address": "Vadapalani Potter Colony",
                    "city": "Chennai",
                    "state": "Tamil Nadu",
                    "latitude": 13.0500,
                    "longitude": 80.2100,
                    "rating": 4.9,
                    "review_count": 58,
                    "verified": 1,
                    "description": "Equipment, pottery wheels, natural terracotta clay, and kiln accessories.",
                    "delivery_available": "Yes (within 15 km)",
                    "image_url": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
                    "materials": [
                        {"name": "Clay", "category": "raw_material", "price": 40.0, "unit": "kg", "in_stock": 1, "min_order": "20 kg", "image_url": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80"},
                        {"name": "Pottery Wheel", "category": "machinery", "price": 8500.0, "unit": "unit", "in_stock": 1, "min_order": "1 unit", "image_url": "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80"},
                        {"name": "Kiln", "category": "machinery", "price": 24000.0, "unit": "unit", "in_stock": 1, "min_order": "1 unit", "image_url": "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80"},
                        {"name": "Glaze", "category": "raw_material", "price": 290.0, "unit": "kg", "in_stock": 1, "min_order": "3 kg", "image_url": "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80"},
                        {"name": "Wooden Handles", "category": "tool", "price": 35.0, "unit": "piece", "in_stock": 1, "min_order": "10 pieces", "image_url": "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=600&q=80"},
                        {"name": "Tools", "category": "tool", "price": 450.0, "unit": "set", "in_stock": 1, "min_order": "1 set", "image_url": "https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?w=600&q=80"},
                    ]
                }
            ]

            for s in seeded_suppliers:
                cursor.execute("""
                INSERT INTO suppliers (
                    id, name, phone, whatsapp, address, city, state, latitude, longitude,
                    rating, review_count, verified, description, delivery_available, image_url,
                    source, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'self_registered', ?);
                """, (
                    s["id"], s["name"], s["phone"], s["whatsapp"], s["address"], s["city"], s["state"],
                    s["latitude"], s["longitude"], s["rating"], s["review_count"], s["verified"],
                    s["description"], s["delivery_available"], s["image_url"], now_iso
                ))
                for mat in s.get("materials", []):
                    mat_id = f"mat_{uuid.uuid4().hex[:8]}"
                    cursor.execute("""
                    INSERT INTO supplier_materials (
                        id, supplier_id, material_name, category, price, unit, in_stock, min_order, image_url, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """, (
                        mat_id, s["id"], mat["name"], mat["category"], mat["price"], mat["unit"],
                        mat["in_stock"], mat["min_order"], mat["image_url"], now_iso
                    ))
            logger.info("Seeded 5 suppliers and their raw materials & tools catalog.")



