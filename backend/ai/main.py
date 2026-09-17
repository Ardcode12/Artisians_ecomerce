#!/usr/bin/env python3
"""
Artisans AI Master Pipeline — FastAPI Service
Endpoints:
  - POST /api/enhance-image: rembg -> #F0F0F0 composite -> OpenCV AWB/CLAHE -> Real-ESRGAN -> 1000x1000 JPEG
  - POST /api/generate-description: faster-whisper -> Claude/GPT rewrite -> EN & HI descriptions
  - POST /api/suggest-price: SerpApi Google Shopping / Amazon -> pandas median -> fair margin formula
"""

import os
import sys
import json
import uuid
import time
import shutil
import logging
from typing import Optional
from pathlib import Path

# Load environment variables from backend/.env
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)
load_dotenv()  # also check current dir

import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ArtisansAI")

# Directory setup
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Artisans AI Master Pipeline",
    description="Professional AI photo enhancement, voice auto-cataloging, and real-time competitor pricing assistant",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory so generated images are publicly accessible
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# ── Global Lazy Model Caching ────────────────────────────────────────────────
_whisper_model = None
_esrgan_upsampler = None


def get_whisper_model():
    """Lazily load faster-whisper model once into memory for fast inference."""
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info("Loading faster-whisper model ('base') into memory...")
            _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
            logger.info("faster-whisper model loaded successfully.")
        except Exception as e:
            logger.warning(f"Failed to load faster-whisper: {e}")
            return None
    return _whisper_model


def get_esrgan_upsampler():
    """Lazily load Real-ESRGAN model."""
    global _esrgan_upsampler
    if _esrgan_upsampler is None:
        try:
            from basicsr.archs.rrdbnet_arch import RRDBNet
            from realesrgan import RealESRGANer
            logger.info("Initializing Real-ESRGAN...")
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
            _esrgan_upsampler = RealESRGANer(
                scale=4,
                model_path="https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
                model=model,
                tile=256,
                tile_pad=10,
                pre_pad=0,
                half=False
            )
            logger.info("Real-ESRGAN initialized successfully.")
        except Exception as e:
            logger.warning(f"Real-ESRGAN initialization skipped/failed: {e}")
            return None
    return _esrgan_upsampler


# ── Health Check ─────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check(request: Request):
    openai_key = bool(os.getenv("OPENAI_API_KEY") and os.getenv("OPENAI_API_KEY") != "your_openai_api_key_here")
    anthropic_key = bool(os.getenv("ANTHROPIC_API_KEY") and os.getenv("ANTHROPIC_API_KEY") != "your_anthropic_api_key_here")
    serpapi_key = bool(os.getenv("SERPAPI_API_KEY") and os.getenv("SERPAPI_API_KEY") != "your_serpapi_api_key_here")

    return {
        "status": "online",
        "service": "Artisans AI Master Pipeline (FastAPI)",
        "timestamp": time.time(),
        "keys_configured": {
            "openai": openai_key,
            "anthropic": anthropic_key,
            "serpapi": serpapi_key,
        },
        "endpoints": [
            "POST /api/enhance-image",
            "POST /api/generate-description",
            "POST /api/suggest-price",
        ]
    }


# ── SERVICE 1: POST /api/enhance-image ───────────────────────────────────────
@app.post("/api/enhance-image")
async def enhance_image_endpoint(
    request: Request,
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None)
):
    """
    AI Photo Studio — Production Version
    Pipeline:
      1. Lighting + Color Correction on ORIGINAL photo (Auto White Balance + CLAHE)
      2. AI Product Segmentation (rembg with 'isnet-general-use' and alpha_matting=True)
      3. Bounding box cropping
      4. Smart Centering & Padding (12% breathing room, 2% downward bias)
      5. Natural Ground Shadow (soft blurred ellipse anchored under product base)
      6. Real-ESRGAN super-resolution sharpening, denoising and 1000x1000 final output
    """
    upload_item = image or file
    if not upload_item:
        return JSONResponse(status_code=400, content={"success": False, "error": "No image uploaded. Use 'image' or 'file' field."})

    logger.info(f"[/api/enhance-image] Studio processing for upload: {upload_item.filename}")

    temp_id = uuid.uuid4().hex[:8]
    ext = Path(upload_item.filename).suffix.lower() or ".jpg"
    temp_input_path = UPLOADS_DIR / f"raw-{temp_id}{ext}"
    output_filename = f"enhanced-{int(time.time())}-{temp_id}.jpg"
    output_path = UPLOADS_DIR / output_filename

    try:
        with open(temp_input_path, "wb") as buffer:
            shutil.copyfileobj(upload_item.file, buffer)

        from studio_pipeline import build_studio_photo
        build_studio_photo(str(temp_input_path), str(output_path))

        base_url = str(request.base_url).rstrip("/")
        enhanced_image_url = f"{base_url}/uploads/{output_filename}"

        logger.info(f"[/api/enhance-image] Studio photo created successfully: {output_filename}")

        return {
            "success": True,
            "enhanced_image_url": enhanced_image_url,
            "filename": output_filename,
            "studio_quality": True,
            "shadow": True,
            "esrgan_used": True,
            "size": "1000x1000"
        }

    except Exception as e:
        logger.error(f"Error in studio enhance_image: {e}", exc_info=True)
        if temp_input_path.exists():
            base_url = str(request.base_url).rstrip("/")
            return {
                "success": False,
                "enhanced_image_url": f"{base_url}/uploads/{temp_input_path.name}",
                "error": "Couldn't process this photo — please try again",
                "detail": str(e)
            }
        return {"success": False, "error": "Couldn't process this photo — please try again"}

    finally:
        try:
            temp_input_path.unlink(missing_ok=True)
        except Exception:
            pass


