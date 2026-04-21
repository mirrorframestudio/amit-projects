"""
Generate category hero images using REAL jersey photos from WooCommerce.
Sends the actual jersey image to Gemini to put it on a fictional model
in a dramatic stadium/marketing setting.

Usage:
  python generate_category_images_v2.py              # all categories
  python generate_category_images_v2.py --ids retro,nba
  python generate_category_images_v2.py --force      # re-generate existing
"""

import os, sys, time, json, io, requests
from pathlib import Path

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

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

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
WOO_URL    = os.getenv("WOO_URL", "https://onezonejersey.com").rstrip("/")
WOO_KEY    = os.getenv("WOO_CONSUMER_KEY", "")
WOO_SECRET = os.getenv("WOO_CONSUMER_SECRET", "")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
OUTPUT_DIR = ROOT / "onezone-next" / "public" / "images" / "categories"

# ─── Category config ──────────────────────────────────────────────────────────
# For each category:
#   wc_category_id  → WooCommerce category to pull the representative jersey from
#   search          → optional search term to find a specific jersey (overrides category)
#   is_kids         → use child model
#   setting         → describe the background/atmosphere for this category
#   pose            → model pose description
# ─────────────────────────────────────────────────────────────────────────────
CATEGORIES = [
    {
        "id": "mondial-2026",
        "name_he": "מונדיאל 2026",
        "wc_category_id": 519,
        "search": "ארגנטינה מונדיאל",
        "is_kids": False,
        "setting": "packed World Cup stadium at night, confetti falling, massive crowd in blue and white, golden World Cup trophy visible in the background bokeh, electric atmosphere",
        "pose": "arms raised in triumph, euphoric celebration, looking up at the sky",
        "mood": "triumphant, World Cup glory, once-in-a-lifetime moment",
    },
    {
        "id": "liga-anglit",
        "name_he": "ליגה אנגלית",
        "wc_category_id": 28,
        "search": None,
        "is_kids": False,
        "setting": "iconic English Premier League stadium at dusk, packed stands in team colors, dramatic floodlights cutting through rain, quintessential English football atmosphere",
        "pose": "powerful sprint toward camera, ball at feet, explosive energy",
        "mood": "powerful, dynamic, Premier League intensity",
    },
    {
        "id": "liga-sparadit",
        "name_he": "ליגה ספרדית",
        "wc_category_id": 29,
        "search": None,
        "is_kids": False,
        "setting": "stunning Spanish La Liga stadium at golden hour, warm Mediterranean light, passionate crowd, dramatic shadows",
        "pose": "elegant ball control move, precise technical skill, composed expression",
        "mood": "technical elegance, Spanish passion, tiki-taka mastery",
    },
    {
        "id": "retro",
        "name_he": "רטרו",
        "wc_category_id": 110,
        "search": None,
        "is_kids": False,
        "setting": "vintage 1990s stadium terraces, grainy film photography aesthetic, Kodachrome color palette, old-school football atmosphere with nostalgic crowd",
        "pose": "classic standing pose, hands on hips, confident vintage footballer look",
        "mood": "nostalgic, heritage, classic 90s football, timeless",
    },
    {
        "id": "yeladim",
        "name_he": "ילדים",
        "wc_category_id": 147,
        "search": None,
        "is_kids": True,
        "setting": "bright sunny green football pitch, kids training ground, cheerful and vibrant atmosphere, goal posts in background",
        "pose": "jumping with both arms raised in celebration, huge happy smile, pure joy",
        "mood": "joyful, childhood fun, energetic, sporty",
    },
    {
        "id": "nba",
        "name_he": "NBA",
        "wc_category_id": 107,
        "search": None,
        "is_kids": False,
        "setting": "dramatic NBA arena at night, blinding spotlights, massive packed crowd, hardwood court, premium arena atmosphere",
        "pose": "holding basketball high above head in a powerful slam dunk approach, explosive athletic energy",
        "mood": "powerful, elite NBA energy, dramatic, premium",
    },
    {
        "id": "nbachrot",
        "name_he": "נבחרות",
        "wc_category_id": 109,
        "search": "ארגנטינה חוץ 25",
        "is_kids": False,
        "setting": "packed international stadium at night, massive crowd waving flags, intense floodlights, national team pride atmosphere, Copa America or World Cup qualifier feel",
        "pose": "chest out, chin up, one hand over heart, proud national anthem moment",
        "mood": "national pride, patriotism, international prestige, emotional",
    },
    {
        "id": "special",
        "name_he": "ספיישל",
        "wc_category_id": 163,
        "search": None,
        "is_kids": False,
        "setting": "minimalist luxury studio, dramatic chiaroscuro lighting, dark background with golden rim light, high-fashion sports photography",
        "pose": "fashion-forward confident stance, slight angle, direct look at camera, one hand in pocket",
        "mood": "exclusive, luxury, limited edition, premium fashion meets sport",
    },
    {
        "id": "kapuchon",
        "name_he": "קפוצ'ונים",
        "wc_category_id": 162,
        "search": None,
        "is_kids": False,
        "setting": "modern urban street near a football stadium exterior, golden hour warm light, lifestyle photography setting",
        "pose": "leaning casually against a wall, hands in hoodie pocket, relaxed confident street style",
        "mood": "cool, casual street-style, urban athletic",
    },
    {
        "id": "onat-2526",
        "name_he": "עונת 25/26",
        "wc_category_id": 21,
        "search": None,
        "is_kids": False,
        "setting": "cutting-edge modern stadium with LED lighting, night match, packed with excited fans, latest season launch atmosphere",
        "pose": "full-speed sprint toward camera, explosive power, hair and jersey in motion",
        "mood": "new era, exciting, fresh season, energetic launch",
    },
    {
        "id": "chalipot-arukhot",
        "name_he": "חליפות ארוכות",
        "wc_category_id": 161,
        "search": None,
        "is_kids": False,
        "setting": "professional football training facility, stadium tunnel or training pitch, clean professional athletic environment",
        "pose": "walking purposefully with jacket slightly open, professional athlete stride",
        "mood": "professional, training intensity, pre-match readiness",
    },
    {
        "id": "tsaifim",
        "name_he": "צעיפים",
        "wc_category_id": 228,
        "search": None,
        "is_kids": False,
        "setting": "electric match-day stadium atmosphere, confetti and banners everywhere, thousands of fans in stands, celebration atmosphere",
        "pose": "holding a matching team scarf stretched wide above head with both hands, massive fan celebration",
        "mood": "fan passion, match-day celebration, stadium energy",
    },
    {
        "id": "mystery-box",
        "name_he": "מיסטרי בוקס",
        "wc_category_id": 227,
        "search": None,
        "is_kids": False,
        "setting": "dramatic dark studio with purple and gold bokeh lights, mysterious premium atmosphere",
        "pose": "holding the jersey out toward camera with both hands to present it, surprised delighted expression as if just opening a gift",
        "mood": "mystery reveal, excitement, surprise, premium gift experience",
    },
]

