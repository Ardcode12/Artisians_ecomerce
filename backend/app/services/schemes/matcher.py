"""
Rule-based matching engine for Artisan Welfare Schemes.
Scores and ranks schemes against the artisan's craft category, geographic state,
and business profile without needing heavy ML.
"""

import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("SchemeMatcher")


def get_matched_schemes(artisan_profile: Dict[str, Any], all_schemes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Matches schemes against the artisan's profile.
    Returns schemes sorted by match score, highest first.
    """
    if not all_schemes:
        return []

    artisan_profile = artisan_profile or {}
    craft = (
        artisan_profile.get("craft_type")
        or artisan_profile.get("craft_custom")
        or artisan_profile.get("category")
        or ""
    ).strip()
    craft_lower = craft.lower()
    
    location = (
        artisan_profile.get("location")
        or artisan_profile.get("state")
        or artisan_profile.get("city")
        or ""
    ).strip()
    location_lower = location.lower()

    scored = []
    for scheme in all_schemes:
        score = 0
        reasons = []

        # Parse eligible trades
        trades = scheme.get("eligible_trades_json") or []
        if isinstance(trades, str):
            try:
                trades = json.loads(trades)
            except Exception:
                trades = [t.strip() for t in trades.split(",") if t.strip()]

        # 1. Trade matching (high value for traditional craftspeople)
        if craft_lower and trades:
            # Check for exact or substring match in trade list
            matched_trade = next(
                (t for t in trades if t.lower() in craft_lower or craft_lower in t.lower()),
                None
            )
            if matched_trade:
                score += 4
                reasons.append(f"Covers your craft: {craft.title()}")
            elif any("artisan" in t.lower() or "handicraft" in t.lower() for t in trades):
                score += 2
                reasons.append("Open to all recognized handicraft artisans")

        # 2. State-level schemes
        scheme_level = scheme.get("level")
        scheme_state = (scheme.get("state") or "").strip()
        scheme_state_lower = scheme_state.lower()

        if scheme_level == "state":
            if scheme_state_lower in ("all states", "all", ""):
                score += 2
                reasons.append("Applicable across all Indian states via State MSME")
            elif location_lower and (scheme_state_lower in location_lower or location_lower in scheme_state_lower):
                score += 4
                reasons.append(f"Available in {scheme_state}")
            else:
                # If state doesn't match and it's a specific state, skip
                continue

        # 3. Central government schemes (nationwide eligibility)
        if scheme_level == "central":
            score += 1
            if not reasons:
                reasons.append("Central government nationwide flagship scheme")

        # 4. Check active loan flag if present
        if artisan_profile.get("has_active_govt_loan") and scheme.get("category") == "loans":
            score -= 1
            reasons.append("Check 5-year loan clearance guidelines")

        # Include default base score so all schemes remain accessible
        if score > 0:
            scored.append({**scheme, "match_score": score, "match_reasons": reasons})

    # Sort descending by match score
    return sorted(scored, key=lambda s: s.get("match_score", 0), reverse=True)
