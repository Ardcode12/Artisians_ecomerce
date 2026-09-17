"""
voice_stt/backend/app/stt/indic_whisper.py
--------------------------------------------
AI4Bharat IndicWhisper STT backend.

Model: ai4bharat/indicwhisper  (HuggingFace)
Architecture: OpenAI Whisper fine-tuned on 22 Indian languages
License: MIT (as of the official AI4Bharat release)

Supported languages include (BCP-47 codes):
  ta (Tamil), te (Telugu), hi (Hindi), kn (Kannada),
  ml (Malayalam), mr (Marathi), gu (Gujarati), bn (Bengali),
  pa (Punjabi), or (Odia), as (Assamese), ur (Urdu), and more.

Reference:
  https://github.com/AI4Bharat/IndicWhisper
  https://huggingface.co/ai4bharat/indicwhisper
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import torch

from .base import BaseSTTModel

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Language mapping:  BCP-47 code  →  IndicWhisper language token
# Whisper uses full language names or ISO codes internally.
# ──────────────────────────────────────────────────────────────────────────────
LANGUAGE_MAP: dict[str, str] = {
    "ta": "tamil",
    "te": "telugu",
    "hi": "hindi",
    "kn": "kannada",
    "ml": "malayalam",
    "mr": "marathi",
    "gu": "gujarati",
    "bn": "bengali",
    "pa": "punjabi",
    "or": "odia",
    "as": "assamese",
    "ur": "urdu",
    "sa": "sanskrit",
    "mai": "maithili",
    "kok": "konkani",
    "ne": "nepali",
    "sd": "sindhi",
    "ks": "kashmiri",
    "mni": "manipuri",
    "doi": "dogri",
    "sat": "santali",
    "brx": "bodo",
}


class IndicWhisperSTT(BaseSTTModel):
    """
    STT backend using AI4Bharat's IndicWhisper checkpoint.

    The model is a fine-tuned Whisper that natively produces transcripts
    in the original spoken Indian language without translating to English.

    This class uses HuggingFace `transformers.pipeline` with
    `automatic-speech-recognition` which handles:
      - Feature extraction
      - Encoder-decoder generation
      - Timestamps (if requested)
    """

    def __init__(self, model_id: str, device: str, cache_dir: Optional[str] = None):
        """
        Load the IndicWhisper model into memory.

        Parameters
        ----------
        model_id : str
            HuggingFace model repository, e.g. "ai4bharat/indicwhisper"
        device : str
            "cpu" or "cuda"
        cache_dir : str | None
            Local directory to cache downloaded weights.
        """
        self._model_id = model_id
        self._device = device
        self._cache_dir = cache_dir

        logger.info("=" * 60)
        logger.info("  Loading AI4Bharat IndicWhisper")
        logger.info("  Model : %s", model_id)
        logger.info("  Device: %s", device)
        logger.info("  Cache : %s", cache_dir or "HuggingFace default")
        logger.info("=" * 60)

        try:
            self._pipeline = self._build_pipeline()
            logger.info("✓ IndicWhisper model loaded successfully.")
        except Exception as exc:
            logger.error("✗ Failed to load IndicWhisper model: %s", exc)
            raise RuntimeError(
                f"Could not load IndicWhisper model '{model_id}'. "
                f"Check your internet connection (first run) or cache. "
                f"Error: {exc}"
            ) from exc

    # ──────────────────────────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────────────────────────

    def _build_pipeline(self):
        """Build a HuggingFace ASR pipeline for IndicWhisper."""
        from transformers import pipeline

        # torch_dtype: float16 on CUDA for speed/memory, float32 on CPU
        torch_dtype = torch.float16 if self._device == "cuda" else torch.float32

        pipe = pipeline(
            task="automatic-speech-recognition",
            model=self._model_id,
            torch_dtype=torch_dtype,
            device=self._device,
            model_kwargs={"cache_dir": self._cache_dir} if self._cache_dir else {},
        )
        return pipe

    # ──────────────────────────────────────────────────────────────────
    # BaseSTTModel interface
    # ──────────────────────────────────────────────────────────────────

    @torch.inference_mode()
    def transcribe(self, audio: np.ndarray, language: Optional[str] = None) -> str:
        """
        Transcribe a 16 kHz mono float32 audio array.

        Parameters
        ----------
        audio : np.ndarray
            Float32 waveform at 16 kHz.
        language : str | None
            BCP-47 language code ("ta", "te", "hi", etc.).
            If None, the model performs automatic language detection.

        Returns
        -------
        str
            Transcript in the original spoken language (not translated).
        """
        # Build generate_kwargs for language forcing
        generate_kwargs: dict = {
            "task": "transcribe",  # "transcribe" keeps original language; "translate" → English
        }

        if language:
            whisper_lang = LANGUAGE_MAP.get(language.lower())
            if whisper_lang:
                generate_kwargs["language"] = whisper_lang
            else:
                logger.warning(
                    "Language code '%s' not found in LANGUAGE_MAP. "
                    "Proceeding with auto-detection.",
                    language,
                )

        result = self._pipeline(
            audio,
            generate_kwargs=generate_kwargs,
            return_timestamps=False,
        )

        text: str = result.get("text", "").strip()  # type: ignore[index]
        return text

    @property
    def supported_languages(self) -> list[str]:
        return list(LANGUAGE_MAP.keys())

    @property
    def device(self) -> str:
        return self._device

    @property
    def model_id(self) -> str:
        return self._model_id
