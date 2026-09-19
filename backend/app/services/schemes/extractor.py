"""
AI Scheme Extraction Module (Step 2).

Transforms raw scraped content from Step 1's collector into structured SchemeRecord objects
using an LLM (Gemini, Claude, or OpenAI, based on project environment configuration).
"""

import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import requests
from pydantic import BaseModel, Field, ValidationError

# Configure logger
logger = logging.getLogger("SchemeExtractor")
if not logger.handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

# Try importing project config if available
try:
    from app.config import (
        ANTHROPIC_API_KEY,
        GEMINI_API_KEY,
        GEMINI_MODEL,
        OPENAI_API_KEY,
    )
except ImportError:
    # Standalone execution fallback
    from dotenv import load_dotenv

    backend_dir = Path(__file__).resolve().parent.parent.parent.parent
    load_dotenv(backend_dir / ".env")
    load_dotenv()

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


# ── Pydantic Schema ────────────────────────────────────────────────────────────

class SchemeRecord(BaseModel):
    scheme_name: str
    provider_name: str
    provider_type: Literal["government", "ngo", "private"]
    scheme_category: Optional[str] = None
    eligibility_summary: Optional[str] = None
    benefits_offered: Optional[str] = None
    application_process: Optional[str] = None
    application_deadline: Optional[str] = None
    official_source_url: str
    source_type: Literal["api", "web", "pdf"]
    review_flagged: bool = False
    simple_summary: Optional[str] = None
    simple_summary_en: Optional[str] = None
    simple_summary_hi: Optional[str] = None
    simple_summary_ta: Optional[str] = None


# ── System Prompts ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert data extraction assistant specialized in government and NGO welfare schemes for artisans, craftspeople, and weavers in India.

Extract structured scheme records from the provided raw text.
One source may describe MULTIPLE distinct schemes (or sub-schemes/programs). Extract ALL distinct schemes found.
If the text does NOT describe any welfare, financial, marketing, skilling, or development scheme or initiative for artisans/craftspeople, return an empty array `[]`.

