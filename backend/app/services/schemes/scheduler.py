"""
Scheme Discovery Pipeline Scheduler & Orchestrator (Step 5).

Provides a single entrypoint `run_full_refresh()` to execute the end-to-end pipeline:
1. Multi-source collection (collector.py)
2. AI extraction (extractor.py)
3. SQLite persistence & upsert (storage.py)
4. Audit crawl logging (storage.py)
5. Deprecation of stale records older than threshold (storage.py)

Includes in-memory locking to prevent concurrent overlapping executions.
"""

import logging
import threading
from typing import Any, Dict

from app.services.schemes.collector import collect_all_sources
from app.services.schemes.extractor import extract_all
from app.services.schemes.storage import (
    save_schemes,
    log_crawl_results,
    mark_stale_schemes,
)

logger = logging.getLogger("SchemeScheduler")
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

# In-memory execution lock & state
_REFRESH_LOCK = threading.Lock()
_IS_REFRESHING = False


def is_refresh_in_progress() -> bool:
    """Returns True if a refresh pipeline is currently running."""
    global _IS_REFRESHING
    return _IS_REFRESHING


def run_full_refresh(days_threshold: int = 90) -> Dict[str, Any]:
    """
    Executes the full scheme discovery and refresh pipeline:
    Collect -> Extract -> Save -> Log -> Deprecate Stale.

    Guarded by an in-memory lock to prevent race conditions or duplicate runs.
    """
    global _IS_REFRESHING

    # Attempt to acquire lock without blocking
    acquired = _REFRESH_LOCK.acquire(blocking=False)
    if not acquired:
        logger.warning("Refresh triggered while another refresh is already running.")
        return {
            "success": False,
            "status": "already_running",
            "message": "A scheme refresh pipeline is already in progress. Please wait.",
            "schemes_saved": 0,
        }

    _IS_REFRESHING = True
    try:
        logger.info("=== Starting full scheme refresh pipeline ===")

        # 1. Step 1: Collect
        collector_results = collect_all_sources()
        succeeded_sources = sum(1 for r in collector_results if r.get("status") == "success")
        failed_sources = sum(1 for r in collector_results if r.get("status") == "failed")
        skipped_sources = sum(1 for r in collector_results if r.get("status") == "skipped")

        # 2. Step 2: Extract
        extracted_schemes = extract_all(collector_results)

        # 3. Step 3: Save / Upsert
        saved_count = save_schemes(extracted_schemes)

        # 4. Step 3: Audit Log
        log_crawl_results(collector_results, extracted_schemes=extracted_schemes)

        # 5. Step 5A: Mark Stale Schemes
        stale_count = mark_stale_schemes(days_threshold=days_threshold)

        logger.info(
            f"=== Pipeline finished: {saved_count} saved, {stale_count} marked stale, "
            f"{succeeded_sources} sources ok ==="
        )

        return {
            "success": True,
            "status": "completed",
            "message": f"Pipeline completed. {saved_count} schemes saved/updated, {stale_count} marked stale.",
            "schemes_extracted": len(extracted_schemes),
            "schemes_saved": saved_count,
            "stale_marked": stale_count,
            "sources_attempted": len(collector_results),
            "sources_succeeded": succeeded_sources,
            "sources_failed": failed_sources,
            "sources_skipped": skipped_sources,
        }

    except Exception as e:
        logger.error(f"Scheme refresh pipeline encountered an unhandled error: {e}", exc_info=True)
        return {
            "success": False,
            "status": "error",
            "message": f"Pipeline failed: {str(e)}",
            "schemes_saved": 0,
        }
    finally:
        _IS_REFRESHING = False
        _REFRESH_LOCK.release()
