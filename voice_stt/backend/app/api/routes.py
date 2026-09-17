"""
voice_stt/backend/app/api/routes.py
--------------------------------------
FastAPI route: POST /api/stt/transcribe
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from ..stt import get_device_info, get_model, preprocess_audio
from ..stt.audio import SUPPORTED_EXTENSIONS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stt", tags=["Speech-to-Text"])

# ──────────────────────────────────────────────────────────────────────────────
# Response schema
# ──────────────────────────────────────────────────────────────────────────────


class TranscriptionResponse(BaseModel):
    success: bool
    language: Optional[str]
    text: str
    duration_seconds: float
    processing_time_seconds: float
    device: str


# ──────────────────────────────────────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/health", summary="Health check")
async def health():
    """Returns model and device status."""
    info = get_device_info()
    model = get_model()
    return {
        "status": "ok",
        "model": model.model_id,
        "device": model.device,
        "supported_languages": model.supported_languages,
        **info,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Main transcription endpoint
# ──────────────────────────────────────────────────────────────────────────────


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    summary="Transcribe audio to text in the original spoken Indian language",
)
async def transcribe(
    file: UploadFile = File(..., description="Audio file (WAV, MP3, M4A, FLAC)"),
    language: Optional[str] = Form(
        None,
        description="Optional BCP-47 language code: ta | te | hi | kn | ml | mr …",
    ),
):
    """
    Accepts an audio file and an optional language code.
    Returns a transcript in the original spoken language (no translation).

    - **file**: Multipart audio upload (WAV/MP3/M4A/FLAC/OGG recommended).
    - **language**: ISO language code. Omit to let the model auto-detect.
    """

    # ── Validate file extension ─────────────────────────────────────────
    filename = file.filename or "audio.wav"
    from pathlib import Path

    ext = Path(filename).suffix.lower()
    if ext and ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{ext}'. "
                f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )

    # ── Read bytes ──────────────────────────────────────────────────────
    try:
        audio_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file.",
        ) from exc

    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Uploaded audio file is empty.",
        )

    # ── Preprocess audio ────────────────────────────────────────────────
    try:
        audio_array, duration_seconds = preprocess_audio(audio_bytes, filename)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if duration_seconds < 0.1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Audio is too short (< 100 ms). Please provide a valid recording.",
        )

    # ── Transcribe ──────────────────────────────────────────────────────
    model = get_model()

    t0 = time.perf_counter()
    try:
        text = model.transcribe(audio_array, language=language)
    except Exception as exc:
        logger.exception("Transcription failed for file '%s'", filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcription failed. See server logs for details.",
        ) from exc
    processing_time = round(time.perf_counter() - t0, 3)

    # Detect effective language (model sets it via generate_kwargs; return what was used)
    effective_lang = language or "auto"

    logger.info(
        "Transcribed '%s' | lang=%s | duration=%.2fs | inference=%.3fs",
        filename,
        effective_lang,
        duration_seconds,
        processing_time,
    )

    return TranscriptionResponse(
        success=True,
        language=effective_lang if effective_lang != "auto" else None,
        text=text,
        duration_seconds=round(duration_seconds, 3),
        processing_time_seconds=processing_time,
        device=model.device,
    )
