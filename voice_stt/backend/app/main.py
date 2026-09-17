"""
voice_stt/backend/app/main.py
--------------------------------
FastAPI application entry point.

Key responsibilities:
  1. Load the STT model ONCE during lifespan startup.
  2. Register API routers.
  3. Provide startup banner with model/device information.
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .stt import get_device_info, load_model, unload_model

# ──────────────────────────────────────────────────────────────────────────────
# Logging configuration
# ──────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Lifespan: model loaded ONCE at startup, released at shutdown
# ──────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager – replaces deprecated @app.on_event."""
    logger.info("=" * 60)
    logger.info("  AI4Bharat Voice-to-Text Service (SIH 2026)")
    logger.info("  Backend  : %s", settings.STT_BACKEND)
    logger.info("  Device   : %s (requested)", settings.DEVICE)
    logger.info("=" * 60)

    # ── STARTUP ──────────────────────────────────────────────────────────
    try:
        load_model()
    except Exception as exc:
        logger.critical("FATAL: Could not load STT model: %s", exc)
        # Allow the server to start so /health returns a useful error
        # rather than crashing silently
        app.state.model_error = str(exc)
    else:
        app.state.model_error = None
        info = get_device_info()
        logger.info("─" * 60)
        logger.info("  ✓ Server ready  –  http://%s:%s", settings.HOST, settings.PORT)
        logger.info("  Device  : %s", info.get("device"))
        if "gpu" in info:
            logger.info("  GPU     : %s", info["gpu"])
            logger.info("  VRAM    : %.2f GB", info["vram_gb"])
        logger.info("─" * 60)

    yield  # ← server is running and accepting requests

    # ── SHUTDOWN ─────────────────────────────────────────────────────────
    logger.info("Shutting down – releasing STT model …")
    unload_model()


# ──────────────────────────────────────────────────────────────────────────────
# App instance
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI4Bharat Voice-to-Text API",
    description=(
        "Self-hosted, offline Speech-to-Text API for Indian regional languages "
        "using AI4Bharat IndicWhisper. Produces transcripts in the original "
        "spoken language (Tamil, Telugu, Hindi, …)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (open for development; restrict in production) ────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from .api.routes import router as stt_router  # noqa: E402

app.include_router(stt_router)


# ── Root endpoint ─────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse(
        {
            "service": "AI4Bharat Voice-to-Text API",
            "version": "1.0.0",
            "docs": "/docs",
            "health": "/api/stt/health",
            "transcribe": "POST /api/stt/transcribe",
        }
    )


# ──────────────────────────────────────────────────────────────────────────────
# CLI entrypoint: python -m app.main
# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level=settings.LOG_LEVEL.lower(),
    )
