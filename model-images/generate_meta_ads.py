"""
Meta Ads creative generator for OneZoneJersey.
Takes jersey product images from WooCommerce, sends to Gemini for a dynamic
marketing photo, then composites Hebrew text with Pillow.

Outputs two formats per product:
  {id}_square.jpg  — 1080x1080  (feed / carousel)
  {id}_story.jpg   — 1080x1920  (stories / reels)

Usage:
  python generate_meta_ads.py --text "מבצע! 3 ב-300₪" --limit 5 --preview
  python generate_meta_ads.py --text "קולקציית 25/26" --ids 123,456 --preview
  python generate_meta_ads.py --text "הזמן עכשיו" --limit 10 --style street
"""

import os
import sys
import time
import json
import io
import requests
from pathlib import Path
from datetime import datetime

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent


def load_env(path):
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()
    except FileNotFoundError:
        pass


load_env(ROOT / "fb-ads-analyzer" / ".env")
load_env(ROOT / "adcampaigner" / ".env")
load_env(ROOT / "model-images" / ".env")

WOO_URL = os.getenv("WOO_URL", "").rstrip("/")
WOO_KEY = os.getenv("WOO_CONSUMER_KEY", "")
WOO_SECRET = os.getenv("WOO_CONSUMER_SECRET", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

OUTPUT_DIR = Path(__file__).resolve().parent / "output" / "meta_ads"

# Brand colors (dark background strip for story format)
BRAND_BG = (15, 15, 20)      # near-black
BRAND_ACCENT = (255, 210, 0)  # gold / yellow

RUBIK_FONT = ROOT / "nations-slider" / "Rubik-Black.ttf"
WINDOWS_FONTS = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/Arial.ttf",
    "C:/Windows/Fonts/calibrib.ttf",
]

# ── Gemini prompts ─────────────────────────────────────────────────────────────

STYLE_BACKGROUNDS = {
    "stadium": "vibrant packed football stadium crowd in the background, blurred (bokeh), dramatic evening floodlight glow, electric atmosphere",
    "street": "urban street background, golden hour warm sunset lighting, city bokeh lights, lifestyle feel",
    "action": "outdoor training pitch, motion-blurred green grass background, dynamic sports action feel, natural daylight",
    "locker_room": "professional football locker room with lockers and team colors, atmospheric warm moody lighting",
    "trophy": "championship celebration moment, confetti falling, gold and white tones, dramatic lighting",
    "pitch": "close-up on lush green football pitch grass, low angle, soft daylight, shallow depth of field",
    "studio_dark": "minimalist solid dark gradient studio background, professional product photography lighting",
    "studio_color": "vibrant gradient studio background (red to orange), clean professional sports photography lighting",
    "graffiti": "urban graffiti wall background, colorful street art, gritty urban aesthetic, daylight",
    "sunset": "dramatic sunset sky with warm orange and purple tones, cinematic lighting",
    "night_city": "modern city skyline at night with neon lights, blue and purple bokeh, night photography",
    "beach": "tropical beach with white sand and ocean, golden hour lighting, summer lifestyle vibes",
    "fans_pov": "passionate fan crowd in stadium, hands raised holding scarves, low angle, electric atmosphere",
    "tunnel": "dark dramatic player tunnel exit with bright stadium lights ahead, cinematic backlit silhouette feel",
    "training": "modern indoor gym/training facility, equipment blurred in background, clean energetic lighting",
}


# Meta/Instagram safe zones — fraction of (top, right, bottom, left)
# For 9:16 stories: Instagram reserves top ~13% (profile bar) and bottom ~20% (CTA buttons).
# Templates draw strictly inside these zones to avoid being cropped/covered by UI.
SAFE_ZONES = {
    "1:1":  (0.05, 0.05, 0.05, 0.05),
    "4:5":  (0.06, 0.05, 0.06, 0.05),
    "9:16": (0.14, 0.05, 0.21, 0.05),  # ← stories: top + bottom reserved
    "16:9": (0.05, 0.05, 0.06, 0.05),
}


def safe_box(aspect: str, w: int, h: int):
    """Return (x1, y1, x2, y2) — the rectangle that's guaranteed visible in feed/stories."""
    t, r, b, l = SAFE_ZONES.get(aspect, SAFE_ZONES["1:1"])
    return (int(w * l), int(h * t), int(w * (1 - r)), int(h * (1 - b)))


ASPECT_DESC = {
    "1:1":  ("Square 1:1 format, 1080×1080 pixels",            (1080, 1080)),
    "4:5":  ("Vertical 4:5 portrait format, 1080×1350 pixels", (1080, 1350)),
    "9:16": ("Vertical 9:16 story/reel format, 1080×1920 pixels", (1080, 1920)),
    "16:9": ("Horizontal 16:9 landscape format, 1920×1080 pixels", (1920, 1080)),
}


