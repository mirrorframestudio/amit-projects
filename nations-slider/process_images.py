#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Process nations slider images:
1. Remove Gemini sparkle logo (bottom right corner)
2. Add white bar at bottom (France style)
3. Write team name in France-style navy blue bold font
"""

import os, sys, requests
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from bidi.algorithm import get_display

sys.stdout.reconfigure(encoding='utf-8')

IMAGES_DIR  = r"C:\Users\amith\ads-dashboard\nations-slider\images"
OUTPUT_DIR  = r"C:\Users\amith\ads-dashboard\nations-slider\processed"
FONT_PATH   = r"C:\Users\amith\ads-dashboard\nations-slider\Rubik-Black.ttf"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# All text in white
TEAM_COLORS = {
    "ארגנטינה": (255, 255, 255),
    "ברזיל":    (255, 255, 255),
    "גרמניה":   (255, 255, 255),
    "הולנד":    (255, 255, 255),
    "ספרד":     (255, 255, 255),
    "פורטוגל":  (255, 255, 255),
    "צרפת":     (255, 255, 255),
    "אנגליה":   (255, 255, 255),
}

TEAMS = list(TEAM_COLORS.keys())

# Teams that need to be resized/cropped to 2048×2048 (no existing text to remove)
NEEDS_RESIZE = {"אנגליה"}

# Text sits at bottom 22% of image (inpaint + redraw zone)
TEXT_ZONE_RATIO = 0.30    # cover more of image to catch tall original text

# ── Download Rubik-Black ────────────────────────────────────────────────────
def get_font():
    if os.path.exists(FONT_PATH):
        return FONT_PATH
    print("Downloading Rubik-Black font...")
    url = "https://fonts.gstatic.com/s/rubik/v31/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-ro-1UA.ttf"
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        with open(FONT_PATH, "wb") as f:
            f.write(r.content)
        print("  Font downloaded OK")
        return FONT_PATH
    except Exception as e:
        print(f"  Font download failed ({e}), using system Arial Bold")
        return r"C:\Windows\Fonts\arialbd.ttf"

# ── Remove Gemini sparkle ───────────────────────────────────────────────────
def remove_gemini(arr):
    """Paint over the ~80x80px sparkle in the bottom-right corner."""
    h, w = arr.shape[:2]
    # sparkle region (right ~4%, bottom ~4%)
    x1 = int(w * 0.955)
    y1 = int(h * 0.955)
    # sample colour from a patch just to the left and above
    sx0, sx1 = x1 - 80, x1 - 10
    sy0, sy1 = y1 - 80, y1 - 10
    sample = arr[sy0:sy1, sx0:sx1, :3].mean(axis=(0,1)).astype(np.uint8)
    arr[y1:, x1:, :3] = sample
    arr[y1:, x1:, 3]  = 255  # full alpha
    return arr

# ── Main processing ─────────────────────────────────────────────────────────
def process(name, font_path):
    src = os.path.join(IMAGES_DIR, f"{name}.jpg.png")
    if not os.path.exists(src):
        print(f"  SKIP (not found): {name}")
        return

    img = Image.open(src).convert("RGBA")

    # Resize to 2048×2048 if needed (crop center to square first, then resize)
    if name in NEEDS_RESIZE:
        ow, oh = img.size
        side = min(ow, oh)
        left = (ow - side) // 2
        top  = (oh - side) // 2
        img  = img.crop((left, top, left + side, top + side))
        img  = img.resize((2048, 2048), Image.LANCZOS)

    w, h = img.size
    arr = np.array(img)

    # 1. Remove Gemini logo (skip for clean images)
    if name not in NEEDS_RESIZE:
        arr = remove_gemini(arr)

    img = Image.fromarray(arr, "RGBA").convert("RGB")

    # For clean images (no existing text), skip straight to backing + text
    if name in NEEDS_RESIZE:
        arr_rgb = np.array(img, dtype=np.float32)
        zone_top = int(h * (1 - TEXT_ZONE_RATIO))
        zone_h   = h - zone_top
        cover_top    = int(h * 0.72)
        cover_bottom = h
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ov_draw = ImageDraw.Draw(overlay)
        ov_draw.rectangle([0, cover_top + 60, w, cover_bottom], fill=(0, 0, 0, 230))
        overlay = overlay.filter(ImageFilter.GaussianBlur(radius=30))
        img = img.convert("RGBA")
        img = Image.alpha_composite(img, overlay).convert("RGB")
        draw        = ImageDraw.Draw(img)
        font_size   = int(h * 0.13)
        font        = ImageFont.truetype(font_path, font_size)
        visual_text = get_display(name)
        bbox        = draw.textbbox((0, 0), visual_text, font=font)
        txt_w, txt_h = bbox[2]-bbox[0], bbox[3]-bbox[1]
        x = (w - txt_w) // 2 - bbox[0]
        y = int(h * 0.87) - txt_h // 2 - bbox[1]
        draw.text((x, y), visual_text, font=font, fill=TEAM_COLORS[name])
        img.save(os.path.join(OUTPUT_DIR, f"{name}.png"), "PNG")
        print(f"  ✓ {name}")
        return

    # 2. Erase existing text: for each pixel in the text zone that matches the
    #    team's original color (±tolerance), replace it with the pixel sampled
    #    from the same column 80px ABOVE the text zone (background continuation).
    zone_top   = int(h * (1 - TEXT_ZONE_RATIO))
    zone_h     = h - zone_top
    arr_rgb    = np.array(img, dtype=np.float32)
    tc         = np.array(TEAM_COLORS[name], dtype=np.float32)
    tolerance  = 130  # color distance threshold — wider to catch anti-aliased edges

    zone       = arr_rgb[zone_top:]                              # view of text region
    dist       = np.sqrt(((zone - tc) ** 2).sum(axis=2))        # per-pixel color distance
    text_mask  = dist < tolerance                                # True = text pixel

    # For each masked pixel, copy from (zone_top - 80) same column
    source_row_offset = max(0, zone_top - 80)
    ys, xs = np.where(text_mask)
    for y_local, x in zip(ys, xs):
        arr_rgb[zone_top + y_local, x] = arr_rgb[source_row_offset, x]

    # Smooth the repaired zone with a light blur to hide hard edges
    img       = Image.fromarray(arr_rgb.astype(np.uint8))
    zone_box  = (0, zone_top, w, h)
    zone_crop = img.crop(zone_box)
    smoothed  = zone_crop.filter(ImageFilter.GaussianBlur(radius=6))
    img.paste(smoothed, zone_box)

    # 3. Draw team name in Rubik-Black with original color
    color     = TEAM_COLORS[name]
    font_size = int(h * 0.13)
    font      = ImageFont.truetype(font_path, font_size)

    draw        = ImageDraw.Draw(img)
    visual_text = get_display(name)
    bbox        = draw.textbbox((0, 0), visual_text, font=font)
    txt_w       = bbox[2] - bbox[0]
    txt_h       = bbox[3] - bbox[1]

    # Position text at 87% from top — matches original text placement in all images
    text_center_y = int(h * 0.87)
    x = (w - txt_w) // 2 - bbox[0]
    y = text_center_y - txt_h // 2 - bbox[1]

    # Full-width dark backing that covers the entire original text zone (75%–97%)
    # This guarantees the old text is hidden regardless of exact position
    cover_top    = int(h * 0.72)
    cover_bottom = h

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    ov_draw.rectangle([0, cover_top + 60, w, cover_bottom], fill=(0, 0, 0, 230))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=30))
    img = img.convert("RGBA")
    img = Image.alpha_composite(img, overlay).convert("RGB")

    draw = ImageDraw.Draw(img)
    draw.text((x, y), visual_text, font=font, fill=color)

    # Save
    out = os.path.join(OUTPUT_DIR, f"{name}.png")
    img.save(out, "PNG")
    print(f"  ✓ {name}")

def main():
    font_path = get_font()
    print(f"\nProcessing {len(TEAMS)} images...")
    for t in TEAMS:
        process(t, font_path)
    print(f"\nDone! Files in: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
