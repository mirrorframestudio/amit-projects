"""
בניית סרטון ההירו של מִקְרָא.

------------------------------------------------------------------
מצלמה אחת, שלוש שכבות, אפס חיתוכים.

הסרטון הישן היה שני צילומים עם חיתוך ביניהם, ולכן הוא רק הראה
תכשיט. כאן יש מצלמה וירטואלית אחת עם שלושה פרמטרים - כמה גדול
השבב על המסך, כמה המצלמה מגולגלת, ומה נמצא מתחת - וכל שכבה
מצוירת דרך אותה טרנספורמציה אפינית. לכן המעברים אינם מעברים:
העין נעולה על ריבוע כחול שגדל, והחומר מתחתיו מתחלף.

השבב משובץ במעוין - נמדד מהצילום, 52% מילוי של תיבה חוסמת, כלומר
ריבוע מסובב ב-45 מעלות. המצלמה מתגלגלת לאותן 45 מעלות בדיוק, כך
שברגע שנכנסים אל תוך השבב הטקסט יושב ישר. זו לא תנועה דקורטיבית -
זה מה שעושים כשמיישרים דגימה מתחת למיקרוסקופ.
------------------------------------------------------------------

השכבה השלישית היא הדמיה ומסומנת ככזו. הטקסט בה אמיתי - נקרא
מקובץ הצריבה, מעוצב באותו HarfBuzz שמפיק את קובץ הייצור, ופרוס
בגובה 15 מיקרון כמו במפרט. אבל בגובה הזה אי אפשר לראות אותו בעין,
ולהראות אותו בלי לומר "הדמיה" סותר את מה שהאתר עצמו כותב.
"""
from __future__ import annotations

import math
import subprocess
import sys
from pathlib import Path

from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def bidi_text(s: str) -> str:
    return get_display(s)

Image.MAX_IMAGE_PIXELS = None

SITE = Path(r"C:\Users\amith\ads-dashboard\.claude\worktrees\adoring-allen-44a65d\nano-scripture")
ENGRAVE = Path(r"C:\Users\amith\ads-dashboard\.claude\worktrees\adoring-allen-44a65d\nano-engrave")
TMP = Path(r"C:\Users\amith\AppData\Local\Temp\claude\hero")

FPS, DUR = 30, 9.0
CHIP_START, CHIP_END = 46.0, 5400.0   # צלע השבב על המסך, בפיקסלים

# נמדד מהפיקסלים, לא הוערך: מרכז השבב ואורך צלעו בכל מקור
WORN = {"file": SITE / "public/worn/etz-hachaim.jpg", "cx": 0.546, "cy": 0.537, "side": 27.0}
PACK = {"file": SITE / "public/products/YASNN004W.webp", "cx": 0.592, "cy": 0.586, "side": 139.0}
SIM = ENGRAVE / "out/chip-1_set-parnasa.png"

CHIP_TILT = 45.0          # השבב משובץ כמעוין
HANDOFF = (50.0, 95.0)    # התכשיט החד נכנס מעל הרקע כאן
SIM_IN = (260.0, 620.0)   # הטקסט עולה כשהמתכת כבר יוצאת מפוקוס


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def chip_px(t: float) -> float:
    return CHIP_START * (CHIP_END / CHIP_START) ** ease(t / DUR)


def roll_deg(c: float) -> float:
    """גלגול המצלמה. מתחיל רק כשמתקרבים, ומסתיים מיושר עם השבב"""
    return -CHIP_TILT * ease((c - 60.0) / 420.0)


def matte_of(img: Image.Image) -> Image.Image:
    """
    מסכת התכשיט מתוך צילום האולפן.

    הרקע שם שחור מוחלט (חציון לומיננסה 0) והתכשיט מגיע ל-193, ולכן
    סף רך על הבהירות מספיק ואין צורך במפתח כרומטי. זה מה שמאפשר
    להניח את התכשיט על הצילום שעל הגוף במקום להחליף אליו את הפריים -
    כלומר בלי שהרקע יקפוץ לשחור באמצע הזום.
    """
    lum = img.convert("L").point(lambda v: max(0, min(255, int((v - 12) * 255 / 30))))
    return lum.filter(ImageFilter.GaussianBlur(1.2))


