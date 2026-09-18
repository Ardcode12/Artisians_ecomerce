"""
Standalone manual verification script for the AI Scheme Extractor (Step 2).

Usage:
    python backend/app/services/schemes/test_extractor_manual.py
or from the backend directory:
    python app/services/schemes/test_extractor_manual.py
"""

import os
import sys

# Ensure current directory and backend root are in sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))

if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import collector
import extractor

collect_all_sources = collector.collect_all_sources
extract_all = extractor.extract_all


def main():
    print("=" * 80)
    print("SCHEME EXTRACTION MODULE (STEP 2) - STANDALONE MANUAL VERIFICATION")
    print("=" * 80)
    print("\n1. Running Step 1 Multi-Source Collector...")
    collector_results = collect_all_sources()

    successful_sources = [r for r in collector_results if r.get("status") == "success" and r.get("raw_content")]
    print(f"\nCollected {len(collector_results)} total sources ({len(successful_sources)} successful with content).")

    print("\n2. Executing Step 2 AI Scheme Extraction via LLM...")
    extracted_schemes = extract_all(collector_results, delay_between_calls=1.0)

    print("\n" + "=" * 80)
    print("EXTRACTED SCHEME RECORDS:")
    print("=" * 80)

    if not extracted_schemes:
        print("No schemes extracted.")
    else:
        for idx, scheme in enumerate(extracted_schemes, 1):
            flag_str = "[FLAGGED FOR REVIEW]" if scheme.review_flagged else "[VERIFIED / CONFIDENT]"
            print(f"\n--- Scheme #{idx}: {scheme.scheme_name} ---")
            print(f"  Provider:             {scheme.provider_name} ({scheme.provider_type})")
            print(f"  Category:             {scheme.scheme_category or 'N/A'}")
            print(f"  Status / Confidence:  {flag_str}")
            print(f"  Eligibility:          {scheme.eligibility_summary or 'N/A'}")
            print(f"  Benefits:             {scheme.benefits_offered or 'N/A'}")
            print(f"  Application Process:  {scheme.application_process or 'N/A'}")
            print(f"  Deadline:             {scheme.application_deadline or 'N/A'}")
            print(f"  Official Source:      {scheme.official_source_url} ({scheme.source_type})")

    print("\n" + "=" * 80)
    total_sources = len(collector_results)
    total_schemes = len(extracted_schemes)
    flagged_count = sum(1 for s in extracted_schemes if s.review_flagged)
    confident_count = total_schemes - flagged_count

    print("EXTRACTION SUMMARY:")
    print(f"  Total Sources Processed:  {total_sources}")
    print(f"  Sources with Content:     {len(successful_sources)}")
    print(f"  Total Schemes Extracted:  {total_schemes}")
    print(f"  Schemes Confident:        {confident_count}")
    print(f"  Schemes Flagged (Review): {flagged_count}")
    print("=" * 80)


if __name__ == "__main__":
    main()