CRITICAL EXTRACTION RULES:
1. Extract ONLY real, explicitly stated facts present in the text. NEVER invent, hallucinate, or extrapolate details not in the source text.
2. If a field's information is not clearly stated in the text, set it to null (None). DO NOT guess or assume.
3. Provider Type must be one of: "government", "ngo", or "private".
4. Scheme Category should represent the primary support type, such as: "financial aid", "training", "equipment", "market access", "skill certification", "welfare", or similar concise category.
5. Set review_flagged to true if eligibility, criteria, or benefits are vague, incomplete, ambiguous, or if key details are missing in the source text. Otherwise set review_flagged to false.
6. Return a strict JSON array of objects conforming to the SchemeRecord schema. Do NOT wrap in markdown backticks or commentary if possible.
"""

EXTRACTION_SCHEMA_DESCRIPTION = """
Schema for each item in the JSON array:
{
  "scheme_name": "string (name of the scheme/program)",
  "provider_name": "string (ministry, department, NGO, or organization offering it)",
  "provider_type": "government" | "ngo" | "private",
  "scheme_category": "string or null (e.g. financial aid, training, equipment, market access, skill certification)",
  "eligibility_summary": "string or null (plain descriptive text of who is eligible)",
  "benefits_offered": "string or null (key benefits, loan limits, subsidies, toolkit aid)",
  "application_process": "string or null (how to apply, portal name, offline process)",
  "application_deadline": "string or null (deadline date or 'Ongoing' if stated)",
  "review_flagged": true | false
}
"""


# ── LLM Client Dispatch ────────────────────────────────────────────────────────

def _call_llm_for_json(prompt: str) -> Optional[str]:
    """
    Sends the extraction prompt to whichever LLM is configured in the environment.
    Supports Gemini (REST API), Anthropic (SDK), or OpenAI (SDK).
    """
    # 1. Resolve Gemini Key
    # (Check GEMINI_API_KEY, or ANTHROPIC_API_KEY if user supplied a Gemini key there)
    active_gemini_key = ""
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        active_gemini_key = GEMINI_API_KEY
    elif ANTHROPIC_API_KEY and (
        ANTHROPIC_API_KEY.startswith("AQ.") or ANTHROPIC_API_KEY.startswith("AIzaSy")
    ):
        active_gemini_key = ANTHROPIC_API_KEY

    if active_gemini_key:
        models_to_try = [
            "gemini-3.6-flash",
            "gemini-flash-latest",
            "gemini-3.5-flash",
            "gemini-2.0-flash",
        ]
        if GEMINI_MODEL and GEMINI_MODEL not in models_to_try:
            models_to_try.insert(0, GEMINI_MODEL)

        for model_name in models_to_try:
            for attempt in range(3):
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={active_gemini_key}"
                    payload = {
                        "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\n{EXTRACTION_SCHEMA_DESCRIPTION}\n\n{prompt}"}]}],
                        "generationConfig": {
                            "temperature": 0.1,
                            "response_mime_type": "application/json",
                        },
                    }
                    resp = requests.post(url, json=payload, timeout=45)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts:
                                return parts[0].get("text", "").strip()
                    elif resp.status_code == 429:
                        time.sleep(2 * (attempt + 1))
                        continue
                    else:
                        logger.debug(f"Gemini {model_name} returned status {resp.status_code}: {resp.text[:120]}")
                        break
                except Exception as e:
                    logger.warning(f"Gemini {model_name} call attempt {attempt+1} note: {e}")
                    time.sleep(1.5 * (attempt + 1))

    # 2. Anthropic Claude (when valid Anthropic key is present)
    active_claude_key = ""
    if (
        ANTHROPIC_API_KEY
        and ANTHROPIC_API_KEY != "your_anthropic_api_key_here"
        and not (ANTHROPIC_API_KEY.startswith("AQ.") or ANTHROPIC_API_KEY.startswith("AIzaSy"))
    ):
        active_claude_key = ANTHROPIC_API_KEY

    if active_claude_key:
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=active_claude_key)
            msg = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=4000,
                temperature=0.1,
                system=f"{SYSTEM_PROMPT}\n{EXTRACTION_SCHEMA_DESCRIPTION}",
                messages=[{"role": "user", "content": prompt}],
            )
            return msg.content[0].text.strip()
        except Exception as e:
            logger.warning(f"Anthropic Claude API error: {e}")

    # 3. OpenAI (when OPENAI_API_KEY is present)
    if OPENAI_API_KEY and OPENAI_API_KEY != "your_openai_api_key_here":
        try:
            from openai import OpenAI

            client = OpenAI(api_key=OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.1,
                messages=[
                    {"role": "system", "content": f"{SYSTEM_PROMPT}\n{EXTRACTION_SCHEMA_DESCRIPTION}"},
                    {"role": "user", "content": prompt},
                ],
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"OpenAI API error: {e}")

    logger.error("No working LLM provider could be reached or keys are unconfigured.")
    return None


PLAIN_LANGUAGE_SYSTEM_PROMPT = (
    "Rewrite this for someone with very basic reading ability. Use words a 10-year-old would understand. "
    "No jargon, no legal terms, no long sentences.\n\n"
    "CRITICAL RULES:\n"
    "1. Write ONE short paragraph containing 3 to 4 short sentences maximum.\n"
    "2. Every sentence MUST be short (under ~12 words each).\n"
    "3. Use simple, everyday words. Avoid bureaucratic, legal, or administrative jargon.\n"
    "4. Use concrete numbers instead of vague terms (e.g., 'You must be between 18 and 40 years old' instead of 'age criteria apply', 'You get Rs 15,000 grant' instead of 'financial assistance provided').\n"
    "5. Format strictly as:\n"
    "What it is: [One short sentence]. Who can apply: [One short sentence]. What you get: [One or two short sentences with exact numbers].\n"
    "6. Return ONLY the plain text paragraph. Do not use bullet points, markdown bolding, quotes, or conversational filler."
)

MULTILINGUAL_SUMMARY_SYSTEM_PROMPT = (
    "Rewrite this scheme for someone with very basic reading ability in THREE languages: English, Hindi, and Tamil.\n\n"
    "CRITICAL RULES:\n"
    "1. For English: Format as 'What it is: [sentence]. Who can apply: [sentence]. What you get: [sentence with numbers].'\n"
    "2. For Hindi (Devanagari script): Format as 'यह क्या है: [वाक्य]. कौन आवेदन कर सकता है: [वाक्य]. आपको क्या मिलेगा: [वाक्य].'\n"
    "3. For Tamil (Tamil script): Format as 'இது என்ன: [வாக்கியம்]. யார் விண்ணப்பிக்கலாம்: [வாக்கியம்]. உங்களுக்கு என்ன கிடைக்கும்: [வாக்கியம்].'\n"
    "4. Return ONLY a valid JSON object strictly with keys \"en\", \"hi\", and \"ta\". Do NOT wrap with markdown backticks or explanations."
)

def _call_llm_for_text(system_prompt: str, user_prompt: str) -> Optional[str]:
    """
    Sends a text rewrite prompt to the configured LLM.
    Supports Gemini (REST API), Anthropic (SDK), or OpenAI (SDK).
    """
    active_gemini_key = ""
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        active_gemini_key = GEMINI_API_KEY
    elif ANTHROPIC_API_KEY and (
        ANTHROPIC_API_KEY.startswith("AQ.") or ANTHROPIC_API_KEY.startswith("AIzaSy")
    ):
        active_gemini_key = ANTHROPIC_API_KEY

    if active_gemini_key:
        models_to_try = [
            "gemini-3.6-flash",
            "gemini-flash-latest",
            "gemini-3.5-flash",
            "gemini-2.5-flash",
        ]
        if GEMINI_MODEL and GEMINI_MODEL not in models_to_try and "2.0" not in GEMINI_MODEL:
            models_to_try.insert(0, GEMINI_MODEL)

        for model_name in models_to_try:
            for attempt in range(3):
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={active_gemini_key}"
                    payload = {
                        "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
                        "generationConfig": {
                            "temperature": 0.2,
                            "maxOutputTokens": 4000,
                        },
                    }
                    resp = requests.post(url, json=payload, timeout=30)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts:
                                return parts[0].get("text", "").strip()
                    elif resp.status_code == 429:
                        time.sleep(1.5 * (attempt + 1))
                        continue
                    else:
                        break
                except Exception as e:
                    logger.debug(f"Gemini text rewrite error: {e}")
                    time.sleep(1)

    # 2. Anthropic Claude
    active_claude_key = ""
    if (
        ANTHROPIC_API_KEY
        and ANTHROPIC_API_KEY != "your_anthropic_api_key_here"
        and not (ANTHROPIC_API_KEY.startswith("AQ.") or ANTHROPIC_API_KEY.startswith("AIzaSy"))
    ):
        active_claude_key = ANTHROPIC_API_KEY

    if active_claude_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=active_claude_key)
            msg = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=300,
                temperature=0.2,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return msg.content[0].text.strip()
        except Exception as e:
            logger.warning(f"Anthropic text rewrite error: {e}")

    # 3. OpenAI
    if OPENAI_API_KEY and OPENAI_API_KEY != "your_openai_api_key_here":
        try:
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.2,
                max_tokens=300,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"OpenAI text rewrite error: {e}")

    return None


def generate_simple_summary(
    scheme_name: str,
    provider_name: Optional[str] = None,
    category: Optional[str] = None,
    eligibility: Optional[str] = None,
    benefits: Optional[str] = None,
) -> str:
    """
    Generates a 3-4 sentence plain-language summary for low-literacy users.
    Format: What it is: ... Who can apply: ... What you get: ...
    """
    user_prompt = (
        f"SCHEME NAME: {scheme_name}\n"
        f"OFFERED BY: {provider_name or 'Government / NGO'}\n"
        f"TYPE: {category or 'Artisan Support'}\n"
        f"ORIGINAL ELIGIBILITY: {eligibility or 'All traditional artisans and weavers.'}\n"
        f"ORIGINAL BENEFITS: {benefits or 'Toolkits, loan support, and skill training.'}\n\n"
        "Please rewrite this into 3-4 short, simple sentences following the exact format:\n"
        "What it is: [sentence]. Who can apply: [sentence]. What you get: [sentence]."
    )

    llm_output = _call_llm_for_text(PLAIN_LANGUAGE_SYSTEM_PROMPT, user_prompt)
    if llm_output:
        # Clean formatting
        cleaned = llm_output.replace("**", "").replace("__", "").replace("###", "").strip()
        if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
            cleaned = cleaned[1:-1].strip()
        if "What it is:" in cleaned and "Who can apply:" in cleaned and "What you get:" in cleaned:
            return cleaned
        return cleaned

    # Deterministic fallback when LLM is offline
    clean_elig = (eligibility or "Traditional artisans and weavers in India").split(".")[0].strip()
    clean_ben = (benefits or "Toolkits, loan assistance, and training").split(".")[0].strip()
    return (
        f"What it is: This is a government support scheme for craft makers. "
        f"Who can apply: {clean_elig}. "
        f"What you get: {clean_ben}."
    )


def generate_multilingual_simple_summaries(
    scheme_name: str,
    provider_name: Optional[str] = None,
    category: Optional[str] = None,
    eligibility: Optional[str] = None,
    benefits: Optional[str] = None,
) -> Dict[str, str]:
    """
    Generates 3-sentence plain-language summaries in English, Hindi, and Tamil.
    Returns: {"en": "...", "hi": "...", "ta": "..."}
    """
    clean_elig = (eligibility or "Traditional artisans and weavers in India").split(".")[0].strip()
    clean_ben = (benefits or "Toolkits, loan assistance, and training").split(".")[0].strip()

    fallback = {
        "en": (
            f"What it is: This program gives training and financial support to craft workers. "
            f"Who can apply: {clean_elig}. "
            f"What you get: {clean_ben}."
        ),
        "hi": (
            f"यह क्या है: यह योजना शिल्पकारों और दस्तकारों को प्रशिक्षण और आर्थिक मदद देती है। "
            f"कौन आवेदन कर सकता है: {clean_elig}। "
            f"आपको क्या मिलेगा: टूलकिट अनुदान, कम ब्याज पर आसान ऋण और कौशल प्रशिक्षण।"
        ),
        "ta": (
            f"இது என்ன: கைவினைஞர்களுக்கு பயிற்சி மற்றும் நிதி உதவி வழங்கும் அரசு நலத்திட்டம். "
            f"யார் விண்ணப்பிக்கலாம்: {clean_elig}. "
            f"உங்களுக்கு என்ன கிடைக்கும்: கருவித்தொகுப்பு உதவித்தொகை, எளிய கடன் மற்றும் பயிற்சி."
        ),
    }

    user_prompt = (
        f"SCHEME NAME: {scheme_name}\n"
        f"OFFERED BY: {provider_name or 'Government / NGO'}\n"
        f"TYPE: {category or 'Artisan Support'}\n"
        f"ORIGINAL ELIGIBILITY: {eligibility or 'All traditional artisans and weavers.'}\n"
        f"ORIGINAL BENEFITS: {benefits or 'Toolkits, loan support, and skill training.'}\n\n"
        "Generate plain-language summaries in English, Hindi, and Tamil as a JSON object with keys 'en', 'hi', and 'ta'."
    )

    llm_output = _call_llm_for_text(MULTILINGUAL_SUMMARY_SYSTEM_PROMPT, user_prompt)
    if llm_output:
        try:
            cleaned = _clean_json_string(llm_output)
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict) and "en" in parsed and "hi" in parsed and "ta" in parsed:
                return {
                    "en": str(parsed.get("en") or fallback["en"]).strip(),
                    "hi": str(parsed.get("hi") or fallback["hi"]).strip(),
                    "ta": str(parsed.get("ta") or fallback["ta"]).strip(),
                }
        except Exception as e:
            logger.warning(f"Error parsing multilingual summaries from LLM: {e}")

    # Fallback to English single-summary LLM if multilingual json call failed
    en_summary = generate_simple_summary(scheme_name, provider_name, category, eligibility, benefits)
    if en_summary:
        fallback["en"] = en_summary

    return fallback
# ── Extraction Functions ───────────────────────────────────────────────────────

def _clean_json_string(raw_text: str) -> str:
    """Extracts JSON substring if the LLM output includes markdown backticks or commentary."""
    text = raw_text.strip()
    # Remove markdown code blocks like ```json ... ```
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

    # Find bounding array brackets [ ... ]
    start = text.find("[")
    end = text.rfind("]")
    if start != -1 and end != -1 and end >= start:
        return text[start : end + 1]

    # Find bounding object brackets { ... } if single object returned
    start_obj = text.find("{")
    end_obj = text.rfind("}")
    if start_obj != -1 and end_obj != -1 and end_obj >= start_obj:
        return text[start_obj : end_obj + 1]

    return text


def extract_schemes_from_source(raw_result: dict) -> List[SchemeRecord]:
    """
    Takes one item from Step 1 collector output:
    {
        "source_name": str,
        "source_url": str,
        "source_type": "api" | "web" | "pdf",
        "status": "success" | "failed" | "skipped",
        "raw_content": Optional[str],
        "error_message": Optional[str]
    }

    Skips immediately if status != 'success' or raw_content is empty.
    Calls the configured LLM to extract all distinct SchemeRecord objects.
    Handles malformed responses gracefully without crashing.
    """
    status = raw_result.get("status")
    raw_content = raw_result.get("raw_content") or ""
    source_name = raw_result.get("source_name", "Unknown Source")
    source_url = raw_result.get("source_url", "")
    source_type_val = raw_result.get("source_type", "web")
    if source_type_val not in ("api", "web", "pdf"):
        source_type_val = "web"

    # Fast skip check
    if status != "success" or not raw_content.strip():
        logger.debug(f"Skipping source '{source_name}': status={status}, content_len={len(raw_content)}")
        return []

    logger.info(f"Extracting schemes from: '{source_name}' ({len(raw_content)} chars)...")

    # Limit maximum raw content sent to prompt to keep token count reasonable (approx 12,000 chars)
    trimmed_content = raw_content[:15000]

    user_prompt = f"""SOURCE NAME: {source_name}