# ─── WooCommerce helpers ──────────────────────────────────────────────────────

def fetch_jersey_image(category_id: int, search: str = None) -> tuple[bytes, str]:
    """Returns (image_bytes, product_name)."""
    params = {"status": "publish", "per_page": 5}
    if search:
        params["search"] = search
    else:
        params["category"] = category_id

    r = requests.get(
        f"{WOO_URL}/wp-json/wc/v3/products",
        params=params,
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=20,
    )
    r.raise_for_status()
    products = r.json()

    # find first product with an image
    for p in products:
        imgs = p.get("images", [])
        if imgs and imgs[0].get("src"):
            img_url = imgs[0]["src"]
            img_r = requests.get(img_url, headers={"User-Agent": UA}, timeout=15)
            img_r.raise_for_status()
            return img_r.content, p["name"]

    raise ValueError(f"No products with images found (category={category_id}, search={search})")


# ─── Gemini ───────────────────────────────────────────────────────────────────

def build_prompt(cat: dict, product_name: str) -> str:
    is_kids = cat.get("is_kids", False)

    if is_kids:
        subject = "a real-looking child (age 8-11, natural face with minor imperfections, could be boy or girl, everyday kid look — not a model)"
        body = "full body shot from knees up"
        camera = "Canon EOS R6, 50mm f/2.0, natural daylight, ISO 400"
    else:
        subject = "a real-looking young man (age 22-28, athletic but ordinary-looking, natural face with pores and slight stubble — NOT a model face, looks like an actual football player)"
        body = "upper body to 3/4 shot"
        camera = "Canon EOS-1D X Mark III, 135mm f/2.0, available stadium light, ISO 1600, slight grain"

    return f"""A genuine sports photograph — NOT a marketing render, NOT a CGI image.

The attached image shows a jersey. Dress {subject} in this EXACT jersey, copying its colors, stripes, badge placement and design precisely.

Shot: {body}, subject slightly off-center, natural posture — {cat['pose']}.
Setting: {cat['setting']}. Background naturally out of focus from lens compression, NOT fake bokeh.
Light: real {cat['setting'].split(',')[0]} lighting — harsh shadows, natural color temperature, no studio fill lights.
Camera: {camera}.

Realism requirements — these are MANDATORY:
- Skin must show real texture: pores, slight unevenness, no airbrushed smoothness
- Fabric must show real texture: wrinkles, folds where the body bends, slight stretch
- Eyes must look human: slight asymmetry, natural catchlights from the actual environment
- Background must look like a real photograph: slightly noisy, real crowd/environment detail
- Motion or slight depth: subject may have a tiny natural sway, not perfectly posed statue
- Photo imperfections welcome: slight chromatic aberration at edges, natural vignette, real lens flare if light source is near frame

The final image must be indistinguishable from a photo taken by a real sports photographer.
Do NOT make it look polished, perfect or "rendered". Embrace natural imperfection.
No text. No watermarks. Square crop 900×900."""


