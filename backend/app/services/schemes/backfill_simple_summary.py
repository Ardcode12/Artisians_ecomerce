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
from app.services.schemes.extractor import generate_simple_summary

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("BackfillSimpleSummary")


def backfill_existing_schemes():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, scheme_name, provider_name, scheme_category, eligibility_summary, benefits_offered, simple_summary
            FROM schemes
            WHERE simple_summary IS NULL OR trim(simple_summary) = '';
        """)
        rows = cursor.fetchall()

    if not rows:
        logger.info("No schemes need backfilling. All records already have simple_summary.")
        return []

    logger.info(f"Found {len(rows)} schemes needing simple_summary backfill...")
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

            logger.info(f"Generating plain-language summary for: '{scheme_name}'...")
            summary = generate_simple_summary(
                scheme_name=scheme_name,
                provider_name=provider,
                category=category,
                eligibility=eligibility,
                benefits=benefits,
            )

            cursor.execute("""
                UPDATE schemes
                SET simple_summary = ?, updated_at = ?
                WHERE id = ?;
            """, (summary, now_iso, scheme_id))

            updated_records.append({
                "id": scheme_id,
                "scheme_name": scheme_name,
                "provider_name": provider,
                "simple_summary": summary,
            })
            logger.info(f"Saved simple_summary for '{scheme_name}':\n   -> {summary}\n")

    logger.info(f"Successfully backfilled {len(updated_records)} schemes.")
    return updated_records


if __name__ == "__main__":
    records = backfill_existing_schemes()
    print("\n" + "="*70)
    print(f"BACKFILL COMPLETED: {len(records)} schemes updated")
    print("="*70)
    for r in records:
        print(f"\n[SCHEME]: {r['scheme_name']} ({r['provider_name']})")
        print(f"[PLAIN-LANGUAGE SUMMARY]:\n{r['simple_summary']}")
