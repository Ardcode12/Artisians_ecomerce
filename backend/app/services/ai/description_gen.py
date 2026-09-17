"""
Multilingual Description Generator (Auto-Cataloger)
Transcribes audio voice notes and uses AI to generate tailored e-commerce descriptions in EN, HI, and TA.

Speech-to-Text: Audio is transcribed by the remote NVIDIA A100 Whisper Large V3 server.
Local faster-whisper is NOT used. All Whisper credentials live in environment variables only.
"""

import os
import re
import json
import logging
import subprocess
import tempfile
import requests
from typing import Dict, Any, Optional
from app.config import (
    ANTHROPIC_API_KEY, OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_USERNAME, OLLAMA_PASSWORD,
    OPENAI_API_KEY, GEMINI_API_KEY,
    WHISPER_BASE_URL, WHISPER_USERNAME, WHISPER_PASSWORD, WHISPER_MODEL,
)

logger = logging.getLogger("DescriptionGen")

# Tamil Unicode block: U+0B80–U+0BFF
_TAMIL_SCRIPT_RE = re.compile(r'[\u0b80-\u0bff]')
# CJK Unified Ideographs (Chinese Hanzi) — must never appear in EN/HI/TA output
_CJK_RE = re.compile(r'[\u4e00-\u9fff\u3400-\u4dbf]')
_GEMINI_MODELS = [
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]


def _is_valid_tamil(text: str) -> bool:
    """Returns True if text contains at least 10 Tamil-script characters (not Romanized)."""
    return len(_TAMIL_SCRIPT_RE.findall(text)) >= 10


def _has_chinese_leak(text: str) -> bool:
    """Returns True if text contains CJK characters (Chinese model internal thinking leaking out)."""
    return bool(_CJK_RE.search(text))


def transcribe_audio_file(audio_path: str, language: Optional[str] = None) -> str:
    """
    Transcribe an audio file by posting it to the remote NVIDIA A100 Whisper Large V3 server.

    Non-WAV files (m4a, mp4, aac, webm, etc.) are automatically converted to
    16kHz mono WAV using ffmpeg before upload — the remote server returns HTTP 500
    on container formats but processes WAV correctly.

    Returns the transcribed text string, or "" on any error.
    The password is NEVER included in log output.
    """
    if not WHISPER_BASE_URL:
        logger.info(
            "WHISPER_BASE_URL is not configured — voice transcription skipped. "
            "Set WHISPER_BASE_URL, WHISPER_USERNAME, and WHISPER_PASSWORD in .env."
        )
        return ""

    endpoint = f"{WHISPER_BASE_URL}/transcribe"
    auth_label = f"{WHISPER_USERNAME}:***" if WHISPER_USERNAME else "none"
    logger.info(
        f"Remote Whisper request → {endpoint}  "
        f"model={WHISPER_MODEL}  auth={auth_label}  file={audio_path}"
    )

    _auth = (WHISPER_USERNAME, WHISPER_PASSWORD) if WHISPER_USERNAME and WHISPER_PASSWORD else None
    _headers = {"ngrok-skip-browser-warning": "true"}
    _timeout = 300

    # --- Convert non-WAV audio to 16kHz mono WAV before sending ---
    # The remote Whisper server returns HTTP 500 on m4a/mp4/aac containers.
    # ffmpeg converts any format to standard 16kHz mono PCM WAV that Whisper accepts.
    wav_path = None
    send_path = audio_path
    try:
        ext = os.path.splitext(audio_path)[1].lower()
        if ext not in (".wav",):
            wav_fd, wav_path = tempfile.mkstemp(suffix=".wav")
            os.close(wav_fd)
            result = subprocess.run(
                [
                    "ffmpeg", "-y", "-i", audio_path,
                    "-ar", "16000", "-ac", "1", "-f", "wav", wav_path,
                    "-loglevel", "error"
                ],
                capture_output=True, timeout=60
            )
            if result.returncode == 0:
                send_path = wav_path
                logger.info(f"Audio converted {ext} → WAV 16kHz mono for Whisper.")
            else:
                stderr_msg = result.stderr.decode(errors="replace")[:200]
                logger.warning(f"ffmpeg conversion failed ({stderr_msg}), sending original file.")
                try:
                    os.unlink(wav_path)
                except Exception:
                    pass
                wav_path = None
                send_path = audio_path
    except FileNotFoundError:
        logger.warning("ffmpeg not found — sending original audio file to Whisper.")
    except Exception as conv_exc:
        logger.warning(f"Audio conversion note: {conv_exc} — sending original file.")

    try:
        audio_size = os.path.getsize(send_path)
        logger.info(f"Sending audio to Whisper ({audio_size} bytes, file: {os.path.basename(send_path)})")
        with open(send_path, "rb") as audio_file:
            fname = os.path.basename(send_path)
            files = {"file": (fname, audio_file, "audio/wav")}
            data_payload = {}
            if language:
                data_payload["language"] = language
            response = requests.post(
                endpoint,
                files=files,
                data=data_payload if data_payload else None,
                auth=_auth,
                headers=_headers,
                timeout=_timeout,
            )

        # --- HTTP error handling ---
        if response.status_code == 401:
            logger.error(
                "Remote Whisper authentication failure (HTTP 401). "
                "Check WHISPER_USERNAME and WHISPER_PASSWORD in .env."
            )
            return ""

        if response.status_code == 400:
            logger.warning(
                f"Remote Whisper rejected the audio (HTTP 400): {response.text[:200]}"
            )
            return ""

        if response.status_code >= 500:
            logger.error(
                f"Remote Whisper server error (HTTP {response.status_code}): "
                f"{response.text[:200]}"
            )
            return ""

        if not response.ok:
            logger.warning(
                f"Remote Whisper unexpected status HTTP {response.status_code}: "
                f"{response.text[:200]}"
            )
            return ""

        # --- Parse JSON response ---
        try:
            data = response.json()
        except Exception:
            logger.warning(
                f"Remote Whisper returned non-JSON response: {response.text[:200]}"
            )
            return ""

        text = (data.get("text") or "").strip()

        if not text:
            logger.warning("Remote Whisper returned an empty transcription.")
            return ""

        detected_lang = data.get("language", "unknown")
        lang_prob = data.get("language_probability", 0.0)
        logger.info(
            f"Remote Whisper transcribed "
            f"(lang={detected_lang}, p={lang_prob:.2f}): {text[:120]!r}"
        )

        if len(text) < 3:
            logger.warning(f"Remote Whisper short transcription: {text!r}")

        return text

    except requests.Timeout:
        logger.warning(
            f"Remote Whisper request timed out after {_timeout}s — "
            "the audio may be too long or the server is busy."
        )
        return ""

    except requests.ConnectionError as exc:
        logger.warning(f"Remote Whisper connection error: {exc}")
        return ""

    except OSError as exc:
        logger.warning(f"Could not open audio file for transcription: {exc}")
        return ""

    except Exception as exc:
        logger.warning(f"Remote Whisper unexpected error: {exc}")
        return ""

    finally:
        # Always clean up the temporary WAV conversion file
        if wav_path:
            try:
                os.unlink(wav_path)
            except Exception:
                pass


