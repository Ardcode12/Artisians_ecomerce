#!/usr/bin/env python3
"""
AI Photo Studio Pipeline — Production Studio-Quality Version.
Pipeline:
  1. Image loading with truncated image tolerance and EXIF orientation fix
  2. Lighting + Color Correction on ORIGINAL photo (Auto White Balance + CLAHE)
  3. AI Product Segmentation (rembg with 'isnet-general-use' or 'u2net')
  4. Bounding box cropping
  5. Smart Centering & Padding (12% breathing room, slight downward bias)
  6. Natural Ground Shadow (soft blurred ellipse anchored under product base)
  7. High-quality Studio Sharpening & detail enhancement (1000x1000 output)
"""

import os
import sys
from pathlib import Path
import numpy as np
import cv2
from PIL import Image, ImageFilter, ImageDraw, ImageOps, ImageFile

# Ensure truncated, partial, or progressive JPEGs load without error
ImageFile.LOAD_TRUNCATED_IMAGES = True

CANVAS_SIZE = 1000
STUDIO_BG = (250, 250, 250)
PADDING_RATIO = 0.12

# Lazy global session caching for fast inference
_session = None
_upsampler = None

WEIGHTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "RealESRGAN_x4plus.pth")


def get_rembg_session():
    global _session
    if _session is None:
        try:
            from rembg import new_session
            # isnet-general-use gives clean, professional edges on artisan textures
            _session = new_session("isnet-general-use")
        except Exception:
            try:
                from rembg import new_session
                _session = new_session("u2net")
            except Exception:
                _session = None
    return _session


def get_esrgan_upsampler():
    global _upsampler
    if _upsampler is None:
        try:
            import torch
            # Only instantiate RealESRGAN if CUDA GPU is present to avoid CPU freeze
            if not torch.cuda.is_available():
                return None

            from realesrgan import RealESRGANer
            from basicsr.archs.rrdbnet_arch import RRDBNet

            device = torch.device("cuda")
            model = RRDBNet(
                num_in_ch=3,
                num_out_ch=3,
                num_feat=64,
                num_block=23,
                num_grow_ch=32,
                scale=4
            )
            model_path = WEIGHTS_PATH if os.path.exists(WEIGHTS_PATH) else "RealESRGAN_x4plus.pth"
            _upsampler = RealESRGANer(
                scale=4,
                model_path=model_path,
                model=model,
                tile=256,
                tile_pad=10,
                pre_pad=0,
                half=False,
                device=device
            )
        except Exception as e:
            print(f"[Studio Pipeline] Real-ESRGAN init note: {e}", file=sys.stderr)
            _upsampler = None
    return _upsampler


def auto_white_balance(img):
    """Gray-world auto white balance to correct indoor lighting/color casts."""
    result = img.copy().astype(np.float32)
    avg_b, avg_g, avg_r = [np.mean(result[:, :, i]) for i in range(3)]
    avg_gray = (avg_b + avg_g + avg_r) / 3.0
    if avg_b > 0:
        result[:, :, 0] *= (avg_gray / avg_b)
    if avg_g > 0:
        result[:, :, 1] *= (avg_gray / avg_g)
    if avg_r > 0:
        result[:, :, 2] *= (avg_gray / avg_r)
    return np.clip(result, 0, 255).astype(np.uint8)


def auto_contrast_clahe(img):
    """CLAHE contrast correction on LAB color space L-channel."""
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.8, tileGridSize=(8, 8))
    lab_enhanced = cv2.merge((clahe.apply(l), a, b))
    return cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)


def segment_product(input_pil):
    """
    Remove background with tuned thresholds for crisp studio edges on fabrics,
    wood grain, pottery, and crafts.
    """
    from rembg import remove

    session = get_rembg_session()
    try:
        return remove(
            input_pil,
            session=session,
            alpha_matting=True,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=8,
        )
    except Exception:
        # Fallback to standard remove if alpha_matting memory limits are hit
        return remove(input_pil, session=session)


