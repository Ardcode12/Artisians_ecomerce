#!/usr/bin/env python3
"""
Service 2: Multimodal Voice / Image / Text → AI Enhanced Product Description & Category Detection
Powered by Google Gemini 3.6/3.7 Flash & faster-whisper.
Produces authentic, SEO-optimized, culturally grounded descriptions in:
  1. English (description_en)
  2. Hindi (description_hi)
  3. Tamil (description_ta)
Plus auto-detected Category and Title!
"""

import sys
import os
import json
import re
import base64
import traceback
from pathlib import Path

# Force UTF-8 encoding on Windows console/stdout
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Load environment variables
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
    load_dotenv()
except Exception:
    pass

GEMINI_MODELS = [
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
]


def is_error_translation(text):
    if not text:
        return True
    lower = text.lower()
    return "error" in lower or "server error" in lower or "that’s an error" in lower or "<html" in lower


def translate_text(text, target_lang, source_lang='auto'):
    """Translate text using deep_translator as emergency fallback."""
    if not text:
        return ""
    try:
        from deep_translator import GoogleTranslator
        result = GoogleTranslator(source=source_lang, target=target_lang).translate(text)
        if result and result.strip() and not is_error_translation(result):
            return result.strip()
    except Exception:
        pass
    return ""


def call_gemini_multimodal(parts, gemini_key):
    """Calls Google Gemini API with fallback models to generate structured JSON descriptions."""
    import requests

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": parts
        }],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1000,
            "response_mime_type": "application/json"
        }
    }

    last_error = ""
    for model_name in GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    cand_parts = candidates[0]["content"].get("parts", [])
                    if cand_parts:
                        text_out = cand_parts[0].get("text", "").strip()
                        # Extract JSON object
                        match = re.search(r'\{.*\}', text_out, re.DOTALL)
                        if match:
                            parsed = json.loads(match.group(0))
                            if parsed.get("description_en"):
                                return parsed
            else:
                last_error = f"{model_name} HTTP {resp.status_code}: {resp.text[:150]}"
        except Exception as e:
            last_error = f"{model_name} exception: {str(e)}"

    print(f"[Gemini Warning] Model cascade notes: {last_error}", file=sys.stderr)
    return None