def call_ollama(prompt: str) -> Dict[str, Any]:
    """Generate structured catalog content with the Ollama model (local or remote GPU)."""
    # Build auth tuple only when credentials are configured — never log them.
    _auth = (OLLAMA_USERNAME, OLLAMA_PASSWORD) if OLLAMA_USERNAME and OLLAMA_PASSWORD else None

    # ngrok free-tier serves an HTML interstitial unless this header is present.
    # Safe to send to local Ollama too — it is simply ignored.
    _headers = {"ngrok-skip-browser-warning": "true"}

    # Remote A100 GPU inference can take longer than a local CPU model;
    # 600 s gives ample headroom while still failing fast on hard errors.
    _timeout = 600

    auth_label = f"{OLLAMA_USERNAME}:***" if _auth else "none"
    logger.info(
        f"Ollama request → {OLLAMA_BASE_URL}/api/generate  model={OLLAMA_MODEL}  auth={auth_label}"
    )

    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "think": False,
            "options": {
                "temperature": 0.45,
                "repeat_penalty": 1.15,
                "num_predict": 1400
            },
        },
        auth=_auth,
        headers=_headers,
        timeout=_timeout,
    )
    response.raise_for_status()
    result = response.json().get("response", "")
    if not result:
        raise ValueError("Ollama returned an empty response")
    return json.loads(result)


def call_gemini(prompt: str) -> Dict[str, Any]:
    """Call Google Gemini API with model cascade for description generation."""
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1000,
            "response_mime_type": "application/json"
        }
    }
    last_error = ""
    for model_name in _GEMINI_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=25)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts:
                        text_out = parts[0].get("text", "").strip()
                        match = re.search(r'\{.*\}', text_out, re.DOTALL)
                        if match:
                            parsed = json.loads(match.group(0))
                            if parsed.get("description_en"):
                                logger.info(f"Gemini ({model_name}) generated descriptions.")
                                return parsed
            else:
                last_error = f"{model_name} HTTP {resp.status_code}"
        except Exception as e:
            last_error = f"{model_name} exception: {str(e)}"
    raise RuntimeError(f"All Gemini models failed: {last_error}")


