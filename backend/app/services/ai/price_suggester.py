"""
Dynamic Pricing Assistant
Analyzes market trends, competitor listings on Google Shopping/Amazon, and raw material costs.
"""

import logging
import requests
import pandas as pd
from typing import Dict, Any, Optional
from app.config import SERPAPI_API_KEY

logger = logging.getLogger("PriceSuggester")


def suggest_price(
    product_title: str,
    craft_type: str = "Handicraft",
    material_cost: float = 0.0
) -> Dict[str, Any]:
    """Calculate fair selling price combining market competitor median and craft labor valuation."""
    title = (product_title or "").strip() or f"{craft_type or 'Handicraft'} handmade craft"
    mat_cost = float(material_cost) if material_cost is not None else 0.0

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

            resp = requests.get("https://serpapi.com/search", params=params, timeout=12)
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

            # Fallback to Amazon via SerpApi if shopping empty
            if not competitor_prices:
                params["engine"] = "amazon"
                params["k"] = search_query
                params.pop("q", None)
                resp_amz = requests.get("https://serpapi.com/search", params=params, timeout=12)
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
            logger.warning(f"SerpApi lookup note: {e}")
            api_note = "SerpApi connection failed — using cost-based fair margin"
    else:
        api_note = "Using craft-labor valuation & fair margin calculation"

    # Compute: max(material_cost * 1.6, competitor_median * 0.85)
    base_labor = 550.0 if any(k in craft_type.lower() for k in ["textile", "saree", "silk", "embroidery"]) else 350.0
    cost_floor = round(mat_cost * 1.6 + (base_labor * 0.5), 2) if mat_cost > 0 else base_labor

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
        "median_competitor_price": int(round(median_price)) if median_price > 0 else int(round(final_suggested * 1.2)),
        "material_cost": int(round(mat_cost)),
        "cost_floor": int(round(cost_floor)),
        "sample_size": sample_size,
        "note": api_note,
        "formula": f"Materials (₹{int(mat_cost)}) + Craft Labor + Fair Margin"
    }