GENDER_DESC = {
    "male":   ("man",   "men",   "all male"),
    "female": ("woman", "women", "all female"),
    "mixed":  ("person", "people", "a mix of men and women"),
}

AGE_DESC = {
    "kids":   ("child (age 6-11)",        "children (age 6-11)",        "happy, playful, age-appropriate, kids' fashion catalog feel"),
    "teens":  ("teenager (age 13-17)",    "teenagers (age 13-17)",      "youthful, casual, hanging out together"),
    "adults": ("adult (age 22-35)",       "adults (age 22-35)",         "confident, relatable, like real customers"),
    "family": ("family member",           "family members of mixed ages (parents and kids together, age range 8-45)", "warm family group portrait, parents with their children"),
}


PHOTO_STYLE = {
    "candid": {
        "opener": "AUTHENTIC, CANDID lifestyle photo for a football jersey shop's Instagram — NOT a polished studio ad",
        "vibe":   "Visual style: looks like a friend's iPhone photo at a real moment, NOT a Nike commercial. Slightly imperfect framing is fine. Natural lighting, real skin, realistic atmosphere.",
        "lighting": "NATURAL ambient light from the scene — NOT dramatic studio lighting. Use the actual light sources in the scene at realistic exposure.",
        "style_line": "AUTHENTIC LIFESTYLE PHOTOGRAPHY, candid feel, like a real iPhone photo. NOT a glossy magazine ad. Slight motion blur, natural skin texture, realistic depth of field.",
        "anti_ai": True,
    },
    "polished": {
        "opener": "PROFESSIONAL marketing advertisement photo for a football jersey brand",
        "vibe":   "Visual style: polished commercial photography, clean composition, premium brand feel.",
        "lighting": "Premium controlled lighting — flattering on the models and sharp on the jerseys. Editorial-quality lighting.",
        "style_line": "Premium sportswear campaign quality — Nike / Adidas / Puma professional advertisement photography. Clean and aspirational.",
        "anti_ai": False,
    },
    "phone_snapshot": {
        "opener": "Casual phone snapshot for a football fan's social feed — looks like a quick photo grabbed by a friend",
        "vibe":   "Visual style: imperfect, authentic, low-key. Like a quick photo taken on the go, not planned.",
        "lighting": "Whatever ambient light is around — could be slightly over- or under-exposed, slightly grainy, totally OK.",
        "style_line": "iPhone snapshot aesthetic. Real, unplanned, human. NOT staged.",
        "anti_ai": True,
    },
}