def _build_prompt(input_text: str, craft_type: str) -> str:
    return f"""You are an expert e-commerce product copywriter with deep knowledge of Indian handmade crafts AND general consumer products (electronics, personal care, kitchenware, clothing, toys, etc.).

ARTISAN VOICE NOTES (use as seed keywords/hints — the artisan described this product in their own words):
"{input_text}"

PRODUCT CATEGORY: {craft_type}

YOUR TASK:
The artisan's notes are raw seed keywords. Use them to identify the product, then write a RICH, PROFESSIONAL product description that goes FAR BEYOND just repeating what they said.

Think like a top Amazon/Flipkart copywriter:
- Identify the product from the artisan's keywords
- Add real product BENEFITS, USE-CASES, and SELLING POINTS from your knowledge
- Highlight WHY a customer should buy it (comfort, quality, durability, uniqueness, craftsmanship)
- Include specific features they mentioned AND enrich with well-known category benefits

EXAMPLE — If artisan says: "white gaming mouse, 8000 DPI, gaming lights"
DO NOT write: "This is a white gaming mouse with 8000 DPI and gaming lights."
WRITE: "Dominate every game with this precision white gaming mouse featuring ultra-high 8000 DPI sensitivity for pixel-perfect accuracy. RGB gaming lights add an electrifying aesthetic to your setup. Ergonomic design ensures fatigue-free marathon sessions. Perfect for FPS, MOBA, and competitive gaming."

EXAMPLE — If artisan says: "wooden comb, handmade, smooth teeth"
DO NOT write: "This is a handmade wooden comb with smooth teeth."
WRITE: "Crafted by skilled artisans, this handmade wooden comb gently detangles hair without static or breakage. Smooth, wide teeth glide effortlessly through all hair types, distributing natural oils from root to tip for shinier, healthier hair. Eco-friendly and biodegradable — a beautiful alternative to plastic."

OUTPUT RULES:
1. title: Catchy, SEO-friendly product title (4-8 words). Make it sound premium.
2. description_en: 50-80 words. Professional, benefit-rich, persuasive English. Use the artisan's keywords as the foundation, then ENRICH with real product knowledge.
3. description_hi: 50-80 words in fluent Devanagari Hindi (हिंदी). Same enriched style — NOT a word-for-word translation. Natural, flowing sentences.
4. description_ta: 50-80 words in pure Tamil script (தமிழ்). STRICTLY Tamil Unicode characters only — absolutely NO Roman/English letters. Same enriched style.

ABSOLUTELY FORBIDDEN — YOUR OUTPUT WILL BE REJECTED IF:
- Chinese characters (汉字) appear ANYWHERE in the output — you are outputting to Indian users, NOT Chinese users
- You include your internal reasoning, chain-of-thought, or notes inside the JSON values
- You add any text outside the JSON object
- description_hi or description_ta contain Roman/English letters

CRITICAL:
- Never just echo back the voice notes — ALWAYS add value and professional copy
- Return ONLY the raw JSON object below, nothing else — no explanation, no preamble

{{
  "title": "...",
  "category": "{craft_type}",
  "description_en": "...",
  "description_hi": "...",
  "description_ta": "..."
}}"""


def _parse_result(parsed: Dict, craft_type: str) -> tuple:
    """Extract and validate fields from AI-parsed result."""
    desc_en = parsed.get("description_en", "")
    desc_hi = parsed.get("description_hi", "")
    desc_ta = parsed.get("description_ta", "")
    title = parsed.get("title", "")
    category = parsed.get("category", craft_type)

    # Discard any field that contains Chinese characters leaking from the model's internal thinking
    if _has_chinese_leak(desc_en):
        logger.warning("English description contained Chinese characters (model thinking leak) — discarding.")
        desc_en = ""
    if _has_chinese_leak(desc_hi):
        logger.warning("Hindi description contained Chinese characters (model thinking leak) — discarding.")
        desc_hi = ""
    if _has_chinese_leak(desc_ta):
        logger.warning("Tamil description contained Chinese characters (model thinking leak) — discarding.")
        desc_ta = ""

    # Validate Tamil: if model returned Romanized text, discard it
    if desc_ta and not _is_valid_tamil(desc_ta):
        logger.warning("Tamil description contained non-Tamil (Romanized) text — discarding and using fallback.")
        desc_ta = ""

    return desc_en, desc_hi, desc_ta, title, category


