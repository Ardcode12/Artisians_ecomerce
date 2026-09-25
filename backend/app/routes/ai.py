"""
AI Services Routes
Handles Photo Studio Enhancement, Voice Auto-Cataloging, and Dynamic Pricing Assistant.
"""

import os
import time
import uuid
import shutil
import base64
import logging
from typing import Optional
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, Form, Request, HTTPException, status
from app.config import UPLOADS_DIR
from app.models.ai import PriceSuggestRequest
from app.services.ai.image_studio import build_studio_photo
from app.services.ai.description_gen import transcribe_audio_file, generate_descriptions
from app.services.ai.price_suggester import suggest_price

logger = logging.getLogger("AIRoutes")

router = APIRouter(prefix="/api", tags=["AI Services"])


@router.post("/enhance-image")
async def enhance_image_endpoint(
    request: Request,
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None)
):
    """
    AI Photo Studio:
    - Multipart file upload or Base64 JSON body
    - Auto white-balance, CLAHE, background removal, centering, shadow, 1000x1000 JPEG output.
    """
    temp_input_path = None
    upload_item = image or file

    # 1. Handle multipart file
    if upload_item and upload_item.filename:
        temp_id = uuid.uuid4().hex[:8]
        ext = Path(upload_item.filename).suffix.lower() or ".jpg"
        temp_input_path = UPLOADS_DIR / f"raw-{temp_id}{ext}"
        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(upload_item.file, buffer)

    # 2. Handle base64 JSON payload
    if not temp_input_path:
        try:
            body = await request.json()
            raw_b64 = body.get("base64") or body.get("image")
            if raw_b64:
                clean_b64 = raw_b64.split(",")[-1].strip()
                temp_id = uuid.uuid4().hex[:8]
                temp_input_path = UPLOADS_DIR / f"raw-{temp_id}.jpg"
                with open(temp_input_path, "wb") as buffer:
                    buffer.write(base64.b64decode(clean_b64))
        except Exception:
            pass

    if not temp_input_path or not temp_input_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image file or base64 data provided."
        )

    output_filename = f"enhanced-{int(time.time() * 1000)}.jpg"
    output_path = UPLOADS_DIR / output_filename
    base_url = str(request.base_url).rstrip("/")

    try:
        success = build_studio_photo(str(temp_input_path), str(output_path))
        enhanced_url = f"{base_url}/uploads/{output_filename}"

        return {
            "success": success,
            "enhanced_image_url": enhanced_url,
            "esrgan_used": True,
            "size": "1000x1000"
        }
    except Exception as e:
        logger.error(f"Image enhancement error: {e}", exc_info=True)
        # Fallback to original
        fallback_filename = temp_input_path.name
        return {
            "success": False,
            "enhanced_image_url": f"{base_url}/uploads/{fallback_filename}",
            "warning": f"AI note: {str(e)[:100]}. Using original photo.",
            "esrgan_used": False
        }
    finally:
        if temp_input_path and temp_input_path.exists():
            try:
                temp_input_path.unlink(missing_ok=True)
            except Exception:
                pass


