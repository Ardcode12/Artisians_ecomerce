"""
One-time / on-demand backfill script to generate plain-language 'simple_summary'
for existing welfare schemes stored in SQLite database.
"""

import sys
import logging
from datetime import datetime, timezone
from pathlib import Path

# Setup paths
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.db.database import get_db
from app.services.schemes.extractor import generate_multilingual_simple_summaries

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("BackfillSimpleSummary")


def backfill_existing_schemes():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, scheme_name, provider_name, scheme_category, eligibility_summary, benefits_offered,
                   simple_summary, simple_summary_en, simple_summary_hi, simple_summary_ta
            FROM schemes
            WHERE simple_summary_en IS NULL OR simple_summary_hi IS NULL OR simple_summary_ta IS NULL
               OR trim(COALESCE(simple_summary_en, '')) = ''
               OR trim(COALESCE(simple_summary_hi, '')) = ''
               OR trim(COALESCE(simple_summary_ta, '')) = '';
        """)
        rows = cursor.fetchall()

    if not rows:
        logger.info("No schemes need backfilling. All records already have simple_summary_en, simple_summary_hi, and simple_summary_ta.")
        return []

    logger.info(f"Found {len(rows)} schemes needing multilingual simple_summary backfill...")
    updated_records = []
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        for row in rows:
            scheme_id = row["id"]
            scheme_name = row["scheme_name"]
            provider = row["provider_name"]
            category = row["scheme_category"]
            eligibility = row["eligibility_summary"]
            benefits = row["benefits_offered"]

            logger.info(f"Generating multilingual plain-language summaries for: '{scheme_name}'...")
            summaries = generate_multilingual_simple_summaries(
                scheme_name=scheme_name,
                provider_name=provider,
                category=category,
                eligibility=eligibility,
                benefits=benefits,
            )

            en_summary = summaries.get("en", "")
            hi_summary = summaries.get("hi", "")
            ta_summary = summaries.get("ta", "")

            cursor.execute("""
                UPDATE schemes
                SET simple_summary = ?,
                    simple_summary_en = ?,
                    simple_summary_hi = ?,
                    simple_summary_ta = ?,
                    updated_at = ?
                WHERE id = ?;
            """, (en_summary, en_summary, hi_summary, ta_summary, now_iso, scheme_id))

            updated_records.append({
                "id": scheme_id,
                "scheme_name": scheme_name,
                "provider_name": provider,
                "simple_summary_en": en_summary,
                "simple_summary_hi": hi_summary,
                "simple_summary_ta": ta_summary,
            })
            logger.info(f"Saved multilingual summaries for '{scheme_name}'.")

    logger.info(f"Successfully backfilled {len(updated_records)} schemes.")
    return updated_records


if __name__ == "__main__":
    records = backfill_existing_schemes()
    print("\n" + "="*70)
    print(f"BACKFILL COMPLETED: {len(records)} schemes updated")
    print("="*70)
    for r in records:
        print(f"\n[SCHEME]: {r['scheme_name']} ({r['provider_name']})")
        print(f"[EN SUMMARY]: {r['simple_summary_en']}")
        print(f"[HI SUMMARY]: {r['simple_summary_hi']}")
        print(f"[TA SUMMARY]: {r['simple_summary_ta']}")