def generate_description(audio_or_text_input, craft_type="Handicraft", api_key="", image_path=""):
    raw_transcription = ""
    detected_lang = "en"

    gemini_key = (
        api_key
        if (api_key and not api_key.startswith("sk-") and not api_key.startswith("your_"))
        else os.getenv("GEMINI_API_KEY", "")
    )

    # ── Step 1: Process Audio or Text Input ──────────────────────────────────
    is_audio_file = False
    if len(audio_or_text_input) < 260 and any(audio_or_text_input.lower().endswith(ext) for ext in ['.m4a', '.mp3', '.wav', '.aac', '.ogg', '.webm', '.caf']):
        try:
            is_audio_file = os.path.isfile(audio_or_text_input) and os.path.getsize(audio_or_text_input) > 50
        except Exception:
            is_audio_file = False
    audio_base64 = None

    if is_audio_file:
        try:
            with open(audio_or_text_input, "rb") as af:
                audio_base64 = base64.b64encode(af.read()).decode("utf-8")
        except Exception:
            pass

        # Also try faster-whisper locally
        try:
            from faster_whisper import WhisperModel
            model = WhisperModel("base", device="cpu", compute_type="int8")
            segments, info = model.transcribe(
                audio_or_text_input,
                beam_size=5,
                language=None,    # Auto-detect regional Indian language
                task="translate", # Auto-translate to English
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            raw_transcription = " ".join([seg.text.strip() for seg in segments]).strip()
            detected_lang = info.language or "en"
        except Exception as whisper_err:
            print(f"[Whisper Note] faster-whisper note: {whisper_err}", file=sys.stderr)
            raw_transcription = ""
    else:
        raw_transcription = str(audio_or_text_input).strip()

    # If the text is empty or just generic "Pottery & Clay", reset it so AI detects accurately
    if raw_transcription.lower() in ["pottery & clay", "handicraft", "craft"]:
        raw_transcription = ""

    # ── Step 2: Prepare Multimodal Parts (Image + Audio + Prompt) ────────────
    parts = []

    # Attach image if provided
    has_image = False
    if image_path and os.path.isfile(image_path) and os.path.getsize(image_path) > 100:
        try:
            with open(image_path, "rb") as imf:
                img_b64 = base64.b64encode(imf.read()).decode("utf-8")
            ext = os.path.splitext(image_path)[1].lower().replace('.', '')
            mime = "image/png" if ext == "png" else "image/jpeg"
            parts.append({
                "inline_data": {
                    "mime_type": mime,
                    "data": img_b64
                }
            })
            has_image = True
        except Exception as ie:
            print(f"[Image Note] Could not attach image: {ie}", file=sys.stderr)

    # Attach audio directly to Gemini if available
    if audio_base64:
        parts.append({
            "inline_data": {
                "mime_type": "audio/mp4",
                "data": audio_base64
            }
        })

    # Build prompt
    prompt = f"""You are an elite e-commerce copywriter specializing in authentic Indian handmade arts, crafts, and handloom textiles.

Context provided:
- Artisan Spoken / Typed Notes: "{raw_transcription if raw_transcription else 'Examine the attached image / audio carefully'}"
- Initial Craft Category Hint: "{craft_type if craft_type and craft_type != 'Pottery & Clay' else 'Detect from image/notes'}"

Instructions:
1. Examine the attached product photo and voice note carefully.
2. Accurately identify the exact craft item. If it is a SAREE, FABRIC, or WEAVE, identify it as "Handloom Textile" or "Weaving" (NEVER confuse a saree or textile with pottery, clay, or unrelated items!).
3. Determine the best category among: ["Handloom Textile", "Pottery & Clay", "Wood Carving", "Metalwork", "Jewelry", "Painting", "Weaving", "Embroidery"].
4. Suggest a compelling product title (5-12 words).
5. Write tailored, high-converting product descriptions in 3 languages:
   - English (description_en): 60-90 words. Highlight the authentic craftsmanship, specific materials/colors/uses, and cultural heritage.
   - Hindi (description_hi): 60-90 words in natural, elegant Hindi (हिंदी) highlighting the handcrafted quality.
   - Tamil (description_ta): 60-90 words in authentic, beautiful Tamil (தமிழ்) describing the craft.

Return ONLY valid JSON in this exact structure:
{{
  "category": "...",
  "title": "...",
  "description_en": "...",
  "description_hi": "...",
  "description_ta": "..."
}}"""

    parts.append({"text": prompt})

    detected_category = craft_type if craft_type and craft_type != 'Pottery & Clay' else "Handloom Textile"
    detected_title = ""
    description_en = ""
    description_hi = ""
    description_ta = ""

    # ── Step 3: Call Gemini Multimodal AI ─────────────────────────────────────
    if gemini_key and gemini_key != "your_gemini_api_key_here":
        gemini_result = call_gemini_multimodal(parts, gemini_key)
        if gemini_result:
            description_en = gemini_result.get("description_en", "").strip()
            description_hi = gemini_result.get("description_hi", "").strip()
            description_ta = gemini_result.get("description_ta", "").strip()
            detected_category = gemini_result.get("category", detected_category).strip()
            detected_title = gemini_result.get("title", "").strip()

    # ── Step 4: Intelligent Fallbacks if API is unreachable ───────────────────
    if not detected_category:
        detected_category = "Handloom Textile" if ("saree" in raw_transcription.lower() or "silk" in raw_transcription.lower()) else (craft_type or "Handicraft")

    clean_notes = raw_transcription.strip().rstrip('.') or f"Authentic handcrafted {detected_category}"
    if not description_en:
        description_en = (
            f"Exquisite handcrafted {detected_category} — {clean_notes}. "
            f"Individually handcrafted by skilled Indian artisans using time-honoured heritage methods "
            f"and sustainably sourced, eco-friendly materials. Designed to bring authentic cultural elegance, "
            f"warmth, and distinct artisanal character to your collection."
        )

    if not description_hi:
        translated_hi = translate_text(description_en, 'hi', 'en')
        if translated_hi:
            description_hi = translated_hi
        else:
            description_hi = (
                f"उत्कृष्ट हस्तनिर्मित {detected_category} — {clean_notes}। "
                f"कुशल भारतीय कारीगरों द्वारा पारंपरिक तकनीकों और पर्यावरण-अनुकूल प्राकृतिक सामग्रियों से तैयार। "
                f"यह आपके घर और व्यक्तित्व को एक समृद्ध सांस्कृतिक आकर्षण प्रदान करता है।"
            )

    if not description_ta:
        translated_ta = translate_text(description_en, 'ta', 'en')
        if translated_ta:
            description_ta = translated_ta
        else:
            description_ta = (
                f"நேர்த்தியான பாரம்பரிய கைவினை {detected_category} — {clean_notes}. "
                f"ஒவ்வொரு தயாரிப்பும் திறமையான இந்திய கைவினைஞர்களால் பாரம்பரிய நுட்பங்கள் மற்றும் இயற்கை, "
                f"சுற்றுச்சூழல் நட்பு பொருட்களைப் பயன்படுத்தி அன்புடன் உருவாக்கப்பட்டுள்ளது."
            )

    if not detected_title:
        detected_title = clean_notes[:60] if len(clean_notes) > 5 else f"Handcrafted {detected_category}"

    result = {
        "success": True,
        "category": detected_category,
        "title": detected_title,
        "description_en": description_en,
        "description_hi": description_hi,
        "description_ta": description_ta,
        "raw_transcription": raw_transcription or clean_notes,
        "detected_language": detected_lang
    }

    result_json = json.dumps(result, ensure_ascii=False)

    # Safe binary write to avoid Windows cp1252 charmap encoding crash
    try:
        sys.stdout.buffer.write(result_json.encode('utf-8') + b'\n')
        sys.stdout.buffer.flush()
    except Exception:
        print(result_json)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        err = json.dumps({"error": "Usage: python generate_description.py <audio_or_text> [craft_type] [api_key] [image_path]"})
        sys.stdout.buffer.write(err.encode('utf-8') + b'\n')
        sys.exit(1)

    input_data = sys.argv[1]
    craft_type_input = sys.argv[2] if len(sys.argv) > 2 else "Handicraft"
    api_key_input = sys.argv[3] if len(sys.argv) > 3 else os.getenv("GEMINI_API_KEY", "")
    image_path_input = sys.argv[4] if len(sys.argv) > 4 else ""

    try:
        generate_description(input_data, craft_type_input, api_key_input, image_path_input)
    except Exception as e:
        err = json.dumps({"error": str(e), "traceback": traceback.format_exc()})
        try:
            sys.stdout.buffer.write(err.encode('utf-8') + b'\n')
        except Exception:
            print(err, file=sys.stderr)
        sys.exit(1)
