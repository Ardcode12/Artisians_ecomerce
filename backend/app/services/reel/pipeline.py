"""
Reel Generation & Auto-Publish Pipeline Orchestrator
Executes the multi-stage AI workflow:
Script -> Voiceover -> Subtitles -> Video Composition -> Storage Upload -> Instagram Publication
"""

import os
import shutil
import logging
import traceback
from pathlib import Path
import httpx

from .script_writer import write_script
from .voiceover import synthesize_with_fallback
from .subtitles import build_ass
from .compositor import build_reel
from .storage import upload_reel
from app.services.instagram_service import publish_reel
from app.models.instagram_account import get_linked_account
from app.models.reel_job import update_job
from app.config import REEL_OUTPUT_DIR, UPLOADS_DIR

logger = logging.getLogger("ReelPipeline")


def _resolve_image_to_local(img_ref: str, work_dir: Path, idx: int) -> str:
    """Ensure image reference is accessible as a local file path."""
    if not img_ref:
        return ""

    # Case 1: Already an existing local path
    p = Path(img_ref)
    if p.is_file() and p.exists():
        return str(p.resolve())

    # Case 2: Uploads path relative or URL
    if "/uploads/" in img_ref:
        filename = img_ref.split("/uploads/")[-1]
        local_upload = Path(UPLOADS_DIR) / filename
        if local_upload.exists():
            return str(local_upload.resolve())

    # Case 3: HTTP/HTTPS URL -> Download to work dir
    if img_ref.startswith("http://") or img_ref.startswith("https://"):
        try:
            target = work_dir / f"input_photo_{idx}.jpg"
            with httpx.Client(timeout=20) as client:
                r = client.get(img_ref)
                if r.status_code == 200:
                    target.write_bytes(r.content)
                    return str(target.resolve())
        except Exception as e:
            logger.warning(f"Could not download image from URL {img_ref}: {e}")

    return ""


def run_reel_pipeline(job_id: str, user_id: str, product: dict,
                      image_paths: list, language: str,
                      style: str, post_to_instagram: bool):
    """
    Main asynchronous pipeline for generating vertical Reels and auto-publishing to Instagram.
    """
    work = Path(REEL_OUTPUT_DIR) / job_id
    work.mkdir(parents=True, exist_ok=True)

    try:
        # Prepare valid local image paths
        local_images = []
        for i, img in enumerate(image_paths):
            loc = _resolve_image_to_local(img, work, i)
            if loc and os.path.exists(loc):
                local_images.append(loc)

        if not local_images:
            # Fallback placeholder if no product photos exist
            from PIL import Image, ImageDraw
            dummy_path = work / "dummy_craft.jpg"
            img = Image.new("RGB", (1080, 1080), color=(194, 65, 12))
            d = ImageDraw.Draw(img)
            d.text((540, 540), product.get("title", "Artisan Craft"), fill=(255, 255, 255), anchor="mm")
            img.save(dummy_path)
            local_images.append(str(dummy_path))

        # ── 1. SCRIPT GENERATION ──────────────────────────────────────────
        update_job(
            job_id,
            status="WRITING_SCRIPT",
            stage="Writing your ad script...",
            progress=12
        )
        logger.info(f"[{job_id}] Step 1: Generating ad script in {language} ({style})...")
        s = write_script(product, language=language, style=style)
        update_job(
            job_id,
            script_native=s.get("script_native"),
            script_english=s.get("script_english"),
            caption=s.get("caption"),
            hashtags=",".join(s.get("hashtags", []))
        )

        # ── 2. VOICEOVER SYNTHESIS ────────────────────────────────────────
        update_job(
            job_id,
            status="GENERATING_VOICE",
            stage="Recording the AI voiceover...",
            progress=32
        )
        logger.info(f"[{job_id}] Step 2: Synthesizing voiceover narration...")
        voice_wav = str(work / "voice.wav")
        voice_dur = synthesize_with_fallback(s["script_native"], language, voice_wav)

        # ── 3. SUBTITLES (.ASS) ───────────────────────────────────────────
        ass_path = str(work / "subs.ass")
        build_ass(s.get("segments", []), voice_dur, language, ass_path)

        # ── 4. VIDEO COMPOSITION ──────────────────────────────────────────
        update_job(
            job_id,
            status="RENDERING_VIDEO",
            stage="Editing your 9:16 vertical reel...",
            progress=58
        )
        logger.info(f"[{job_id}] Step 3: Rendering 1080x1920 MP4 reel via FFmpeg...")
        mp4_path = str(work / "reel.mp4")
        duration = build_reel(local_images, voice_wav, ass_path, style, mp4_path)
        update_job(job_id, local_path=mp4_path, duration_seconds=duration)

        # ── 5. CLOUD STORAGE UPLOAD ───────────────────────────────────────
        update_job(
            job_id,
            status="UPLOADING",
            stage="Uploading reel to cloud storage...",
            progress=76
        )
        logger.info(f"[{job_id}] Step 4: Uploading video to storage...")
        video_url = upload_reel(mp4_path, job_id)
        update_job(job_id, video_url=video_url)

        # ── 6. INSTAGRAM PUBLISH ──────────────────────────────────────────
        if not post_to_instagram:
            logger.info(f"[{job_id}] Reel ready without Instagram posting.")
            update_job(
                job_id,
                status="VIDEO_READY",
                stage="Reel ready for download",
                progress=100
            )
            return

        account = get_linked_account(user_id)
        if not account or not account.auto_post_enabled:
            logger.info(f"[{job_id}] Instagram not linked or auto-post disabled.")
            update_job(
                job_id,
                status="VIDEO_READY",
                stage="Reel ready — Instagram account not connected",
                progress=100
            )
            return

        update_job(
            job_id,
            status="PUBLISHING_INSTAGRAM",
            stage="Posting Reel to Instagram...",
            progress=88
        )
        logger.info(f"[{job_id}] Step 5: Publishing Reel to Instagram @{account.ig_username}...")
        full_caption = s["caption"] + "\n\n" + " ".join("#" + h for h in s.get("hashtags", []))

        try:
            pub_res = publish_reel(account, video_url, full_caption)
            update_job(
                job_id,
                status="COMPLETED",
                stage="Live on Instagram!",
                progress=100,
                ig_media_id=pub_res.get("media_id"),
                ig_creation_id=pub_res.get("creation_id"),
                ig_permalink=pub_res.get("permalink")
            )
            logger.info(f"[{job_id}] Reel posted successfully! Permalink: {pub_res.get('permalink')}")
        except Exception as ig_err:
            logger.error(f"[{job_id}] Instagram Meta API post failed: {ig_err}", exc_info=True)
            update_job(
                job_id,
                status="VIDEO_READY",
                stage=f"Reel saved, Instagram post failed: {str(ig_err)[:100]}",
                progress=100,
                error_message=str(ig_err)[:500]
            )

    except Exception as e:
        logger.error(f"[{job_id}] Reel pipeline error: {e}", exc_info=True)
        mp4_path = str(work / "reel.mp4")
        if os.path.exists(mp4_path) and os.path.getsize(mp4_path) > 10000:
            video_url = upload_reel(mp4_path, job_id)
            update_job(
                job_id,
                status="VIDEO_READY",
                video_url=video_url,
                stage="Reel ready, Instagram post failed",
                progress=100,
                error_message=str(e)[:500]
            )
        else:
            update_job(
                job_id,
                status="FAILED",
                stage="Could not create reel",
                progress=100,
                error_message=str(e)[:500]
            )