def build_group_prompt(n: int, style: str = "stadium", user_prompt: str = "",
                       aspect: str = "1:1", gender: str = "mixed", age: str = "adults",
                       photo_style: str = "candid") -> str:
    bg = STYLE_BACKGROUNDS.get(style, STYLE_BACKGROUNDS["stadium"])
    aspect_text = ASPECT_DESC.get(aspect, ASPECT_DESC["1:1"])[0]
    g_single, g_plural, g_phrase = GENDER_DESC.get(gender, GENDER_DESC["mixed"])
    a_single, a_plural, a_mood = AGE_DESC.get(age, AGE_DESC["adults"])
    ps = PHOTO_STYLE.get(photo_style, PHOTO_STYLE["candid"])
    extra = f"\n\nADDITIONAL DIRECTION FROM USER: {user_prompt.strip()}" if user_prompt and user_prompt.strip() else ""

    if n <= 1:
        models = (f"one completely fictional, non-recognizable everyday {g_single} who is a {a_single}, "
                  f"with regular build and natural expression — {a_mood}")
        wearing = "wearing the uploaded football jersey"
        comp = "Pose: relaxed natural stance, chest clearly visible, full upper body in frame."
    else:
        models = (f"{n} completely fictional, non-recognizable everyday {g_plural} ({g_phrase}) "
                  f"who are {a_plural}, with varied body types, varied appearance and skin tones — {a_mood}, "
                  f"shown TOGETHER in one frame")
        wearing = (f"each person wearing one of the {n} uploaded jerseys — "
                   f"one DIFFERENT jersey per person, matching the input images exactly")
        comp = (f"Composition: all {n} people clearly visible side-by-side or in a relaxed friendly group pose, "
                f"each jersey fully visible, authentic group portrait composition.")

    anti_ai_block = """

ANTI-AI-LOOK CHECKLIST — actively AVOID these telltale AI-generated signs:
- Identical perfect smiles on everyone — instead: varied expressions, some neutral, some half-smiling, one looking away, one mid-laugh
- Symmetrical group composition with everyone facing camera — instead: natural asymmetry, some slightly turned, varied head heights, candid grouping
- Flawless skin / perfect teeth / perfect hair — instead: real human texture, slight imperfections, casual hair
- Studio-grade perfect lighting — instead: matches the background's light realistically, with shadows where they belong
- Overly saturated colors — instead: realistic color grading, slightly muted is OK
- Glassy / waxy / plastic skin — instead: matte natural skin with pores
- Suspiciously clean composition — instead: a bit of incidental clutter (a bag, a phone, a half-eaten food, an extra person at the edge)

Composition feel: like a quick snapshot a friend took — not a posed professional photoshoot. The viewer should be unsure whether this is a real photo or AI.""" if ps["anti_ai"] else ""

    return f"""Create a {ps["opener"]} using the uploaded football jersey image{'s' if n > 1 else ''}.

{ps["vibe"]}

Show {models}, {wearing}.

{comp}{anti_ai_block}

MODEL IDENTITY — ABSOLUTELY CRITICAL (the most important rule):

THE MOST IMPORTANT RULE: The models in this image are CUSTOMERS / FANS of the team, NOT players. They are ordinary Israeli people who happen to wear this jersey because they are fans. They have NO connection to the actual team.

- DO NOT generate ANY player from the actual team whose jersey is shown in the input. If the jersey is Barcelona, the models must NOT look like Lamine Yamal, Pedri, Gavi, Lewandowski, Ferran Torres, Raphinha, Frenkie de Jong, Ter Stegen, or ANY current/past Barcelona player. If the jersey is Real Madrid, NOT Bellingham/Vinicius/Mbappé/Modric/Rodrygo/etc. If Manchester United, NOT Bruno Fernandes/Rashford/Casemiro/etc. APPLY THIS UNIVERSALLY for every team.
- Models MUST look ISRAELI — Mediterranean / Middle-Eastern features typical of Israelis (Mizrahi, Sephardi, Ashkenazi, Ethiopian-Israeli, Arab-Israeli). Skin tones olive to medium-dark, dark hair common, dark eyes common. NOT generic Northern-European blond/blue-eyed look, AND NOT South-American or West-African football-star looks.
- Models must be COMPLETELY ORIGINAL, AUTHENTIC, ORDINARY, EVERYDAY-LOOKING people — NOT athletes, NOT celebrities, NOT public figures, NOT football stars
- Banned faces (do not even slightly resemble): Messi, Cristiano Ronaldo, Bruno Fernandes, Mbappé, Haaland, Neymar, Salah, Bellingham, Vinicius Jr, De Bruyne, Modric, Lewandowski, Benzema, Kane, Foden, Saka, Pedri, Gavi, Lamine Yamal, Ferran Torres, Raphinha, Rashford, Pulisic, Xavi, Iniesta, Ronaldinho, Ramos, or ANY other professional footballer past or present.
- Do NOT replicate the typical "European footballer look": short fade haircut + manicured beard + chiselled cheekbones + intense gaze. THIS LOOK IS BANNED.
- Required appearance traits to push AWAY from football-star aesthetic — be aggressive about variety:
  * At least one model wearing GLASSES (regular or sunglasses)
  * Hairstyles: long hair, curls, afro, messy hair, ponytails, beanies, caps — NOT the standard short cropped athlete cut
  * Faces: ordinary proportions, slightly asymmetric, lived-in, friendly. Must look like a stranger on Tel Aviv street
  * Body: average / regular / slightly out-of-shape build — NOT chiselled or muscular like a pro athlete
  * Optional: light stubble or full beard (not the manicured short footballer beard), tattoos, piercings, casual everyday accessories
- The image MUST NOT look like an official team photoshoot. It must feel like real customers/fans wearing the jerseys, snapped on a regular Israeli street.
- If a model starts looking like a real player, you MUST drastically change: add thick-frame glasses, change hairstyle to long/curly/afro, add a beanie, change beard style, or use a three-quarter angle that obscures recognition.

Background: {bg}.
Lighting: {ps["lighting"]}
Style: {ps["style_line"]}

JERSEY RULES — STRICT (the second most important rule after model identity):

JERSEY IDENTITY — NEVER SUBSTITUTE:
- The jersey shown in EACH input image is THE EXACT jersey to be worn — not "a jersey of the same team", not "a similar World Cup jersey", not "a default version of this team's kit"
- If the input shows a club jersey (e.g. Real Madrid 2024 home), do NOT replace it with the national team's jersey or with any other season/version
- If the input shows a specific kit version (home/away/third/special edition), reproduce THAT specific kit — do not default to the most famous version
- Even if you're "almost sure" what the team is, ignore your training assumptions and copy the input visually, pixel by pixel
- If multiple jerseys are uploaded, person N wears jersey N — keep the same order as uploaded, no swapping

GENERAL ACCURACY:
- Copy the exact colors, gradients, patterns, stripes, and fabric texture as shown in each input
- Match the cut, collar style, sleeve length, and fit precisely

FINE DETAILS — TREAT AS REFERENCE PHOTO, COPY PIXEL-LIKE:
- The team CREST / BADGE is a critical visual element — copy it with EXTREME accuracy
  * Pay close attention to every shape, color, and any text/letters/numbers INSIDE the crest
  * If the crest contains text (team name, year, motto, initials), reproduce that text EXACTLY as it appears in the input — do not invent letters, do not change spelling, do not approximate
  * If you cannot read the text in the crest clearly, render it as a faithful blurry/abstract representation rather than inventing fake text
- The MANUFACTURER LOGO (Nike swoosh, Adidas trefoil/three-stripes, Puma cat, New Balance NB, Umbro, Kappa, etc.) — preserve its exact placement, scale, and color
- The MAIN SPONSOR LOGO on the chest — reproduce its exact shape, color, and any wordmark/text within it. Do NOT substitute famous brands for what's actually shown.
- Secondary sponsors (sleeves, lower chest, back) — same accuracy rule
- Numbers, names, or text on the back / collar / hem — copy precisely or omit if not visible

COMMON MISTAKES TO AVOID:
- Inventing or hallucinating text, letters, or numbers that aren't actually in the input
- Substituting a different team's crest because the colors look similar
- Replacing the manufacturer (e.g. swapping Nike for Adidas) — never do this
- Adding generic "JERSEY", "FOOTBALL", or fake sponsor text where none exists
- Mirroring or flipping logos accidentally

If any small detail is genuinely unreadable in the input, render it as a faithful soft/blurred version of what's there — DO NOT invent a clean fake version.

SHARPNESS PRIORITY: keep the crest, manufacturer logo, and main sponsor logo IN SHARP FOCUS — these are the brand-defining elements customers recognize.

NO text, NO captions, NO watermarks, NO overlaid graphics in the generated image — clean image only.{extra}

OUTPUT FORMAT: {aspect_text} — make sure the entire frame is filled with the scene (no white borders, no empty space).

FINAL CHECKLIST BEFORE GENERATING:
1. Jersey identity: EVERY person wears the EXACT jersey from the input (same season, same version, same sponsors) — no substitution with "similar" jerseys
2. Jersey crest: every detail and every letter/number INSIDE it is faithful to the input — no invented text
3. Manufacturer logo + main sponsor: exact match to the input, sharp and centered correctly
4. Models: ordinary Israeli everyday-looking people, NOT the team's actual players
5. Photo aesthetic: looks like a candid iPhone snapshot, NOT a polished studio ad — natural light, real skin texture, varied expressions, slight imperfection
6. Frame is fully filled, no empty borders, no overlaid text or watermarks"""