def generate_with_jersey(jersey_bytes: bytes, prompt: str) -> bytes:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_KEY)
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[
            types.Part.from_bytes(data=jersey_bytes, mime_type="image/jpeg"),
            types.Part.from_text(text=prompt),
        ],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"]
        )
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            data = part.inline_data.data
            return data if isinstance(data, bytes) else data.encode('latin-1')
    raise ValueError("Gemini returned no image")


def compress_image(image_bytes: bytes, quality: int = 85, max_size: int = 900) -> bytes:
    from PIL import Image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    force_mode = "--force" in sys.argv
    target_ids = []
    for i, arg in enumerate(sys.argv):
        if arg == "--ids" and i + 1 < len(sys.argv):
            target_ids = [x.strip() for x in sys.argv[i + 1].split(",")]

    if not GEMINI_KEY:
        print("❌ Missing GEMINI_API_KEY")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    log_path = OUTPUT_DIR / "_results_v2.json"
    results = {}
    if log_path.exists():
        with open(log_path, encoding="utf-8") as f:
            results = json.load(f)

    categories = CATEGORIES
    if target_ids:
        categories = [c for c in CATEGORIES if c["id"] in target_ids]

    print(f"\n{'='*60}")
    print(f"  Category Images v2 — Real Jersey on Model (Gemini)")
    print(f"  Categories: {len(categories)}")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    success, failed, skipped = 0, 0, 0

    for cat in categories:
        cid  = cat["id"]
        name = cat["name_he"]
        out_path = OUTPUT_DIR / f"{cid}.jpg"

        print(f"[{cid}] {name}")

        if out_path.exists() and not force_mode:
            print(f"  ✓ Already exists (use --force to regenerate)")
            skipped += 1
            continue

        try:
            print(f"  🛍  Fetching jersey from WooCommerce"
                  + (f" (search: {cat['search']})" if cat['search'] else f" (cat ID: {cat['wc_category_id']})") + "...")
            jersey_bytes, product_name = fetch_jersey_image(cat["wc_category_id"], cat.get("search"))
            print(f"  👕 Jersey: {product_name[:60]}")

            prompt = build_prompt(cat, product_name)

            print(f"  🤖 Generating with Gemini...")
            raw_bytes = generate_with_jersey(jersey_bytes, prompt)

            print(f"  🗜  Compressing...")
            final_bytes = compress_image(raw_bytes)

            with open(out_path, "wb") as f:
                f.write(final_bytes)
            print(f"  ✅ Saved: {cid}.jpg ({len(final_bytes)//1024}KB)")

            results[cid] = {
                "name_he": name,
                "product": product_name,
                "size_kb": len(final_bytes) // 1024,
            }
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

            success += 1

        except Exception as e:
            print(f"  ✗ Error: {e}")
            import traceback; traceback.print_exc()
            failed += 1

        time.sleep(5)

    print(f"\n{'='*60}")
    print(f"Done: {success} generated, {failed} failed, {skipped} skipped")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
