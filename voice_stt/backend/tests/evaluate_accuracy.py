#!/usr/bin/env python3
"""
voice_stt/backend/tests/evaluate_accuracy.py
----------------------------------------------
WER / CER accuracy evaluation tool.

USAGE
─────
    python tests/evaluate_accuracy.py --dir tests/audio/tamil/ --language ta
    python tests/evaluate_accuracy.py --dir tests/audio/ --all-langs
    python tests/evaluate_accuracy.py --report report.json

Reference transcripts must be placed in a JSON file named
`reference.json` inside each language folder:

    tests/audio/tamil/reference.json
    {
        "tamil_01.wav": "இந்த மூங்கில் கூடையை நான் கையால் செய்தேன்.",
        "tamil_02.wav": "இதன் விலை நானூற்று ஐம்பது ரூபாய்."
    }

Only files listed in reference.json are evaluated.
Files without a reference are skipped.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Optional

# Language folder → BCP-47 code
FOLDER_LANG_MAP = {
    "tamil": "ta",
    "telugu": "te",
    "hindi": "hi",
    "kannada": "kn",
    "malayalam": "ml",
    "marathi": "mr",
    "gujarati": "gu",
    "bengali": "bn",
    "punjabi": "pa",
}


def compute_metrics(reference: str, hypothesis: str) -> dict[str, float]:
    """
    Compute WER and CER using the `jiwer` library.

    For Tamil and other Indic languages, CER is often more meaningful
    than WER because word-boundary tokenisation differs from English.
    """
    try:
        from jiwer import cer, wer

        wer_score = round(wer(reference, hypothesis), 4)
        cer_score = round(cer(reference, hypothesis), 4)
    except ImportError:
        print("  [WARNING] jiwer not installed. Run: pip install jiwer")
        wer_score = -1.0
        cer_score = -1.0

    return {"wer": wer_score, "cer": cer_score}


def evaluate_directory(
    audio_dir: Path,
    language: Optional[str],
    api_url: Optional[str],
) -> list[dict]:
    """Evaluate all files in audio_dir that have references."""
    ref_file = audio_dir / "reference.json"
    if not ref_file.exists():
        print(f"  [SKIP] No reference.json found in {audio_dir}")
        return []

    references: dict[str, str] = json.loads(ref_file.read_text(encoding="utf-8"))
    if not references:
        print(f"  [SKIP] reference.json in {audio_dir} is empty.")
        return []

    # Ensure backend/app is importable for local mode
    if api_url is None:
        backend_dir = Path(__file__).resolve().parents[1]
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))

        from app.stt import get_model, load_model, preprocess_audio

        try:
            model = get_model()
        except RuntimeError:
            print("  [Loading model…]")
            load_model()
            model = get_model()

    results = []
    for filename, ref_text in references.items():
        audio_path = audio_dir / filename
        if not audio_path.exists():
            print(f"  [MISSING] {audio_path} not found, skipping.")
            continue

        # Transcribe
        try:
            if api_url:
                import requests

                url = f"{api_url.rstrip('/')}/api/stt/transcribe"
                with open(audio_path, "rb") as f:
                    resp = requests.post(
                        url,
                        files={"file": (filename, f, "audio/wav")},
                        data={"language": language} if language else {},
                        timeout=120,
                    )
                resp.raise_for_status()
                data = resp.json()
                hyp_text = data.get("text", "")
                inf_time = data.get("processing_time_seconds", 0)
            else:
                with open(audio_path, "rb") as f:
                    audio_bytes = f.read()
                audio_array, _ = preprocess_audio(audio_bytes, filename)  # noqa: F821
                t0 = time.perf_counter()
                hyp_text = model.transcribe(audio_array, language=language)  # noqa: F821
                inf_time = round(time.perf_counter() - t0, 3)

            metrics = compute_metrics(ref_text, hyp_text)
            results.append(
                {
                    "file": filename,
                    "language": language or "auto",
                    "reference": ref_text,
                    "hypothesis": hyp_text,
                    "wer": metrics["wer"],
                    "cer": metrics["cer"],
                    "inference_time_seconds": inf_time,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "file": filename,
                    "language": language or "auto",
                    "error": str(exc),
                }
            )

    return results


def print_report(all_results: list[dict]):
    """Print a summary report grouped by language."""
    from collections import defaultdict

    by_lang: dict[str, list[dict]] = defaultdict(list)
    for r in all_results:
        if "error" not in r:
            by_lang[r["language"]].append(r)

    print()
    print("=" * 80)
    print("  Accuracy Report – AI4Bharat IndicWhisper")
    print("=" * 80)
    print(f"{'Language':<12} {'Samples':>8} {'WER':>10} {'CER':>10} {'Avg Inference':>15}")
    print("-" * 57)

    for lang, rows in sorted(by_lang.items()):
        wers = [r["wer"] for r in rows if r["wer"] >= 0]
        cers = [r["cer"] for r in rows if r["cer"] >= 0]
        times = [r["inference_time_seconds"] for r in rows]
        avg_wer = round(sum(wers) / len(wers), 4) if wers else "N/A"
        avg_cer = round(sum(cers) / len(cers), 4) if cers else "N/A"
        avg_time = round(sum(times) / len(times), 3)
        print(f"{lang:<12} {len(rows):>8} {str(avg_wer):>10} {str(avg_cer):>10} {avg_time:>14}s")

    print("-" * 57)
    print()
    print("  WER = Word Error Rate  (lower is better, 0.0 = perfect)")
    print("  CER = Character Error Rate (recommended for Tamil/Indic)")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate WER/CER for AI4Bharat STT transcriptions."
    )
    parser.add_argument(
        "--dir", "-d",
        default=None,
        help="Single language audio directory to evaluate.",
    )
    parser.add_argument(
        "--language", "-l",
        default=None,
        help="BCP-47 language code for the directory (e.g. ta, te, hi).",
    )
    parser.add_argument(
        "--all-langs",
        action="store_true",
        help="Evaluate all language subdirectories under tests/audio/",
    )
    parser.add_argument(
        "--api",
        default=None,
        metavar="URL",
        help="Use running API. E.g. http://localhost:8000",
    )
    parser.add_argument(
        "--report", "-r",
        default=None,
        metavar="FILE",
        help="Save detailed JSON report to a file.",
    )
    args = parser.parse_args()

    audio_root = Path(__file__).parent / "audio"
    all_results: list[dict] = []

    if args.all_langs:
        for lang_dir in sorted(audio_root.iterdir()):
            if lang_dir.is_dir():
                lang_code = FOLDER_LANG_MAP.get(lang_dir.name.lower())
                print(f"\nEvaluating: {lang_dir.name} ({lang_code or 'auto'})")
                results = evaluate_directory(lang_dir, lang_code, args.api)
                all_results.extend(results)
    elif args.dir:
        target = Path(args.dir)
        if not target.exists():
            print(f"Error: '{target}' does not exist.", file=sys.stderr)
            sys.exit(1)
        lang_code = args.language or FOLDER_LANG_MAP.get(target.name.lower())
        print(f"\nEvaluating: {target.name} ({lang_code or 'auto'})")
        results = evaluate_directory(target, lang_code, args.api)
        all_results.extend(results)
    else:
        parser.print_help()
        sys.exit(0)

    if not all_results:
        print("\nNo results. Add audio files and reference.json to the test directories.")
        return

    print_report(all_results)

    if args.report:
        out = Path(args.report)
        out.write_text(json.dumps(all_results, ensure_ascii=False, indent=2))
        print(f"Detailed report saved to: {out}")


if __name__ == "__main__":
    main()
