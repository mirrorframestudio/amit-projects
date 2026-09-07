"""
הדמיית השבב: הנוסח האמיתי, בצפיפות האמיתית, על שטח השבב האמיתי.

זו לא איור ולא הדמיה חופשית. הטקסט נקרא מקובץ הצריבה עצמו, מעוצב
דרך אותו HarfBuzz שמפיק את קובץ הייצור, ונפרס על ריבוע במידות שכתובות
ב-spec. אם הפריסה לא יוצאת בערך ריבועית - סימן שהמספרים בספק אינם
מתיישבים זה עם זה, וזו בדיקה ולא קישוט.

    python src/render_chip.py 1_set-parnasa 4096

פלט: out/chip-<set>.png  ו-.svg
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import fitz

sys.path.insert(0, str(Path(__file__).resolve().parent))
from proof import glyph_paths  # noqa: E402
from shaper import Shaper  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"


def read_spec(set_dir: Path) -> dict:
    """המספרים מהמפרט, שהם מקור האמת ולא הקוד שכאן."""
    s = (set_dir / "spec.txt").read_text(encoding="utf-8")

    def g(pat, cast=str):
        m = re.search(pat, s)
        return cast(m.group(1).replace(",", "")) if m else None

    return {
        "title": s.splitlines()[0].strip(),
        "chars": g(r"תווים\s+([\d,]+)", int),
        "words": g(r"מילים\s+([\d,]+)", int),
        "letter_um": g(r"גובה אות\s+([\d.]+)", float),
        "stroke_um": g(r"עובי קו\s+([\d.]+)", float),
        "chip_mm": g(r"שבב ריבועי\s+([\d.]+)", float),
    }


def letter_height_units(sh: Shaper) -> float:
    """
    גובה אות עברית ביחידות em.

    לא upem ולא ascender: שניהם כוללים מקום לניקוד ולטעמים, ואות
    עברית ממוצעת נמוכה בהרבה. נמדד מהתיבה של אל״ף בפועל.
    """
    tt = sh.tt
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    gid = sh.shape("א")[0].gid
    from fontTools.pens.boundsPen import BoundsPen

    pen = BoundsPen(gs)
    gs[order[gid]].draw(pen)
    return (pen.bounds[3] - pen.bounds[1]) if pen.bounds else sh.upem * 0.5


def wrap(sh: Shaper, text: str, max_units: float) -> list[str]:
    """גלישה לפי מילים. מעצבים כל שורה בשלמותה, ולא חותכים פסקה
    מעוצבת - חיתוך אחרי shaping מזיז את הסימנים המעוגנים."""
    lines: list[str] = []
    for para in [p for p in text.split("\n") if p.strip()]:
        cur: list[str] = []
        for word in para.split():
            trial = " ".join(cur + [word])
            if cur and sh.width_of(trial) > max_units:
                lines.append(" ".join(cur))
                cur = [word]
            else:
                cur.append(word)
        if cur:
            lines.append(" ".join(cur))
    return lines


def render(set_name: str, px: int = 4096) -> Path:
    set_dir = ROOT / "launch" / set_name
    spec = read_spec(set_dir)
    text = next(set_dir.glob("*.txt")).read_text(encoding="utf-8")
    text = (set_dir / f"{set_name.split('_', 1)[1]}.txt").read_text(encoding="utf-8")

    sh = Shaper()
    missing = sh.missing_glyphs(text)
    if missing:
        print(f"  אזהרה - תווים שהגופן לא מכיר: {missing}")

    chip_um = spec["chip_mm"] * 1000.0
    upem = sh.upem
    lh_units = letter_height_units(sh)
    asc_u = sh.tt["hhea"].ascender
    desc_u = -sh.tt["hhea"].descender

    """
    גודל הגופן נגזר מהשבב, ולא להפך.

    קודם קבעתי אותו לפי "גובה אות 15 מיקרון" שבמפרט, והטקסט מילא
    41% מגובה השבב - כלומר גוש כתב על משטח ריק. אבל המפרט עצמו סותר
    את זה: בכל חמשת הסטים היחס הוא 2,304 תווים למ״מ² בדיוק, כלומר
    מידת השבב מחושבת מכמות התווים ולא נבחרה בנפרד. אם השבב נגזר
    מהטקסט, הטקסט ממלא אותו.

    לכן מחפשים כאן את גודל ה-em שבו הטקסט העטוף יוצא ריבועי, וגובה
    האות הוא תוצאה של החיפוש. הוא מודפס, כדי שיהיה אפשר להשוות אותו
    למספר שבמפרט.
    """
    lo, hi = 4.0, 400.0
    for _ in range(60):
        um_per_em = (lo + hi) / 2
        lines = wrap(sh, text, chip_um / (um_per_em / upem))
        height = len(lines) * (asc_u + desc_u) / upem * um_per_em
        if height > chip_um:
            hi = um_per_em
        else:
            lo = um_per_em
    um_per_em = lo
    lines = wrap(sh, text, chip_um / (um_per_em / upem))

    # ריווח שורות מהמטריקות של הגופן, ולא מחלוקת גובה השבב במספר
    # השורות. חלוקה כזו הייתה "מותחת" את הטקסט למלא את השבב ומייצרת
    # צפיפות שלא קיימת - כלומר הדמיה שמשקרת לטובת התמונה
    asc, desc = asc_u, desc_u
    line_step_um = (asc + desc) / upem * um_per_em
    block_um = len(lines) * line_step_um
    top_um = (chip_um - block_um) / 2.0

    print(f"  {spec['title']}")
    print(f"    {spec['chars']:,} תווים · {spec['words']} מילים · אות {spec['letter_um']}µm")
    print(f"    שבב {spec['chip_mm']} מ״מ  ->  {len(lines)} שורות · ריווח {line_step_um:.1f}µm")
    print(f"    גוש הטקסט {chip_um:.0f} x {block_um:.0f}µm  =  {block_um / chip_um * 100:.0f}% מגובה השבב")
    got = lh_units / upem * um_per_em
    print(f"    גובה אות בפועל {got:.1f}µm  (המפרט אומר {spec['letter_um']:.0f}µm)")

    scale = px / chip_um            # פיקסל למיקרון
    s = um_per_em / upem * scale    # יחידות גופן -> פיקסל

    gids = {g.gid for line in lines for g in sh.shape(line)}
    paths = glyph_paths(sh, gids)

    body = []
    for i, line in enumerate(lines):
        glyphs = sh.shape(line)
        width_px = sum(g.advance for g in glyphs) * s
        # יישור לימין: הטקסט עברי, והשוליים נופלים בשמאל השורה
        x0 = px - width_px
        baseline = (top_um + (i + 1) * line_step_um - desc / upem * um_per_em) * scale
        for g in glyphs:
            d = paths.get(g.gid)
            if not d:
                continue
            body.append(
                f'<path d="{d}" transform="translate({x0 + g.x * s:.2f},'
                f'{baseline - g.y * s:.2f}) scale({s:.6f},{-s:.6f})"/>'
            )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" '
        f'viewBox="0 0 {px} {px}">'
        f'<rect width="100%" height="100%" fill="#0a1a3a"/>'
        f'<g fill="#cfe0ff">' + "".join(body) + "</g></svg>"
    )

    OUT.mkdir(exist_ok=True)
    svg_path = OUT / f"chip-{set_name}.svg"
    svg_path.write_text(svg, encoding="utf-8")

    doc = fitz.open(str(svg_path))
    page = doc[0]
    zoom = px / page.rect.width
    pngp = OUT / f"chip-{set_name}.png"
    page.get_pixmap(matrix=fitz.Matrix(zoom, zoom)).save(str(pngp))
    print(f"    -> {pngp.name}  ({pngp.stat().st_size / 1024:.0f} KB)")
    return pngp


if __name__ == "__main__":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    name = sys.argv[1] if len(sys.argv) > 1 else "1_set-parnasa"
    render(name, int(sys.argv[2]) if len(sys.argv) > 2 else 4096)
