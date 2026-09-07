"""
קטלוג הטקסטים לצריבה — מזמורים וברכות.

כל ערך כאן נשלף מ-WLC (נחלת הכלל, מנוקד ומוטעם במלואו) לפי מראה מקום.
להוספת דגם חדש: שורה אחת ב-CATALOG. הכול נגזר משם.
"""
from __future__ import annotations

import math
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from wlc import read_book  # noqa: E402

# --- פרמטרי צריבה ---
# גובה אות היעד במיקרון. גבול הראייה האנושית ~75 מיקרון,
# כך שב-15 אנחנו פי 5 מתחת לו — בלתי נראה, ועדיין קריא במיקרוסקופ כיס.
LETTER_UM = 15.0
CELL_RATIO = 1 / 0.72   # יחס תא לגובה אות
STROKE_RATIO = 0.13     # עובי קו אופייני ביחס לגובה אות


@dataclass
class TextSpec:
    slug: str
    title: str          # שם הדגם בעברית
    latin: str          # שם לטיני, לשמות קבצים ולמפעל
    ref: str            # מראה מקום מוצג
    book: str           # שם הספר ב-WLC
    chapter: int
    v_from: int | None = None
    v_to: int | None = None
    chapters: tuple[int, ...] | None = None   # לספר שלם/מספר פרקים
    whole_book: bool = False
    # דגם מורכב: כמה קטעים שנצרבים יחד. (ספר, פרק, מפסוק, עד פסוק)
    parts: tuple[tuple[str, int, int, int], ...] | None = None
    # טקסט ליטורגי שאינו מקראי — נטען מ-assets/liturgy/<שם>.txt
    # ומצורף בסוף. טקסטים כאלה מנוקדים אך אין בהם טעמי מקרא.
    liturgy: str | None = None
    occasion: str = ""  # האירוע — זה מה שמוכר
    audience: str = ""  # למי קונים
    note: str = ""
    # הטקסט המלא. קטעים בדגם מורכב מופרדים בשורה חדשה — כך הם
    # נצרבים כפסקאות נפרדות ולא נראים כרצף אחד מעורבב.
    text: str = field(default="", repr=False)
    segments: list[str] = field(default_factory=list, repr=False)

    # --- נגזרות ---
    @property
    def chars(self) -> int:
        """תווים שנצרבים בפועל. שורה חדשה אינה צורה ואינה נספרת."""
        return len(self.text) - self.text.count("\n")

    @property
    def words(self) -> int:
        return len(self.text.split())

    @property
    def chip_mm(self) -> float:
        """צלע השבב הריבועי הדרושה, במ״מ, בגובה אות היעד."""
        return math.sqrt(self.chars) * LETTER_UM * CELL_RATIO / 1000

    @property
    def stroke_um(self) -> float:
        return LETTER_UM * STROKE_RATIO

    @property
    def form(self) -> str:
        s = self.chip_mm
        if s < 0.5:
            return "טבעת · עגיל · תליון זעיר"
        if s < 1.2:
            return "כל תליון"
        if s < 3:
            return "תליון בינוני ומעלה"
        return "תליון גדול / אובייקט"