def generate_descriptions(
    raw_text: str,
    craft_type: str = "Handicraft"
) -> Dict[str, Any]:
    """Generate professional SEO-friendly descriptions in EN, HI, and TA."""
    input_text = raw_text.strip() or f"Handmade {craft_type} crafted with authentic traditional techniques."
    
    # Add quality check for input text
    if len(input_text) < 5:
        logger.warning("Very short input text detected, using fallback")
        input_text = f"Handmade {craft_type} crafted with authentic traditional techniques."
    
    prompt = _build_prompt(input_text, craft_type)

    desc_en = ""
    desc_hi = ""
    desc_ta = ""
    generated_title = ""
    generated_category = craft_type or "Handicraft"

    # 1. Try Gemini first (if AI_key / GEMINI_API_KEY is configured) for ultra-fast, high-quality multilingual copy.
    if GEMINI_API_KEY:
        try:
            parsed = call_gemini(prompt)
            desc_en, desc_hi, desc_ta, generated_title, generated_category = _parse_result(parsed, craft_type)
            if desc_en:
                logger.info(f"Gemini generated descriptions successfully. Tamil valid: {bool(desc_ta)}")
        except Exception as e:
            logger.warning(f"Gemini generation note: {e}")

    # 2. Fallback to Ollama if Gemini was not available or did not produce results (preserving existing Ollama code)
    if not desc_en:
        try:
            parsed = call_ollama(prompt)
            desc_en, desc_hi, desc_ta, generated_title, generated_category = _parse_result(parsed, craft_type)
            logger.info(f"Ollama ({OLLAMA_MODEL}) generated descriptions. Tamil valid: {bool(desc_ta)}")
        except Exception as e:
            logger.warning(f"Ollama generation note ({OLLAMA_MODEL}): {e}")

    # 3. Try Claude if still unavailable.
    if not desc_en and ANTHROPIC_API_KEY and ANTHROPIC_API_KEY != "your_anthropic_api_key_here":
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            msg = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=700,
                messages=[{"role": "user", "content": prompt}]
            )
            resp_text = msg.content[0].text.strip()
            if "{" in resp_text and "}" in resp_text:
                json_str = resp_text[resp_text.find("{"):resp_text.rfind("}")+1]
                parsed = json.loads(json_str)
                desc_en, desc_hi, desc_ta, generated_title, generated_category = _parse_result(parsed, craft_type)
        except Exception as e:
            logger.warning(f"Claude API note: {e}")

    # 4. Try OpenAI
    if not desc_en and OPENAI_API_KEY and OPENAI_API_KEY != "your_openai_api_key_here":
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=700,
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            parsed = json.loads(response.choices[0].message.content.strip())
            desc_en, desc_hi, desc_ta, generated_title, generated_category = _parse_result(parsed, craft_type)
        except Exception as e:
            logger.warning(f"OpenAI API note: {e}")

    # Final fallback: clean native Tamil templates
    clean_notes = input_text.strip().rstrip('.')
    if not generated_title:
        generated_title = clean_notes[:60] if len(clean_notes) < 60 else f"Handcrafted {craft_type}"
    if not desc_en:
        desc_en = f"Exquisite handcrafted {craft_type} — {clean_notes}. Meticulously created by skilled Indian artisans celebrating authentic cultural heritage and fine craftsmanship."
    if not desc_hi:
        desc_hi = f"उत्कृष्ट हस्तनिर्मित {craft_type} — {clean_notes}। कुशल भारतीय कारीगरों द्वारा पारंपरिक कला और प्रामाणिक तकनीकों से तैयार।"
    if not desc_ta:
        # Safe native Tamil template — always uses real Tamil script
        desc_ta = f"பாரம்பரிய கைவினை {craft_type} — {clean_notes}. திறமையான இந்திய கைவினைஞர்களால் பாரம்பரிய நுட்பங்களுடன் வடிவமைக்கப்பட்டது. தரமான மூலப்பொருட்களால் தயாரிக்கப்பட்ட இந்தப் பொருள் உங்கள் வீட்டிற்கு அழகு சேர்க்கும்."

    # Quality validation
    if desc_en and len(desc_en) < 30:
        logger.warning("Generated English description seems too short")
        desc_en = f"Exquisite handcrafted {craft_type} — {clean_notes}. Meticulously created by skilled Indian artisans celebrating authentic cultural heritage and fine craftsmanship."
        
    if desc_ta and not _is_valid_tamil(desc_ta):
        # Try to reconstruct proper Tamil description
        logger.warning("Reconstructing Tamil description in valid script")
        desc_ta = f"பாரம்பரிய கைவினை {craft_type} — {clean_notes}. திறமையான இந்திய கைவினைஞர்களால் பாரம்பரிய நுட்பங்களுடன் வடிவமைக்கப்பட்டது. தரமான மூலப்பொருட்களால் தயாரிக்கப்பட்ட இந்தப் பொருள் உங்கள் வீட்டிற்கு அழகு சேர்க்கும்."

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