def draw_layer(img, cx, cy, side, want, W, H, roll, extra_rot=0.0, bg=(11, 10, 8)):
    """
    ציור שכבה דרך טרנספורמציה אפינית אחת.

    PIL ממפה פלט->קלט, ולכן המטריצה היא ההופכית: לכל פיקסל על המסך
    מחושב מאיפה במקור לדגום אותו. דגימה אחת במקום סיבוב-ואז-שינוי-גודל
    שומרת חדות ומונעת שני עיגולים רצופים.
    """
    s = want / side
    a = math.radians(-(roll + extra_rot))
    k = 1.0 / s
    cos, sin = math.cos(a) * k, math.sin(a) * k
    ox, oy = W / 2.0, H / 2.0
    px, py = cx * img.width, cy * img.height
    m = (cos, -sin, px - cos * ox + sin * oy,
         sin, cos, py - sin * ox - cos * oy)
    return img.transform((W, H), Image.AFFINE, m, resample=Image.BICUBIC, fillcolor=bg)


def diamond_mask(W, H, want, roll, feather=True):
    """מסכת פני השבב: ריבוע בגודלו, מסובב יחד עם המצלמה"""
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    a = math.radians(CHIP_TILT + roll)
    r = want / 2.0
    pts = []
    for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        x, y = dx * r, dy * r
        pts.append((W / 2 + x * math.cos(a) - y * math.sin(a),
                    H / 2 + x * math.sin(a) + y * math.cos(a)))
    d.polygon(pts, fill=255)
    return m


