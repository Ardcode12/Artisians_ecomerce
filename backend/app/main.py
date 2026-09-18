"""
Main FastAPI Application Entrypoint
"""

import sys
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
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
    logger.info("Artisans backend initialized successfully.")
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

# Serve uploaded avatars and media statically with graceful fallback
@app.get("/uploads/{filename}")
def serve_upload(filename: str):
    file_path = UPLOADS_DIR / filename
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    return RedirectResponse(
        url="https://images.unsplash.com/photo-1605289355680-75fb41239154?w=600&q=80",
        status_code=302
    )

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
media_dir = BACKEND_DIR / "media"
media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

scheme_ui_dir = BACKEND_DIR / "scheme_ui"
scheme_ui_dir.mkdir(parents=True, exist_ok=True)

@app.get("/schemes", include_in_schema=False)
@app.get("/schemes/", include_in_schema=False)
def serve_scheme_ui():
    """Serves scheme discovery UI with strict anti-caching headers."""
    index_file = scheme_ui_dir / "index.html"
    return FileResponse(
        str(index_file),
        media_type="text/html",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        }
    )

app.mount("/schemes", StaticFiles(directory=str(scheme_ui_dir), html=True), name="schemes")

# Mount all modular routes
app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Artisans Marketplace & AI Backend"}



if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on port {PORT}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
