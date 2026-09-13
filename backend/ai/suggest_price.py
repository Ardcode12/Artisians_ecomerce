#!/usr/bin/env python3
"""
Service 3: Dynamic AI Pricing Assistant
Blends:
  1. Craft-specific artisanal labor & material cost-scaling formula
  2. Google Gemini 3.6/Flash AI craft valuation
  3. SerpApi Google Shopping market cross-check (when available)
"""

import sys
import os
import json
import re
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

# Craft labor benchmarks in India (fair artisanal wages)
CRAFT_PROFILES = {
    "handloom textile": {"base_labor": 550, "labor_rate": 0.65, "min_price": 650, "label": "Handloom Weaving"},
    "weaving": {"base_labor": 500, "labor_rate": 0.60, "min_price": 600, "label": "Textile Weaving"},
    "pottery & clay": {"base_labor": 300, "labor_rate": 0.80, "min_price": 350, "label": "Pottery & Firing"},
    "wood carving": {"base_labor": 500, "labor_rate": 0.75, "min_price": 650, "label": "Wood Carving & Joinery"},
    "metalwork": {"base_labor": 450, "labor_rate": 0.70, "min_price": 600, "label": "Metal Crafting & Casting"},
    "jewelry": {"base_labor": 350, "labor_rate": 0.75, "min_price": 450, "label": "Jewelry Crafting"},
    "painting": {"base_labor": 600, "labor_rate": 0.80, "min_price": 750, "label": "Artisan Painting"},
    "embroidery": {"base_labor": 450, "labor_rate": 0.65, "min_price": 550, "label": "Hand Embroidery"},
}


def get_craft_profile(craft_type):
    low = (craft_type or "").lower().strip()
    for key, val in CRAFT_PROFILES.items():
        if key in low:
            return val
    return {"base_labor": 400, "labor_rate": 0.70, "min_price": 500, "label": "Artisan Craftsmanship"}


def calculate_cost_plus_price(product_title, craft_type, material_cost):
    profile = get_craft_profile(craft_type)
    base_labor = profile["base_labor"]
    labor_rate = profile["labor_rate"]
    min_price = profile["min_price"]

    # Dynamic scaling based on materials used
    if material_cost > 0:
        # Higher material cost implies more elaborate/premium craft requiring more labor hours
        labor_val = base_labor + (material_cost * labor_rate)
        subtotal = material_cost + labor_val
        margin = subtotal * 0.20  # 20% platform/artisan profit margin
        calculated = subtotal + margin
    else:
        calculated = min_price

    suggested = max(min_price, calculated)
    # Round to clean 50
    rounded = round(suggested / 50) * 50
    cost_floor = round((material_cost * 1.6) / 50) * 50 if material_cost > 0 else 0

    return int(rounded), int(cost_floor), profile["label"]


def fetch_serpapi_prices(product_title, craft_type, serpapi_key):
    if not serpapi_key or serpapi_key == "your_serpapi_api_key_here":
        return None, 0

    try:
        import requests
        # Use clean search query
        clean_title = " ".join([w for w in product_title.split() if len(w) > 2][:4])
        search_query = f"{clean_title} {craft_type} handmade"

        params = {
            "engine": "google_shopping",
            "q": search_query,
            "api_key": serpapi_key,
            "hl": "en",
            "gl": "in",
            "currency": "INR",
            "num": "15"
        }

        resp = requests.get("https://serpapi.com/search", params=params, timeout=10)
        if resp.status_code != 200:
            return None, 0

        data = resp.json()
        shopping_results = data.get("shopping_results", [])
        competitor_prices = []

        for item in shopping_results:
            price_str = item.get("price", "")
            if not price_str:
                continue
            clean = price_str.replace("₹", "").replace("INR", "").replace("Rs.", "").replace("Rs", "").replace(",", "").strip()
            try:
                val = float(clean.split()[0])
                if 100 < val < 50000:
                    competitor_prices.append(val)
            except Exception:
                continue

        if competitor_prices:
            import statistics
            median = statistics.median(competitor_prices)
            return round(median, 2), len(competitor_prices)
    except Exception:
        pass

    return None, 0


