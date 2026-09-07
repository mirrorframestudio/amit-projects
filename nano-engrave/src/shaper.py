"""
עיצוב טקסט (shaping) עברי מנוקד ומוטעם באמצעות HarfBuzz.

זה הרכיב שבו ה-PDF המקורי נכשל: הצבת ניקוד וטעמים דורשת את טבלאות
ה-GPOS של הגופן (mark = עיגון סימן לאות, mkmk = עיגון סימן לסימן).
בלעדיהן הסימנים נערמים זה על זה ונודדים מהאות שלהם.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ASSETS = Path(__file__).resolve().parent.parent / "assets"


@dataclass(frozen=True)
class PlacedGlyph:
    """גליף בודד אחרי shaping, ביחידות em של הגופן."""
    gid: int
    x: float
    y: float
    advance: float


class Shaper:
    def __init__(
        self,
        font_path: Path | str = ASSETS / "NotoSerifHebrew.ttf",
        weight: float = 400,
        width: float = 100,
    ):
        self.font_path = Path(font_path)
        static = self._instance(self.font_path, weight, width)
        self.tt = TTFont(static, fontNumber=0)
        self.upem = self.tt["head"].unitsPerEm

        blob = hb.Blob.from_file_path(str(static))
        face = hb.Face(blob)
        self.hb_font = hb.Font(face)
        self.static_path = static

    @staticmethod
    def _instance(path: Path, weight: float, width: float) -> Path:
        """
        גופן משתנה חייב להיות מוקפא למופע סטטי אחד — אחרת HarfBuzz
        וה-outlines עלולים להיחלץ בעוביים שונים.
        ציר ה-wdth שימושי כאן: כיווץ = יותר טקסט על אותו שטח שבב.
        """
        out = ASSETS / f"{path.stem}-w{int(weight)}-wd{int(width)}.ttf"
        if out.exists():
            return out
        f = TTFont(path, fontNumber=0)
        if "fvar" in f:
            axes = {a.axisTag for a in f["fvar"].axes}
            loc = {}
            if "wght" in axes:
                loc["wght"] = weight
            if "wdth" in axes:
                loc["wdth"] = width
            f = instantiateVariableFont(f, loc, inplace=False, updateFontNames=False)
        f.save(out)
        return out

    def shape(self, text: str) -> list[PlacedGlyph]:
        """מחזיר גליפים ממוקמים, ביחידות em, ראשית בנקודת ההתחלה הימנית."""
        buf = hb.Buffer()
        buf.add_str(text)
        buf.direction = "rtl"
        buf.script = "Hebr"
        buf.language = "he"
        # kern לא רלוונטי לחריטה, אבל mark/mkmk הם כל העניין
        hb.shape(self.hb_font, buf, {"kern": True, "mark": True, "mkmk": True})

        out: list[PlacedGlyph] = []
        x = y = 0.0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            out.append(
                PlacedGlyph(
                    gid=info.codepoint,  # אחרי shaping זה glyph id, לא קוד תו
                    x=x + pos.x_offset,
                    y=y + pos.y_offset,
                    advance=pos.x_advance,
                )
            )
            x += pos.x_advance
            y += pos.y_advance
        return out

    def width_of(self, text: str) -> float:
        return sum(g.advance for g in self.shape(text))

    @lru_cache(maxsize=4096)
    def glyph_name(self, gid: int) -> str:
        return self.tt.getGlyphOrder()[gid]

    def missing_glyphs(self, text: str) -> set[str]:
        """כל תו שהגופן לא מכיר יחזור כ-gid 0 (.notdef) — כאן תופסים אותו."""
        bad = set()
        for ch in set(text):
            if ch in " \n\t":
                continue
            if any(g.gid == 0 for g in self.shape(ch)):
                bad.add(ch)
        return bad
