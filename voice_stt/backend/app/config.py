"""
voice_stt/backend/app/config.py
--------------------------------
Centralised configuration via pydantic-settings.
All values can be overridden via environment variables or a .env file.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from .env or environment variables."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # -----------------------------------------------------------------
    # Device
    # -----------------------------------------------------------------
    # Options: "auto" | "cpu" | "cuda"
    DEVICE: str = "auto"

    # -----------------------------------------------------------------
    # STT Backend
    # -----------------------------------------------------------------
    # Options: "indic_whisper" | "indic_conformer"
    STT_BACKEND: str = "indic_whisper"

    # HuggingFace model ID for IndicWhisper
    # The multilingual AI4Bharat checkpoint supports 22 Indian languages
    # openai/whisper-large-v3 is a freely available multilingual model that
    # natively supports all Indian languages (Tamil, Telugu, Hindi, Kannada…).
    # For per-language AI4Bharat fine-tunes set in .env:
    #   vasista22/whisper-tamil-large-v2   (Tamil, best accuracy)
    #   vasista22/whisper-telugu-large-v2  (Telugu, best accuracy)
    #   vasista22/whisper-hindi-large-v2   (Hindi, best accuracy)
    #   vasista22/whisper-tamil-medium     (Tamil, faster on CPU)
    INDICWHISPER_MODEL_ID: str = "openai/whisper-large-v3"

    # -----------------------------------------------------------------
    # Cache
    # -----------------------------------------------------------------
    HF_CACHE_DIR: str = str(
        Path(__file__).resolve().parents[2] / ".cache" / "huggingface"
    )

    # -----------------------------------------------------------------
    # Server
    # -----------------------------------------------------------------
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    LOG_LEVEL: str = "INFO"


# Singleton instance used throughout the app
settings = Settings()

# Propagate HF_HOME so transformers respects our cache dir
os.environ.setdefault("HF_HOME", settings.HF_CACHE_DIR)
os.environ.setdefault("TRANSFORMERS_CACHE", settings.HF_CACHE_DIR)