def find_bbox(rgba_pil, threshold=15):
    """Find exact pixel bounding box using the alpha channel."""
    alpha = np.array(rgba_pil)[:, :, 3]
    ys, xs = np.where(alpha > threshold)
    if len(xs) == 0 or len(ys) == 0:
        return 0, 0, rgba_pil.width, rgba_pil.height
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def create_soft_shadow(canvas_size, bbox):
    """Creates a natural studio ground shadow anchored under the product base."""
    x0, y0, x1, y1 = bbox
    shadow_layer = Image.new("L", (canvas_size, canvas_size), 0)
    draw = ImageDraw.Draw(shadow_layer)
    prod_w = x1 - x0
    ellipse_w = int(prod_w * 0.75)
    ellipse_h = int(ellipse_w * 0.16)
    cx = (x0 + x1) // 2
    cy = y1 - int(prod_w * 0.02)
    draw.ellipse(
        [cx - ellipse_w // 2, cy - ellipse_h // 2, cx + ellipse_w // 2, cy + ellipse_h // 2],
        fill=90
    )
    return shadow_layer.filter(ImageFilter.GaussianBlur(radius=18))


def studio_sharpen(pil_img):
    """
    High-quality studio sharpening and detail restoration.
    Uses Real-ESRGAN if GPU is available, or fast unsharp mask on CPU.
    """
    upsampler = get_esrgan_upsampler()
    if upsampler is not None:
        try:
            output, _ = upsampler.enhance(np.array(pil_img), outscale=1)
            return Image.fromarray(output).resize((CANVAS_SIZE, CANVAS_SIZE), Image.LANCZOS)
        except Exception as e:
            print(f"[Studio Pipeline] Real-ESRGAN enhance note: {e}", file=sys.stderr)

    # Fast high-precision studio unsharp mask + detail enhancement
    cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    gaussian = cv2.GaussianBlur(cv_img, (0, 0), 1.8)
    sharpened = cv2.addWeighted(cv_img, 1.28, gaussian, -0.28, 0)
    resized = cv2.resize(sharpened, (CANVAS_SIZE, CANVAS_SIZE), interpolation=cv2.INTER_LANCZOS4)
    return Image.fromarray(cv2.cvtColor(resized, cv2.COLOR_BGR2RGB))


def build_studio_photo(input_path, output_path):
    """
    Executes the complete studio photography pipeline.
    """
    # 1. Load image safely with orientation fix
    with Image.open(input_path) as raw_img:
        raw_img.load()
        original = ImageOps.exif_transpose(raw_img).convert("RGB")

    # 2. Lighting correction on the ORIGINAL photo, before cutting anything out
    cv_img = cv2.cvtColor(np.array(original), cv2.COLOR_RGB2BGR)
    cv_img = auto_white_balance(cv_img)
    cv_img = auto_contrast_clahe(cv_img)
    corrected = Image.fromarray(cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB))

    # 3. AI segmentation with isnet-general-use / u2net
    cutout = segment_product(corrected)
    x0, y0, x1, y1 = find_bbox(cutout)
    product = cutout.crop((x0, y0, x1, y1))

    # 4. Smart centering & padding (12% breathing room)
    target_size = int(CANVAS_SIZE * (1 - PADDING_RATIO * 2))
    product.thumbnail((target_size, target_size), Image.LANCZOS)

    canvas = Image.new("RGB", (CANVAS_SIZE, CANVAS_SIZE), STUDIO_BG)
    px = (CANVAS_SIZE - product.width) // 2
    # 2% downward bias so product sits naturally on the ground plane
    py = (CANVAS_SIZE - product.height) // 2 + int(CANVAS_SIZE * 0.02)

    # 5. Natural ground shadow, drawn before the product so it sits underneath
    shadow = create_soft_shadow(CANVAS_SIZE, (px, py, px + product.width, py + product.height))
    canvas.paste((225, 225, 225), (0, 0, CANVAS_SIZE, CANVAS_SIZE), shadow)
    canvas.paste(product, (px, py), product)

    # 6. Final AI detail & studio sharpening
    canvas = studio_sharpen(canvas)

    # 7. Save studio photo
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    canvas.save(output_path, "JPEG", quality=95)
    return output_path
