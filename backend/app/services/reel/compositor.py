"""
FFmpeg Video Compositor for 9:16 Vertical Instagram Reels
Handles Ken Burns motion, crossfades, burned-in captions, audio ducking,
and brand outro card with fallback rendering.
"""

import os
import subprocess
import logging
from pathlib import Path
from .voiceover import probe_duration, get_ffmpeg_binary
from app.config import REEL_ASSETS_DIR

logger = logging.getLogger("ReelCompositor")

W, H, FPS = 1080, 1920, 30


def _clean_path_for_ffmpeg_filter(path_str: str) -> str:
    """Format file path for FFmpeg filter complexes on Windows."""
    p = str(Path(path_str).resolve()).replace("\\", "/")
    if len(p) > 1 and p[1] == ":":
        p = p[0] + "\\:" + p[2:]
    return p


def build_reel(image_paths: list, voice_path: str, ass_path: str,
               style: str, out_path: str, outro_seconds: float = 2.5) -> float:
    """
    Compose an Instagram Reel (1080x1920 vertical MP4):
      - Ken Burns zoom motion
      - Crossfades between product photos
      - Brand outro card
      - Burned-in ASS captions
      - Voiceover mixed with background music
    Guarantees 15 to 20 seconds total reel length.
    """
    ffmpeg_exe = get_ffmpeg_binary()
    voice_dur = probe_duration(voice_path)
    # Ensure total reel length is between 15.0 and 20.0 seconds
    target_total = max(15.0, min(20.0, voice_dur + outro_seconds))

    valid_images = [str(Path(p).resolve()) for p in image_paths if os.path.exists(p)]
    if not valid_images:
        raise ValueError("No valid image files available for reel generation")

    images = valid_images[:5]
    n = len(images)

    assets_dir = Path(REEL_ASSETS_DIR)
    outro = str((assets_dir / "outro.png").resolve())
    music_map = {
        "heritage": str((assets_dir / "music" / "heritage.mp3").resolve()),
        "festive": str((assets_dir / "music" / "festive.mp3").resolve()),
        "minimal": str((assets_dir / "music" / "minimal.mp3").resolve()),
    }
    music = music_map.get(style, music_map["heritage"])
    has_music = os.path.exists(music)
    has_outro = os.path.exists(outro)

    # Calculate clip durations
    outro_dur = outro_seconds if has_outro else 0.0
    content_dur = target_total - outro_dur
    seg_dur = content_dur / n
    fade = min(0.4, seg_dur / 3.0)

    try:
        inputs = []
        filters = []
        labels = []
        clip_lengths = []

        # 1. Product Image inputs with Ken Burns
        for i, img in enumerate(images):
            dur = seg_dur + fade
            clip_lengths.append(dur)
            frames = int(dur * FPS)
            if i % 2 == 0:
                z = "min(zoom+0.0012,1.20)"
                x, y = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
            else:
                z = "if(lte(zoom,1.0),1.20,max(1.001,zoom-0.0012))"
                x, y = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"

            inputs += ["-loop", "1", "-t", f"{dur:.3f}", "-i", img]
            filters.append(
                f"[{i}:v]scale={W*2}:{H*2}:force_original_aspect_ratio=increase,"
                f"crop={W*2}:{H*2},"
                f"zoompan=z='{z}':d={frames}:x='{x}':y='{y}':s={W}x{H}:fps={FPS},"
                f"fps={FPS},settb=AVTB,setsar=1,format=yuv420p[v{i}]"
            )
            labels.append(f"[v{i}]")

        # 2. Outro Card input
        next_input_idx = n
        if has_outro:
            oi = next_input_idx
            next_input_idx += 1
            clip_lengths.append(outro_dur + fade)
            inputs += ["-loop", "1", "-t", f"{outro_dur + fade:.3f}", "-i", outro]
            filters.append(
                f"[{oi}:v]scale={W}:{H}:force_original_aspect_ratio=increase,"
                f"crop={W}:{H},fps={FPS},settb=AVTB,setsar=1,format=yuv420p[v_outro]"
            )
            labels.append("[v_outro]")

        # 3. Audio inputs: Voiceover + Music
        ai_voice = next_input_idx
        next_input_idx += 1
        inputs += ["-i", voice_path]

        if has_music:
            ai_music = next_input_idx
            next_input_idx += 1
            inputs += ["-stream_loop", "-1", "-i", music]

        # 4. Chain crossfades
        prev = labels[0]
        cur_offset = seg_dur
        for i in range(1, len(labels)):
            nxt = labels[i]
            out = f"[x{i}]"
            filters.append(
                f"{prev}{nxt}xfade=transition=fade:duration={fade:.3f}:offset={cur_offset:.3f}{out}"
            )
            cur_offset += (seg_dur if i < n else outro_dur)
            prev = out

        # 5. Burn captions (if ASS file exists)
        if os.path.exists(ass_path):
            ass_clean = _clean_path_for_ffmpeg_filter(ass_path)
            filters.append(f"{prev}ass='{ass_clean}'[vout]")
        else:
            filters.append(f"{prev}null[vout]")

        # 6. Audio mix
        audio_pad = max(0.5, target_total - voice_dur)
        if has_music:
            filters.append(
                f"[{ai_voice}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
                f"volume=1.0,apad=pad_dur={audio_pad:.3f}[a_voice];"
                f"[{ai_music}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
                f"volume=0.15,atrim=0:{target_total:.3f},afade=t=out:st={target_total-1.2:.3f}:d=1.2[a_music];"
                f"[a_voice][a_music]amix=inputs=2:duration=first:dropout_transition=0[aout]"
            )
        else:
            filters.append(
                f"[{ai_voice}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
                f"volume=1.0,apad=pad_dur={audio_pad:.3f}[aout]"
            )

        cmd = (
            [ffmpeg_exe, "-y"] + inputs +
            ["-filter_complex", ";".join(filters),
             "-map", "[vout]", "-map", "[aout]",
             "-c:v", "libx264", "-profile:v", "high", "-level", "4.0",
             "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
             "-r", str(FPS), "-g", str(FPS * 2),
             "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
             "-movflags", "+faststart",
             "-t", f"{target_total:.3f}",
             out_path]
        )

        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Running primary FFmpeg composition: total {target_total:.2f}s")
        proc = subprocess.run(cmd, capture_output=True, text=True)

        if proc.returncode == 0 and os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
            return probe_duration(out_path)
        else:
            logger.warning(f"Primary FFmpeg composition failed:\n{proc.stderr[-1200:]}")
            logger.info("Engaging resilient fallback composition...")

    except Exception as ex:
        logger.warning(f"Primary composition raised error ({ex}), falling back to resilient renderer.")

    return _build_resilient_reel(images, voice_path, out_path, target_total)


def _build_resilient_reel(images: list, voice_path: str, out_path: str, duration: float) -> float:
    """Bulletproof fallback renderer that guarantees a valid MP4 is created."""
    ffmpeg_exe = get_ffmpeg_binary()
    img = images[0]
    dur = max(duration, 15.0)

    filter_str = (
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
        f"zoompan=z='min(zoom+0.0008,1.15)':d={int(dur*FPS)}:s={W}x{H}:fps={FPS},"
        f"setsar=1,format=yuv420p[v];"
        f"[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1.0,apad=pad_dur=4.0[a]"
    )

    cmd = [
        ffmpeg_exe, "-y",
        "-loop", "1", "-t", f"{dur:.3f}", "-i", img,
        "-i", voice_path,
        "-filter_complex", filter_str,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "24", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
        "-movflags", "+faststart",
        "-t", f"{dur:.3f}",
        out_path
    ]

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        simple_cmd = [
            ffmpeg_exe, "-y",
            "-loop", "1", "-t", f"{dur:.3f}", "-i", img,
            "-i", voice_path,
            "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-shortest", out_path
        ]
        subprocess.run(simple_cmd, capture_output=True, check=True)

    return probe_duration(out_path)
