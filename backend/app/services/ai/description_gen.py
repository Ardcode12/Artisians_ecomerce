"""
Multilingual Description Generator (Auto-Cataloger)
Transcribes audio voice notes and uses AI to generate tailored e-commerce descriptions in EN, HI, and TA.
"""

import json
import logging
import requests
from typing import Dict, Any, Optional
from app.config import GEMINI_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY

logger = logging.getLogger("DescriptionGen")

_whisper_model = None


def get_whisper_model():
    """Lazily load faster-whisper model."""
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info("Loading faster-whisper model ('base') into memory...")
            _whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        except Exception as e:
            logger.warning(f"Failed to load faster-whisper: {e}")
            _whisper_model = None
    return _whisper_model


def transcribe_audio_file(audio_path: str) -> str:
    """Transcribe audio file to text using faster-whisper."""
    whisper = get_whisper_model()
    if not whisper:
        return ""
    try:
        segments, info = whisper.transcribe(
            str(audio_path),
            beam_size=5,
            language=None,
            task="translate",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        return " ".join([seg.text.strip() for seg in segments]).strip()
    except Exception as e:
        logger.warning(f"Whisper transcription exception: {e}")
        return ""


def generate_descriptions(
    raw_text: str,
    craft_type: str = "Handicraft"
) -> Dict[str, Any]:
    """Generate professional SEO-friendly descriptions in EN, HI, and TA."""
    input_text = raw_text.strip() or f"Handmade {craft_type} crafted with authentic traditional techniques."

    prompt = f"""You are an elite e-commerce copywriter specializing in authentic Indian handmade arts and crafts.

Product Details provided by the artisan:
"{input_text}"

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
  "title": "...",
  "category": "...",
  "description_en": "...",
  "description_hi": "...",
  "description_ta": "..."
}}"""

    desc_en = ""
    desc_hi = ""
    desc_ta = ""
    generated_title = ""
    generated_category = craft_type or "Handicraft"

    # 1. Try Gemini
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        for g_model in ["gemini-2.5-flash", "gemini-flash-latest", "gemini-1.5-flash", "gemini-2.0-flash"]:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.7,
                        "maxOutputTokens": 1000,
                        "response_mime_type": "application/json"
                    }
                }
                resp = requests.post(url, json=payload, timeout=12)
                if resp.status_code == 200:
                    cand = resp.json().get("candidates", [])
                    if cand and "content" in cand[0]:
                        parts = cand[0]["content"].get("parts", [])
                        if parts:
                            parsed = json.loads(parts[0].get("text", "{}"))
                            desc_en = parsed.get("description_en", "")
                            desc_hi = parsed.get("description_hi", "")
                            desc_ta = parsed.get("description_ta", "")
                            generated_title = parsed.get("title", "")
                            generated_category = parsed.get("category", craft_type)
                            if desc_en:
                                break
            except Exception as e:
                logger.warning(f"Gemini API attempt note: {e}")

    # 2. Try Claude
    if not desc_en and ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "your_anthropic_api_key_here":
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
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
                desc_en = parsed.get("description_en", "")
                desc_hi = parsed.get("description_hi", "")
                desc_ta = parsed.get("description_ta", "")
                generated_title = parsed.get("title", "")
                generated_category = parsed.get("category", craft_type)
        except Exception as e:
            logger.warning(f"Claude API note: {e}")

    # 3. Try OpenAI
    if not desc_en and OPENAI_API_KEY and OPENAI_API_KEY != "your_openai_api_key_here":
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=600,
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            parsed = json.loads(response.choices[0].message.content.strip())
            desc_en = parsed.get("description_en", "")
            desc_hi = parsed.get("description_hi", "")
            desc_ta = parsed.get("description_ta", "")
            generated_title = parsed.get("title", "")
            generated_category = parsed.get("category", craft_type)
        except Exception as e:
            logger.warning(f"OpenAI API note: {e}")

    # Robust Craft Fallback
    clean_notes = input_text.strip().rstrip('.')
    if not generated_title:
        generated_title = clean_notes[:60] if len(clean_notes) < 60 else f"Handcrafted {craft_type}"
    if not desc_en:
        desc_en = f"Exquisite handcrafted {craft_type} — {clean_notes}. Meticulously created by skilled Indian artisans celebrating authentic cultural heritage and fine craftsmanship."
    if not desc_hi:
        desc_hi = f"उत्कृष्ट हस्तनिर्मित {craft_type} — {clean_notes}। कुशल भारतीय कारीगरों द्वारा पारंपरिक कला और प्रामाणिक तकनीकों से तैयार।"
    if not desc_ta:
        desc_ta = f"பாரம்பரிய கைவினை {craft_type} — {clean_notes}. திறமையான இந்திய கைவினைஞர்களால் பாரம்பரிய நுட்பங்களுடன் வடிவமைக்கப்பட்டது."

    return {
        "success": True,
        "title": generated_title,
        "category": generated_category,
        "description_en": desc_en,
        "description_hi": desc_hi,
        "description_ta": desc_ta,
        "raw_transcription": input_text,
        "detected_language": "en"
    }
