"""
Database Storage and Persistence Module for Welfare Schemes (Step 3).

Persists and retrieves SchemeRecord objects in the on-device SQLite database.
Supports upserting with stable UUID generation, audit logging for crawl jobs,
and stale scheme deprecation.
"""

import json
import logging
import os
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project imports resolve
try:
    from app.db.database import get_db
    from app.services.schemes.extractor import SchemeRecord
except ImportError:
    current_dir = Path(__file__).resolve().parent
    backend_dir = current_dir.parent.parent.parent
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    if str(current_dir) not in sys.path:
        sys.path.insert(0, str(current_dir))

    from app.db.database import get_db
    from extractor import SchemeRecord

logger = logging.getLogger("SchemeStorage")
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


def generate_scheme_id(scheme_name: str, source_url: str) -> str:
    """
    Generates a deterministic, reproducible UUID (v5) based on scheme name and source URL.
    Ensures repeated crawler executions reliably update existing rows without duplicates.
    """
    normalized_name = " ".join(scheme_name.strip().lower().split())
    normalized_url = source_url.strip().lower().rstrip("/")
    unique_key = f"{normalized_name}::{normalized_url}"
    return str(uuid.uuid5(uuid.NAMESPACE_URL, unique_key))


def save_schemes(records: List[SchemeRecord]) -> int:
    """
    Inserts or updates SchemeRecord objects into the SQLite 'schemes' table.
    Uses ON CONFLICT(id) DO UPDATE to perform upserts.
    Updates 'last_verified_date' and 'updated_at' to current UTC ISO timestamp.

    Returns:
        Count of scheme records processed and saved (inserted or updated).
    """
    if not records:
        logger.info("No scheme records to save.")
        return 0

    now_iso = datetime.now(timezone.utc).isoformat()
    processed_count = 0

    with get_db() as conn:
        cursor = conn.cursor()

        for record in records:
            scheme_id = generate_scheme_id(record.scheme_name, record.official_source_url)
            review_flag_int = 1 if record.review_flagged else 0

            cursor.execute("""
            INSERT INTO schemes (
                id,
                scheme_name,
                provider_name,
                provider_type,
                scheme_category,
                eligibility_summary,
                benefits_offered,
                application_process,
                application_deadline,
                official_source_url,
                source_type,
                review_flagged,
                is_active,
                last_verified_date,
                created_at,
                updated_at,
                simple_summary
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, 1,
                ?, ?, ?,
                ?
            )
            ON CONFLICT(id) DO UPDATE SET
                scheme_name = excluded.scheme_name,
                provider_name = excluded.provider_name,
                provider_type = excluded.provider_type,
                scheme_category = excluded.scheme_category,
                eligibility_summary = excluded.eligibility_summary,
                benefits_offered = excluded.benefits_offered,
                application_process = excluded.application_process,
                application_deadline = excluded.application_deadline,
                official_source_url = excluded.official_source_url,
                source_type = excluded.source_type,
                review_flagged = excluded.review_flagged,
                is_active = 1,
                last_verified_date = excluded.last_verified_date,
                updated_at = excluded.updated_at,
                simple_summary = excluded.simple_summary;
            """, (
                scheme_id,
                record.scheme_name,
                record.provider_name,
                record.provider_type,
                record.scheme_category,
                record.eligibility_summary,
                record.benefits_offered,
                record.application_process,
                record.application_deadline,
                record.official_source_url,
                record.source_type,
                review_flag_int,
                now_iso,
                now_iso,
                now_iso,
                getattr(record, 'simple_summary', None),
            ))
            processed_count += 1

    logger.info(f"Successfully saved/upserted {processed_count} scheme(s) into database.")
    return processed_count


def log_crawl_results(
    collector_results: List[Dict[str, Any]],
    extracted_schemes: Optional[List[SchemeRecord]] = None
) -> None:
    """
    Takes Step 1 raw collector output and logs one row per source into 'scheme_crawl_log'.
    Computes schemes_found per source by correlating with extracted_schemes or 'schemes_found' in result dict.
    """
    if not collector_results:
        return

    # Count schemes found per source URL if extracted_schemes is provided
    url_to_count: Dict[str, int] = {}
    if extracted_schemes:
        for s in extracted_schemes:
            url_key = s.official_source_url.strip().lower().rstrip("/")
            url_to_count[url_key] = url_to_count.get(url_key, 0) + 1

    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()

        for res in collector_results:
            source_name = res.get("source_name", "Unknown Source")
            source_url = res.get("source_url", "")
            status = res.get("status", "unknown")
            error_message = res.get("error_message")

            # Determine schemes found count
            norm_url = source_url.strip().lower().rstrip("/")
            found_count = res.get("schemes_found")
            if found_count is None:
                found_count = url_to_count.get(norm_url, 0)

            cursor.execute("""
            INSERT INTO scheme_crawl_log (
                source_name,
                source_url,
                status,
                schemes_found,
                error_message,
                crawled_at
            ) VALUES (?, ?, ?, ?, ?, ?);
            """, (
                source_name,
                source_url,
                status,
                found_count,
                error_message,
                now_iso
            ))

    logger.info(f"Logged crawl results for {len(collector_results)} sources into 'scheme_crawl_log'.")