# ── SERVICE 2: POST /api/generate-description ────────────────────────────────
@app.post("/api/generate-description")
async def generate_description_endpoint(
    audio: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    raw_text: Optional[str] = Form(None),
    craft_type: str = Form("Handicraft")
):
    """
    Service 2: Voice / Text -> AI Description (Auto-Cataloger)
    Pipeline:
      1. Receive regional voice note or text description
      2. faster-whisper -> transcribe to raw text (multilingual auto-detection)
      3. Send structured copywriting prompt to Google Gemini 3.6/Flash
      4. Return polished English, Hindi, and Tamil descriptions
    """
    logger.info(f"[/api/generate-description] Audio: {audio.filename if audio else 'None'}, text: {text or raw_text}, craft_type: {craft_type}")

    temp_audio_path = None
    if audio is not None and audio.filename:
        temp_id = uuid.uuid4().hex[:8]
        ext = Path(audio.filename).suffix.lower() or ".m4a"
        temp_audio_path = UPLOADS_DIR / f"voice-{temp_id}{ext}"
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

    try:
        # Step 1: Transcribe with faster-whisper or use text
        raw_transcription = (text or raw_text or "").strip()
        detected_lang = "en"

        if temp_audio_path and temp_audio_path.exists() and temp_audio_path.stat().st_size > 50:
            whisper = get_whisper_model()
            if whisper is not None:
                try:
                    segments, info = whisper.transcribe(
                        str(temp_audio_path),
                        beam_size=5,
                        language=None,    # auto-detect Hindi, Tamil, Telugu, etc.
                        task="translate", # auto-translate to English
                        vad_filter=True,
                        vad_parameters=dict(min_silence_duration_ms=500)
                    )
                    transcribed = " ".join([seg.text.strip() for seg in segments]).strip()
                    if transcribed:
                        raw_transcription = transcribed
                    detected_lang = info.language or "en"
                    logger.info(f"Whisper transcription done. Language: {detected_lang}, Text length: {len(raw_transcription)}")
                except Exception as e:
                    logger.warning(f"Whisper transcription failed: {e}")

        if not raw_transcription:
            raw_transcription = f"Handmade {craft_type} crafted with authentic traditional techniques and sustainable materials."

        # Step 2: Perfect copy rewrite with Gemini AI (or Claude/GPT)
        prompt = f"""You are an elite e-commerce copywriter specializing in authentic Indian handmade arts and crafts.

Product Details provided by the artisan:
"{raw_transcription}"

Craft Category:
"{craft_type}"

Task:
Write a tailored, high-converting, professional product description in 3 languages:
1. English (description_en): 60-90 words. Highlight the authentic craftsmanship, specific materials/colors/uses mentioned in the notes, and timeless cultural heritage.
2. Hindi (description_hi): 60-90 words in natural, elegant Hindi (हिंदी) highlighting the handcrafted quality and traditional skill.
3. Tamil (description_ta): 60-90 words in authentic, beautiful Tamil (தமிழ்) describing the craft and its beauty.

Important Rules:
- Incorporate the SPECIFIC details mentioned in the product notes (e.g. materials, patterns, utility, color, technique). Never give a generic copy if specifics were provided.
- Do NOT include markdown code blocks. Return ONLY valid JSON in this exact structure:
{{
  "description_en": "...",
  "description_hi": "...",
  "description_ta": "..."
}}"""

        description_en = ""
        description_hi = ""
        description_ta = ""

        # Option A: Google Gemini API (Primary)
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key and gemini_key != "your_gemini_api_key_here":
            try:
                import requests
                for g_model in ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-3.7-flash"]:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={gemini_key}"
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.7,
                            "maxOutputTokens": 1000,
                            "response_mime_type": "application/json"
                        }
                    }
                    resp = requests.post(url, json=payload, timeout=15)
                    if resp.status_code == 200:
                        cand = resp.json().get("candidates", [])
                        if cand and "content" in cand[0]:
                            parts = cand[0]["content"].get("parts", [])
                            if parts:
                                parsed = json.loads(parts[0].get("text", "{}"))
                                description_en = parsed.get("description_en", "")
                                description_hi = parsed.get("description_hi", "")
                                description_ta = parsed.get("description_ta", "")
                                if description_en:
                                    logger.info(f"Gemini {g_model} successfully generated descriptions.")
                                    break
            except Exception as e:
                logger.warning(f"Google Gemini call error: {e}")

        # Option B: Anthropic Claude
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        if (not description_en) and anthropic_key and anthropic_key != "your_anthropic_api_key_here":
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=anthropic_key)
                msg = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=600,
                    temperature=0.7,
                    messages=[{"role": "user", "content": prompt}]
                )
                resp_text = msg.content[0].text.strip()
                if "{" in resp_text and "}" in resp_text:
                    json_str = resp_text[resp_text.find("{"):resp_text.rfind("}")+1]
                    parsed = json.loads(json_str)
                    description_en = parsed.get("description_en", "")
                    description_hi = parsed.get("description_hi", "")
                    description_ta = parsed.get("description_ta", "")
                    logger.info("Claude successfully generated descriptions.")
            except Exception as e:
                logger.warning(f"Anthropic Claude call error: {e}")

        # Option C: OpenAI GPT (if Claude/Gemini not configured or failed)
        openai_key = os.getenv("OPENAI_API_KEY")
        if (not description_en) and openai_key and openai_key != "your_openai_api_key_here":
            try:
                from openai import OpenAI
                client = OpenAI(api_key=openai_key)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=600,
                    temperature=0.7,
                    response_format={"type": "json_object"}
                )
                content = response.choices[0].message.content.strip()
                parsed = json.loads(content)
                description_en = parsed.get("description_en", "") or description_en
                description_hi = parsed.get("description_hi", "") or description_hi
                description_ta = parsed.get("description_ta", "") or description_ta
                logger.info("OpenAI GPT-4o-mini successfully generated descriptions.")
            except Exception as e:
                logger.warning(f"OpenAI GPT call error: {e}")

        # Intelligent Fallback preserving artisan notes
        clean_notes = raw_transcription.strip().rstrip('.')
        if not description_en:
            description_en = f"Exquisite handcrafted {craft_type} — {clean_notes}. Meticulously created by skilled Indian artisans celebrating authentic cultural heritage and fine craftsmanship."
        if not description_hi:
            description_hi = f"उत्कृष्ट हस्तनिर्मित {craft_type} — {clean_notes}। कुशल भारतीय कारीगरों द्वारा पारंपरिक कला और प्रामाणिक तकनीकों से तैयार।"
        if not description_ta:
            description_ta = f"பாரம்பரிய கைவினை {craft_type} — {clean_notes}. திறமையான இந்திய கைவினைஞர்களால் பாரம்பரிய நுட்பங்களுடன் வடிவமைக்கப்பட்டது."

        return {
            "success": True,
            "description_en": description_en,
            "description_hi": description_hi,
            "description_ta": description_ta,
            "raw_transcription": raw_transcription,
            "detected_language": detected_lang
        }

    finally:
        if temp_audio_path:
            try:
                temp_audio_path.unlink(missing_ok=True)
            except Exception:
                pass


