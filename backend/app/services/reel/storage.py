"""
Reel Video Cloud Storage Service
Uploads MP4 video to Cloudinary with fallback to local static serving.
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger("ReelStorage")


def upload_reel(local_path: str, job_id: str) -> str:
    """
    Upload the MP4 video to Cloudinary for a public HTTPS URL.
    Falls back to the local backend URL if Cloudinary is not configured.
    """
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if cloud_name and api_key and api_secret and cloud_name != "xxxxx":
        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
                secure=True,
            )

            logger.info(f"Uploading reel {job_id} to Cloudinary...")
            res = cloudinary.uploader.upload_large(
                str(local_path),
                resource_type="video",
                public_id=f"reels/{job_id}",
                overwrite=True,
                chunk_size=6_000_000,
            )
            secure_url = res.get("secure_url")
            if secure_url:
                logger.info(f"Reel uploaded to Cloudinary: {secure_url}")
                return secure_url
        except Exception as e:
            logger.warning(f"Cloudinary upload failed: {e}. Using local URL fallback.")

    # Local fallback URL
    public_base = os.getenv("PUBLIC_BASE_URL", "")
    port = os.getenv("PORT", "5000")
    host_ip = "10.45.69.254"

    if public_base and not public_base.startswith("https://your-domain"):
        base = public_base.rstrip("/")
    else:
        base = f"http://{host_ip}:{port}"

    local_url = f"{base}/media/reels/{job_id}/reel.mp4"
    logger.info(f"Using local static URL: {local_url}")
    return local_url