@router.post("/generate-description")
async def generate_description_endpoint(
    request: Request,
    audio: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    raw_text: Optional[str] = Form(None),
    craft_type: Optional[str] = Form(None),
    language: Optional[str] = Form(None)
):
    """
    Multilingual Auto-Cataloger:
    - Audio voice note transcription or raw text input
    - Produces high-converting descriptions in English, Hindi, and Tamil.
    """
    temp_audio_path = None
    input_text = text or raw_text or ""
    selected_craft = craft_type or "Handicraft"
    lang_hint = language

    # 1. Handle multipart audio file
    if audio and audio.filename:
        temp_id = uuid.uuid4().hex[:8]
        ext = Path(audio.filename).suffix.lower() or ".m4a"
        temp_audio_path = UPLOADS_DIR / f"voice-{temp_id}{ext}"
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

    # 2. Handle JSON body with base64 audio/text
    if not temp_audio_path and not input_text:
        try:
            body = await request.json()
            input_text = body.get("text") or body.get("raw_text") or ""
            selected_craft = body.get("craft_type") or selected_craft
            lang_hint = body.get("language") or lang_hint
            raw_audio_b64 = body.get("audio_base64") or body.get("base64")
            if raw_audio_b64:
                clean_b64 = raw_audio_b64.split(",")[-1].strip()
                if len(clean_b64) > 50:
                    raw_bytes = base64.b64decode(clean_b64)
                    ext = ".m4a"
                    if raw_bytes.startswith(b"RIFF"):
                        ext = ".wav"
                    elif raw_bytes.startswith(b"ID3") or raw_bytes[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
                        ext = ".mp3"
                    elif raw_bytes.startswith(b"OggS"):
                        ext = ".ogg"
                    elif raw_bytes.startswith(b"\x1a\x45\xdf\xa3"):
                        ext = ".webm"
                    temp_id = uuid.uuid4().hex[:8]
                    temp_audio_path = UPLOADS_DIR / f"voice-{temp_id}{ext}"
                    with open(temp_audio_path, "wb") as buffer:
                        buffer.write(raw_bytes)
        except Exception:
            pass

    warning = None
    try:
        # Transcribe if audio present
        transcription = input_text
        if temp_audio_path and temp_audio_path.exists():
            whisper_result = transcribe_audio_file(str(temp_audio_path), language=lang_hint)
            if whisper_result:
                transcription = whisper_result
                logger.info(f"[AI] Voice transcribed to: '{transcription}'")
            else:
                warning = (
                    "Audio was received but could not be transcribed "
                    "(speech-to-text unavailable). Falling back to text input."
                )
                logger.warning(warning)

        result = generate_descriptions(
            raw_text=transcription,
            craft_type=selected_craft,
            language=lang_hint or "ta"
        )
        if warning:
            result["warning"] = warning
            result["raw_transcription"] = transcription
        return result
    finally:
        if temp_audio_path and temp_audio_path.exists():
            try:
                temp_audio_path.unlink(missing_ok=True)
            except Exception:
                pass


@router.post("/transcribe")
async def transcribe_voice_endpoint(
    request: Request,
    audio: Optional[UploadFile] = File(None),
    language: Optional[str] = Form(None)
):
    """
    Universal Speech-to-Text Transcription:
    - Transcribes audio from multipart upload or base64 JSON payload
    - Used for voice input across onboarding and catalog fields
    """
    temp_audio_path = None
    lang_hint = language

    # 1. Handle multipart audio file
    if audio and audio.filename:
        temp_id = uuid.uuid4().hex[:8]
        ext = Path(audio.filename).suffix.lower() or ".m4a"
        temp_audio_path = UPLOADS_DIR / f"stt-{temp_id}{ext}"
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

    # 2. Handle JSON body with base64
    if not temp_audio_path:
        try:
            body = await request.json()
            lang_hint = body.get("language") or lang_hint
            raw_audio_b64 = body.get("audio_base64") or body.get("base64")
            if raw_audio_b64:
                clean_b64 = raw_audio_b64.split(",")[-1].strip()
                if len(clean_b64) > 50:
                    raw_bytes = base64.b64decode(clean_b64)
                    ext = ".m4a"
                    if raw_bytes.startswith(b"RIFF"):
                        ext = ".wav"
                    elif raw_bytes.startswith(b"ID3") or raw_bytes[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
                        ext = ".mp3"
                    elif raw_bytes.startswith(b"OggS"):
                        ext = ".ogg"
                    elif raw_bytes.startswith(b"\x1a\x45\xdf\xa3"):
                        ext = ".webm"
                    temp_id = uuid.uuid4().hex[:8]
                    temp_audio_path = UPLOADS_DIR / f"stt-{temp_id}{ext}"
                    with open(temp_audio_path, "wb") as buffer:
                        buffer.write(raw_bytes)
        except Exception:
            pass

    if not temp_audio_path or not temp_audio_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No audio file or audio_base64 provided."
        )

    try:
        text = transcribe_audio_file(str(temp_audio_path), language=lang_hint)
        return {
            "success": bool(text),
            "text": text,
            "language": lang_hint or "auto"
        }
    finally:
        if temp_audio_path and temp_audio_path.exists():
            try:
                temp_audio_path.unlink(missing_ok=True)
            except Exception:
                pass


@router.post("/suggest-price")
@router.post("/ai/suggest-price")
async def suggest_price_endpoint(
    request: Request,
    payload: Optional[PriceSuggestRequest] = None,
    product_title: Optional[str] = Form(None),
    craft_type: Optional[str] = Form(None),
    material_cost: Optional[float] = Form(None)
):
    """
    Dynamic Pricing Assistant:
    - Analyzes title, craft category, and material cost against Google Shopping / Amazon.
    """
    title = (payload.product_title if payload else None) or product_title
    craft = (payload.craft_type if payload else None) or craft_type or "Handicraft"
    raw_cost = (payload.material_cost if payload else None) or material_cost or 0.0

    if not title:
        try:
            body = await request.json()
            title = body.get("product_title", "")
            craft = body.get("craft_type", "Handicraft")
            raw_cost = float(body.get("material_cost", 0.0))
        except Exception:
            pass

    if not title:
        title = f"Handmade {craft}"

    return suggest_price(
        product_title=title,
        craft_type=craft,
        material_cost=raw_cost
    )