# ── SERVICE 3: POST /api/suggest-price ───────────────────────────────────────
class PriceRequestModel(BaseModel):
    product_title: str
    craft_type: Optional[str] = "Handicraft"
    material_cost: Optional[float] = 0.0


@app.post("/api/suggest-price")
async def suggest_price_endpoint(
    request: Request,
    payload: Optional[PriceRequestModel] = None,
    product_title: Optional[str] = Form(None),
    craft_type: Optional[str] = Form(None),
    material_cost: Optional[float] = Form(None),
):
    """
    Service 3: Dynamic Pricing Assistant (compares to Amazon / Google Shopping)
    Pipeline:
      1. SerpApi search for "{product_title} {craft_type}"
      2. pandas extraction of competitor prices & median computation
      3. Formula: max(material_cost * 1.6, competitor_median * 0.85)
      4. Return suggested price + sample size + note
    """
    # Accept both JSON body and Form data
    title = (payload.product_title if payload else None) or product_title
    craft = (payload.craft_type if payload else None) or craft_type or "Handicraft"
    raw_cost = (payload.material_cost if payload else None) or material_cost or 0.0

    if not title:
        # Check if raw JSON body has it
        try:
            body = await request.json()
            title = body.get("product_title", "")
            craft = body.get("craft_type", "Handicraft")
            raw_cost = float(body.get("material_cost", 0.0))
        except Exception:
            pass

    if not title:
        raise HTTPException(status_code=400, detail="product_title is required")

    mat_cost = float(raw_cost) if raw_cost is not None else 0.0
    serpapi_key = os.getenv("SERPAPI_API_KEY", "")

    logger.info(f"[/api/suggest-price] Title: {title} | Craft: {craft} | Material Cost: ₹{mat_cost}")

    competitor_prices = []
    sample_size = 0
    api_note = ""
    median_price = 0.0

    if serpapi_key and serpapi_key != "your_serpapi_api_key_here":
        try:
            import requests
            import pandas as pd

            search_query = f"{title} {craft} handmade"
            params = {
                "engine": "google_shopping",
                "q": search_query,
                "api_key": serpapi_key,
                "hl": "en",
                "gl": "in",
                "currency": "INR",
                "num": "20"
            }

            resp = requests.get("https://serpapi.com/search", params=params, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("shopping_results", []):
                    price_str = item.get("price", "")
                    if not price_str:
                        continue
                    clean = price_str.replace("₹", "").replace("INR", "").replace("Rs.", "").replace("Rs", "").replace(",", "").strip()
                    try:
                        val = float(clean.split()[0])
                        if 50 < val < 100000:
                            competitor_prices.append(val)
                    except (ValueError, IndexError):
                        continue

            # If shopping results empty, try Amazon via SerpApi
            if not competitor_prices:
                params["engine"] = "amazon"
                params["k"] = search_query
                params.pop("q", None)
                resp_amz = requests.get("https://serpapi.com/search", params=params, timeout=15)
                if resp_amz.status_code == 200:
                    data_amz = resp_amz.json()
                    for item in data_amz.get("organic_results", []):
                        p = item.get("price", {})
                        p_val = p.get("value", "") if isinstance(p, dict) else str(p)
                        clean = str(p_val).replace("₹", "").replace(",", "").strip()
                        try:
                            val = float(clean.split()[0])
                            if 50 < val < 100000:
                                competitor_prices.append(val)
                        except (ValueError, IndexError):
                            continue

            if competitor_prices:
                df = pd.Series(competitor_prices)
                lower = df.quantile(0.05)
                upper = df.quantile(0.95)
                df_clean = df[(df >= lower) & (df <= upper)]
                median_price = round(float(df_clean.median()), 2)
                sample_size = len(competitor_prices)
                api_note = f"Based on {sample_size} similar listings on Google Shopping & Amazon"
            else:
                api_note = "No direct competitor listings found — using fair cost margin"

        except Exception as e:
            logger.warning(f"SerpApi query exception: {e}")
            api_note = "SerpApi connection failed — using cost-based fair margin"
    else:
        api_note = "SERPAPI_API_KEY not configured — using cost-based fair margin"

    # Compute: max(material_cost * 1.6, competitor_median * 0.85)
    cost_floor = round(mat_cost * 1.6, 2) if mat_cost > 0 else 0.0

    if median_price > 0:
        market_suggestion = round(median_price * 0.85, 2)
        suggested_price = max(cost_floor, market_suggestion)
    else:
        suggested_price = cost_floor if cost_floor > 0 else 500.0

    # Round to clean multiples of 50
    final_suggested = int(round(suggested_price / 50.0) * 50)
    if final_suggested == 0:
        final_suggested = 500

    return {
        "success": True,
        "suggested_price": final_suggested,
        "median_competitor_price": int(round(median_price)),
        "material_cost": int(round(mat_cost)),
        "cost_floor": int(round(cost_floor)),
        "sample_size": sample_size,
        "note": api_note,
        "formula": "max(material_cost × 1.6, competitor_median × 0.85)"
    }


# ── Run direct via python main.py ────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("FASTAPI_PORT", 8000))
    logger.info(f"Starting Artisans AI FastAPI service on http://0.0.0.0:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
