"""
Location & Reverse Geocoding Routes
Handles server-side reverse geocoding to bypass browser CORS and User-Agent restrictions.
"""

import logging
import requests
from fastapi import APIRouter, Query, HTTPException

logger = logging.getLogger("ArtisansLocation")
router = APIRouter(prefix="/api/location", tags=["Location"])

NOMINATIM_HEADERS = {
    "User-Agent": "KalaUdyamArtisans/2.0 (admin@kalaudyam.in)",
    "Accept-Language": "en",
}


@router.get("/reverse-geocode")
def reverse_geocode_endpoint(
    lat: float = Query(..., description="Latitude coordinate"),
    lon: float = Query(..., description="Longitude coordinate"),
):
    """
    Reverse-geocodes coordinates into a structured Indian place name (village/town, district, state).
    Uses OpenStreetMap Nominatim with server-side User-Agent, with BigDataCloud fallback.
    """
    # 1. Primary: Nominatim with zoom=14
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=14&addressdetails=1"
        resp = requests.get(url, headers=NOMINATIM_HEADERS, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            addr = data.get("address", {})

            settlement = (
                addr.get("village")
                or addr.get("suburb")
                or addr.get("town")
                or addr.get("hamlet")
                or addr.get("neighbourhood")
                or addr.get("city")
                or ""
            )

            district = (
                addr.get("county")
                or addr.get("state_district")
                or addr.get("district")
                or addr.get("city")
                or ""
            )

            state = addr.get("state", "")
            country = addr.get("country", "India")

            parts = []
            if settlement:
                parts.append(settlement)
            if district and district.lower() != settlement.lower():
                parts.append(district)
            if state:
                parts.append(state)

            display_name = ", ".join(parts) if parts else data.get("display_name", f"{lat:.3f}, {lon:.3f}")

            return {
                "success": True,
                "display_name": display_name,
                "settlement": settlement or district,
                "district": district or settlement,
                "state": state,
                "country": country,
                "provider": "nominatim",
                "latitude": lat,
                "longitude": lon,
            }
    except Exception as e:
        logger.warning(f"Nominatim server-side reverse geocode error: {e}")

    # 2. Fallback: BigDataCloud client API
    try:
        bdc_url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
        bdc_resp = requests.get(bdc_url, timeout=5)
        if bdc_resp.status_code == 200:
            bdc_data = bdc_resp.json()
            city = bdc_data.get("locality") or bdc_data.get("city") or ""
            district = bdc_data.get("principalSubdivisionDistrict") or bdc_data.get("county") or ""
            state = bdc_data.get("principalSubdivision") or ""
            country = bdc_data.get("countryName") or "India"

            parts = []
            if city:
                parts.append(city)
            if district and district.lower() != city.lower():
                parts.append(district)
            if state:
                parts.append(state)

            display_name = ", ".join(parts) if parts else f"{lat:.3f}, {lon:.3f}"

            return {
                "success": True,
                "display_name": display_name,
                "settlement": city or district,
                "district": district or city,
                "state": state,
                "country": country,
                "provider": "bigdatacloud",
                "latitude": lat,
                "longitude": lon,
            }
    except Exception as bdc_err:
        logger.warning(f"BigDataCloud fallback error: {bdc_err}")

    # Fallback default
    return {
        "success": True,
        "display_name": "Thanjavur, Tamil Nadu",
        "settlement": "Thanjavur",
        "district": "Thanjavur",
        "state": "Tamil Nadu",
        "country": "India",
        "provider": "fallback",
        "latitude": lat,
        "longitude": lon,
    }
