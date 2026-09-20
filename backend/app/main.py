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

    # ── Auto-tunnel for Twilio webhooks ──────────────────────────────────────
    # On each startup, if WEBHOOK_BASE_URL is not set (or unreachable), we
    # spawn a cloudflared quick-tunnel so Twilio can POST to our webhook routes.
    import os, subprocess, time, re as _re, threading as _threading
    _webhook_url = (os.getenv("WEBHOOK_BASE_URL") or "").strip().rstrip("/")

    def _probe_url(url: str) -> bool:
        try:
            import urllib.request
            urllib.request.urlopen(f"{url}/health", timeout=8)
            return True
        except Exception:
            return False

    if not _webhook_url or not _webhook_url.startswith("https://") or not _probe_url(_webhook_url):
        logger.warning(f"[TUNNEL] WEBHOOK_BASE_URL is missing or unreachable ({_webhook_url!r}). Starting cloudflared tunnel…")
        try:
            _cf_log = "/tmp/artisans_cf_tunnel.log"
            with open(_cf_log, "w") as _f:
                _cf_proc = subprocess.Popen(
                    ["/tmp/cloudflared", "tunnel", "--url", "http://localhost:5000", "--no-autoupdate"],
                    stdout=_f, stderr=_f,
                    start_new_session=True,
                )
            # Wait up to 20s for the URL to appear in the log
            _cf_url = None
            for _ in range(20):
                time.sleep(1)
                try:
                    with open(_cf_log) as _f:
                        _m = _re.search(r"https://[^\s]+\.trycloudflare\.com", _f.read())
                        if _m:
                            _cf_url = _m.group(0).strip()
                            break
                except Exception:
                    pass
            if _cf_url:
                os.environ["WEBHOOK_BASE_URL"] = _cf_url
                logger.info(f"[TUNNEL] cloudflared tunnel ready → {_cf_url}")
            else:
                logger.error("[TUNNEL] Could not extract tunnel URL from cloudflared output")
        except Exception as _e:
            logger.warning(f"[TUNNEL] cloudflared not available: {_e}. Trying pyngrok…")
            try:
                from pyngrok import ngrok as _ngrok, conf as _ngrok_conf
                _ngrok_auth = os.getenv("NGROK_AUTHTOKEN", "").strip()
                if _ngrok_auth:
                    _ngrok_conf.get_default().auth_token = _ngrok_auth
                _tunnel = _ngrok.connect(int(os.getenv("PORT", 5000)), "http")
                _public_url = _tunnel.public_url.replace("http://", "https://")
                os.environ["WEBHOOK_BASE_URL"] = _public_url
                logger.info(f"[TUNNEL] pyngrok tunnel started → {_public_url}")
            except Exception as _e2:
                logger.warning(f"[TUNNEL] Could not start any tunnel: {_e2} — Twilio gather callbacks may not work")
    else:
        logger.info(f"[TUNNEL] Using existing WEBHOOK_BASE_URL: {_webhook_url}")
    # ─────────────────────────────────────────────────────────────────────────

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
