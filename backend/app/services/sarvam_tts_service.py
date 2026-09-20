"""
Sarvam AI TTS Service — Generates audio for Indian regional languages
=======================================================================
Used by the voice call system for languages that Amazon Polly (Twilio)
does not natively support: Tamil, Telugu, Kannada, Malayalam.

Hindi and English continue to use Polly voices (they sound better on Polly).
"""

import os
import base64
import hashlib
import logging
import time
import requests
from pathlib import Path
from typing import Optional

logger = logging.getLogger("SarvamTTS")

# ─── Config ───────────────────────────────────────────────────────────────────
SARVAM_API_URL  = "https://api.sarvam.ai/text-to-speech"
SARVAM_MODEL    = "bulbul:v3"
TTS_CACHE_DIR   = Path(os.getenv("TTS_CACHE_DIR", "/tmp/artisans_tts_cache"))
TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Languages Polly supports natively → skip Sarvam for these
POLLY_NATIVE_LANGS = {"en-IN", "hi-IN"}

# Best Sarvam speaker per language
SARVAM_SPEAKER_MAP: dict[str, str] = {
    "ta-IN": "kavitha",
    "te-IN": "shruti",
    "kn-IN": "kavitha",
    "ml-IN": "kavitha",
    "hi-IN": "ritu",
    "mr-IN": "pooja",
    "gu-IN": "ishita",
    "bn-IN": "priya",
    "pa-IN": "simran",
}


def _sarvam_key() -> str:
    return os.getenv("SARVAM_API_KEY", "").strip()


def _cache_path(text: str, lang: str) -> Path:
    """Return a deterministic cache file path for (text, lang) pair."""
    digest = hashlib.md5(f"{lang}::{text}".encode()).hexdigest()
    return TTS_CACHE_DIR / f"tts_{lang}_{digest}.wav"


def generate_sarvam_audio(text: str, lang: str) -> Optional[Path]:
    """
    Call Sarvam TTS API to synthesise `text` in `lang`.
    Returns the Path to the cached WAV file, or None on failure.
    Audio is cached by content hash so duplicate calls are free.
    """
    api_key = _sarvam_key()
    if not api_key:
        logger.error("[SARVAM TTS] SARVAM_API_KEY not set in .env")
        return None

    cached = _cache_path(text, lang)
    if cached.exists() and cached.stat().st_size > 1000:
        logger.debug(f"[SARVAM TTS] Cache hit → {cached.name}")
        return cached

    speaker = SARVAM_SPEAKER_MAP.get(lang, "kavitha")
    try:
        resp = requests.post(
            SARVAM_API_URL,
            headers={"api-subscription-key": api_key, "Content-Type": "application/json"},
            json={
                "inputs": [text],
                "target_language_code": lang,
                "speaker": speaker,
                "model": SARVAM_MODEL,
            },
            timeout=20,
        )
        if resp.status_code != 200:
            logger.error(f"[SARVAM TTS] API error {resp.status_code}: {resp.text[:300]}")
            return None

        data = resp.json()
        audios = data.get("audios", [])
        if not audios:
            logger.error("[SARVAM TTS] No audio in response")
            return None

        # Response audio is base64-encoded WAV
        audio_bytes = base64.b64decode(audios[0])
        cached.write_bytes(audio_bytes)
        logger.info(f"[SARVAM TTS] Generated {len(audio_bytes)//1024}KB audio → {cached.name}")
        return cached

    except Exception as e:
        logger.exception(f"[SARVAM TTS] Exception: {e}")
        return None


def needs_sarvam(lang: str) -> bool:
    """Return True if this language needs Sarvam TTS (Polly doesn't support it)."""
    return lang not in POLLY_NATIVE_LANGS and _sarvam_key() != ""


def get_audio_url(text: str, lang: str, base_url: str) -> Optional[str]:
    """
    Generate Sarvam TTS audio and return a public URL Twilio can stream.
    Returns None if generation fails.
    """
    cached = generate_sarvam_audio(text, lang)
    if not cached:
        return None
    # Serve via the /api/tts/audio/<filename> endpoint
    return f"{base_url}/api/tts/audio/{cached.name}"
