#!/usr/bin/env python3
"""
voice_stt/backend/tests/test_transcription.py
-----------------------------------------------
CLI test tool for the AI4Bharat STT service.

USAGE
─────
# Single file (language auto-detected):
    python tests/test_transcription.py path/to/audio.wav

# Single file with language hint:
    python tests/test_transcription.py path/to/audio.wav --language ta

# Batch: all files in a directory:
    python tests/test_transcription.py tests/audio/tamil/

# Against running API instead of loading model locally:
    python tests/test_transcription.py path/to/audio.wav --api http://localhost:8000

# With specific language for batch:
    python tests/test_transcription.py tests/audio/hindi/ --language hi
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Language folder → BCP-47 code heuristic
# ──────────────────────────────────────────────────────────────────────────────
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

AUDIO_EXTS = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}


def guess_language_from_path(path: Path) -> str | None:
    for part in path.parts:
        lang = FOLDER_LANG_MAP.get(part.lower())
        if lang:
            return lang
    return None


# ──────────────────────────────────────────────────────────────────────────────
# API mode: call the running FastAPI server
# ──────────────────────────────────────────────────────────────────────────────

def transcribe_via_api(audio_path: Path, language: str | None, base_url: str) -> dict:
    import requests

    url = f"{base_url.rstrip('/')}/api/stt/transcribe"
    with open(audio_path, "rb") as f:
        files = {"file": (audio_path.name, f, "audio/wav")}
        data = {"language": language} if language else {}
        resp = requests.post(url, files=files, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


# ──────────────────────────────────────────────────────────────────────────────
# Local mode: load model in-process
# ──────────────────────────────────────────────────────────────────────────────

def transcribe_locally(audio_path: Path, language: str | None) -> dict:
    # Ensure we can import from backend/app
    backend_dir = Path(__file__).resolve().parents[1]
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))

    from app.stt import load_model, get_model, preprocess_audio

    # Load model if not already loaded (local single-run mode)
    try:
        model = get_model()
    except RuntimeError:
        print("  [Loading model – first run may take a moment…]")
        load_model()
        model = get_model()

    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    audio_array, duration = preprocess_audio(audio_bytes, audio_path.name)

    t0 = time.perf_counter()
    text = model.transcribe(audio_array, language=language)
    processing_time = round(time.perf_counter() - t0, 3)

    return {
        "success": True,
        "language": language,
        "text": text,
        "duration_seconds": round(duration, 3),
        "processing_time_seconds": processing_time,
        "device": model.device,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Batch runner
# ──────────────────────────────────────────────────────────────────────────────

def run_batch(paths: list[Path], language: str | None, api_url: str | None):
    results = []
    print(f"\n{'Language':<10} {'File':<35} {'Transcription':<55} {'Time':>8}")
    print("─" * 115)

    for p in paths:
        lang = language or guess_language_from_path(p)
        try:
            if api_url:
                result = transcribe_via_api(p, lang, api_url)
            else:
                result = transcribe_locally(p, lang)

            text = result.get("text", "")[:52] + "…" if len(result.get("text", "")) > 52 else result.get("text", "")
            t = result.get("processing_time_seconds", "?")
            print(f"{(lang or 'auto'):<10} {p.name:<35} {text:<55} {t:>7}s")
            results.append({"file": str(p), "language": lang, **result})
        except Exception as exc:
            print(f"{(lang or 'auto'):<10} {p.name:<35} ERROR: {exc}")
            results.append({"file": str(p), "language": lang, "error": str(exc)})

    print()
    return results


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Test AI4Bharat STT transcription on audio files."
    )
    parser.add_argument("path", help="Path to an audio file or a directory of audio files.")
    parser.add_argument(
        "--language", "-l",
        default=None,
        help="BCP-47 language code: ta | te | hi | kn | ml | mr … (default: auto-detect)",
    )
    parser.add_argument(
        "--api",
        default=None,
        metavar="URL",
        help="Use running API server instead of loading locally. E.g. http://localhost:8000",
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        metavar="FILE",
        help="Save JSON results to a file.",
    )
    args = parser.parse_args()

    target = Path(args.path)
    if not target.exists():
        print(f"Error: path '{target}' does not exist.", file=sys.stderr)
        sys.exit(1)

    if target.is_file():
        paths = [target]
    else:
        paths = sorted(
            p for p in target.rglob("*") if p.suffix.lower() in AUDIO_EXTS
        )
        if not paths:
            print(f"No audio files found in '{target}'.", file=sys.stderr)
            sys.exit(1)

    results = run_batch(paths, args.language, args.api)

    if args.output:
        out_path = Path(args.output)
        out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2))
        print(f"Results saved to {out_path}")


if __name__ == "__main__":
    main()