def build_ad_prompt(style: str = "stadium") -> str:
    """Backward-compat single-jersey prompt for CLI."""
    return build_group_prompt(1, style)


# ── WooCommerce helpers ────────────────────────────────────────────────────────

def get_top_products(n: int = 50) -> list:
    r = requests.get(
        f"{WOO_URL}/wp-json/wc/v3/products",
        params={"orderby": "popularity", "order": "desc", "per_page": n, "status": "publish"},
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def get_products_by_ids(ids: list) -> list:
    products = []
    for pid in ids:
        r = requests.get(
            f"{WOO_URL}/wp-json/wc/v3/products/{pid}",
            auth=(WOO_KEY, WOO_SECRET),
            headers={"User-Agent": UA},
            timeout=30,
        )
        if r.status_code == 200:
            products.append(r.json())
        else:
            print(f"  ⚠ Could not fetch product {pid}: {r.status_code}")
    return products


def download_image(url: str) -> bytes:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=15)
    r.raise_for_status()
    return r.content


# ── Gemini ─────────────────────────────────────────────────────────────────────

def generate_marketing_copy(jersey_names: list, style: str = "stadium",
                            user_prompt: str = "", n: int = 5) -> list:
    """Generate Hebrew marketing copy for the ad. Returns list of dicts: [{headline, subline, cta, hashtags, full}]."""
    from google import genai
    from google.genai import types

    style_he = {
        "stadium": "אצטדיון", "street": "רחוב עירוני", "action": "אימון בחוץ",
        "locker_room": "חדר הלבשה", "trophy": "חגיגת ניצחון", "pitch": "מגרש דשא",
        "studio_dark": "סטודיו כהה", "studio_color": "סטודיו צבעוני",
        "graffiti": "קיר גרפיטי", "sunset": "שקיעה", "night_city": "לילה בעיר",
        "beach": "חוף ים", "fans_pov": "קהל אוהדים",
        "tunnel": "מנהרת השחקנים", "training": "חדר כושר",
    }.get(style, style)

    jerseys_str = " + ".join(jersey_names) if jersey_names else "חולצות כדורגל"
    extra = f"\nתיאור התמונה: {user_prompt.strip()}" if user_prompt and user_prompt.strip() else ""

    prompt = f"""אתה כותב פרסומות מקצועי לעסק ישראלי בשם OneZone Jersey שמוכר חולצות כדורגל מקוריות.

יצרנו תמונת פרסומת עם: {jerseys_str}
רקע: {style_he}{extra}

תייצר {n} גרסאות של קופי שיווקי בעברית למודעת פייסבוק / אינסטגרם. כל גרסה תכלול:
- HEADLINE: כותרת קצרה ומושכת (5-8 מילים)
- SUBLINE: שורה משלימה (5-12 מילים)
- CTA: קריאה לפעולה קצרה (2-4 מילים)
- HASHTAGS: 5-7 hashtags בעברית ובאנגלית

כללים:
- עברית טבעית, לא מתורגמת. אסור ניסוחים מלאכותיים.
- טון ספורטיבי, נמרץ, מותאם לקהל אוהדי כדורגל ישראלים
- כל גרסה ב-VIBE שונה: 1=שיווקי-קלאסי, 2=מבצע, 3=רגשי-זיקה לאוהדים, 4=ישיר-תכליתי, 5=הומוריסטי-קליל
- אל תפרט מחירים מדומים, אלא אם המשתמש ביקש
- אל תשתמש באימוג'ים מוגזם — 1-3 אימוג'ים רלוונטיים בלבד לכל גרסה

החזר את התשובה במבנה JSON בלבד (ללא הסבר):
{{
  "variants": [
    {{"vibe":"קלאסי","headline":"...","subline":"...","cta":"...","hashtags":["#כדורגל","#football"]}},
    ...
  ]
}}"""

    client = genai.Client(api_key=GEMINI_KEY)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.9,
        ),
    )
    try:
        data = json.loads(response.text)
        return data.get("variants", [])
    except Exception:
        return []