CATALOG: list[TextSpec] = [
    # ───────── אהבה וזוגיות ─────────
    TextSpec("eshet-chayil", "אֵשֶׁת חַיִל", "Eshet Chayil", "משלי ל״א, י׳–ל״א",
             "Proverbs", 31, 10, 31,
             occasion="יום נישואין · יום הולדת · יום האם", audience="בעל, ילדים"),
    TextSpec("ani-ledodi", "אֲנִי לְדוֹדִי", "Ani LeDodi", "שיר השירים ו׳, ג׳",
             "Song_of_Songs", 6, 3, 3,
             occasion="אירוסין · חתונה", audience="בן/בת זוג",
             note="קצר מאוד — מתאים לטבעת נישואין"),
    TextSpec("aza-kamavet", "כִּי עַזָּה כַמָּוֶת אַהֲבָה", "Aza KaMavet", "שיר השירים ח׳, ו׳–ז׳",
             "Song_of_Songs", 8, 6, 7,
             occasion="חתונה · יום נישואין", audience="בן/בת זוג"),
    TextSpec("shir-hashirim", "שִׁיר הַשִּׁירִים", "Song of Songs", "שיר השירים — הספר המלא",
             "Song_of_Songs", 0, whole_book=True,
             occasion="חתונה · מתנת פרימיום", audience="בן/בת זוג",
             note="דגם דגל של קו האהבה"),

    # ───────── ברכה והגנה ─────────
    TextSpec("birkat-kohanim", "בִּרְכַּת כֹּהֲנִים", "Priestly Blessing", "במדבר ו׳, כ״ד–כ״ו",
             "Numbers", 6, 24, 26,
             occasion="לידה · בר/בת מצווה · חנוכת בית", audience="הורים, סבים",
             note="שלושת הפסוקים בלבד — הקצר בקטלוג, נכנס לכל צורה"),
    TextSpec("birkat-kohanim-full", "בִּרְכַּת כֹּהֲנִים — הַפָּרָשָׁה הַשְּׁלֵמָה",
             "Priestly Blessing (full passage)", "במדבר ו׳, כ״ב–כ״ז",
             "Numbers", 6, 22, 27,
             occasion="לידה · בר/בת מצווה · חנוכת בית", audience="הורים, סבים",
             note="כולל את הציווי לכהנים ואת החתימה — וְשָׂמוּ אֶת־שְׁמִי עַל־בְּנֵי יִשְׂרָאֵל וַאֲנִי אֲבָרֲכֵם"),
    TextSpec("set-menora", "בִּרְכַּת כֹּהֲנִים וּמִזְמוֹר הַמְּנוֹרָה",
             "Priestly Blessing & Menorah Psalm", "במדבר ו׳, כ״ב–כ״ז · תהילים ס״ז", "", 0,
             parts=(("Numbers", 6, 22, 27), ("Psalms", 67, 1, 8)),
             occasion="חנוכת בית · מתנה מרכזית", audience="משפחה, קהילה",
             note="מזמור ס״ז נכתב מסורתית בצורת מנורה, וחוזר על אותה לשון — יָאֵר פָּנָיו"),
    TextSpec("shir-lamaalot-121", "שִׁיר לַמַּעֲלוֹת", "Psalm 121", "תהילים קכ״א",
             "Psalms", 121,
             occasion="הגנה · גיוס · נסיעה", audience="אמא, הורים"),
    TextSpec("yoshev-beseter", "יוֹשֵׁב בְּסֵתֶר עֶלְיוֹן", "Psalm 91", "תהילים צ״א",
             "Psalms", 91,
             occasion="שמירה והגנה", audience="הורים, בני משפחה",
             note="המזמור המבוקש ביותר לשמירה"),
    TextSpec("mizmor-ledavid-23", "מִזְמוֹר לְדָוִד", "Psalm 23", "תהילים כ״ג",
             "Psalms", 23,
             occasion="נחמה · אמונה · מתנה כללית", audience="כל אחד"),

    # ───────── הודיה ─────────
    TextSpec("mizmor-letoda", "מִזְמוֹר לְתוֹדָה", "Psalm 100", "תהילים ק׳",
             "Psalms", 100,
             occasion="הודיה · אחרי החלמה", audience="משפחה, חברים"),
    TextSpec("aromimcha", "אֲרוֹמִמְךָ ה׳", "Psalm 30", "תהילים ל׳",
             "Psalms", 30,
             occasion="החלמה · חנוכת בית", audience="משפחה"),
    TextSpec("halelu-150", "הַלְלוּ־יָהּ", "Psalm 150", "תהילים ק״נ",
             "Psalms", 150,
             occasion="שמחה · הולדת ילד", audience="כל אחד",
             note="קצר ומוזיקלי"),

    # ───────── אמונה ויומיום ─────────
    TextSpec("shema", "שְׁמַע יִשְׂרָאֵל", "Shema Yisrael", "דברים ו׳, ד׳–ט׳",
             "Deuteronomy", 6, 4, 9,
             occasion="בר מצווה · מתנה לזהות יהודית", audience="הורים, סבים"),
    TextSpec("ashrei-145", "אַשְׁרֵי", "Psalm 145", "תהילים קמ״ה",
             "Psalms", 145,
             occasion="מתנה כללית · יום הולדת", audience="כל אחד"),
    TextSpec("aseret-hadibrot", "עֲשֶׂרֶת הַדִּבְּרוֹת", "Ten Commandments", "שמות כ׳, א׳–י״ד",
             "Exodus", 20, 1, 14,
             occasion="בר מצווה · מתנה מסורתית", audience="הורים, סבים"),

    # ───────── ירושלים וזהות ─────────
    TextSpec("im-eshkachech", "אִם אֶשְׁכָּחֵךְ יְרוּשָׁלִָם", "Im Eshkachech", "תהילים קל״ז, ה׳–ו׳",
             "Psalms", 137, 5, 6,
             occasion="עלייה · מתנה לקהילה בחו״ל", audience="עצמי, חברים"),
    TextSpec("samachti-122", "שָׂמַחְתִּי בְּאֹמְרִים לִי", "Psalm 122", "תהילים קכ״ב",
             "Psalms", 122,
             occasion="עלייה · ביקור בירושלים", audience="תיירים, עולים"),

    # ───────── תינוקות וילדים ─────────
    TextSpec("hamalach-hagoel", "הַמַּלְאָךְ הַגֹּאֵל", "HaMalach HaGoel", "בראשית מ״ח, ט״ז",
             "Genesis", 48, 16, 16,
             occasion="לידה · ברית · מתנה לתינוק", audience="הורים, סבים",
             note="ברכת הלילה הקלאסית לילדים"),
    TextSpec("yesimcha", "יְשִׂמְךָ אֱלֹהִים", "Yesimcha Elohim", "בראשית מ״ח, כ׳",
             "Genesis", 48, 20, 20,
             occasion="ברכת הבנים · ליל שבת · ברית", audience="הורים, סבים",
             note="הברכה שמברכים ילדים בליל שבת"),
    TextSpec("ki-malachav", "כִּי מַלְאָכָיו יְצַוֶּה־לָּךְ", "Ki Malachav", "תהילים צ״א, י״א–י״ב",
             "Psalms", 91, 11, 12,
             occasion="שמירה לתינוק · צמיד ילדים", audience="הורים, סבים",
             note="פסוק השמירה המצוטט ביותר לילדים"),
    TextSpec("ben-porat", "בֵּן פֹּרָת יוֹסֵף", "Ben Porat Yosef", "בראשית מ״ט, כ״ב",
             "Genesis", 49, 22, 22,
             occasion="שמירה מעין הרע · לידה", audience="הורים, סבים",
             note="מסורתי לקמיעות ולתינוקות"),
    TextSpec("yishmor-tzetcha", "ה׳ יִשְׁמָר צֵאתְךָ וּבוֹאֶךָ", "Yishmor Tzetcha", "תהילים קכ״א, ז׳–ח׳",
             "Psalms", 121, 7, 8,
             occasion="דרך · גיוס · צמיד יומיומי", audience="אמא, בן/בת זוג",
             note="שתי השורות הידועות ביותר של שיר המעלות"),
    TextSpec("ashrei-kol-yere", "אַשְׁרֵי כָּל־יְרֵא ה׳", "Psalm 128", "תהילים קכ״ח",
             "Psalms", 128,
             occasion="חתונה · הקמת בית", audience="זוג צעיר"),

    # ───────── רפואה והחלמה ─────────
    TextSpec("el-na-refa", "אֵל נָא רְפָא נָא לָהּ", "El Na Refa Na", "במדבר י״ב, י״ג",
             "Numbers", 12, 13, 13,
             occasion="רפואה שלמה · מתנה לחולה", audience="משפחה, חברים",
             note="תפילת הרפואה הקצרה במקרא"),
    TextSpec("refaeni", "רְפָאֵנִי ה׳ וְאֵרָפֵא", "Refaeni Hashem", "ירמיהו י״ז, י״ד",
             "Jeremiah", 17, 14, 14,
             occasion="רפואה · החלמה", audience="משפחה"),

    # ───────── פסוקים קצרים לצמיד ולטבעת ─────────
    TextSpec("shema-verse", "שְׁמַע יִשְׂרָאֵל — הפסוק", "Shema (one verse)", "דברים ו׳, ד׳",
             "Deuteronomy", 6, 4, 4,
             occasion="צמיד · טבעת · שרשרת עדינה", audience="כל אחד",
             note="הפסוק הבודד, בלי המשך הפרשה"),
    TextSpec("veahavta-lereacha", "וְאָהַבְתָּ לְרֵעֲךָ כָּמוֹךָ", "Love Thy Neighbour", "ויקרא י״ט, י״ח",
             "Leviticus", 19, 18, 18,
             occasion="מתנת חברות · בר מצווה", audience="חברים, מורים"),
    TextSpec("etz-chaim", "עֵץ חַיִּים הִיא", "Etz Chaim", "משלי ג׳, י״ח",
             "Proverbs", 3, 18, 18,
             occasion="סיום לימודים · הקדשה", audience="קהילה, מורים"),
    TextSpec("hashem-ori", "ה׳ אוֹרִי וְיִשְׁעִי", "Hashem Ori", "תהילים כ״ז, א׳",
             "Psalms", 27, 1, 1,
             occasion="אומץ · התחלה חדשה", audience="כל אחד"),
    TextSpec("baruch-bevoecha", "בָּרוּךְ אַתָּה בְּבֹאֶךָ", "Blessed Coming and Going", "דברים כ״ח, ו׳",
             "Deuteronomy", 28, 6, 6,
             occasion="חנוכת בית · נסיעה", audience="משפחה"),

    # ───────── חבילות נושא: כמה פסוקים שנצרבים יחד ─────────
    # לכל חבילה חוט מקשר אחד ברור. כל פסוק נשאר שלם.
    TextSpec("set-habracha-shelcha", "הַבְּרָכָה שֶׁלְּךָ", "Your Blessing",
             "דברים ז׳, י״ב–ט״ו · דברים כ״ח, א׳–י״ד · תהילים קכ״ח", "", 0,
             parts=(("Deuteronomy", 7, 12, 15),    # ההבטחה: ואהבך וברכך
                    ("Deuteronomy", 28, 1, 14),    # הברכות עצמן
                    ("Psalms", 128, None, None)),  # דיוקן החיים המבורכים
             occasion="מתנה אישית · יום הולדת · הצלחה", audience="כל אחד",
             note="ברכה טהורה בגוף שני — לא שמירה ולא תפילה. "
                  "דברים כ״ח עד פסוק י״ד בלבד: יחידת הברכות בשלמותה, "
                  "בדיוק לפני שהתוכחה מתחילה בפסוק ט״ו."),
    TextSpec("set-avot", "בִּרְכַּת הָאָבוֹת", "The Fathers' Blessing",
             "בראשית י״ב, ב׳–ג׳ · בראשית כ״ז, כ״ח–כ״ט · בראשית מ״ח, ט״ו–ט״ז", "", 0,
             parts=(("Genesis", 12, 2, 3),      # אברהם מקבל
                    ("Genesis", 27, 28, 29),    # יצחק מעביר ליעקב
                    ("Genesis", 48, 15, 16)),   # יעקב מעביר לנכדיו
             occasion="ירושה משפחתית · בר/בת מצווה · לידה", audience="סבים, הורים",
             note="שלוש ברכות, שלושה דורות, לפי סדר המסירה. "
                  "ברכת כהנים הושמטה במכוון — היא הנוסחה לכהנים, "
                  "לא ברכת אב לבן, והיא כבר מופיעה בשבעה דגמים אחרים."),
    TextSpec("set-shmira", "שְׁמִירָה וַהֲגָנָה", "Protection Set",
             "תהילים צ״א · תהילים קכ״א · תפילת הדרך · "
             "בראשית ל״ב, ב׳–ג׳ · במדבר ו׳, כ״ב–כ״ז", "", 0,
             # הסדר עוקב אחרי הסידור: המזמורים, התפילה, ויעקב בדרכו,
             # וחתימה בברכת כהנים.
             parts=(("Psalms", 91, None, None),
                    ("Psalms", 121, None, None),
                    "tfilat-haderech",
                    ("Genesis", 32, 2, 3),
                    ("Numbers", 6, 22, 27)),
             liturgy="tfilat-haderech",
             occasion="גיוס · נסיעה · רילוקיישן", audience="אמא, בן/בת זוג",
             note="נוסח תפילת הדרך נמסר על ידי הלקוח. ארבעת הפסוקים "
                  "שבסופו הושמטו משם — שלושה כבר בשבב, והרביעי "
                  "(ויעקב הלך לדרכו) נוסף כקטע מקראי מ-WLC."),
    TextSpec("set-yeled", "בִּרְכַּת הַיֶּלֶד", "Child Blessing Set",
             "במדבר ו׳ · בראשית מ״ח", "", 0,
             parts=(("Numbers", 6, 24, 26), ("Genesis", 48, 20, 20), ("Genesis", 48, 16, 16)),
             occasion="לידה · ברית · צמיד תינוק", audience="הורים, סבים",
             note="שלוש הברכות שמברכים בהן ילד — ברכת כהנים, ברכת הבנים, והמלאך הגואל"),
    TextSpec("set-refua", "רְפוּאָה שְׁלֵמָה", "Healing Set",
             "במדבר י״ב · ירמיהו י״ז · תהילים מ״א", "", 0,
             parts=(("Numbers", 12, 13, 13), ("Jeremiah", 17, 14, 14), ("Psalms", 41, 4, 4)),
             occasion="רפואה · מתנה לחולה", audience="משפחה, חברים"),
    TextSpec("set-yesodot", "יְסוֹדוֹת", "Foundations Set",
             "דברים ו׳ · ויקרא י״ט · משלי ג׳ · תהילים כ״ז", "", 0,
             parts=(("Deuteronomy", 6, 4, 4), ("Leviticus", 19, 18, 18),
                    ("Proverbs", 3, 18, 18), ("Psalms", 27, 1, 1)),
             occasion="בר/בת מצווה · מתנת זהות", audience="הורים, סבים",
             note="שמע · ואהבת לרעך · עץ חיים · ה׳ אורי"),
    TextSpec("set-ahava", "אַהֲבָה", "Love Set",
             "שיר השירים ו׳ · שיר השירים ח׳", "", 0,
             parts=(("Song_of_Songs", 6, 3, 3), ("Song_of_Songs", 8, 6, 7)),
             occasion="חתונה · אירוסין · יום נישואין", audience="בן/בת זוג"),
    TextSpec("set-yerushalayim", "יְרוּשָׁלַיִם", "Jerusalem Set",
             "תהילים קל״ז · תהילים קכ״ב", "", 0,
             parts=(("Psalms", 137, 5, 6), ("Psalms", 122, 6, 9)),
             occasion="עלייה · מתנה לקהילה בחו״ל", audience="עצמי, חברים"),
    TextSpec("set-parnasa", "בִּרְכַּת הַפַּרְנָסָה", "Sustenance Set",
             "תהילים כ״ד · פיטום הקטורת · תהילים ק׳", "", 0,
             parts=(("Psalms", 24, None, None),
                    "pitum-haketoret",
                    ("Psalms", 100, None, None)),
             liturgy="pitum-haketoret",
             occasion="עסק חדש · חנוכת בית · הצלחה", audience="משפחה, שותפים",
             note="תהילים כ״ד שלם + פיטום הקטורת + מזמור לתודה שלם. "
                  "פיטום הקטורת אינו מקראי — ממתין לנוסח"),

    # ───────── דגמי דגל ─────────
    TextSpec("tehillim", "סֵפֶר תְּהִלִּים", "Book of Psalms", "תהילים — הספר המלא",
             "Psalms", 0, whole_book=True,
             occasion="דגם דגל", audience="אספן, מתנה יוקרתית",
             note="150 מזמורים — מעל גבול הקריאות בעדשה"),
    TextSpec("torah", "חֲמִשָּׁה חֻמְשֵׁי תּוֹרָה", "The Torah", "בראשית–דברים",
             "", 0,
             occasion="דגם דגל עליון", audience="אספן",
             note="נכנס במגבלת המפעל · מעל גבול הקריאות"),
]

