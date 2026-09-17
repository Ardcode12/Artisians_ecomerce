"""
voice_stt/backend/app/stt/audio.py
-------------------------------------
Audio preprocessing utilities.

Converts any supported audio file (WAV, MP3, M4A, FLAC, OGG, etc.)
to a 16 kHz mono float32 numpy array suitable for Whisper-based models.

Dependencies: soundfile, librosa, numpy, (optional) ffmpeg on PATH.
"""

import io
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Tuple

import numpy as np

logger = logging.getLogger(__name__)

# Target sample rate required by IndicWhisper (same as OpenAI Whisper)
TARGET_SAMPLE_RATE: int = 16_000

# Supported MIME types / extensions
SUPPORTED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm", ".opus"}


def _load_with_soundfile(data: bytes) -> Tuple[np.ndarray, int]:
    """Try loading audio bytes directly with soundfile."""
    import soundfile as sf

    buf = io.BytesIO(data)
    audio, sr = sf.read(buf, dtype="float32", always_2d=False)
    return audio, sr


def _load_with_ffmpeg(data: bytes, source_ext: str = ".wav") -> Tuple[np.ndarray, int]:
    """
    Fallback: decode any format to raw PCM via ffmpeg.
    Requires ffmpeg installed on the system PATH.
    """
    with tempfile.NamedTemporaryFile(suffix=source_ext, delete=False) as tmp_in:
        tmp_in.write(data)
        tmp_in_path = tmp_in.name

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_out:
        tmp_out_path = tmp_out.name

    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i", tmp_in_path,
                "-ar", str(TARGET_SAMPLE_RATE),
                "-ac", "1",
                "-f", "wav",
                tmp_out_path,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
        )
        import soundfile as sf

        audio, sr = sf.read(tmp_out_path, dtype="float32", always_2d=False)
        return audio, sr
    finally:
        Path(tmp_in_path).unlink(missing_ok=True)
        Path(tmp_out_path).unlink(missing_ok=True)


def preprocess_audio(
    data: bytes,
    filename: str = "audio.wav",
) -> Tuple[np.ndarray, float]:
    """
    Preprocess audio bytes into a 16 kHz mono float32 array.

    Parameters
    ----------
    data : bytes
        Raw audio file bytes from the upload.
    filename : str
        Original filename (used to detect extension for ffmpeg fallback).

    Returns
    -------
    audio_array : np.ndarray  (float32, 1-D)
        Normalised audio waveform at TARGET_SAMPLE_RATE.
    duration_seconds : float
        Duration of the audio clip.

    Raises
    ------
    ValueError
        If the audio is empty, corrupt, or in an unsupported format.
    """
    if not data:
        raise ValueError("Received empty audio data.")

    ext = Path(filename).suffix.lower()

    # ── Step 1: Load audio ──────────────────────────────────────────────
    audio: np.ndarray | None = None
    sr: int = 0

    try:
        audio, sr = _load_with_soundfile(data)
    except Exception as sf_err:
        logger.debug("soundfile failed (%s), trying ffmpeg fallback.", sf_err)
        try:
            audio, sr = _load_with_ffmpeg(data, source_ext=ext if ext else ".wav")
        except Exception as ffmpeg_err:
            raise ValueError(
                f"Cannot decode audio '{filename}'. "
                f"soundfile error: {sf_err} | ffmpeg error: {ffmpeg_err}"
            ) from ffmpeg_err

    if audio is None or len(audio) == 0:
        raise ValueError("Audio file appears to be empty or silent after decoding.")

    # ── Step 2: Convert to mono if stereo ──────────────────────────────
    if audio.ndim > 1:
        audio = audio.mean(axis=1)

    # ── Step 3: Resample to 16 kHz if needed ───────────────────────────
    if sr != TARGET_SAMPLE_RATE:
        import librosa

        audio = librosa.resample(audio, orig_sr=sr, target_sr=TARGET_SAMPLE_RATE)
        sr = TARGET_SAMPLE_RATE
        logger.debug("Resampled audio from %d Hz to %d Hz.", sr, TARGET_SAMPLE_RATE)

    # ── Step 4: Ensure float32 ─────────────────────────────────────────
    audio = audio.astype(np.float32)

    duration = len(audio) / TARGET_SAMPLE_RATE
    logger.debug(
        "Audio preprocessed: %.2f s, %d Hz, %d samples.", duration, sr, len(audio)
    )

    return audio, duration