def generate_ad_image(jersey_bytes, style: str = "stadium",
                      user_prompt: str = "", aspect: str = "1:1",
                      gender: str = "mixed", age: str = "adults",
                      photo_style: str = "candid") -> bytes:
    """Generate one ad. Accepts a single bytes object or a list of bytes (group)."""
    from google import genai
    from google.genai import types

    if isinstance(jersey_bytes, (bytes, bytearray)):
        jerseys = [bytes(jersey_bytes)]
    else:
        jerseys = list(jersey_bytes)

    client = genai.Client(api_key=GEMINI_KEY)
    parts = [types.Part.from_bytes(data=j, mime_type="image/jpeg") for j in jerseys]
    parts.append(types.Part.from_text(
        text=build_group_prompt(len(jerseys), style, user_prompt, aspect, gender, age, photo_style)
    ))

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=parts,
        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            data = part.inline_data.data
            return data if isinstance(data, bytes) else data.encode("latin-1")
    raise ValueError("Gemini did not return an image")


_LOGO_DIR = Path(__file__).resolve().parent
STATS_PATH = _LOGO_DIR / "stats.json"
COST_PER_IMAGE_USD = 0.04  # Gemini 3 Pro Image rough estimate; adjust as needed
USD_TO_ILS = 3.7


def log_generation(aspect: str, style: str, n_jerseys: int):
    """Append a record to stats.json after each successful Gemini call."""
    rec = {
        "ts": datetime.now().isoformat(timespec="seconds"),
        "aspect": aspect,
        "style": style,
        "n_jerseys": n_jerseys,
        "cost_usd": COST_PER_IMAGE_USD,
    }
    try:
        data = json.loads(STATS_PATH.read_text(encoding="utf-8")) if STATS_PATH.exists() else {"records": []}
    except Exception:
        data = {"records": []}
    data["records"].append(rec)
    STATS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def get_stats_summary() -> dict:
    """Return aggregated stats: today / this month / total."""
    if not STATS_PATH.exists():
        return {"today": 0, "month": 0, "total": 0,
                "today_cost_usd": 0.0, "month_cost_usd": 0.0, "total_cost_usd": 0.0,
                "month_cost_ils": 0.0}
    try:
        data = json.loads(STATS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"today": 0, "month": 0, "total": 0,
                "today_cost_usd": 0.0, "month_cost_usd": 0.0, "total_cost_usd": 0.0,
                "month_cost_ils": 0.0}
    now = datetime.now()
    today_str = now.date().isoformat()
    month_str = now.strftime("%Y-%m")
    today, month, total = 0, 0, 0
    today_c, month_c, total_c = 0.0, 0.0, 0.0
    for r in data.get("records", []):
        c = r.get("cost_usd", COST_PER_IMAGE_USD)
        total += 1; total_c += c
        ts = r.get("ts", "")
        if ts.startswith(today_str):
            today += 1; today_c += c
        if ts.startswith(month_str):
            month += 1; month_c += c
    return {
        "today": today, "month": month, "total": total,
        "today_cost_usd": round(today_c, 3),
        "month_cost_usd": round(month_c, 3),
        "total_cost_usd": round(total_c, 3),
        "month_cost_ils": round(month_c * USD_TO_ILS, 1),
    }