TORAH_BOOKS = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"]


# תווי בקרה בלתי נראים ב-WLC. הם קיימים כדי לשלוט בסדר נרמול יוניקוד,
# לא מייצרים שום צורה, ורק מנפחים את ספירת התווים. HarfBuzz מתעלם מהם ממילא.
INVISIBLE = str.maketrans("", "", "͏‍‌‎‏")

# שני ארטיפקטים של כתב יד לנינגרד שבהם מקף מופיע בתוך מילה אחת.
# בכל תנ"ך מודפס הם מופיעים כמילה רגילה, ועל תכשיט הם ייקראו כשגיאת דפוס.
MANUSCRIPT_FIXES = {
    "יָ֤אֵ֥־ר": "יָ֤אֵ֥ר",          # תהילים ס״ז, ב׳
    "הֲ־לַיְהוָה֙": "הֲלַיְהוָה֙",   # דברים ל״ב, ו׳
}


def _clean(text: str) -> str:
    """
    ניקוי לפני צריבה:
      · הסרת סימני פרשה (פ/ס) — סימון עריכה של סופר, חסר מובן בקטע עצמאי
      · הסרת תווי בקרה בלתי נראים
      · תיקון שני ארטיפקטים ידועים של כתב היד
    """
    text = text.translate(INVISIBLE)
    for bad, good in MANUSCRIPT_FIXES.items():
        text = text.replace(bad, good)
    return " ".join(w for w in text.split() if w not in ("פ", "ס"))


