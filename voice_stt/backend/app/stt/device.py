"""
voice_stt/backend/app/stt/device.py
--------------------------------------
Automatic CPU/CUDA device detection and logging.
"""

import logging
from typing import Literal

import torch

logger = logging.getLogger(__name__)

DeviceType = Literal["cpu", "cuda"]


def resolve_device(requested: str = "auto") -> DeviceType:
    """
    Resolve the target PyTorch device.

    Parameters
    ----------
    requested : str
        "auto" | "cpu" | "cuda"

    Returns
    -------
    str
        "cuda" if CUDA is available AND requested or auto, else "cpu"
    """
    requested = requested.strip().lower()

    if requested == "cuda":
        if torch.cuda.is_available():
            return "cuda"
        else:
            logger.warning(
                "DEVICE=cuda requested but no CUDA-capable GPU found. "
                "Falling back to CPU."
            )
            return "cpu"

    if requested == "auto":
        if torch.cuda.is_available():
            logger.info("DEVICE=auto → CUDA GPU detected, using CUDA.")
            return "cuda"
        else:
            logger.info("DEVICE=auto → No CUDA GPU found, using CPU.")
            return "cpu"

    # Explicit "cpu"
    return "cpu"


def log_device_info(device: DeviceType) -> dict:
    """
    Log and return a dict with device/hardware information shown at startup.
    """
    info: dict = {"device": device}

    if device == "cuda":
        gpu_index = torch.cuda.current_device()
        gpu_name = torch.cuda.get_device_name(gpu_index)
        total_vram = torch.cuda.get_device_properties(gpu_index).total_memory
        vram_gb = round(total_vram / 1024**3, 2)
        info["gpu"] = gpu_name
        info["vram_gb"] = vram_gb
        logger.info("  GPU      : %s", gpu_name)
        logger.info("  VRAM     : %.2f GB", vram_gb)
    else:
        try:
            import psutil  # optional dependency
            ram_gb = round(psutil.virtual_memory().total / 1024**3, 2)
            info["ram_gb"] = ram_gb
            logger.info("  System RAM: %.2f GB", ram_gb)
        except ImportError:
            pass

    logger.info("  Device   : %s", device)
    return info
