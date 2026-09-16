#!/usr/bin/env python3
"""Cart-drawer banner for the glasses, matching the existing band banner (1500x643).

Reuses the original banner's headline + ribbon (pixel crop) so the style is identical,
swaps the product photo, and re-typesets the bottom pill without the band-only
"100 ימי אחריות" claim.

    python build_cart_banner.py <original_band_banner.png> <glasses_product.png> <out.png>
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from bidi.algorithm import get_display

FONT = r"C:\Users\amith\ads-dashboard\nations-slider\Rubik-Black.ttf"
RED = (214, 20, 24)
BLACK = (20, 20, 20)


def key_out(im, tol=28):
    """Make the near-uniform light background transparent (product shots on grey)."""
    im = im.convert("RGBA")
    bg = im.getpixel((5, 5))[:3]
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r - bg[0]) < tol and abs(g - bg[1]) < tol and abs(b - bg[2]) < tol:
                px[x, y] = (r, g, b, 0)
    return im


def main(orig_path, product_path, out_path):
    orig = Image.open(orig_path).convert("RGBA")
    W, H = orig.size  # 1500 x 643
    out = Image.new("RGBA", (W, H), (255, 255, 255, 255))

    # Right side: headline "14 ימי ניסיון במתנה" + bow + underline, cropped from the original.
    head = orig.crop((540, 110, 1470, 340))
    out.alpha_composite(head, (540, 110))

    # Left side: the glasses, keyed out, with a soft drop shadow like the band has.
    prod = key_out(Image.open(product_path))
    bbox = prod.getbbox()
    prod = prod.crop(bbox)
    scale = 470 / prod.width
    prod = prod.resize((470, round(prod.height * scale)), Image.LANCZOS)
    shadow = Image.new("RGBA", prod.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 90), (0, 0), prod.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    px, py = 45, 300 - prod.height // 2
    out.alpha_composite(shadow, (px + 6, py + 18))
    out.alpha_composite(prod, (px, py))

    # Bottom pill, re-typeset: "14 ימי ניסיון במתנה + משלוח חינם לכל הארץ"
    pill = (548, 368, 1455, 488)
    d = ImageDraw.Draw(out)
    d.rounded_rectangle(pill, radius=60, fill=(255, 255, 255, 255), outline=(225, 225, 225, 255), width=2)
    # gift icon from the original pill
    icon = orig.crop((560, 375, 668, 483))
    out.alpha_composite(icon, (560, 375))
    font = ImageFont.truetype(FONT, 46)
    # RTL: visual order right-to-left, coloured segments drawn from the right edge inward.
    segments = [("14 ימי ניסיון", BLACK), (" במתנה", RED), (" + ", BLACK), ("משלוח חינם", RED)]
    x = 1420
    y = 428
    for text, color in segments:
        vis = get_display(text)
        w = d.textlength(vis, font=font)
        d.text((x - w, y), vis, font=font, fill=color, anchor="lm")
        x -= w

    out.convert("RGB").save(out_path, "PNG", optimize=True)
    print("saved", out_path, out.size)


if __name__ == "__main__":
    main(*sys.argv[1:4])
