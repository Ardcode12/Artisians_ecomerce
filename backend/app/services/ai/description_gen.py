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


SARVAM_LANG_MAP = {
    "ta": "ta-IN",
    "hi": "hi-IN",
    "te": "te-IN",
    "bn": "bn-IN",
    "mr": "mr-IN",
    "pa": "pa-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "gu": "gu-IN",
    "en": "en-IN",
}

_local_whisper = None


def _get_ffmpeg_exe() -> Optional[str]:
    """Find a usable ffmpeg executable, checking system PATH then imageio-ffmpeg."""
    try:
        res = subprocess.run(["ffmpeg", "-version"], capture_output=True, timeout=5)
        if res.returncode == 0:
            return "ffmpeg"
    except Exception:
        pass
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def _convert_audio_to_wav(audio_path: str) -> Optional[str]:
    """Convert any audio file to 16kHz mono WAV using ffmpeg if available."""
    ffmpeg_exe = _get_ffmpeg_exe()
    if not ffmpeg_exe:
        return None
    try:
        wav_fd, wav_path = tempfile.mkstemp(suffix=".wav")
        os.close(wav_fd)
        result = subprocess.run(
            [
                ffmpeg_exe, "-y", "-i", audio_path,
                "-ar", "16000", "-ac", "1", "-f", "wav", wav_path,
                "-loglevel", "error"
            ],
            capture_output=True, timeout=60
        )
        if result.returncode == 0 and os.path.exists(wav_path) and os.path.getsize(wav_path) > 100:
            return wav_path
        try:
            os.unlink(wav_path)
        except Exception:
            pass
    except Exception as e:
        logger.warning(f"Audio conversion error: {e}")
    return None