def surface(sim: Image.Image) -> Image.Image:
    """
    ברק עדין על פני השבב.

    בלעדיו השטח שמעל ומתחת לגוש הטקסט הוא מלבן כחול שטוח, והמעבר
    בין טקסט לריק נראה כמו קצה של תיבה ולא כמו פני חומר. ההדמיה
    מסומנת ככזו על המסך, ולכן משטח שנראה כמו סיליקון הוא תיאור
    ולא טענה נוספת.
    """
    w = sim.width
    grad = Image.linear_gradient("L").resize((w, w)).rotate(28, resample=Image.BICUBIC)
    grad = grad.filter(ImageFilter.GaussianBlur(w // 14)).point(lambda v: 150 + v // 6)
    sheen = Image.new("RGB", (w, w), (44, 74, 140))
    return Image.composite(sim, Image.blend(sim, sheen, 0.16), grad)


def build(W, H, out: Path):
    worn = Image.open(WORN["file"]).convert("RGB")
    pack = Image.open(PACK["file"]).convert("RGB")
    sim = surface(Image.open(SIM).convert("RGB"))
    pmatte = matte_of(pack).convert("RGB")

    frames = TMP / f"f{W}x{H}"
    frames.mkdir(exist_ok=True)
    for old in frames.glob("*.jpg"):
        old.unlink()

    fsize = max(18, W // 42)
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", fsize)
    except OSError:
        font = ImageFont.load_default()

    n = int(DUR * FPS)
    for i in range(n):
        c = chip_px(i / FPS)
        roll = roll_deg(c)

        # הרקע הוא תמיד הצילום שעל הגוף. הוא נמתח והולך ככל שנכנסים,
        # וזה בדיוק מה שרקע במאקרו אמור לעשות - לא לקפוץ לשחור
        frame = draw_layer(worn, WORN["cx"], WORN["cy"], WORN["side"], c, W, H, roll,
                           bg=(26, 20, 16))
        # רק הרקע מתרכך, ורק אחרי שהתכשיט החד כבר עליו. זה לא טשטוש
        # של המעבר אלא עומק שדה - וזה גם מה שמעלים את השרשרת הכפולה,
        # ששני הצילומים לא מיישרים בדיוק זה על זה
        if c > HANDOFF[0]:
            soft = min(16.0, (c / (WORN["side"] * 2.2) - 1.0) * 2.4)
            if soft > 0.4:
                frame = frame.filter(ImageFilter.GaussianBlur(soft))

        # התכשיט מצולם האולפן מונח מעליו דרך מסכה, ולכן הוא נעשה חד
        # יותר בלי שהפריים יתחלף. שני התכשיטים מיושרים על אותו שבב,
        # ולכן זה נקרא כהתמקדות ולא כהחלפה
        jewel = draw_layer(pack, PACK["cx"], PACK["cy"], PACK["side"], c, W, H, roll,
                           bg=(0, 0, 0))
        mask = draw_layer(pmatte, PACK["cx"], PACK["cy"], PACK["side"], c, W, H, roll,
                          bg=(0, 0, 0)).convert("L")
        if c < HANDOFF[1]:
            k = ease((c - HANDOFF[0]) / (HANDOFF[1] - HANDOFF[0]))
            mask = mask.point(lambda v, k=k: int(v * k))
        frame.paste(jewel, (0, 0), mask)

        # הטקסט עולה על פני השבב עצמו, בתוך המעוין, ולא מחליף את
        # הפריים. מסביבו נשארים הכסף והזירקוניה האמיתיים - עד שהזום
        # מוציא אותם מהמסגרת מעצמו
        if c > SIM_IN[0]:
            layer = draw_layer(sim, 0.5, 0.5, sim.width, c, W, H, roll,
                               extra_rot=CHIP_TILT, bg=(10, 26, 58))
            k = ease((c - SIM_IN[0]) / (SIM_IN[1] - SIM_IN[0]))
            mask = diamond_mask(W, H, c * 1.02, roll)
            if k < 1.0:
                mask = mask.point(lambda v, k=k: int(v * k))
            frame.paste(layer, (0, 0), mask)

        if c > SIM_IN[1]:
            k = min(1.0, (c - SIM_IN[1]) / 300.0)
            d = ImageDraw.Draw(frame, "RGBA")
            # PIL כאן בלי raqm, ולכן הוא לא הופך עברית בעצמו. היפוך
            # ידני של המחרוזת שובר מספרים ("15" היה נכתב "51"), ולכן
            # ההיפוך נעשה באלגוריתם הדו-כיווני של יוניקוד
            # בלי מספר המיקרונים. מפרט הייצור אומר 15 והאתר אומר 9,
            # והשניים לא יכולים להיות שניהם נכונים - עד שזה ייפתר,
            # הירו לא ישא צד ולא יסתור את העמוד שהוא יושב עליו
            label = bidi_text("הדמיה · הנוסח המלא, כפי שהוא נצרב")
            tw = d.textlength(label, font=font)
            pad = fsize * 0.7
            x, y = (W - tw) / 2, H - fsize * 3.6
            d.rounded_rectangle([x - pad, y - pad * 0.55, x + tw + pad, y + fsize * 1.35],
                                radius=fsize * 0.4, fill=(8, 10, 16, int(165 * k)))
            d.text((x, y), label, font=font, fill=(232, 226, 214, int(240 * k)))

        frame.save(frames / f"{i:04d}.jpg", quality=93)
        if i % 60 == 0:
            print(f"    {i:>3}/{n}  שבב {c:>6.0f}px  גלגול {roll:5.1f}°")

    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", str(frames / "%04d.jpg"),
         "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p",
         "-movflags", "+faststart", "-an", str(out)], check=True)
    print(f"  -> {out.name}  {out.stat().st_size / 1048576:.2f} MB")


if __name__ == "__main__":
    import io

    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    TMP.mkdir(parents=True, exist_ok=True)
    print("  אנכי")
    build(1080, 1920, TMP / "hero-portrait.mp4")
    print("  אופקי")
    build(1920, 1080, TMP / "hero-landscape.mp4")
