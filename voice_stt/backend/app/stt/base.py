"""
voice_stt/backend/app/stt/base.py
------------------------------------
Abstract base class for all STT backends.
New backends (e.g. IndicConformer) must subclass this and implement
the `transcribe` method.
"""

from abc import ABC, abstractmethod


class BaseSTTModel(ABC):
    """
    Abstract STT backend interface.

    Implementors MUST:
      - Load the model in __init__ (called once at server startup).
      - Implement transcribe() to return the transcript string.
    """

    @abstractmethod
    def transcribe(self, audio: "np.ndarray", language: str | None = None) -> str:  # noqa: F821
        """
        Transcribe a preprocessed audio array.

        Parameters
        ----------
        audio : np.ndarray (float32, 1-D, 16 kHz)
            Preprocessed waveform.
        language : str | None
            BCP-47 / ISO-639-1 language code (e.g. "ta", "te", "hi").
            If None, the model should auto-detect.

        Returns
        -------
        str
            Transcript in the original spoken language script.
        """
        ...

    @property
    @abstractmethod
    def supported_languages(self) -> list[str]:
        """Return list of supported language codes, e.g. ["ta", "te", "hi"]."""
        ...

    @property
    @abstractmethod
    def device(self) -> str:
        """Return the device the model is loaded on: "cpu" or "cuda"."""
        ...

    @property
    @abstractmethod
    def model_id(self) -> str:
        """Return the model identifier / checkpoint name."""
        ...
