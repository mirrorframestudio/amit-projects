"""
בונה את תיקיית הטקסטים: קובץ לכל דגם, מפרט לכל דגם, ואינדקס מרכזי.
מריצים אחרי כל שינוי ב-CATALOG.
"""
from __future__ import annotations

import hashlib
import io
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from texts import LETTER_UM, load  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "library"


def spec_sheet(s, idx: int) -> str:
    sha = hashlib.sha256(s.text.encode("utf-8")).hexdigest()
    liturgy_warning = ""
    if getattr(s, "liturgy", None):
        liturgy_warning = (
            "\n*** שים לב — רכיב ליטורגי ***\n"
            f"דגם זה כולל טקסט שאינו מקראי: {s.liturgy}\n"
            "הוא אינו מ-WLC, אין בו טעמי מקרא (וזה תקין),\n"
            "והוא טעון הגהה ואישור נוסח לפני ייצור.\n"
            f"הקובץ לעריכה: assets/liturgy/{s.liturgy}.txt\n"
        )
    return f"""\
דגם {idx:02d} — {s.title}
{'=' * 60}

מראה מקום       {s.ref}
שם לועזי        {s.latin}
מזהה            {s.slug}

--- שיווק ---
אירוע           {s.occasion}
קהל             {s.audience}
{('הערה           ' + s.note) if s.note else ''}

--- מבנה ---
קטעים           {len(s.segments)}  (כל קטע נצרב כפסקה נפרדת, בשורה חדשה)
{chr(10).join(f"  {i}. {seg[:52]}…  [{len(seg):,} תווים]" for i, seg in enumerate(s.segments, 1))}

--- נתוני טקסט ---
תווים           {s.chars:,}
מילים           {s.words:,}
ניקוד           {sum(1 for c in s.text if 0x05B0 <= ord(c) <= 0x05C7):,}
טעמי מקרא       {sum(1 for c in s.text if 0x0591 <= ord(c) <= 0x05AF):,}
SHA-256         {sha}

--- מפרט צריבה ---
גובה אות        {LETTER_UM:.0f} מיקרון
עובי קו         {s.stroke_um:.1f} מיקרון
שבב ריבועי      {s.chip_mm:.2f} × {s.chip_mm:.2f} מ״מ
שטח             {s.chip_mm ** 2:.3f} מ״מ²
צורת תכשיט      {s.form}

גבול הראייה האנושית הוא כ-75 מיקרון. בגובה {LETTER_UM:.0f} מיקרון
הכתב קטן פי {75 / LETTER_UM:.0f} מהסף — בלתי נראה לעין, וקריא במיקרוסקופ כיס.

--- מקור ---
Westminster Leningrad Codex דרך tanach.us — נחלת הכלל.
נוסח מסורתי מלא, כולל ניקוד וטעמים. סימני פרשה (פ/ס) הוסרו.
{liturgy_warning}"""


def main() -> None:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    specs = load()

    LIB.mkdir(parents=True, exist_ok=True)
    wanted = {f"{i:02d}_{s.slug}" for i, s in enumerate(specs, 1)}
    locked: list[str] = []

    def write(path: Path, data: str) -> None:
        """כתיבה שסובלת קובץ נעול — Word מחזיק קבצים פתוחים."""
        try:
            path.write_text(data, encoding="utf-8")
        except PermissionError:
            locked.append(str(path.relative_to(LIB)))

    # מחיקת תיקיות של דגמים שכבר לא בקטלוג
    for old in LIB.iterdir():
        if old.is_dir() and old.name not in wanted:
            shutil.rmtree(old, ignore_errors=True)

    manifest = []
    for i, s in enumerate(specs, 1):
        d = LIB / f"{i:02d}_{s.slug}"
        d.mkdir(exist_ok=True)
        write(d / f"{s.slug}.txt", s.text)
        write(d / "spec.txt", spec_sheet(s, i))
        manifest.append({
            "index": i,
            "slug": s.slug,
            "title": s.title,
            "latin": s.latin,
            "ref": s.ref,
            "occasion": s.occasion,
            "audience": s.audience,
            "note": s.note,
            "chars": s.chars,
            "words": s.words,
            "chip_mm": round(s.chip_mm, 3),
            "letter_um": LETTER_UM,
            "form": s.form,
            "sha256": hashlib.sha256(s.text.encode("utf-8")).hexdigest(),
            "segments": s.segments,
            "dir": d.name,
            "text": s.text,
        })

    write(LIB / "catalog.json", json.dumps(manifest, ensure_ascii=False, indent=2))

    # אינדקס קריא
    rows = "\n".join(
        f"| {m['index']:02d} | {m['title']} | {m['ref']} | {m['chars']:,} | "
        f"{m['chip_mm']:.2f} מ״מ | {m['occasion']} |"
        for m in manifest
    )
    write(LIB / "00_INDEX.md", f"""# ספריית הטקסטים

כל טקסט נשלף מ־Westminster Leningrad Codex — נוסח מסורתי מלא,
מנוקד ומוטעם. נחלת הכלל.

**מפרט צריבה אחיד:** גובה אות {LETTER_UM:.0f} מיקרון · עובי קו {LETTER_UM * 0.13:.1f} מיקרון
גבול הראייה האנושית ~75 מיקרון — הכתב קטן פי {75 / LETTER_UM:.0f} מהסף.

| # | דגם | מראה מקום | תווים | שבב | אירוע |
|---|---|---|---:|---:|---|
{rows}

## מבנה התיקייה

```
library/
  00_INDEX.md          הקובץ הזה
  catalog.json         כל הנתונים, לשימוש תוכנה
  NN_slug/
    slug.txt           הטקסט, UTF-8
    slug.docx          Word, גופן David, RTL
    spec.txt           מפרט מלא לדגם
```

## לעדכון

לערוך את `src/texts.py` ולהריץ:

```
python src/build_library.py
node build_library_docx.js
```
""")

    if locked:
        print("!! קבצים נעולים (סגור אותם ב-Word והרץ שוב):")
        for f in locked:
            print("   ", f)
    print(f"נבנו {len(manifest)} דגמים ב-{LIB}")
    for m in manifest:
        print(f"  {m['index']:02d} {m['title']:26s} {m['chars']:7,d} תווים  {m['chip_mm']:5.2f}מ\"מ")


if __name__ == "__main__":
    main()
