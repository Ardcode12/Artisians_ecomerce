#!/usr/bin/env python3
"""
Service 1: AI Photo Studio — Production Version
Pipeline:
  1. Lighting + Color Correction on ORIGINAL photo (Auto White Balance + CLAHE)
  2. AI Product Segmentation (rembg with 'isnet-general-use' and alpha_matting=True)
  3. Bounding box cropping
  4. Smart Centering & Padding (12% breathing room, 2% downward bias)
  5. Natural Ground Shadow (soft blurred ellipse anchored under product base)
  6. Real-ESRGAN super-resolution sharpening/denoising/upscale to 1000x1000px
  7. High-quality 1000x1000 JPEG output
"""

import sys
import os
import json
import traceback

# Force UTF-8 on Windows console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def enhance_image(input_path, output_path):
    from studio_pipeline import build_studio_photo

    try:
        build_studio_photo(input_path, output_path)
        result = {
            "success": True,
            "output_path": output_path,
            "size": "1000x1000",
            "model": "isnet-general-use + RealESRGAN_x4plus",
            "shadow": True,
            "white_balance": True,
            "clahe": True
        }
        result_str = json.dumps(result, ensure_ascii=False)
        try:
            sys.stdout.buffer.write(result_str.encode("utf-8") + b"\n")
            sys.stdout.buffer.flush()
        except Exception:
            print(result_str)
    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python enhance_image.py <input_path> <output_path>"}), file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(json.dumps({"error": f"Input file not found: {input_path}"}), file=sys.stderr)
        sys.exit(1)

    enhance_image(input_path, output_path)