SOURCE URL: {source_url}
SOURCE TYPE: {source_type_val}

RAW SOURCE TEXT:
\"\"\"
{trimmed_content}
\"\"\"

Extract all distinct schemes/programs described above as a JSON array of SchemeRecord objects.
Remember to return ONLY valid JSON."""

    raw_response = _call_llm_for_json(user_prompt)
    if not raw_response:
        logger.warning(f"Empty LLM response for source: '{source_name}'")
        return []

    # Clean and parse JSON
    cleaned_json = _clean_json_string(raw_response)
    try:
        parsed_data = json.loads(cleaned_json)
    except json.JSONDecodeError as err:
        logger.error(f"Malformed JSON returned by LLM for '{source_name}': {err}. Snippet: {cleaned_json[:200]}")
        return []

    # Normalize to list
    items = parsed_data if isinstance(parsed_data, list) else [parsed_data]

    extracted_records: List[SchemeRecord] = []
    for item in items:
        if not isinstance(item, dict):
            continue

        # Fill mandatory source metadata defaults if missing from LLM output
        if not item.get("official_source_url"):
            item["official_source_url"] = source_url
        if not item.get("source_type"):
            item["source_type"] = source_type_val
        elif item["source_type"] not in ("api", "web", "pdf"):
            item["source_type"] = source_type_val

        # Ensure valid provider_type
        pt = str(item.get("provider_type", "")).lower().strip()
        if pt in ("government", "ngo", "private"):
            item["provider_type"] = pt
        else:
            # Safe default based on source name or url
            if any(term in source_name.lower() or term in source_url.lower() for term in ["ngo", "foundation", "samiti", "society"]):
                item["provider_type"] = "ngo"
            else:
                item["provider_type"] = "government"

        # Validate with Pydantic
        try:
            record = SchemeRecord(**item)
            # Step 1A: Plain-language rewrite for low-literacy accessibility (EN, HI, TA)
            if not record.simple_summary_en or not record.simple_summary_hi or not record.simple_summary_ta:
                multi = generate_multilingual_simple_summaries(
                    scheme_name=record.scheme_name,
                    provider_name=record.provider_name,
                    category=record.scheme_category,
                    eligibility=record.eligibility_summary,
                    benefits=record.benefits_offered,
                )
                if not record.simple_summary_en:
                    record.simple_summary_en = multi.get("en")
                if not record.simple_summary_hi:
                    record.simple_summary_hi = multi.get("hi")
                if not record.simple_summary_ta:
                    record.simple_summary_ta = multi.get("ta")
                if not record.simple_summary:
                    record.simple_summary = record.simple_summary_en or multi.get("en")
            extracted_records.append(record)
        except ValidationError as val_err:
            logger.warning(f"Skipping record in '{source_name}' due to validation error: {val_err}")

    logger.info(f"Extracted {len(extracted_records)} scheme(s) from '{source_name}'")
    return extracted_records


def extract_all(collector_results: List[Dict[str, Any]], delay_between_calls: float = 1.0) -> List[SchemeRecord]:
    """
    Loops through all collector results, calls extract_schemes_from_source on each,
    and returns a combined flat list of all SchemeRecord objects.
    Includes rate-limit delay between sequential LLM calls.
    """
    all_schemes: List[SchemeRecord] = []
    total_sources = len(collector_results)

    logger.info(f"Starting scheme extraction across {total_sources} collector results...")

    for i, res in enumerate(collector_results):
        if res.get("status") == "success" and (res.get("raw_content") or "").strip():
            schemes = extract_schemes_from_source(res)
            all_schemes.extend(schemes)

            # Rate limit delay between actual LLM calls
            if i < total_sources - 1 and schemes is not None:
                time.sleep(delay_between_calls)

    logger.info(f"Completed extraction. Total schemes extracted: {len(all_schemes)}")
    return all_schemes