def get_all_schemes(
    provider_type: Optional[str] = None,
    category: Optional[str] = None,
    keyword: Optional[str] = None,
    is_active: bool = True
) -> List[Dict[str, Any]]:
    """
    Reads from the 'schemes' table with optional filters (provider_type, category, keyword, is_active).
    Returns a list of dicts.
    """
    query = "SELECT * FROM schemes WHERE 1=1"
    params: List[Any] = []

    if is_active is not None:
        query += " AND is_active = ?"
        params.append(1 if is_active else 0)

    if provider_type:
        query += " AND (LOWER(COALESCE(provider_type, '')) = ? OR LOWER(COALESCE(level, '')) = ?)"
        norm_prov = provider_type.strip().lower()
        params.extend([norm_prov, norm_prov])

    if category and category.lower() != 'all':
        norm_cat = f"%{category.strip().lower()}%"
        query += " AND (LOWER(COALESCE(category, '')) LIKE ? OR LOWER(COALESCE(scheme_category, '')) LIKE ?)"
        params.extend([norm_cat, norm_cat])

    if keyword:
        kw_pattern = f"%{keyword.strip().lower()}%"
        query += """ AND (
            LOWER(COALESCE(name, '')) LIKE ? OR
            LOWER(COALESCE(scheme_name, '')) LIKE ? OR
            LOWER(COALESCE(provider_name, '')) LIKE ? OR
            LOWER(COALESCE(ministry, '')) LIKE ? OR
            LOWER(COALESCE(category, '')) LIKE ? OR
            LOWER(COALESCE(short_summary, '')) LIKE ? OR
            LOWER(COALESCE(benefits_offered, '')) LIKE ? OR
            LOWER(COALESCE(eligibility_summary, '')) LIKE ? OR
            LOWER(COALESCE(simple_summary, '')) LIKE ?
        )"""
        params.extend([kw_pattern] * 9)

    query += " ORDER BY COALESCE(review_flagged, 0) ASC, id ASC;"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def get_scheme_by_id(scheme_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a single scheme record by primary key ID (slug or UUID)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM schemes WHERE id = ?;", (scheme_id,))
        row = cursor.fetchone()
        if not row:
            # Fallback search by slugified name
            cursor.execute("SELECT * FROM schemes WHERE LOWER(name) = ? OR LOWER(scheme_name) = ?;", (scheme_id.lower(), scheme_id.lower()))
            row = cursor.fetchone()
        return dict(row) if row else None


def get_user_scheme_progress(user_id: str, scheme_id: str) -> Optional[Dict[str, Any]]:
    """Fetches an artisan's checklist progress and bookmarks for a scheme."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM artisan_scheme_progress WHERE user_id = ? AND scheme_id = ?;",
            (user_id, scheme_id)
        )
        row = cursor.fetchone()
        if not row:
            return None
        res = dict(row)
        try:
            res["checked_conditions"] = json.loads(res.get("checked_conditions") or "[]")
        except Exception:
            res["checked_conditions"] = []
        try:
            res["documents_gathered"] = json.loads(res.get("documents_gathered") or "[]")
        except Exception:
            res["documents_gathered"] = []
        return res


def save_user_scheme_progress(
    user_id: str,
    scheme_id: str,
    checked_conditions: Optional[List[int]] = None,
    documents_gathered: Optional[List[str]] = None,
    bookmarked: Optional[int] = None,
    applied: Optional[int] = None
) -> Dict[str, Any]:
    """Upserts an artisan's progress against a scheme."""
    now_iso = datetime.now(timezone.utc).isoformat()
    checked_json = json.dumps(checked_conditions if checked_conditions is not None else [])
    docs_json = json.dumps(documents_gathered if documents_gathered is not None else [])

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO artisan_scheme_progress (
            user_id, scheme_id, checked_conditions, documents_gathered,
            bookmarked, applied, applied_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, scheme_id) DO UPDATE SET
            checked_conditions = COALESCE(excluded.checked_conditions, artisan_scheme_progress.checked_conditions),
            documents_gathered = COALESCE(excluded.documents_gathered, artisan_scheme_progress.documents_gathered),
            bookmarked = COALESCE(excluded.bookmarked, artisan_scheme_progress.bookmarked),
            applied = COALESCE(excluded.applied, artisan_scheme_progress.applied),
            applied_at = CASE WHEN excluded.applied = 1 THEN excluded.applied_at ELSE artisan_scheme_progress.applied_at END,
            updated_at = excluded.updated_at
        ;""", (
            user_id,
            scheme_id,
            checked_json,
            docs_json,
            bookmarked if bookmarked is not None else 0,
            applied if applied is not None else 0,
            now_iso if applied == 1 else None,
            now_iso,
            now_iso
        ))

    return get_user_scheme_progress(user_id, scheme_id) or {}



def get_recent_crawl_logs(limit: int = 20) -> List[Dict[str, Any]]:
    """Fetches the most recent crawl log entries."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, source_name, source_url, status, schemes_found, error_message, crawled_at
        FROM scheme_crawl_log
        ORDER BY id DESC
        LIMIT ?;
        """, (limit,))
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def mark_stale_schemes(days_threshold: int = 90) -> int:
    """
    Marks schemes as is_active = 0 if last_verified_date is older than days_threshold.
    Returns count of schemes marked stale.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_threshold)
    cutoff_iso = cutoff.isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE schemes
        SET is_active = 0, updated_at = ?
        WHERE last_verified_date < ? AND is_active = 1;
        """, (now_iso, cutoff_iso))
        stale_count = cursor.rowcount

    logger.info(f"Marked {stale_count} schemes as stale (older than {days_threshold} days).")
    return stale_count
