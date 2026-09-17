"""
Application Configuration Module
Loads environment variables and sets system-wide paths and constants.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Base backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv()

# App paths
DATA_DIR = BACKEND_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
DB_PATH = DATA_DIR / "artisans.db"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Server settings
PORT = int(os.getenv("PORT") or os.getenv("FASTAPI_PORT") or 5000)
HOST = os.getenv("HOST", "0.0.0.0")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

# AI configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "qwen3:30b")
OLLAMA_USERNAME = os.getenv("OLLAMA_USERNAME", "")   # HTTP Basic Auth username for remote Ollama
OLLAMA_PASSWORD = os.getenv("OLLAMA_PASSWORD", "")   # HTTP Basic Auth password — never logged or exposed
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY", "")
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY") or os.getenv("AI_key") or os.getenv("AI_KEY") or ""
GEMINI_MODEL      = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview")
SERPAPI_API_KEY   = os.getenv("SERPAPI_API_KEY", "")

# Remote Whisper STT — NVIDIA A100, Whisper Large V3, faster-whisper, CUDA float16
# Credentials are loaded from .env; the password is NEVER logged or hardcoded.
WHISPER_BASE_URL = os.getenv("WHISPER_BASE_URL", "").rstrip("/")
WHISPER_USERNAME = os.getenv("WHISPER_USERNAME", "")
WHISPER_PASSWORD = os.getenv("WHISPER_PASSWORD", "")   # secret — never logged
WHISPER_MODEL    = os.getenv("WHISPER_MODEL", "whisper-large-v3")

# Sarvam TTS
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_TTS_MODEL = os.getenv("SARVAM_TTS_MODEL", "bulbul:v2")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

# Cloudinary
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")

# Instagram Meta Graph
IG_APP_ID = os.getenv("IG_APP_ID", "")
IG_APP_SECRET = os.getenv("IG_APP_SECRET", "")
IG_REDIRECT_URI = os.getenv("IG_REDIRECT_URI", "")
IG_GRAPH_BASE = os.getenv("IG_GRAPH_BASE", "https://graph.instagram.com")

# App & Public URLs
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")

# Reel Output & Asset Directories
REEL_OUTPUT_DIR = Path(os.getenv("REEL_OUTPUT_DIR", str(BACKEND_DIR / "media" / "reels")))
REEL_ASSETS_DIR = Path(os.getenv("REEL_ASSETS_DIR", str(BACKEND_DIR / "assets" / "reel")))

REEL_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
REEL_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