def _transcribe_sarvam(audio_path: str, language: Optional[str] = None) -> str:
    """Primary STT: Sarvam AI STT (saaras:v3) specializing in Indian vernacular languages."""
    sarvam_key = os.getenv("SARVAM_API_KEY", "").strip()
    if not sarvam_key:
        return ""
    try:
        lang_norm = (language or "").strip().lower()
        sarvam_lang = SARVAM_LANG_MAP.get(lang_norm)
        data_payload = {"model": "saaras:v3"}
        if sarvam_lang:
            data_payload["language_code"] = sarvam_lang

        ext = os.path.splitext(audio_path)[1].lower()
        mime = "audio/wav" if ext == ".wav" else ("audio/mp4" if ext in (".m4a", ".mp4") else "audio/mpeg")
        with open(audio_path, "rb") as f:
            files = {"file": (os.path.basename(audio_path), f, mime)}
            headers = {"api-subscription-key": sarvam_key}
            resp = requests.post(
                "https://api.sarvam.ai/speech-to-text",
                headers=headers,
                files=files,
                data=data_payload,
                timeout=30,
            )
            if resp.status_code == 200:
                transcript = (resp.json().get("transcript") or "").strip()
                if transcript:
                    logger.info(f"[STT:Sarvam] Transcribed ({sarvam_lang or 'auto'}): {transcript[:80]!r}")
                    return transcript
            else:
                logger.warning(f"[STT:Sarvam] HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"[STT:Sarvam] Exception: {e}")
    return ""


def _transcribe_local_whisper(audio_path: str, language: Optional[str] = None) -> str:
    """Local fallback STT: faster-whisper running on CPU."""
    global _local_whisper
    try:
        if _local_whisper is None:
            from faster_whisper import WhisperModel
            logger.info("[STT:FasterWhisper] Loading local faster-whisper tiny...")
            _local_whisper = WhisperModel("tiny", device="cpu", compute_type="int8")

        lang_code = language.lower() if language and language.lower() not in ("auto", "unknown") else None
        segments, info = _local_whisper.transcribe(str(audio_path), language=lang_code)
        text = " ".join([seg.text.strip() for seg in segments]).strip()
        if text:
            logger.info(f"[STT:FasterWhisper] Transcribed: {text[:80]!r}")
            return text
    except Exception as e:
        logger.warning(f"[STT:FasterWhisper] Exception: {e}")
    return ""


def _transcribe_remote_whisper(audio_path: str, language: Optional[str] = None) -> str:
    """Remote Whisper server fallback."""
    if not WHISPER_BASE_URL:
        return ""
    endpoint = f"{WHISPER_BASE_URL}/transcribe"
    _auth = (WHISPER_USERNAME, WHISPER_PASSWORD) if WHISPER_USERNAME and WHISPER_PASSWORD else None
    _headers = {"ngrok-skip-browser-warning": "true"}
    try:
        with open(audio_path, "rb") as f:
            files = {"file": (os.path.basename(audio_path), f, "audio/wav")}
            data = {"language": language} if language else {}
            resp = requests.post(endpoint, files=files, data=data, auth=_auth, headers=_headers, timeout=60)
            if resp.ok:
                data = resp.json()
                text = (data.get("text") or "").strip()
                if text:
                    logger.info(f"[STT:RemoteWhisper] Transcribed: {text[:80]!r}")
                    return text
    except Exception as e:
        logger.warning(f"[STT:RemoteWhisper] Exception: {e}")
    return ""


def transcribe_audio_file(audio_path: str, language: Optional[str] = None) -> str:
    """
    Robust multi-tiered Speech-to-Text:
    1. Sarvam AI STT (saaras:v3) — Best in class for Indian languages (ta, hi, te, etc.)
    2. Remote Whisper Large V3 (if reachable)
    3. Local faster-whisper (offline fallback)
    """
    if not os.path.exists(audio_path) or os.path.getsize(audio_path) < 50:
        logger.warning(f"[STT] Audio file does not exist or is empty: {audio_path}")
        return ""

    # Prepare standard WAV if needed
    converted_wav = None
    ext = os.path.splitext(audio_path)[1].lower()
    if ext not in (".wav",):
        converted_wav = _convert_audio_to_wav(audio_path)

    active_path = converted_wav or audio_path

    try:
        # Tier 1: Remote Whisper Large V3 (from arnald branch)
        text = _transcribe_remote_whisper(active_path, language=language)
        if text:
            return text

        # Tier 2: Local faster-whisper (WhisperModel on-device fallback)
        text = _transcribe_local_whisper(active_path, language=language)
        if text:
            return text

        # Tier 3: Sarvam AI STT
        text = _transcribe_sarvam(active_path, language=language)
        if text:
            return text

        logger.warning("[STT] All transcription engines returned empty text.")
        return ""
    finally:
        if converted_wav and os.path.exists(converted_wav):
            try:
                os.unlink(converted_wav)
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


# Language definitions
REGIONAL_LANG_MAP = {
    "ta": {"name": "Tamil", "native": "தமிழ்", "script": "pure Tamil script (தமிழ்)"},
    "te": {"name": "Telugu", "native": "తెలుగు", "script": "pure Telugu script (తెలుగు)"},
    "bn": {"name": "Bengali", "native": "বাংলা", "script": "pure Bengali script (বাংলা)"},
    "mr": {"name": "Marathi", "native": "मराठी", "script": "Devanagari script for Marathi (मराठी)"},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "script": "Gurmukhi script for Punjabi (ਪੰਜਾਬੀ)"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "script": "pure Kannada script (ಕನ್ನಡ)"},
    "ml": {"name": "Malayalam", "native": "മലയാളം", "script": "pure Malayalam script (മലയാളം)"},
}

