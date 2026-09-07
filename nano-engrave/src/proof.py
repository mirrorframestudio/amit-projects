"""
הוכחה ויזואלית: מרנדר פסוק דרך צינור ה-shaping ומייצר PNG להשוואה
מול הרינדור של ה-PDF המקורי.
"""
from __future__ import annotations

import sys
from pathlib import Path

import fitz
from fontTools.pens.svgPathPen import SVGPathPen

sys.path.insert(0, str(Path(__file__).resolve().parent))
from shaper import Shaper  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "out"


def glyph_paths(shaper: Shaper, gids: set[int]) -> dict[int, str]:
    gs = shaper.tt.getGlyphSet()
    order = shaper.tt.getGlyphOrder()
    paths = {}
    for gid in gids:
        pen = SVGPathPen(gs)
        gs[order[gid]].draw(pen)
        paths[gid] = pen.getCommands()
    return paths


def render_line(
    text: str,
    png: Path,
    px_per_em: float = 240,
    pad: float = 0.35,
    fg: str = "#2b3440",
    shaper: Shaper | None = None,
) -> Path:
    sh = shaper or Shaper()
    glyphs = sh.shape(text)
    upem = sh.upem
    s = px_per_em / upem

    total = sum(g.advance for g in glyphs) * s
    asc = sh.tt["hhea"].ascender * s
    desc = -sh.tt["hhea"].descender * s
    padpx = pad * px_per_em
    w = total + 2 * padpx
    h = asc + desc + 2 * padpx
    baseline = padpx + asc

    paths = glyph_paths(sh, {g.gid for g in glyphs})

    # HarfBuzz כבר החזיר את הגליפים בסדר ויזואלי משמאל לימין,
    # ו-g.x הוא המיקום הסופי כולל היסט הסימנים. רק ממירים ליחידות פיקסל
    # והופכים את ציר ה-Y (בגופן Y עולה, ב-SVG יורד).
    body = []
    for g in glyphs:
        d = paths[g.gid]
        if not d:
            continue
        gx = padpx + g.x * s
        gy = baseline - g.y * s
        body.append(
            f'<path d="{d}" transform="translate({gx:.3f},{gy:.3f}) '
            f'scale({s:.6f},{-s:.6f})" fill="{fg}"/>'
        )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}" '
        f'viewBox="0 0 {w:.3f} {h:.3f}">'
        f'<rect width="100%" height="100%" fill="#ffffff"/>'
        + "".join(body)
        + "</svg>"
    )

    svg_path = png.with_suffix(".svg")
    svg_path.write_text(svg, encoding="utf-8")
    doc = fitz.open(str(svg_path))
    doc[0].get_pixmap(dpi=150).save(str(png))
    return png


if __name__ == "__main__":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    OUT.mkdir(exist_ok=True)

    from wlc import read_book

    v = read_book("Genesis")[0]
    sh = Shaper()

    missing = sh.missing_glyphs(v.text)
    print("תווים שהגופן לא מכיר:", missing or "אין")

    glyphs = sh.shape(v.text)
    print(f"תווים: {len(v.text)}  →  גליפים אחרי shaping: {len(glyphs)}")
    zero = sum(1 for g in glyphs if g.advance == 0)
    print(f"גליפים ברוחב אפס (סימנים מעוגנים): {zero}")

    p = render_line(v.text, OUT / "proof_gen1_1.png", shaper=sh)
    print("נשמר:", p)
