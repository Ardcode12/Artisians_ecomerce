"""
AI Reel Ad Script Writer using Google Gemini 2.0 Flash
Generates spoken scripts in Indic languages and English, on-screen caption segments,
Instagram captions, and hashtags.
"""

import os
import json
import re
import logging
from typing import Dict, Any, List

logger = logging.getLogger("ReelScriptWriter")

LANG_NAMES = {
    "ta-IN": "Tamil",
    "hi-IN": "Hindi",
    "te-IN": "Telugu",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "bn-IN": "Bengali",
    "mr-IN": "Marathi",
    "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
    "od-IN": "Odia",
    "en-IN": "English",
}

SYSTEM_PROMPT = """You are an award-winning advertising copywriter specializing in
Indian handicrafts and handloom. You write short-form video ad scripts for Instagram Reels
that showcase and sell authentic, handmade products from rural artisans.

Your scripts are:
- SPOKEN narration, not written copy. Short, punchy sentences with natural breathing pauses.
- Emotionally led: the artisan's hands, the heritage tradition, the cultural lineage.
- Specific: mention the craft technique, region, materials. Never use generic corporate jargon like "high quality" or "premium".
- 45 to 60 words TOTAL so narration duration lands precisely between 15 and 20 seconds.
- Ending with a single, warm, authentic call to action.

Return ONLY valid JSON with no markdown formatting."""

USER_TEMPLATE = """Write an Instagram Reel ad script for this artisan creation.

PRODUCT:
Name: {name}
Category: {category}
Materials: {materials}
Craft technique: {technique}
Artisan: {artisan_name}, from {location}
Cluster / GI Tag: {cluster}
Price: Rs {price}
Artisan's description: {description}

TONE: {tone}
LANGUAGE: {lang_name} ({language_code})

Return ONLY a JSON object with exactly these keys:
{{
  "script_native": "Spoken narration script in {lang_name}, 45-60 words (15-20s speaking time)",
  "script_english": "The same spoken script in natural English, 45-60 words",
  "segments": ["4 to 5 short on-screen caption lines in {lang_name}, max 6 words each"],
  "segments_english": ["4 to 5 short caption lines in English, max 6 words each"],
  "caption": "An engaging Instagram post caption in English (2-3 sentences) with a warm call to action",
  "hashtags": ["10-12 relevant hashtags without the # symbol, mixing craft, heritage, region, and handmade tags"]
}}"""

TONE_MAP = {
    "heritage": "reverent and warm; focus on ancestral tradition, lineage and timeless cultural heritage",
    "festive": "bright, vibrant and festive; celebration, auspicious gifting, festive joy and vibrant colors",
    "minimal": "calm, earthy and modern; texture, conscious buying, organic materials, slow living",
}


def _parse_json(text: str) -> dict:
    """Safely extract JSON object from markdown or text output."""
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return json.loads(cleaned)


