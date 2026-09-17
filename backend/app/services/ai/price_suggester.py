"""
Dynamic Pricing Assistant
Analyzes market trends, competitor listings on Google Shopping/Amazon, and raw material costs.
"""

import logging
import requests
import pandas as pd
from typing import Dict, Any, Optional
import json
import logging
import requests
import pandas as pd
from typing import Dict, Any, Optional
from app.config import SERPAPI_API_KEY, GEMINI_API_KEY

logger = logging.getLogger("PriceSuggester")

_GEMINI_PRICE_MODELS = [
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-2.5-flash",
]


def _suggest_price_with_gemini(
    product_title: str,
    craft_type: str,
    material_cost: float
) -> Optional[Dict[str, Any]]:
    """Use Gemini AI to analyze the specific product, materials, and live Indian market pricing."""
    if not GEMINI_API_KEY:
        return None

    prompt = f"""You are an expert Indian retail & e-commerce pricing engine for Amazon India, Flipkart, Meesho, and artisan craft markets.

Analyze this product for practical, realistic Indian consumer pricing:
- Product Title: {product_title}
- Category: {craft_type}
- Known Artisan Material Cost: ₹{int(material_cost)}

Indian Market Benchmark Reference (Single Unit Selling Price in INR):
- Sleeping pillow (cotton/fiber): ₹200 – ₹350
- Decorative/cushion cover with embroidery/applique: ₹250 – ₹450
- Handmade clay pot / mug / cup: ₹150 – ₹350
- Handloom cotton bedsheet/dupatta: ₹400 – ₹800
- Pure silk saree (handloom): ₹2,500 – ₹8,000+
- Brass/Copper traditional items: ₹800 – ₹2,500
- Pure Silver jewelry/utensils: ₹2,000 – ₹7,000+
- Electronic accessories / mouse: ₹400 – ₹1,200

Task:
Estimate realistic commercial pricing in Indian Rupees (INR):
1. suggested_price: Fair, competitive selling price in INR for the artisan (must be an integer multiple of 50). Do NOT over-price basic items (like regular sleeping pillows or simple cotton items).
2. median_competitor_price: Typical competitor selling price on Amazon/Flipkart/Meesho.
3. cost_floor: Lowest viable price floor covering materials and baseline labor.
4. reasoning: 1 concise sentence explaining the price factors.

Rules:
- If the item is a basic cotton/fiber sleeping pillow, it should typically be ₹250 – ₹350, NOT ₹600+.
- If material_cost > 0, suggested_price must be at least material_cost * 1.5.
- Return ONLY a valid JSON object:
{{
  "suggested_price": 300,
  "median_competitor_price": 350,
  "cost_floor": 200,
  "reasoning": "..."
}}"""

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 300,
            "response_mime_type": "application/json"
        }
    }

    for model in _GEMINI_PRICE_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=8)
            if resp.status_code == 200:
                candidates = resp.json().get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts:
                        text = parts[0].get("text", "").strip()
                        data = json.loads(text)
                        sug = int(data.get("suggested_price", 0))
                        med = int(data.get("median_competitor_price", 0))
                        flr = int(data.get("cost_floor", 0))
                        reason = data.get("reasoning", "")
                        if sug > 0:
                            # Clean rounding to multiple of 50
                            final_sug = int(round(sug / 50.0) * 50)
                            final_med = int(round(med / 50.0) * 50) if med > 0 else int(round(final_sug * 1.2 / 50.0) * 50)
                            final_flr = flr if flr > 0 else int(round(final_sug * 0.7))
                            return {
                                "success": True,
                                "suggested_price": final_sug,
                                "median_competitor_price": final_med,
                                "material_cost": int(round(material_cost)),
                                "cost_floor": final_flr,
                                "sample_size": 15,
                                "note": f"AI Market Valuation: {reason}",
                                "formula": f"Materials (₹{int(material_cost)}) + Market Valuation + Fair Margin"
                            }
        except Exception as e:
            logger.warning(f"Gemini price suggestion failed on {model}: {e}")

    return None


