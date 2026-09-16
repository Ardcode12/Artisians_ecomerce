"""
Burned-in Subtitle (.ass) Builder for Vertical Reels
"""

import os
from pathlib import Path

FONT_FOR_LANG = {
    "ta-IN": "Noto Sans Tamil, Latha, Vijaya, Nirmala UI, Segoe UI, Arial",
    "hi-IN": "Noto Sans Devanagari, Mangal, Aparajita, Nirmala UI, Segoe UI, Arial",
    "mr-IN": "Noto Sans Devanagari, Mangal, Nirmala UI, Segoe UI, Arial",
    "te-IN": "Noto Sans Telugu, Gautami, Vani, Nirmala UI, Segoe UI, Arial",
    "kn-IN": "Noto Sans Kannada, Tunga, Nirmala UI, Segoe UI, Arial",
    "ml-IN": "Noto Sans Malayalam, Kartika, Nirmala UI, Segoe UI, Arial",
    "bn-IN": "Noto Sans Bengali, Vrinda, Shonar Bangla, Nirmala UI, Segoe UI, Arial",
    "gu-IN": "Noto Sans Gujarati, Shruti, Nirmala UI, Segoe UI, Arial",
    "pa-IN": "Noto Sans Gurmukhi, Raavi, Nirmala UI, Segoe UI, Arial",
    "od-IN": "Noto Sans Oriya, Kalinga, Nirmala UI, Segoe UI, Arial",
    "en-IN": "Segoe UI, Arial, Roboto, Helvetica",
}

ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Main,{font},68,&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,5,3,2,80,80,380,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""


def _ts(seconds: float) -> str:
    """Format seconds into ASS timestamp (H:MM:SS.cc)."""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def build_ass(segments: list, total_duration: float,
              language: str, out_path: str) -> str:
    """Evenly distribute caption lines across the reel duration."""
    font = FONT_FOR_LANG.get(language, "Segoe UI, Arial, sans-serif")
    count = max(len(segments), 1)
    per = total_duration / count

    lines = [ASS_HEADER.format(font=font)]
    for i, seg in enumerate(segments):
        start = i * per
        end = min((i + 1) * per, total_duration)
        text = str(seg).replace("\n", " ").strip()
        # Add 150ms fade in/out
        lines.append(
            f"Dialogue: 0,{_ts(start)},{_ts(end)},Main,,0,0,0,,{{\\fad(150,150)}}{text}"
        )

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return out_path
