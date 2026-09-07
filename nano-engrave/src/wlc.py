"""
קריאת נוסח המקרא מארכיון tanach.us (Westminster Leningrad Codex).
נחלת הכלל, מנוקד ומוטעם.
"""
from __future__ import annotations

import zipfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

ARCHIVE = Path(__file__).resolve().parent.parent / "assets" / "Tanach.xml.zip"

# סדר המקרא המסורתי: תורה, נביאים, כתובים
CANON = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Samuel_1", "Samuel_2", "Kings_1", "Kings_2",
    "Isaiah", "Jeremiah", "Ezekiel",
    "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
    "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
    "Psalms", "Proverbs", "Job", "Song_of_Songs", "Ruth", "Lamentations",
    "Ecclesiastes", "Esther", "Daniel", "Ezra", "Nehemiah",
    "Chronicles_1", "Chronicles_2",
]

# סימני פרשה פתוחה/סתומה
PE, SAMEKH = "פ", "ס"


@dataclass
class Verse:
    book: str
    chapter: int
    number: int
    text: str

    @property
    def ref(self) -> str:
        return f"{self.book} {self.chapter}:{self.number}"


def _word_text(el: ET.Element) -> str:
    """טקסט המילה בלי הערות שוליים (<x>) שאסור שייצרבו."""
    parts = [el.text or ""]
    for child in el:
        if child.tag != "x":  # <x> = הפניה להערה, לא חלק מהנוסח
            parts.append(_word_text(child))
        parts.append(child.tail or "")
    return "".join(parts)


MAQAF = "־"


def _join(words: list[str]) -> str:
    """
    מחבר מילים ברווח — אבל לא אחרי מקף.
    ב־WLC כל צד של המקף הוא <w> נפרד, ו"כָּל־אָדָם" חייב להישאר צמוד.
    """
    out = ""
    for w in words:
        if out and not out.endswith(MAQAF):
            out += " "
        out += w
    return out


def read_book(name: str, kq: str = "qere", markers: bool = True) -> list[Verse]:
    """
    kq: איזו צורה לצרוב כשיש כתיב/קרי —
        'qere'  = הנקרא (ברירת מחדל, מנוקד במלואו)
        'ketiv' = הכתוב, כמו בספר תורה
        'both'  = שתיהן, הכתיב בסוגריים
    """
    with zipfile.ZipFile(ARCHIVE) as z:
        root = ET.fromstring(z.read(f"Books/{name}.xml").decode("utf-8"))

    verses: list[Verse] = []
    for c in root.iter("c"):
        chap = int(c.get("n"))
        for v in c.iter("v"):
            words: list[str] = []
            for el in v:
                if el.tag == "w":
                    words.append(_word_text(el))
                elif el.tag == "k":
                    if kq in ("ketiv", "both"):
                        words.append(_word_text(el))
                elif el.tag == "q":
                    if kq == "qere":
                        words.append(_word_text(el))
                    elif kq == "both":
                        words.append("(" + _word_text(el) + ")")
                elif markers and el.tag in ("pe", "samekh"):
                    words.append(PE if el.tag == "pe" else SAMEKH)
            verses.append(Verse(name, chap, int(v.get("n")), _join(words)))
    return verses


def read_tanakh(kq: str = "qere", markers: bool = True) -> list[Verse]:
    out: list[Verse] = []
    for book in CANON:
        out.extend(read_book(book, kq=kq, markers=markers))
    return out


if __name__ == "__main__":
    import io
    import sys

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    vs = read_tanakh()
    chars = sum(len(v.text) for v in vs)
    print(f"ספרים : {len(CANON)}")
    print(f"פסוקים: {len(vs):,}")
    print(f"תווים : {chars:,}")
    print(f"\n{vs[0].ref}: {vs[0].text}")
    print(f"{vs[-1].ref}: {vs[-1].text[:60]}…")