def _build_fallback_script(product: dict, language: str, style: str) -> dict:
    """High-quality deterministic fallback if LLM is offline or unconfigured."""
    name = product.get("name") or product.get("title") or "Handcrafted Creation"
    artisan = product.get("artisan_name") or "our master artisan"
    location = product.get("location") or "India"
    category = product.get("category") or product.get("craft_type") or "Handloom"
    price = str(product.get("price") or "").replace("₹", "").strip() or "500"

    # Native language templates
    if language.startswith("ta"):
        native_script = f"நம் பாரம்பரியக் கைவினைஞரின் கைவண்ணத்தில் உருவான {name}. {location} பகுதியில் பல தலைமுறைகளாகப் பாதுகாக்கப்படும் கலை. அசல் கைவினைப் பொருட்களை நேரடியாகப் பெற்று கைவினைஞர்களுக்கு ஆதரவளியுங்கள். உடனே ஆர்டர் செய்யுங்கள்!"
        segments = [
            f"அசல் {category}",
            f"{location} கைவினைத் திறன்",
            f"தலைமுறை பாரம்பரியம்",
            f"நேரடி கைவினைஞர் விற்பனை",
            f"₹{price} மட்டுமே • இப்போதே வாங்குங்கள்"
        ]
    elif language.startswith("hi"):
        native_script = f"सदियों पुरानी भारतीय विरासत से सजा {name}। {location} के कुशल कारीगर {artisan} द्वारा हाथों से तैयार। शुद्ध कला, जो आपके घर को दे पारंपरिक सौंदर्य। आज ही ऑर्डर करें और हमारे बुनकरों का समर्थन करें।"
        segments = [
            f"शुद्ध हस्तनिर्मित {category}",
            f"{location} की पारंपरिक कला",
            f"कारीगर {artisan} द्वारा निर्मित",
            "सीधे कारीगर से खरीदें",
            f"केवल ₹{price} • आज ही पाएं"
        ]
    elif language.startswith("te"):
        native_script = f"భారతీయ సాంప్రదాయ వారసత్వంతో రూపొందించిన {name}. {location} ప్రాంతపు నైపుణ్యం కలిగిన చేతిపని. నేరుగా మా చేతివృత్తుల వారి వద్ద నుండి పొందండి. ఈరోజే ఆర్డర్ చేయండి!"
        segments = [
            f"అసలైన చేతిపని {category}",
            f"{location} కళాఖండం",
            "సంప్రదాయ వైభవం",
            "నేరుగా కళాకారుల నుండి",
            f"కేవలం ₹{price} • ఇప్పుడే కొనండి"
        ]
    else:
        native_script = f"Crafted with centuries of heritage, this {name} is lovingly handmade in {location} by {artisan}. Every single thread tells an authentic story of generational mastery. Bring timeless Indian artistry into your home today. Tap the link to order directly from the artisan!"
        segments = [
            f"Authentic Handmade {category}",
            f"Crafted in {location}",
            "Generations of Heritage",
            "Direct Artisan Purchase",
            f"Only ₹{price} • Buy Now"
        ]

    eng_script = f"Crafted with timeless heritage, this {name} is handmade in {location} by {artisan}. Every detail reflects generations of Indian master craftsmanship. Support rural weavers and bring authentic culture home. Tap below to order now!"
    segments_eng = [
        f"Handcrafted {category}",
        f"Artisans of {location}",
        "Generations of Heritage",
        "Direct Support for Makers",
        f"Just ₹{price} • Order Now"
    ]

    caption = f"Direct from the artisans of {location}: Discover this authentic {name}, handmade using traditional {category} techniques. Supporting rural livelihoods one handcrafted piece at a time."
    hashtags = [
        "vocalforlocal", "makeinindia", "indianhandicrafts", "handloomlove",
        "artisanmade", "handcrafted", "sustainablefashion", "giftideas",
        "traditionalcraft", "shopartisans"
    ]

    return {
        "script_native": native_script,
        "script_english": eng_script,
        "segments": segments,
        "segments_english": segments_eng,
        "caption": caption,
        "hashtags": hashtags,
    }


def write_script(product: dict, language: str = "ta-IN", style: str = "heritage") -> dict:
    """Generate an Instagram Reel advertising script."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("AI_key") or os.getenv("AI_KEY") or ""
    model_name = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    if not api_key:
        logger.info("No GEMINI_API_KEY provided; using tailored Indic script template.")
        return _build_fallback_script(product, language, style)

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        lang_name = LANG_NAMES.get(language, "Hindi")
        prompt = USER_TEMPLATE.format(
            name=product.get("name") or product.get("title") or "Handicraft",
            category=product.get("category") or product.get("craft_type") or "Handicraft",
            materials=product.get("materials", "authentic natural fibers and heritage materials"),
            technique=product.get("technique") or product.get("craft_type") or "traditional hand craft",
            artisan_name=product.get("artisan_name") or "a local Indian artisan",
            location=product.get("location") or "India",
            cluster=product.get("cluster") or product.get("scheme_id") or "ODOP / GI Heritage",
            price=str(product.get("price") or "").replace("₹", "").strip() or "650",
            description=product.get("description") or product.get("description_en") or "",
            tone=TONE_MAP.get(style, TONE_MAP["heritage"]),
            lang_name=lang_name,
            language_code=language,
        )

        candidates = [model_name, "gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"]
        data = None
        for cand in candidates:
            try:
                model = genai.GenerativeModel(cand, system_instruction=SYSTEM_PROMPT)
                resp = model.generate_content(
                    prompt,
                    generation_config={"temperature": 0.85, "response_mime_type": "application/json"},
                )
                data = _parse_json(resp.text)
                logger.info(f"Generated reel ad script using Gemini model: {cand}")
                break
            except Exception as cand_err:
                logger.debug(f"Candidate model {cand} failed: {cand_err}")

        if not data:
            raise RuntimeError("All Gemini model candidates failed")

        data.setdefault("segments", [product.get("name") or product.get("title") or "Handmade"])
        data.setdefault("segments_english", data["segments"])
        data.setdefault("hashtags", ["handmade", "artisan", "madeinindia", "handicraft"])
        data.setdefault("caption", product.get("description", "")[:300])
        return data

    except Exception as e:
        logger.warning(f"Gemini script writer failed ({e}); using resilient fallback script.")
        return _build_fallback_script(product, language, style)