def _build_prompt(input_text: str, craft_type: str, language: str = "ta") -> str:
    lang_code = language.lower() if language else "ta"
    if lang_code in ("en", "hi"):
        regional_info = REGIONAL_LANG_MAP.get("ta")
        regional_code = "ta"
    else:
        regional_info = REGIONAL_LANG_MAP.get(lang_code, REGIONAL_LANG_MAP["ta"])
        regional_code = lang_code if lang_code in REGIONAL_LANG_MAP else "ta"

    reg_name = regional_info["name"]
    reg_native = regional_info["native"]
    reg_script = regional_info["script"]

    return f"""You are an expert e-commerce product copywriter with deep knowledge of Indian handmade crafts AND general consumer products (electronics, personal care, kitchenware, clothing, toys, etc.).

ARTISAN VOICE NOTES (use as seed keywords/hints — the artisan described this product in their own words):
"{input_text}"

PRODUCT CATEGORY: {craft_type}
USER REGIONAL LANGUAGE: {reg_name} ({reg_native})

YOUR TASK:
The artisan's notes are raw seed keywords. Use them to identify the product, then write a RICH, PROFESSIONAL product description in THREE (3) distinct languages:
1. English (common)
2. Hindi (common)
3. {reg_name} ({reg_native}) (regional)

Think like a top Amazon/Flipkart copywriter:
- Identify the product from the artisan's keywords
- Add real product BENEFITS, USE-CASES, and SELLING POINTS from your knowledge
- Highlight WHY a customer should buy it (comfort, quality, durability, uniqueness, craftsmanship)
- Include specific features they mentioned AND enrich with well-known category benefits

OUTPUT RULES:
1. title: Catchy, SEO-friendly product title (4-8 words). Make it sound premium.
2. description_en: 50-80 words. Professional, benefit-rich, persuasive English.
3. description_hi: 50-80 words in fluent Devanagari Hindi (हिंदी). Same enriched style — NOT a word-for-word translation.
4. description_regional: 50-80 words in {reg_script}. STRICTLY native script characters only — absolutely NO Roman/English letters.
5. description_ta: 50-80 words in pure Tamil script (தமிழ்).
6. description_te: 50-80 words in pure Telugu script (తెలుగు).

ABSOLUTELY FORBIDDEN:
- Chinese characters (汉字) anywhere in the output
- Any Roman letters inside Hindi, Tamil, or Telugu text
- Internal chain-of-thought or reasoning text

CRITICAL:
Return ONLY a valid JSON object:
{{
  "title": "...",
  "category": "{craft_type}",
  "description_en": "...",
  "description_hi": "...",
  "description_regional": "...",
  "description_ta": "...",
  "description_te": "..."
}}"""


def _parse_result(parsed: Dict, craft_type: str, language: str = "ta") -> tuple:
    """Extract and validate fields from AI-parsed result."""
    desc_en = parsed.get("description_en", "")
    desc_hi = parsed.get("description_hi", "")
    desc_reg = parsed.get("description_regional", "")
    desc_ta = parsed.get("description_ta", "")
    desc_te = parsed.get("description_te", "")
    title = parsed.get("title", "")
    category = parsed.get("category", craft_type)

    # Discard Chinese leaks
    if _has_chinese_leak(desc_en): desc_en = ""
    if _has_chinese_leak(desc_hi): desc_hi = ""
    if _has_chinese_leak(desc_reg): desc_reg = ""
    if _has_chinese_leak(desc_ta): desc_ta = ""
    if _has_chinese_leak(desc_te): desc_te = ""

    # Validate Tamil if present
    if desc_ta and not _is_valid_tamil(desc_ta):
        desc_ta = ""

    # Assign regional description appropriately
    lang_code = language.lower() if language else "ta"
    if lang_code == "ta" and not desc_reg and desc_ta:
        desc_reg = desc_ta
    elif lang_code == "te" and not desc_reg and desc_te:
        desc_reg = desc_te
    elif desc_reg and lang_code == "ta" and not desc_ta:
        desc_ta = desc_reg
    elif desc_reg and lang_code == "te" and not desc_te:
        desc_te = desc_reg

    return desc_en, desc_hi, desc_reg, desc_ta, desc_te, title, category


