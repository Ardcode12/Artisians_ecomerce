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

# AI API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY", "")

# Voice Order Confirmation Settings
ENABLE_VOICE_CONFIRMATION = os.getenv("ENABLE_VOICE_CONFIRMATION", "true").lower() == "true"
TELEPHONY_PROVIDER = os.getenv("TELEPHONY_PROVIDER", "twilio").lower() # twilio | mock
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
WEBHOOK_BASE_URL = os.getenv("WEBHOOK_BASE_URL", f"http://localhost:{PORT}").rstrip("/")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "artisans_voice_webhook_secret_key")

