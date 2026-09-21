"""
TTS Audio Serve Route
=======================
Serves cached Sarvam TTS audio files so Twilio can stream them via <Play>.
"""
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

logger = logging.getLogger("TTSRoute")
router = APIRouter(prefix="/api/tts", tags=["TTS Audio"])

TTS_CACHE_DIR = Path("/tmp/artisans_tts_cache")


@router.get("/audio/{filename}")
@router.head("/audio/{filename}")
def serve_tts_audio(filename: str):
    """Serve a cached TTS audio file for Twilio <Play>."""
    # Security: only serve files from our cache dir, no path traversal
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    audio_path = TTS_CACHE_DIR / filename
    if not audio_path.exists():
        logger.warning(f"[TTS SERVE] File not found: {filename}")
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(
        path=str(audio_path),
        media_type="audio/wav",
        headers={"Cache-Control": "public, max-age=3600"},
    )
