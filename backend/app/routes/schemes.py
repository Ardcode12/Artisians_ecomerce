"""
Government Schemes Search Route
Serves government artisan scheme information (PM Vishwakarma, ODOP, Crafts Council, etc.).
"""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/api/schemes", tags=["Schemes"])

GOVT_SCHEMES = [
    {
        "id": "pm-vishwakarma",
        "title": "PM Vishwakarma Scheme",
        "category": "Financial Support & Skill Training",
        "subsidy": "Up to ₹3,00,000 collateral-free loan at 5% interest + ₹15,000 toolkit digital incentive",
        "eligibility": "Artisans & craftspeople working with hands and tools in 18 traditional trades",
        "description": "Comprehensive central scheme providing PM Vishwakarma Certificate, ID card, basic & advanced skill training, toolkit incentive, and subsidized collateral-free credit."
    },
    {
        "id": "odop-scheme",
        "title": "One District One Product (ODOP)",
        "category": "Market Exposure & Export",
        "subsidy": "Brand building, packaging, international exhibition grants up to ₹5,00,000",
        "eligibility": "Registered indigenous craft producers & artisan cooperatives",
        "description": "Fosters balanced regional development across all districts of India by promoting unique local handicrafts, textiles, and traditional arts on global e-commerce channels."
    },
    {
        "id": "ahvy-scheme",
        "title": "Ambedkar Hastshilp Vikas Yojana (AHVY)",
        "category": "Cluster Development",
        "subsidy": "Infrastructure creation, design workshops, and bulk raw material bank subsidies",
        "eligibility": "Artisan Self Help Groups (SHGs) and handicrafts clusters",
        "description": "Mobilizes rural artisans into community cluster groups, supporting them with common facility centers, modern design toolkits, and direct buyer-seller meets."
    }
]


@router.get("/search")
def search_schemes(q: Optional[str] = Query(None)):
    """Search government artisan schemes by keyword."""
    if not q:
        return {"success": True, "schemes": GOVT_SCHEMES}
    
    q_lower = q.lower()
    matched = [
        s for s in GOVT_SCHEMES 
        if q_lower in s["title"].lower() or q_lower in s["description"].lower() or q_lower in s["category"].lower()
    ]
    return {
        "success": True,
        "schemes": matched
    }
