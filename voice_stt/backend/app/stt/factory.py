"""
voice_stt/backend/app/stt/factory.py
---------------------------------------
Singleton factory that creates and holds the STT model instance.
Called once during FastAPI lifespan startup.
"""

from __future__ import annotations

import logging
from typing import Optional

from ..config import settings
from .base import BaseSTTModel
from .device import log_device_info, resolve_device

logger = logging.getLogger(__name__)

# Global singleton – populated at startup, never re-created per request
_stt_model: Optional[BaseSTTModel] = None
_device_info: dict = {}


def get_model() -> BaseSTTModel:
    """
    Return the loaded STT model singleton.
    Raises RuntimeError if called before startup has completed.
    """
    if _stt_model is None:
        raise RuntimeError(
            "STT model has not been loaded yet. "
            "Ensure the FastAPI lifespan startup hook has run."
        )
    return _stt_model


def get_device_info() -> dict:
    """Return hardware info dict (populated at startup)."""
    return _device_info


def load_model() -> None:
    """
    Load the configured STT backend into memory.
    Must be called exactly ONCE during server startup.
    """
    global _stt_model, _device_info  # noqa: PLW0603

    device = resolve_device(settings.DEVICE)
    _device_info = log_device_info(device)

    backend = settings.STT_BACKEND.lower()

    logger.info("Loading STT backend: %s", backend)

    if backend == "indic_whisper":
        from .indic_whisper import IndicWhisperSTT

        _stt_model = IndicWhisperSTT(
            model_id=settings.INDICWHISPER_MODEL_ID,
            device=device,
            cache_dir=settings.HF_CACHE_DIR,
        )
    elif backend == "indic_conformer":
        # Future: implement IndicConformerSTT and register here
        raise NotImplementedError(
            "IndicConformer backend is not yet implemented. "
            "Set STT_BACKEND=indic_whisper in .env."
        )
    else:
        raise ValueError(f"Unknown STT_BACKEND: '{backend}'. Use 'indic_whisper'.")

    logger.info(
        "✓ STT model ready | backend=%s | device=%s | languages=%s",
        backend,
        device,
        ", ".join(_stt_model.supported_languages[:6]) + "…",
    )


def unload_model() -> None:
    """Release the model from memory (called on shutdown)."""
    global _stt_model  # noqa: PLW0603
    if _stt_model is not None:
        import torch

        del _stt_model
        _stt_model = None
        if hasattr(torch.cuda, "empty_cache"):
            torch.cuda.empty_cache()
        logger.info("STT model unloaded.")
