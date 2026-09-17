"""
Master API Router
Aggregates all modular route modules into a single router.
"""

from fastapi import APIRouter
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.profiles import router as profiles_router
from app.routes.buyers import router as buyers_router
from app.routes.products import router as products_router
from app.routes.artisans import router as artisans_router
from app.routes.inquiries import router as inquiries_router
from app.routes.orders import router as orders_router
from app.routes.ai import router as ai_router
from app.routes.webhooks import router as webhooks_router
from app.routes.websocket import router as websocket_router
from app.routes.analytics import router as analytics_router
from app.routes.schemes import router as schemes_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(profiles_router)
api_router.include_router(buyers_router)
api_router.include_router(products_router)
api_router.include_router(artisans_router)
api_router.include_router(inquiries_router)
api_router.include_router(orders_router)
api_router.include_router(ai_router)
api_router.include_router(webhooks_router)
api_router.include_router(websocket_router)
api_router.include_router(analytics_router)
api_router.include_router(schemes_router)