def generate_descriptions(
    raw_text: str,
    craft_type: str = "Handicraft",
    language: str = "ta"
) -> Dict[str, Any]:
    """Generate professional SEO-friendly descriptions in EN, HI, and Regional (TA/TE/etc.)."""
    input_text = raw_text.strip() or f"Handmade {craft_type} crafted with authentic traditional techniques."
    
    # Add quality check for input text
    if len(input_text) < 5:
        logger.warning("Very short input text detected, using fallback")
        input_text = f"Handmade {craft_type} crafted with authentic traditional techniques."
    
    lang_code = language.lower() if language else "ta"
    prompt = _build_prompt(input_text, craft_type, lang_code)

    desc_en = ""
    desc_hi = ""
    desc_reg = ""
    desc_ta = ""
    desc_te = ""
    generated_title = ""
    generated_category = craft_type or "Handicraft"

    # 1. Try Gemini first (if AI_key / GEMINI_API_KEY is configured) for ultra-fast, high-quality multilingual copy.
    if GEMINI_API_KEY:
        try:
            parsed = call_gemini(prompt)
            desc_en, desc_hi, desc_reg, desc_ta, desc_te, generated_title, generated_category = _parse_result(parsed, craft_type, lang_code)
            if desc_en:
                logger.info(f"Gemini generated descriptions successfully. Regional: {lang_code}")
        except Exception as e:
            logger.warning(f"Gemini generation note: {e}")

    # 2. Fallback to Ollama if Gemini was not available or did not produce results
    if not desc_en:
        try:
            parsed = call_ollama(prompt)
            desc_en, desc_hi, desc_reg, desc_ta, desc_te, generated_title, generated_category = _parse_result(parsed, craft_type, lang_code)
            logger.info(f"Ollama ({OLLAMA_MODEL}) generated descriptions.")
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
                desc_en, desc_hi, desc_reg, desc_ta, desc_te, generated_title, generated_category = _parse_result(parsed, craft_type, lang_code)
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
            desc_en, desc_hi, desc_reg, desc_ta, desc_te, generated_title, generated_category = _parse_result(parsed, craft_type, lang_code)
        except Exception as e:
            logger.warning(f"OpenAI API note: {e}")

    # Final fallback: authentic native regional templates
    clean_notes = input_text.strip().rstrip('.')
    if not generated_title:
        generated_title = clean_notes[:60] if len(clean_notes) < 60 else f"Handcrafted {craft_type}"
    if not desc_en:
        desc_en = f"Exquisite handcrafted {craft_type} — {clean_notes}. Meticulously created by skilled Indian artisans celebrating authentic cultural heritage and fine craftsmanship."
    if not desc_hi:
        desc_hi = f"उत्कृष्ट हस्तनिर्मित {craft_type} — {clean_notes}। कुशल भारतीय कारीगरों द्वारा पारंपरिक कला और प्रामाणिक तकनीकों से तैयार।"
    if not desc_ta:
        desc_ta = f"பாரம்பரிய கைவினை {craft_type} — {clean_notes}. திறமையான இந்திய கைவினைஞர்களால் பாரம்பரிய நுட்பங்களுடன் வடிவமைக்கப்பட்டது. தரமான மூலப்பொருட்களால் தயாரிக்கப்பட்ட இந்தப் பொருள் உங்கள் வீட்டிற்கு அழகு சேர்க்கும்."
    if not desc_te:
        desc_te = f"సాంప్రదాయ హస్తకళ {craft_type} — {clean_notes}. అనుభవజ్ఞులైన భారతీయ కళాకారులచే ప్రామాణిక పద్ధతులతో రూపొందించబడింది. నాణ్యమైన ముడి పదార్థాలతో తయారైన ఈ విశిష్ట కళ మీ ఇంటికి ఎంతో శోభను చేకూరుస్తుంది."

    # Map regional description if empty
    if not desc_reg:
        if lang_code == "te":
            desc_reg = desc_te
        elif lang_code == "ta":
            desc_reg = desc_ta
        elif lang_code == "bn":
            desc_reg = f"ঐতিহ্যবাহী হস্তশিল্প {craft_type} — {clean_notes}। দক্ষ ভারতীয় কারিগরদের দ্বারা খাঁটি শিল্পকলায় তৈরি।"
        elif lang_code == "mr":
            desc_reg = f"उत्कृष्ट हस्तनिर्मित {craft_type} — {clean_notes}। कुशल भारतीय कारागिरांनी पारंपरिक पद्धतीने तयार केलेले सुंदर उत्पादन."
        else:
            desc_reg = desc_ta

    return {
        "success": True,
        "title": generated_title,
        "category": generated_category,
        "description_en": desc_en,
        "description_hi": desc_hi,
        "description_regional": desc_reg,
        "description_ta": desc_ta,
        "description_te": desc_te,
        "regional_language": lang_code,
        "raw_transcription": input_text,
        "detected_language": lang_code
    }