def _verses(book: str, chapter: int, v_from: int | None, v_to: int | None) -> str:
    return " ".join(
        v.text for v in read_book(book)
        if v.chapter == chapter and (v_from is None or v_from <= v.number <= v_to)
    )


LITURGY = Path(__file__).resolve().parent.parent / "assets" / "liturgy"

# מה הוסר מכל טקסט ליטורגי — נדפס בכל בנייה
LITURGY_LOG: dict[str, list[str]] = {}


SOF_PASUQ = "׃"   # ׃ — סוף פסוק, כפי שנהוג בטקסט המקראי
NIKUD_RANGE = range(0x0591, 0x05C8)


def _has_nikud(s: str) -> bool:
    return any(ord(c) in NIKUD_RANGE for c in s)


# מילים קצרות שאסור למחוק גם אם הן חסרות ניקוד — שמות קודש וכינויים.
# בלי הרשימה הזו כלל האסימונים הקצרים היה מוחק את שם ה׳ בשקט.
PROTECTED = {"יי", "יְיָ", "אל", "אֵל", "יה", "יָהּ", "ה׳", "יְ־יָ"}


def _normalise_liturgy(text: str, log: list[str] | None = None) -> str:
    """
    מנקה עזרי־סידור מטקסט ליטורגי לפני צריבה.

    הכלל המבחין הוא הניקוד: נוסח התפילה מנוקד, ותוספות המדפיס אינן.
      · הוראות למתפלל בסוגריים — "(טוב למנותם באצבעותיו)"
      · אותיות מניין — א ב ג … יא לפני שמות הסממנים
      · נקודתיים ":" מוחלפות בסוף־פסוק "׃", לאחידות עם הטקסט המקראי

    כל מחיקה נרשמת ב-log כדי שאפשר יהיה לבדוק אותה. טקסט שנצרב
    לנצח לא נמחק בשקט.
    """
    def drop_paren(m: re.Match) -> str:
        if _has_nikud(m.group()):
            return m.group()
        if log is not None:
            log.append(f"סוגריים: {m.group()}")
        return ""

    text = re.sub(r"\([^)]*\)", drop_paren, text)

    kept = []
    for w in text.split():
        if len(w) > 2 or _has_nikud(w) or w in PROTECTED:
            kept.append(w)
        elif log is not None:
            log.append(f"אסימון קצר: {w!r}")
    return " ".join(kept).replace(":", SOF_PASUQ)


