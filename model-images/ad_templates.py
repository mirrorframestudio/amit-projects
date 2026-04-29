"""
Marketing text-overlay templates for Meta Ads.
Each template respects Meta/Instagram safe zones (defined in generate_meta_ads.SAFE_ZONES).

All template functions take:
  image_bytes (the generated ad photo)
  aspect ('1:1' | '4:5' | '9:16' | '16:9')
  fields (dict of headline/subline/price/cta — template-dependent)
And return: jpeg bytes.

Hebrew text is rendered via python-bidi for proper RTL visual order.
"""

import io
from pathlib import Path

# ── Hebrew + font helpers ──────────────────────────────────────────────────────

_FONT_DIR = Path(__file__).resolve().parent.parent / "nations-slider"
_RUBIK_BLACK = _FONT_DIR / "Rubik-Black.ttf"
_WIN_FONTS = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/Arial.ttf",
]


def load_font(size: int, bold: bool = True):
    from PIL import ImageFont
    candidates = []
    if _RUBIK_BLACK.exists():
        candidates.append(str(_RUBIK_BLACK))
    candidates.extend(_WIN_FONTS)
    for fp in candidates:
        try:
            return ImageFont.truetype(fp, size)
        except Exception:
            continue
    return ImageFont.load_default()


def to_display(text: str) -> str:
    if not text:
        return ""
    try:
        from bidi.algorithm import get_display
        return get_display(text)
    except ImportError:
        return text


def _measure(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def _open(image_bytes: bytes):
    from PIL import Image
    return Image.open(io.BytesIO(image_bytes)).convert("RGBA")


def _save(img):
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=92, optimize=True)
    return buf.getvalue()


# ── Safe zones (mirror of generate_meta_ads.SAFE_ZONES) ────────────────────────
SAFE_ZONES = {
    "1:1":  (0.05, 0.05, 0.05, 0.05),
    "4:5":  (0.06, 0.05, 0.06, 0.05),
    "9:16": (0.14, 0.05, 0.21, 0.05),
    "16:9": (0.05, 0.05, 0.06, 0.05),
}


def safe_box(aspect, w, h):
    t, r, b, l = SAFE_ZONES.get(aspect, SAFE_ZONES["1:1"])
    return (int(w * l), int(h * t), int(w * (1 - r)), int(h * (1 - b)))


# ═════════════════════════════════════════════════════════════════════════════
# TEMPLATES
# Each takes (image_bytes, aspect, fields) and returns jpeg bytes.
# Fields dict can include: headline, subline, price, cta
# ═════════════════════════════════════════════════════════════════════════════