_LOGO_CANDIDATES = ["logo.png", "logo.jpg", "logo.jpeg", "logo.png.jpg", "logo.webp"]


def _find_logo() -> Path | None:
    for name in _LOGO_CANDIDATES:
        p = _LOGO_DIR / name
        if p.exists():
            return p
    return None


# Backward-compat: existing code reads `LOGO_PATH.exists()`
class _LogoPath:
    def exists(self) -> bool:
        return _find_logo() is not None
    def __str__(self) -> str:
        p = _find_logo()
        return str(p) if p else str(_LOGO_DIR / "logo.png")
    def __fspath__(self) -> str:
        return self.__str__()


LOGO_PATH = _LogoPath()


def _prepare_logo(target_w: int):
    """Load logo and remove dark background. Returns RGBA Image or None."""
    p = _find_logo()
    if p is None:
        return None
    try:
        from PIL import Image
        import numpy as np
        logo = Image.open(p).convert("RGBA")
        arr = np.array(logo)
        # Smooth alpha falloff: dark pixels (luminance < 25) → transparent;
        # bright pixels (> 80) → fully opaque; smooth gradient in between.
        lum = arr[..., :3].astype(np.float32).mean(axis=2)
        alpha = np.clip((lum - 25) / 55.0, 0.0, 1.0) * 255.0
        # Multiply with existing alpha to preserve any transparency in source
        arr[..., 3] = (arr[..., 3].astype(np.float32) * alpha / 255.0).astype(np.uint8)
        out = Image.fromarray(arr, mode="RGBA")
        # Resize to requested width
        ratio = out.height / out.width
        out = out.resize((target_w, int(target_w * ratio)), Image.LANCZOS)
        return out
    except Exception as e:
        print(f"  ⚠ logo error: {e}")
        return None


def add_logo(image_bytes: bytes, size_pct: float = 0.18,
             position: str = "top-right", opacity: float = 1.0) -> bytes:
    """Composite logo at chosen corner. position ∈ {top-right, top-left, bottom-right, bottom-left}."""
    from PIL import Image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    target_w = max(40, int(img.width * size_pct))
    logo = _prepare_logo(target_w)
    if logo is None:
        return image_bytes

    if 0.0 <= opacity < 1.0:
        # Reduce alpha channel uniformly
        a = logo.split()[-1].point(lambda v: int(v * opacity))
        logo.putalpha(a)

    pad = int(img.width * 0.025)
    if position == "top-left":
        x, y = pad, pad
    elif position == "bottom-right":
        x, y = img.width - logo.width - pad, img.height - logo.height - pad
    elif position == "bottom-left":
        x, y = pad, img.height - logo.height - pad
    else:  # top-right (default)
        x, y = img.width - logo.width - pad, pad

    img.paste(logo, (x, y), logo)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=92, optimize=True)
    return buf.getvalue()


def swap_background(image_bytes: bytes, new_style: str, user_prompt: str = "") -> bytes:
    """Send an existing ad image to Gemini and ask it to change ONLY the background."""
    from google import genai
    from google.genai import types

    bg = STYLE_BACKGROUNDS.get(new_style, STYLE_BACKGROUNDS["stadium"])
    extra = f"\nADDITIONAL DIRECTION: {user_prompt.strip()}" if user_prompt and user_prompt.strip() else ""
    prompt = f"""Edit the uploaded image: change ONLY the background, keep everything else identical.

NEW BACKGROUND: {bg}.

CRITICAL RULES:
- Keep the people IDENTICAL — same faces, same poses, same expressions, same body shapes, same hair
- Keep the jerseys IDENTICAL — same colors, same logos, same patterns, same fit
- Keep the foreground composition IDENTICAL
- ONLY change what is behind the people (the background scene/environment)
- Match the new background's lighting subtly to the foreground for realism
- Output the same aspect ratio as the input image
- NO text, NO watermarks, NO overlaid graphics{extra}"""

    client = genai.Client(api_key=GEMINI_KEY)
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            types.Part.from_text(text=prompt),
        ],
        config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            data = part.inline_data.data
            return data if isinstance(data, bytes) else data.encode("latin-1")
    raise ValueError("Gemini did not return an image")


def upscale_image(image_bytes: bytes, factor: int = 2) -> bytes:
    """High-quality Lanczos upscale by factor (2 → 2K, 4 → 4K from a 1080 base)."""
    from PIL import Image, ImageFilter
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    if factor <= 1:
        return image_bytes
    new_size = (img.width * factor, img.height * factor)
    upscaled = img.resize(new_size, Image.LANCZOS)
    # Mild sharpening to compensate for upscale softness
    upscaled = upscaled.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=2))
    buf = io.BytesIO()
    upscaled.save(buf, format="JPEG", quality=92, optimize=True)
    return buf.getvalue()


