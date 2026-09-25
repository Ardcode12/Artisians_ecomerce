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
    import os, subprocess, time, shutil, re as _re, threading as _threading
    _webhook_url = (os.getenv("WEBHOOK_BASE_URL") or "").strip().rstrip("/")

    def _probe_url(url: str) -> bool:
        try:
            import urllib.request
            urllib.request.urlopen(f"{url}/health", timeout=8)
            return True
        except Exception:
            return False

    _tunnel_proc = None
    if not _webhook_url or not _webhook_url.startswith("https://") or not _probe_url(_webhook_url):
        logger.warning(f"[TUNNEL] WEBHOOK_BASE_URL is missing or unreachable ({_webhook_url!r}). Starting cloudflared tunnel…")
        try:
            # Look for cloudflared binary across standard locations
            _cf_bin = shutil.which("cloudflared")
            if not _cf_bin or not os.path.exists(_cf_bin):
                for _cand in [
                    "/usr/local/bin/cloudflared",
                    "/tmp/cloudflared",
                    os.path.expanduser("~/.local/bin/cloudflared"),
                ]:
                    if os.path.exists(_cand) and os.access(_cand, os.X_OK):
                        _cf_bin = _cand
                        break

            if not _cf_bin:
                raise FileNotFoundError("cloudflared binary not found in PATH, /usr/local/bin, or /tmp")

            logger.info(f"[TUNNEL] Using cloudflared binary: {_cf_bin}")
            _cf_log = "/tmp/artisans_cf_tunnel.log"
            with open(_cf_log, "w") as _f:
                _tunnel_proc = subprocess.Popen(
                    [_cf_bin, "tunnel", "--url", "http://localhost:5000", "--no-autoupdate"],
                    stdout=_f, stderr=_f,
                    start_new_session=True,
                )
            # Wait up to 25s for the URL to appear in the log
            _cf_url = None
            for _ in range(25):
                time.sleep(1)
                try:
                    with open(_cf_log) as _f:
                        _content = _f.read()
                        _m = _re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", _content)
                        if _m:
                            _cf_url = _m.group(0).strip()
                            break
                except Exception:
                    pass
            if _cf_url:
                os.environ["WEBHOOK_BASE_URL"] = _cf_url
                logger.info(f"[TUNNEL] cloudflared tunnel ready → {_cf_url}")
                # Synchronize to backend/.env
                try:
                    _env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
                    if os.path.exists(_env_path):
                        with open(_env_path, "r") as _ef:
                            _env_txt = _ef.read()
                        if "WEBHOOK_BASE_URL=" in _env_txt:
                            _env_txt = _re.sub(r"WEBHOOK_BASE_URL=.*", f"WEBHOOK_BASE_URL={_cf_url}", _env_txt)
                        else:
                            _env_txt += f"\nWEBHOOK_BASE_URL={_cf_url}\n"
                        with open(_env_path, "w") as _ef:
                            _ef.write(_env_txt)
                except Exception as _env_err:
                    logger.warning(f"[TUNNEL] Could not update .env: {_env_err}")
            else:
                logger.error("[TUNNEL] Could not extract tunnel URL from cloudflared output")
        except Exception as _e:
            logger.warning(f"[TUNNEL] cloudflared failed ({_e}). Trying localhost.run SSH tunnel (port 22)…")
            try:
                # localhost.run SSH tunnel — works on any network (uses standard SSH port 22)
                _ssh_log = "/tmp/artisans_lhr_tunnel.log"
                _lhr_proc = subprocess.Popen(
                    [
                        "ssh",
                        "-o", "StrictHostKeyChecking=no",
                        "-o", "ServerAliveInterval=60",
                        "-o", "ExitOnForwardFailure=yes",
                        "-R", f"80:localhost:{os.getenv('PORT', '5000')}",
                        "nokey@localhost.run",
                    ],
                    stdout=open(_ssh_log, "w"), stderr=subprocess.STDOUT,
                    start_new_session=True,
                )
                _lhr_url = None
                for _ in range(20):
                    time.sleep(1)
                    try:
                        _content = open(_ssh_log).read()
                        _m = _re.search(r"https://[a-zA-Z0-9-]+\.lhr\.life", _content)
                        if _m:
                            _lhr_url = _m.group(0).strip()
                            break
                    except Exception:
                        pass
                if _lhr_url:
                    os.environ["WEBHOOK_BASE_URL"] = _lhr_url
                    logger.info(f"[TUNNEL] localhost.run SSH tunnel ready → {_lhr_url}")
                    try:
                        _env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
                        if os.path.exists(_env_path):
                            with open(_env_path, "r") as _ef:
                                _env_txt = _ef.read()
                            _env_txt = _re.sub(r"WEBHOOK_BASE_URL=.*", f"WEBHOOK_BASE_URL={_lhr_url}", _env_txt)
                            with open(_env_path, "w") as _ef:
                                _ef.write(_env_txt)
                    except Exception as _env_err:
                        logger.warning(f"[TUNNEL] Could not update .env: {_env_err}")
                else:
                    logger.warning("[TUNNEL] Could not extract localhost.run URL from SSH output")
            except Exception as _e2:
                logger.warning(f"[TUNNEL] localhost.run SSH tunnel also failed: {_e2} — Twilio callbacks may not work")
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
    fallback_basket = UPLOADS_DIR / "forecast_basket.jpg"
    if fallback_basket.exists():
        return FileResponse(str(fallback_basket))
    return RedirectResponse(
        url="https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=600&q=80",
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