# ── Template 1: Bottom Premium Strip ──────────────────────────────────────────
def t1_bottom_strip(image_bytes: bytes, aspect: str, fields: dict) -> bytes:
    """Dark gradient strip in the bottom safe zone with headline, subline, price."""
    from PIL import Image, ImageDraw
    img = _open(image_bytes)
    w, h = img.size
    sx1, sy1, sx2, sy2 = safe_box(aspect, w, h)

    headline = fields.get("headline", "").strip()
    subline  = fields.get("subline", "").strip()
    price    = fields.get("price", "").strip()

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Strip height ~22% of safe height, anchored to bottom of safe zone
    strip_h = int((sy2 - sy1) * 0.22)
    strip_top = sy2 - strip_h
    # Gradient: transparent → solid black
    for i in range(strip_h):
        alpha = int(220 * (i / strip_h) ** 0.7)
        draw.rectangle([(0, strip_top + i), (w, strip_top + i + 1)], fill=(0, 0, 0, alpha))

    # Solid bottom band for text
    band_top = strip_top + int(strip_h * 0.45)
    draw.rectangle([(0, band_top), (w, sy2)], fill=(0, 0, 0, 230))

    # Yellow accent line above the band
    draw.rectangle([(sx1, band_top - 3), (sx2, band_top)], fill=(255, 210, 0, 255))

    # Text rendering
    txt_y = band_top + int(strip_h * 0.08)
    f_head = load_font(int(h * 0.045))
    f_sub  = load_font(int(h * 0.025))
    f_price = load_font(int(h * 0.06))

    if headline:
        vis = to_display(headline)
        tw, th = _measure(draw, vis, f_head)
        draw.text(((w - tw) // 2, txt_y), vis, font=f_head, fill=(255, 255, 255, 255))
        txt_y += th + 6
    if subline:
        vis = to_display(subline)
        tw, th = _measure(draw, vis, f_sub)
        draw.text(((w - tw) // 2, txt_y), vis, font=f_sub, fill=(220, 220, 220, 255))
        txt_y += th + 6
    if price:
        vis = to_display(price)
        tw, th = _measure(draw, vis, f_price)
        draw.text(((w - tw) // 2, txt_y), vis, font=f_price, fill=(255, 210, 0, 255))

    return _save(Image.alpha_composite(img, overlay))


# ── Template 2: Diagonal Sale Tag (top-left corner) ───────────────────────────
def t2_diagonal_tag(image_bytes: bytes, aspect: str, fields: dict) -> bytes:
    """Rotated red sale tag in the top-left corner (within safe zone)."""
    from PIL import Image, ImageDraw
    img = _open(image_bytes)
    w, h = img.size
    sx1, sy1, sx2, sy2 = safe_box(aspect, w, h)

    headline = fields.get("headline", "מבצע!").strip()
    price    = fields.get("price", "").strip()

    # Build the tag on a separate layer so we can rotate
    tag_w = int((sx2 - sx1) * 0.34)
    tag_h = int(tag_w * 0.55)
    tag = Image.new("RGBA", (tag_w, tag_h), (0, 0, 0, 0))
    td = ImageDraw.Draw(tag)
    # Red rectangle with yellow border
    td.rectangle([(0, 0), (tag_w, tag_h)], fill=(220, 30, 40, 240))
    td.rectangle([(0, 0), (tag_w, tag_h)], outline=(255, 230, 100, 255), width=4)

    f_head = load_font(int(tag_h * 0.32))
    f_price = load_font(int(tag_h * 0.46))
    if headline:
        vis = to_display(headline)
        tw, th = _measure(td, vis, f_head)
        td.text(((tag_w - tw) // 2, int(tag_h * 0.10)), vis, font=f_head, fill=(255, 255, 255, 255))
    if price:
        vis = to_display(price)
        tw, th = _measure(td, vis, f_price)
        td.text(((tag_w - tw) // 2, int(tag_h * 0.45)), vis, font=f_price, fill=(255, 230, 100, 255))

    rotated = tag.rotate(-12, expand=True, resample=Image.BICUBIC)
    pos = (sx1 + int((sx2 - sx1) * 0.02), sy1 + int((sy2 - sy1) * 0.02))
    img.paste(rotated, pos, rotated)
    return _save(img)


# ── Template 3: Top Diagonal Banner ───────────────────────────────────────────
def t3_top_banner(image_bytes: bytes, aspect: str, fields: dict) -> bytes:
    """Diagonal yellow banner across the top of the safe zone."""
    from PIL import Image, ImageDraw
    img = _open(image_bytes)
    w, h = img.size
    sx1, sy1, sx2, sy2 = safe_box(aspect, w, h)

    headline = fields.get("headline", "חדש!").strip()

    band_h = int((sy2 - sy1) * 0.10)
    band_w = int((sx2 - sx1) * 1.3)  # extra width for diagonal
    band = Image.new("RGBA", (band_w, band_h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    bd.rectangle([(0, 0), (band_w, band_h)], fill=(255, 210, 0, 240))
    bd.rectangle([(0, 0), (band_w, 4)], fill=(0, 0, 0, 255))
    bd.rectangle([(0, band_h - 4), (band_w, band_h)], fill=(0, 0, 0, 255))

    f = load_font(int(band_h * 0.6))
    vis = to_display(headline)
    tw, th = _measure(bd, vis, f)
    bd.text(((band_w - tw) // 2, (band_h - th) // 2 - 4), vis, font=f, fill=(20, 20, 20, 255))

    rotated = band.rotate(-6, expand=True, resample=Image.BICUBIC)
    pos = (sx1 - int(band_w * 0.10), sy1 + int(band_h * 0.4))
    img.paste(rotated, pos, rotated)
    return _save(img)


# ── Template 4: Bold Yellow CTA Bar (bottom) ──────────────────────────────────
def t4_cta_bar(image_bytes: bytes, aspect: str, fields: dict) -> bytes:
    """Solid bold yellow CTA bar at the bottom of the safe zone."""
    from PIL import Image, ImageDraw
    img = _open(image_bytes)
    w, h = img.size
    sx1, sy1, sx2, sy2 = safe_box(aspect, w, h)

    cta      = fields.get("cta", "הזמן עכשיו ›").strip()
    headline = fields.get("headline", "").strip()
    price    = fields.get("price", "").strip()

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    bar_h = int((sy2 - sy1) * 0.18)
    bar_top = sy2 - bar_h

    # Optional headline above the bar (small)
    if headline:
        f_head = load_font(int(h * 0.038))
        # Soft dark backdrop for headline
        head_h = int(h * 0.07)
        for i in range(head_h):
            alpha = int(160 * (i / head_h))
            draw.rectangle([(0, bar_top - head_h + i), (w, bar_top - head_h + i + 1)], fill=(0, 0, 0, alpha))
        vis = to_display(headline)
        tw, th = _measure(draw, vis, f_head)
        draw.text(((w - tw) // 2, bar_top - head_h // 2 - th // 2), vis, font=f_head, fill=(255, 255, 255, 255))

    # Bright yellow bar
    draw.rectangle([(0, bar_top), (w, sy2)], fill=(255, 210, 0, 255))
    # Black border lines top + bottom
    draw.rectangle([(0, bar_top), (w, bar_top + 4)], fill=(20, 20, 20, 255))
    draw.rectangle([(0, sy2 - 4), (w, sy2)], fill=(20, 20, 20, 255))

    # CTA + price inline
    f_cta = load_font(int(bar_h * 0.42))
    f_price = load_font(int(bar_h * 0.55))

    cta_vis = to_display(cta)
    cta_tw, cta_th = _measure(draw, cta_vis, f_cta)

    if price:
        price_vis = to_display(price)
        ptw, pth = _measure(draw, price_vis, f_price)
        gap = int(w * 0.04)
        total = cta_tw + ptw + gap
        x_start = (w - total) // 2
        # In Hebrew RTL: price first (right side), then CTA
        draw.text((x_start, bar_top + (bar_h - pth) // 2 - 2), price_vis, font=f_price, fill=(20, 20, 20, 255))
        draw.text((x_start + ptw + gap, bar_top + (bar_h - cta_th) // 2), cta_vis, font=f_cta, fill=(20, 20, 20, 255))
    else:
        draw.text(((w - cta_tw) // 2, bar_top + (bar_h - cta_th) // 2), cta_vis, font=f_cta, fill=(20, 20, 20, 255))

    return _save(Image.alpha_composite(img, overlay))


# ── Template 5: Circular Badge (corner) ───────────────────────────────────────
def t5_circle_badge(image_bytes: bytes, aspect: str, fields: dict) -> bytes:
    """Round colored badge in the top-right safe-zone corner."""
    from PIL import Image, ImageDraw
    img = _open(image_bytes)
    w, h = img.size
    sx1, sy1, sx2, sy2 = safe_box(aspect, w, h)

    headline = fields.get("headline", "").strip()
    price    = fields.get("price", "").strip()

    diameter = int(min(sx2 - sx1, sy2 - sy1) * 0.28)
    badge = Image.new("RGBA", (diameter, diameter), (0, 0, 0, 0))
    bd = ImageDraw.Draw(badge)
    # Two rings — outer red, inner yellow circle
    bd.ellipse([(0, 0), (diameter, diameter)], fill=(220, 30, 40, 250))
    inner = int(diameter * 0.08)
    bd.ellipse([(inner, inner), (diameter - inner, diameter - inner)],
               outline=(255, 230, 100, 255), width=4)

    f_head  = load_font(int(diameter * 0.16))
    f_price = load_font(int(diameter * 0.30))
    if headline:
        vis = to_display(headline)
        tw, th = _measure(bd, vis, f_head)
        bd.text(((diameter - tw) // 2, int(diameter * 0.22)), vis, font=f_head, fill=(255, 255, 255, 255))
    if price:
        vis = to_display(price)
        tw, th = _measure(bd, vis, f_price)
        bd.text(((diameter - tw) // 2, int(diameter * 0.46)), vis, font=f_price, fill=(255, 230, 100, 255))

    # Top-right corner with small rotation for energy
    rotated = badge.rotate(-8, expand=True, resample=Image.BICUBIC)
    pos = (sx2 - rotated.width - int((sx2 - sx1) * 0.02),
           sy1 + int((sy2 - sy1) * 0.02))
    img.paste(rotated, pos, rotated)
    return _save(img)


# ═════════════════════════════════════════════════════════════════════════════

TEMPLATES = {
    "t1_bottom_strip": t1_bottom_strip,
    "t2_diagonal_tag": t2_diagonal_tag,
    "t3_top_banner":   t3_top_banner,
    "t4_cta_bar":      t4_cta_bar,
    "t5_circle_badge": t5_circle_badge,
}


def apply_template(template_id: str, image_bytes: bytes, aspect: str, fields: dict) -> bytes:
    fn = TEMPLATES.get(template_id)
    if not fn:
        return image_bytes
    try:
        return fn(image_bytes, aspect, fields)
    except Exception as e:
        print(f"  ⚠ template {template_id} failed: {e}")
        return image_bytes