def fit_to_aspect(image_bytes: bytes, aspect: str) -> bytes:
    """Smart center-crop to exact target dimensions for the requested aspect ratio."""
    from PIL import Image

    if aspect not in ASPECT_DESC:
        aspect = "1:1"
    target_w, target_h = ASPECT_DESC[aspect][1]

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    iw, ih = img.size
    src_a = iw / ih
    tgt_a = target_w / target_h

    if abs(src_a - tgt_a) < 0.02:
        out = img.resize((target_w, target_h), Image.LANCZOS)
    elif src_a > tgt_a:
        # source wider — crop sides
        new_w = int(round(ih * tgt_a))
        x = (iw - new_w) // 2
        out = img.crop((x, 0, x + new_w, ih)).resize((target_w, target_h), Image.LANCZOS)
    else:
        # source taller — crop top/bottom
        new_h = int(round(iw / tgt_a))
        y = (ih - new_h) // 2
        out = img.crop((0, y, iw, y + new_h)).resize((target_w, target_h), Image.LANCZOS)

    buf = io.BytesIO()
    out.save(buf, format="JPEG", quality=92, optimize=True)
    return buf.getvalue()


# ── Font helpers ───────────────────────────────────────────────────────────────

def load_font(size: int):
    from PIL import ImageFont

    if RUBIK_FONT.exists():
        try:
            return ImageFont.truetype(str(RUBIK_FONT), size)
        except Exception:
            pass
    for fp in WINDOWS_FONTS:
        try:
            return ImageFont.truetype(fp, size)
        except Exception:
            continue
    return ImageFont.load_default()


def to_display(text: str) -> str:
    """Convert Hebrew logical order to visual order for Pillow rendering."""
    try:
        from bidi.algorithm import get_display
        return get_display(text)
    except ImportError:
        return text


# ── Pillow compositing ─────────────────────────────────────────────────────────

def _draw_text_centered(draw, y: int, text: str, font, fill, width: int, shadow_color=None):
    from PIL import ImageDraw
    vis = to_display(text)
    bbox = draw.textbbox((0, 0), vis, font=font)
    tw = bbox[2] - bbox[0]
    tx = (width - tw) // 2
    if shadow_color:
        draw.text((tx + 2, y + 2), vis, font=font, fill=shadow_color)
    draw.text((tx, y), vis, font=font, fill=fill)


def make_square(image_bytes: bytes, ad_text: str, product_name: str, price: str) -> bytes:
    """1080×1080 — image full bleed, dark gradient bottom, Hebrew text overlay."""
    from PIL import Image, ImageDraw

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((1080, 1080), Image.LANCZOS)
    w, h = 1080, 1080

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Dark gradient over bottom 260px
    grad_h = 260
    for i in range(grad_h):
        alpha = int(200 * (i / grad_h))
        draw.rectangle([(0, h - grad_h + i), (w, h - grad_h + i + 1)], fill=(0, 0, 0, alpha))

    font_name = load_font(46)
    font_text = load_font(54)
    font_price = load_font(42)

    # Product name (smaller, top of gradient zone)
    _draw_text_centered(draw, h - 235, product_name, font_name, (220, 220, 220, 220), w, (0, 0, 0, 150))
    # Main ad text
    _draw_text_centered(draw, h - 170, ad_text, font_text, (255, 255, 255, 255), w, (0, 0, 0, 200))
    # Price
    if price:
        _draw_text_centered(draw, h - 95, price, font_price, BRAND_ACCENT + (255,), w, (0, 0, 0, 180))

    result = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    buf = io.BytesIO()
    result.save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue()