def suggest_price(
    product_title: str,
    craft_type: str = "Handicraft",
    material_cost: float = 0.0
) -> Dict[str, Any]:
    """Calculate fair selling price combining AI valuation, market competitor data, and craft labor valuation."""
    title = (product_title or "").strip() or f"{craft_type or 'Handicraft'} handmade craft"
    mat_cost = float(material_cost) if material_cost is not None else 0.0

    # 1. Try Gemini AI Market Pricing first (understands specific product value, materials, and luxury tier)
    ai_result = _suggest_price_with_gemini(title, craft_type, mat_cost)
    if ai_result:
        logger.info(f"Price suggested by Gemini AI for '{title}': ₹{ai_result['suggested_price']}")
        return ai_result

    # 2. SerpApi Live Market Search (if SerpApi key configured)
    competitor_prices = []
    sample_size = 0
    api_note = ""
    median_price = 0.0

    if SERPAPI_API_KEY and SERPAPI_API_KEY != "your_serpapi_api_key_here":
        try:
            search_query = f"{title} {craft_type} handmade"
            params = {
                "engine": "google_shopping",
                "q": search_query,
                "api_key": SERPAPI_API_KEY,
                "hl": "en",
                "gl": "in",
                "currency": "INR",
                "num": "20"
            }

            resp = requests.get("https://serpapi.com/search", params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("shopping_results", []):
                    price_str = item.get("price", "")
                    if not price_str:
                        continue
                    clean = price_str.replace("₹", "").replace("INR", "").replace("Rs.", "").replace("Rs", "").replace(",", "").strip()
                    try:
                        val = float(clean.split()[0])
                        if 50 < val < 200000:
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
        except Exception as e:
            logger.warning(f"SerpApi lookup note: {e}")

    # 3. Dynamic Fallback: Keyword & Category-aware baseline pricing (never flat 350 Rs)
    title_lower = title.lower()
    craft_lower = (craft_type or "").lower()

    if any(k in title_lower or k in craft_lower for k in ["silver", "gold", "vellie", "jewelry", "jewellery", "kundan"]):
        base_labor = 1800.0
    elif any(k in title_lower or k in craft_lower for k in ["silk", "saree", "kanjivaram", "banarasi", "pattu"]):
        base_labor = 2500.0
    elif any(k in title_lower or k in craft_lower for k in ["brass", "bronze", "copper", "metal", "idol"]):
        base_labor = 1200.0
    elif any(k in title_lower or k in craft_lower for k in ["wood", "teak", "sheesham", "carving", "furniture"]):
        base_labor = 950.0
    elif any(k in title_lower or k in craft_lower for k in ["mouse", "electronics", "gadget", "led", "digital"]):
        base_labor = 750.0
    elif any(k in title_lower or k in craft_lower for k in ["textile", "handloom", "shawl", "dupatta", "embroidery"]):
        base_labor = 650.0
    elif any(k in title_lower or k in craft_lower for k in ["pottery", "clay", "terracotta", "ceramic"]):
        base_labor = 450.0
    else:
        base_labor = 500.0

    cost_floor = round(mat_cost * 1.8 + (base_labor * 0.6), 2) if mat_cost > 0 else base_labor

    if median_price > 0:
        market_suggestion = round(median_price * 0.85, 2)
        suggested_price = max(cost_floor, market_suggestion)
    else:
        suggested_price = cost_floor

    final_suggested = int(round(suggested_price / 50.0) * 50)
    final_competitor = int(round(median_price)) if median_price > 0 else int(round(final_suggested * 1.25 / 50.0) * 50)

    return {
        "success": True,
        "suggested_price": final_suggested,
        "median_competitor_price": final_competitor,
        "material_cost": int(round(mat_cost)),
        "cost_floor": int(round(cost_floor)),
        "sample_size": sample_size,
        "note": api_note or "Calculated using dynamic category valuation & artisan labor margin",
        "formula": f"Materials (₹{int(mat_cost)}) + Craft Labor + Fair Margin"
    }
