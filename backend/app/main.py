"""
Main FastAPI Application Entrypoint
"""

import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import UPLOADS_DIR, PORT, BACKEND_DIR
from app.db.schema import init_db
from app.routes.router import api_router

# Ensure UTF-8 output on Windows consoles to prevent UnicodeEncodeError with ₹, etc.
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ArtisansApp")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("Initializing Artisans On-Device SQLite Database...")
    init_db()
    # Speech-to-text is handled by the remote NVIDIA A100 Whisper Large V3 server;
    # no local model loading or pre-warming is required.
    logger.info("Artisans backend initialized successfully. Remote Whisper STT enabled.")
    yield
    logger.info("Shutting down Artisans backend.")


app = FastAPI(
    title="Artisans Marketplace & AI Backend",
    description="Unified, modular Python FastAPI backend with local on-device SQLite database and AI cataloging pipelines",
    version="2.0.0",
    lifespan=lifespan
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc), "detail": str(exc)}
    )

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded avatars and media statically
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
media_dir = BACKEND_DIR / "media"
media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

# Mount all modular routes
app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Artisans Marketplace & AI Backend"}


INDEX_HTML_PATH = BACKEND_DIR.parent / "index.html"

@app.get("/")
@app.get("/call-test")
def serve_call_test():
    if INDEX_HTML_PATH.exists():
        return FileResponse(str(INDEX_HTML_PATH), media_type="text/html")
    return {"status": "ok", "message": "Artisans Call Test Hub"}



if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on port {PORT}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
