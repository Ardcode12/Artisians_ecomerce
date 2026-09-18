"""
Standalone manual verification script for the Scheme Discovery Data Collector (Step 1).

Usage:
    python backend/app/services/schemes/test_collector_manual.py
or from the backend directory:
    python app/services/schemes/test_collector_manual.py
"""

import os
import sys

# Add schemes directory directly to sys.path to allow standalone execution
# without triggering top-level app package initialization.
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import collector
collect_all_sources = collector.collect_all_sources


def main():
    print("=" * 80)
    print("SCHEME DISCOVERY DATA COLLECTOR - STEP 1 VERIFICATION")
    print("=" * 80)
    print("Executing collect_all_sources()...\n")

    results = collect_all_sources()

    print("\n" + "=" * 80)
    print(f"{'SOURCE NAME':<40} {'TYPE':<8} {'STATUS':<10} {'CHARS':<8}")
    print("-" * 80)

    for r in results:
        status_badge = {
            "success": "[SUCCESS]",
            "failed": "[FAILED]",
            "skipped": "[SKIPPED]",
        }.get(r["status"], r["status"])

        content_len = len(r["raw_content"]) if r["raw_content"] else 0
        name = r["source_name"][:38]

        print(f"{name:<40} {r['source_type']:<8} {status_badge:<10} {content_len:<8}")

        if r["status"] == "success" and r["raw_content"]:
            # Print a brief 120-character snippet of the real content
            snippet = " ".join(r["raw_content"].split())[:120]
            print(f"   Preview: {snippet}...")
        elif r["error_message"]:
            print(f"   Note/Error: {r['error_message']}")
        print()

    print("=" * 80)
    success_count = sum(1 for r in results if r["status"] == "success")
    failed_count = sum(1 for r in results if r["status"] == "failed")
    skipped_count = sum(1 for r in results if r["status"] == "skipped")

    print("COLLECTION SUMMARY:")
    print(f"  Total Sources Attempted: {len(results)}")
    print(f"  Successfully Fetched:    {success_count}")
    print(f"  Failed (Offline/Auth):   {failed_count}")
    print(f"  Skipped (Robots/Sparse): {skipped_count}")
    print("=" * 80)


if __name__ == "__main__":
    main()