def _liturgy(name: str) -> str:
    p = LITURGY / f"{name}.txt"
    if not p.exists():
        raise FileNotFoundError(
            f"חסר טקסט ליטורגי: {p}\n"
            f"טקסטים שאינם מקראיים אינם ב-WLC וחייבים מקור מאומת."
        )
    # שורות שמתחילות ב-# הן הערות מקור, לא חלק מהנוסח
    lines = [ln for ln in p.read_text(encoding="utf-8").splitlines()
             if ln.strip() and not ln.lstrip().startswith("#")]
    log: list[str] = []
    out = _normalise_liturgy(" ".join(lines), log)
    if log:
        LITURGY_LOG[name] = log
    return out


def _fetch(spec: TextSpec) -> list[str]:
    """מחזיר את קטעי הדגם. כל קטע ייצרב כפסקה נפרדת."""
    if spec.parts:
        # רכיב יכול להיות מראה מקום מקראי, או שם של טקסט ליטורגי
        # כמחרוזת — וכך הסדר בתוך הדגם נשלט במדויק.
        segs = [
            _clean(_liturgy(p) if isinstance(p, str) else _verses(*p))
            for p in spec.parts
        ]
        if spec.liturgy and spec.liturgy not in spec.parts:
            segs.append(_clean(_liturgy(spec.liturgy)))
        return [s for s in segs if s]
    if spec.liturgy and not spec.book:
        return [_clean(_liturgy(spec.liturgy))]
    if spec.slug == "torah":
        # חומש לכל פסקה — חמישה קטעים
        return [_clean(" ".join(v.text for v in read_book(b))) for b in TORAH_BOOKS]
    if spec.whole_book:
        return [_clean(" ".join(v.text for v in read_book(spec.book)))]
    verses = [
        v for v in read_book(spec.book)
        if v.chapter == spec.chapter
        and (spec.v_from is None or spec.v_from <= v.number <= spec.v_to)
    ]
    return [_clean(" ".join(v.text for v in verses))]


def load() -> list[TextSpec]:
    for spec in CATALOG:
        spec.segments = _fetch(spec)
        spec.text = "\n".join(spec.segments)
    return CATALOG


if __name__ == "__main__":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    specs = load()
    print(f"גובה אות יעד: {LETTER_UM}µm · עובי קו {LETTER_UM*STROKE_RATIO:.1f}µm\n")
    print(f"{'#':>2} {'דגם':26s} {'מראה מקום':22s} {'תווים':>7s} {'שבב':>9s}  צורה")
    print("-" * 92)
    for i, s in enumerate(specs, 1):
        flag = "" if s.text else "  << ריק!"
        print(f"{i:2d} {s.title:26s} {s.ref:22s} {s.chars:7,d} {s.chip_mm:7.2f}מ\"מ  {s.form}{flag}")