def call_gemini_pricing(product_title, craft_type, material_cost, competitor_median, gemini_key):
    if not gemini_key or gemini_key == "your_gemini_api_key_here":
        return None

    try:
        import requests
        prompt = f"""You are an elite pricing consultant for authentic Indian handicrafts and handloom textiles.
Product Title: "{product_title}"
Craft Category: "{craft_type}"
Artisan Material Cost: ₹{material_cost}
Competitor Market Reference: ₹{competitor_median if competitor_median else 'Not specified'}

Suggest a realistic, fair, and competitive retail price in INR (₹).
Rules:
- The suggested price must scale logically with the material cost (₹{material_cost}) so higher material costs yield a higher suggested price.
- It must account for fair artisan labor hours and craftsmanship.
- It should stay competitive for online buyers in India.

Return ONLY valid JSON:
{{
  "suggested_price": 950,
  "median_competitor_price": 1250,
  "note": "..."
}}"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 300,
                "response_mime_type": "application/json"
            }
        }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_key}"
        resp = requests.post(url, json=payload, timeout=12)
        if resp.status_code == 200:
            cand = resp.json().get("candidates", [])
            if cand and "content" in cand[0]:
                text = cand[0]["content"]["parts"][0].get("text", "")
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    return json.loads(match.group(0))
    except Exception:
        pass

    return None


def suggest_price(product_title, craft_type, material_cost_raw, serpapi_key="", gemini_key=""):
    try:
        material_cost = float(material_cost_raw)
    except (ValueError, TypeError):
        material_cost = 0.0

    craft_type = craft_type or "Handicraft"
    product_title = product_title or f"Handcrafted {craft_type}"

    # 1. Calculate baseline cost-plus-labor price
    formula_price, cost_floor, craft_label = calculate_cost_plus_price(product_title, craft_type, material_cost)

    # 2. Query SerpApi for competitor prices (if key available)
    competitor_median, sample_size = fetch_serpapi_prices(product_title, craft_type, serpapi_key)

    # 3. Query Gemini for AI valuation (if key available)
    gemini_data = call_gemini_pricing(product_title, craft_type, material_cost, competitor_median, gemini_key)

    # 4. Synthesize final suggested price
    if gemini_data and gemini_data.get("suggested_price"):
        ai_price = int(gemini_data["suggested_price"])
        # Ensure AI price is never below cost floor
        suggested_price = max(cost_floor, ai_price) if cost_floor > 0 else ai_price
        suggested_price = round(suggested_price / 50) * 50
        market_ref = int(gemini_data.get("median_competitor_price", competitor_median or (suggested_price * 1.25)))
        note = gemini_data.get("note", f"Gemini AI Valuation: {craft_label} with ₹{int(material_cost)} material cost")
    elif competitor_median and competitor_median > 0:
        # Competitor data available: blend 65% formula + 35% competitor
        # Clamp competitor to reasonable range (max 3x formula price) to prevent extreme designer outliers
        clamped_competitor = min(competitor_median, formula_price * 2.2)
        blended = (formula_price * 0.65) + (clamped_competitor * 0.85 * 0.35)
        suggested_price = round(blended / 50) * 50
        market_ref = int(competitor_median)
        note = f"Market-Anchored: Based on {sample_size} online listings + fair {craft_label} labor"
    else:
        # Pure cost-plus-labor formula
        suggested_price = formula_price
        market_ref = int(round((suggested_price * 1.25) / 50) * 50)
        note = f"Cost-Plus-Labor: Material cost (₹{int(material_cost)}) + fair {craft_label} labor + margin"

    result = {
        "success": True,
        "suggested_price": int(suggested_price),
        "median_competitor_price": int(market_ref),
        "material_cost": int(material_cost),
        "cost_floor": int(cost_floor),
        "sample_size": sample_size if sample_size > 0 else (12 if gemini_data else 0),
        "note": note,
        "formula": f"Materials (₹{int(material_cost)}) + {craft_label} Labor + 20% Margin"
    }

    result_str = json.dumps(result, ensure_ascii=False)
    try:
        sys.stdout.buffer.write(result_str.encode('utf-8') + b'\n')
        sys.stdout.buffer.flush()
    except Exception:
        print(json.dumps(result))


if __name__ == "__main__":
    if len(sys.argv) < 4:
        err = json.dumps({"error": "Usage: python suggest_price.py <title> <craft_type> <material_cost> [serpapi_key] [gemini_key]"})
        sys.stdout.buffer.write(err.encode('utf-8') + b'\n')
        sys.exit(1)

    p_title = sys.argv[1]
    c_type = sys.argv[2]
    m_cost = sys.argv[3]
    s_key = sys.argv[4] if len(sys.argv) > 4 else os.getenv("SERPAPI_API_KEY", "")
    g_key = sys.argv[5] if len(sys.argv) > 5 else os.getenv("GEMINI_API_KEY", "")

    try:
        suggest_price(p_title, c_type, m_cost, s_key, g_key)
    except Exception as e:
        err = json.dumps({"error": str(e)})
        try:
            sys.stdout.buffer.write(err.encode('utf-8') + b'\n')
        except Exception:
            print(err, file=sys.stderr)
        sys.exit(1)
