"""
מייצא את נוסח המקרא ל-JSON שממנו נבנה מסמך ה-Word.
מייצר גם manifest עם סכומי בקרה, כדי שאפשר יהיה להוכיח שלא נפל פסוק.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wlc import CANON, read_book  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "out"

# שמות הספרים בעברית, לפי סדר CANON
HEB = {
    "Genesis": "בְּרֵאשִׁית", "Exodus": "שְׁמוֹת", "Leviticus": "וַיִּקְרָא",
    "Numbers": "בְּמִדְבַּר", "Deuteronomy": "דְּבָרִים",
    "Joshua": "יְהוֹשֻׁעַ", "Judges": "שׁוֹפְטִים", "Samuel_1": "שְׁמוּאֵל א",
    "Samuel_2": "שְׁמוּאֵל ב", "Kings_1": "מְלָכִים א", "Kings_2": "מְלָכִים ב",
    "Isaiah": "יְשַׁעְיָהוּ", "Jeremiah": "יִרְמְיָהוּ", "Ezekiel": "יְחֶזְקֵאל",
    "Hosea": "הוֹשֵׁעַ", "Joel": "יוֹאֵל", "Amos": "עָמוֹס", "Obadiah": "עֹבַדְיָה",
    "Jonah": "יוֹנָה", "Micah": "מִיכָה", "Nahum": "נַחוּם", "Habakkuk": "חֲבַקּוּק",
    "Zephaniah": "צְפַנְיָה", "Haggai": "חַגַּי", "Zechariah": "זְכַרְיָה",
    "Malachi": "מַלְאָכִי", "Psalms": "תְּהִלִּים", "Proverbs": "מִשְׁלֵי",
    "Job": "אִיּוֹב", "Song_of_Songs": "שִׁיר הַשִּׁירִים", "Ruth": "רוּת",
    "Lamentations": "אֵיכָה", "Ecclesiastes": "קֹהֶלֶת", "Esther": "אֶסְתֵּר",
    "Daniel": "דָּנִיֵּאל", "Ezra": "עֶזְרָא", "Nehemiah": "נְחֶמְיָה",
    "Chronicles_1": "דִּבְרֵי הַיָּמִים א", "Chronicles_2": "דִּבְרֵי הַיָּמִים ב",
}

TEAMIM = range(0x0591, 0x05B0)


def strip_teamim(text: str) -> str:
    return "".join(ch for ch in text if ord(ch) not in TEAMIM)


def build(kq: str = "qere", teamim: bool = True) -> dict:
    books = []
    manifest = []
    for name in CANON:
        verses = read_book(name, kq=kq)
        chapters: dict[int, list[str]] = {}
        for v in verses:
            t = v.text if teamim else strip_teamim(v.text)
            chapters.setdefault(v.chapter, []).append(t)
        # פסקה אחת לכל פרק — זרימה רציפה, בלי שוברי שורה מיותרים
        paras = [" ".join(chapters[c]) for c in sorted(chapters)]
        body = " ".join(paras)
        books.append({"id": name, "he": HEB[name], "chapters": paras})
        manifest.append({
            "book": name,
            "hebrew": HEB[name],
            "chapters": len(paras),
            "verses": len(verses),
            "chars": len(body),
            "sha256": hashlib.sha256(body.encode("utf-8")).hexdigest(),
        })
    return {"books": books, "manifest": manifest}


if __name__ == "__main__":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    OUT.mkdir(exist_ok=True)

    teamim = "--no-teamim" not in sys.argv
    data = build(teamim=teamim)

    (OUT / "tanakh.json").write_text(
        json.dumps(data["books"], ensure_ascii=False), encoding="utf-8"
    )
    (OUT / "manifest.json").write_text(
        json.dumps(data["manifest"], ensure_ascii=False, indent=2), encoding="utf-8"
    )

    total_chars = sum(m["chars"] for m in data["manifest"])
    total_verses = sum(m["verses"] for m in data["manifest"])
    print(f"טעמי מקרא: {'כלולים' if teamim else 'הושמטו'}")
    print(f"ספרים : {len(data['manifest'])}")
    print(f"פסוקים: {total_verses:,}")
    print(f"תווים : {total_chars:,}")
    print(f"נשמר  : {OUT/'tanakh.json'}")