def make_story(image_bytes: bytes, ad_text: str, product_name: str, price: str) -> bytes:
    """1080×1920 — photo in top 1080px, branded text strip below."""
    from PIL import Image, ImageDraw

    # Top: product photo
    photo = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    photo = photo.resize((1080, 1080), Image.LANCZOS)

    canvas = Image.new("RGB", (1080, 1920), BRAND_BG)
    canvas.paste(photo, (0, 0))

    draw = ImageDraw.Draw(canvas)
    strip_top = 1080  # where the text area starts

    # Accent line separator
    draw.rectangle([(0, strip_top), (1080, strip_top + 4)], fill=BRAND_ACCENT)

    font_big = load_font(72)
    font_mid = load_font(52)
    font_small = load_font(40)

    # Main ad text — big and bold
    _draw_text_centered(draw, strip_top + 80, ad_text, font_big, (255, 255, 255), 1080, (40, 40, 40))

    # Product name
    _draw_text_centered(draw, strip_top + 200, product_name, font_mid, (200, 200, 200), 1080)

    # Price
    if price:
        _draw_text_centered(draw, strip_top + 310, price, font_big, BRAND_ACCENT, 1080, (20, 20, 20))

    # Site hint at bottom
    site_text = to_display("OneZoneJersey.co.il")
    bbox = draw.textbbox((0, 0), site_text, font=font_small)
    tw = bbox[2] - bbox[0]
    draw.text(((1080 - tw) // 2, 1850), site_text, font=font_small, fill=(100, 100, 100))

    buf = io.BytesIO()
    canvas.save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue()


# ── Price extraction ───────────────────────────────────────────────────────────

def extract_price(product: dict) -> str:
    raw = product.get("sale_price") or product.get("regular_price") or product.get("price") or ""
    if raw:
        try:
            return f"₪{int(float(raw))}"
        except ValueError:
            return f"₪{raw}"
    return ""


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    ad_text = ""
    limit = 10
    target_ids = []
    style = "stadium"
    preview_mode = True  # always preview unless --upload flag added later

    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--text" and i < len(sys.argv) - 1:
            ad_text = sys.argv[i + 1]
        if arg == "--limit" and i < len(sys.argv) - 1:
            limit = int(sys.argv[i + 1])
        if arg == "--ids" and i < len(sys.argv) - 1:
            target_ids = [int(x.strip()) for x in sys.argv[i + 1].split(",")]
        if arg == "--style" and i < len(sys.argv) - 1:
            style = sys.argv[i + 1]

    if not ad_text:
        print("Usage: python generate_meta_ads.py --text 'הטקסט שלך' [--limit N] [--ids 1,2] [--style stadium|street|action]")
        sys.exit(1)

    if not GEMINI_KEY:
        print("❌ Missing GEMINI_API_KEY in .env")
        sys.exit(1)
    if not all([WOO_URL, WOO_KEY, WOO_SECRET]):
        print("❌ Missing WooCommerce credentials in .env")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  Meta Ads Creative Generator")
    print(f"  טקסט: {ad_text}")
    print(f"  סגנון רקע: {style}")
    print(f"  פלט: {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    if target_ids:
        print(f"מושך {len(target_ids)} מוצרים לפי ID...")
        products = get_products_by_ids(target_ids)
    else:
        print(f"מושך {limit} מוצרים הכי נמכרים...")
        products = get_top_products(limit)
    print(f"נמצאו {len(products)} מוצרים\n")

    log_path = OUTPUT_DIR / "progress.json"
    progress = {}
    if log_path.exists():
        with open(log_path, encoding="utf-8") as f:
            progress = json.load(f)

    success, failed, skipped = 0, 0, 0

    for i, product in enumerate(products, 1):
        pid = product["id"]
        name = product["name"]
        imgs = product.get("images", [])
        img_url = imgs[0]["src"] if imgs else None
        price = extract_price(product)

        print(f"[{i}/{len(products)}] {name} (ID: {pid}) — {price}")

        if not img_url:
            print("  ⚠ אין תמונה, מדלג")
            skipped += 1
            continue

        # Skip non-jersey products
        skip_kw = ["מיסטרי בוקס", "צעיף", "צעיפים", "גרביים"]
        if any(kw in name for kw in skip_kw):
            print("  ✗ לא חולצה, מדלג")
            skipped += 1
            continue

        safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in name)[:50]
        square_file = f"{pid}_{safe_name}_square.jpg"
        story_file = f"{pid}_{safe_name}_story.jpg"

        try:
            print("  ↓ מוריד תמונת חולצה...")
            jersey_bytes = download_image(img_url)

            print(f"  🤖 Gemini — יוצר תמונת קריאייטיב ({style})...")
            raw_bytes = generate_ad_image(jersey_bytes, style)

            print("  🎨 מכין פורמט ריבוע 1:1...")
            square_bytes = make_square(raw_bytes, ad_text, name, price)
            (OUTPUT_DIR / square_file).write_bytes(square_bytes)
            print(f"  💾 Square: {square_file} ({len(square_bytes)//1024}KB)")

            print("  🎨 מכין פורמט סטורי 9:16...")
            story_bytes = make_story(raw_bytes, ad_text, name, price)
            (OUTPUT_DIR / story_file).write_bytes(story_bytes)
            print(f"  💾 Story:  {story_file} ({len(story_bytes)//1024}KB)")

            progress[str(pid)] = {
                "name": name,
                "square": square_file,
                "story": story_file,
                "ad_text": ad_text,
                "style": style,
                "timestamp": datetime.now().isoformat(),
            }
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(progress, f, ensure_ascii=False, indent=2)

            success += 1

        except Exception as e:
            print(f"  ✗ שגיאה: {e}")
            import traceback; traceback.print_exc()
            failed += 1

        time.sleep(3)

    print(f"\n{'='*60}")
    print(f"סיום: {success} הצליחו, {failed} נכשלו, {skipped} דולגו")
    print(f"📁 תמונות ב: {OUTPUT_DIR}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
