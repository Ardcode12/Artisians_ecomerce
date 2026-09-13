"""
Featured Artisans Route
"""

from fastapi import APIRouter
from app.db.database import get_db

router = APIRouter(prefix="/api/artisans", tags=["Artisans"])

CURATED_MAKERS = [
    {
        "id": "maker-meera",
        "name": "Meera Bai",
        "shop_name": "Meera Handlooms",
        "craft_type": "Kutch Textile & Bandhani",
        "location": "Bhuj, Gujarat",
        "bio": "4th generation weaver specializing in natural indigo dyed silk & organic cotton.",
        "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80",
        "is_verified": True,
    },
    {
        "id": "maker-ramesh",
        "name": "Ramesh Kumar",
        "shop_name": "Mitti Kala Studio",
        "craft_type": "Terracotta & Blue Pottery",
        "location": "Jaipur, Rajasthan",
        "bio": "National award winner bringing heritage terracotta tableware into modern homes.",
        "avatar_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80",
        "is_verified": True,
    },
    {
        "id": "maker-lakshmi",
        "name": "Lakshmi Devi",
        "shop_name": "Thanjavur Arts",
        "craft_type": "Tanjore Painting & Brass",
        "location": "Thanjavur, Tamil Nadu",
        "bio": "Master artisan creating 22K gold foil heritage paintings and brass artifacts.",
        "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80",
        "is_verified": True,
    },
    {
        "id": "maker-suresh",
        "name": "Suresh Gowda",
        "shop_name": "Channapatna Wooden Toys",
        "craft_type": "Wood Carving & Toys",
        "location": "Channapatna, Karnataka",
        "bio": "GI-tagged non-toxic lacquer wooden toys supporting local artisan clusters.",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80",
        "is_verified": True,
    },
]


@router.get("")
def list_artisans_endpoint():
    """Returns directory of active registered artisans combined with curated master makers."""
    artisans = []
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM profiles WHERE role = 'artisan' AND (name IS NOT NULL OR craft_type IS NOT NULL) LIMIT 50
        """)
        rows = cursor.fetchall()
        for r in rows:
            p = dict(r)
            artisans.append({
                "id": p.get("id"),
                "name": p.get("name") or "Master Artisan",
                "shop_name": p.get("shop_name") or f"{p.get('name', 'Artisan')}'s Studio",
                "craft_type": p.get("craft_type") or "Handloom & Art",
                "location": p.get("location") or "India",
                "bio": p.get("bio") or "Preserving centuries-old cultural craftsmanship.",
                "avatar_url": p.get("avatar_url") or "",
                "is_verified": True,
            })

    # Merge curated makers if not already present
    registered_names = {a["name"].lower() for a in artisans if a.get("name")}
    final_artisans = list(artisans)
    for maker in CURATED_MAKERS:
        if maker["name"].lower() not in registered_names:
            final_artisans.append(maker)

    return {
        "success": True,
        "artisans": final_artisans
    }
