"""
Generate realistic national team player photos for the homepage banner slider.
Fetches each team's actual jersey from WooCommerce, then generates a realistic
press-photography-style player photo wearing that exact jersey via Gemini.

Saves to: onezone-next/public/images/nations/
Update CollectionBanners.tsx to reference these paths.

Usage:
  python generate_nation_banners.py              # all teams
  python generate_nation_banners.py --ids spain,france,brazil
  python generate_nation_banners.py --force
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
OUTPUT_DIR = ROOT / "onezone-next" / "public" / "images" / "nations"

# ─── National team definitions ────────────────────────────────────────────────
TEAMS = [
    {
        "id": "spain",
        "name_he": "ספרד",
        "search": "ספרד",
        "player_look": "Spanish Mediterranean features, short dark hair, tanned skin, late 20s",
        "crowd_colors": "red and yellow",
        "stadium": "packed Spanish stadium, red and yellow banners, La Furia Roja atmosphere",
    },
    {
        "id": "france",
        "name_he": "צרפת",
        "search": "צרפת",
        "player_look": "French player, mixed heritage features, close-cropped hair, athletic late 20s",
        "crowd_colors": "blue white red",
        "stadium": "electric Stade de France atmosphere, blue and white crowd, tricolor flags",
    },
    {
        "id": "portugal",
        "name_he": "פורטוגל",
        "search": "פורטוגל",
        "player_look": "Portuguese features, dark hair, strong jawline, mid-20s",
        "crowd_colors": "red and green",
        "stadium": "passionate Portuguese crowd, red and green flags, intense Iberian atmosphere",
    },
    {
        "id": "argentina",
        "name_he": "ארגנטינה",
        "search": "ארגנטינה חוץ 25",
        "player_look": "Argentine Latin features, curly or wavy dark hair, expressive face, late 20s",
        "crowd_colors": "light blue and white",
        "stadium": "sea of light blue and white scarves, Argentine fans going wild, South American passion",
    },
    {
        "id": "brazil",
        "name_he": "ברזיל",
        "search": "ברזיל",
        "player_look": "Brazilian Afro-Latin features, natural confident smile, athletic build, mid-20s",
        "crowd_colors": "yellow and green",
        "stadium": "vibrant Brazilian crowd in yellow and green, samba energy, Maracanã-style atmosphere",
    },
    {
        "id": "england",
        "name_he": "אנגליה",
        "search": "אנגליה",
        "player_look": "English player, fair or mixed-race British features, short hair, determined look, late 20s",
        "crowd_colors": "white and red St George Cross",
        "stadium": "Wembley-style atmosphere, white and red crowd, English football passion",
    },
    {
        "id": "germany",
        "name_he": "גרמניה",
        "search": "גרמניה",
        "player_look": "German player, Northern European features, short blond or light brown hair, focused intense look, late 20s",
        "crowd_colors": "black red gold",
        "stadium": "organized German crowd, black red gold banners, efficient powerful atmosphere",
    },
    {
        "id": "italy",
        "name_he": "איטליה",
        "search": "איטליה",
        "player_look": "Italian features, dark stylish hair, handsome Mediterranean face, late 20s",
        "crowd_colors": "blue Azzurri",
        "stadium": "passionate Italian crowd all in blue, Azzurri banners, intense Italian football atmosphere",
    },
    {
        "id": "netherlands",
        "name_he": "הולנד",
        "search": "הולנד",
        "player_look": "Dutch player, tall athletic build, Northern European features, confident expression, late 20s",
        "crowd_colors": "bright orange",
        "stadium": "sea of orange Dutch fans, Oranje atmosphere, vibrant Dutch supporter culture",
    },
    {
        "id": "belgium",
        "name_he": "בלגיה",
        "search": "בלגיה",
        "player_look": "Belgian player, diverse European features, athletic build, focused determined face, late 20s",
        "crowd_colors": "black yellow red",
        "stadium": "Belgian crowd with devil horns hats, black yellow red flags, intense Red Devils atmosphere",
    },
    {
        "id": "morocco",
        "name_he": "מרוקו",
        "search": "מרוקו",
        "player_look": "Moroccan North African features, dark hair, proud intense look, mid-20s",
        "crowd_colors": "red and green",
        "stadium": "passionate Moroccan crowd, red and green flags and scarves, African pride atmosphere",
    },
    {
        "id": "israel",
        "name_he": "ישראל",
        "search": "ישראל",
        "player_look": "Israeli player, Middle Eastern features, short dark hair, determined proud expression, mid-20s",
        "crowd_colors": "blue and white",
        "stadium": "Israeli crowd waving blue and white flags, Star of David scarves, national pride atmosphere",
    },
]


def build_prompt(team: dict, product_name: str) -> str:
    return f"""A genuine sports press photograph — looks like it was shot by a Getty Images or AFP sports photographer.

The attached image shows a {team['name_he']} national team football jersey. Show a fictional player wearing this EXACT jersey (copy its precise colors, stripes, badge position, and design details).

Player appearance: {team['player_look']}. NOT a celebrity or real player — a realistic generic face with natural imperfections.

Composition: 3/4 upper body shot, player slightly turned, natural athletic posture. Face clearly visible with genuine emotion — pride, intensity, or focus. NOT a fake smile.

Setting: {team['stadium']}. Background naturally compressed and out of focus from telephoto lens — real crowd visible but blurred, NOT fake bokeh.

Camera & technical: Shot on Canon EOS-1D X Mark III, 200mm f/2.8 telephoto, ISO 2000, slight natural grain, available stadium floodlight color temperature (slightly cool/blue-ish). Natural lens vignette at edges.

Realism requirements (MANDATORY):
- Real skin texture: visible pores, slight unevenness, natural under-eye shadows
- Real fabric: jersey shows natural folds, wrinkles at shoulders and elbows, slight fabric stretch
- Eyes look human: natural asymmetry, real catchlights from stadium floodlights
- Slight motion in jersey from breathing or light breeze
- Natural shadow under chin and jersey folds
- Crowd in background has individual people visible (not flat blob)

The photo must be completely indistinguishable from a real sports press photograph.
No text. No watermarks. Portrait crop — tall format 700×900."""


def fetch_jersey_image(search: str) -> tuple[bytes, str]:
    r = requests.get(
        f"{WOO_URL}/wp-json/wc/v3/products",
        params={"search": search, "status": "publish", "per_page": 5},
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=20,
    )
    r.raise_for_status()
    products = r.json()

    for p in products:
        imgs = p.get("images", [])
        if imgs and imgs[0].get("src"):
            img_r = requests.get(imgs[0]["src"], headers={"User-Agent": UA}, timeout=15)
            img_r.raise_for_status()
            return img_r.content, p["name"]

    raise ValueError(f"No product with image found for search: {search}")


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


def compress_image(image_bytes: bytes, quality: int = 87, max_size: int = 900) -> bytes:
    from PIL import Image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def main():
    force_mode = "--force" in sys.argv
    target_ids = []
    for i, arg in enumerate(sys.argv):
        if arg == "--ids" and i + 1 < len(sys.argv):
            target_ids = [x.strip() for x in sys.argv[i + 1].split(",")]

    if not GEMINI_KEY:
        print("❌ Missing GEMINI_API_KEY"); sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    log_path = OUTPUT_DIR / "_results.json"
    results = {}
    if log_path.exists():
        with open(log_path, encoding="utf-8") as f:
            results = json.load(f)

    teams = TEAMS if not target_ids else [t for t in TEAMS if t["id"] in target_ids]

    print(f"\n{'='*60}")
    print(f"  National Team Banners — Real Jersey + Realistic Player")
    print(f"  Teams: {len(teams)}")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    success = failed = skipped = 0

    for team in teams:
        tid = team["id"]
        out_path = OUTPUT_DIR / f"{tid}.jpg"
        print(f"[{tid}] {team['name_he']}")

        if out_path.exists() and not force_mode:
            print(f"  ✓ Already exists (--force to redo)")
            skipped += 1
            continue

        try:
            print(f"  🛍  Fetching jersey (search: {team['search']})...")
            jersey_bytes, product_name = fetch_jersey_image(team["search"])
            print(f"  👕 {product_name[:70]}")

            print(f"  🤖 Generating with Gemini...")
            raw = generate_with_jersey(jersey_bytes, build_prompt(team, product_name))

            final = compress_image(raw)
            with open(out_path, "wb") as f:
                f.write(final)
            print(f"  ✅ {tid}.jpg ({len(final)//1024}KB)")

            results[tid] = {"name_he": team["name_he"], "product": product_name, "size_kb": len(final)//1024}
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

            success += 1

        except Exception as e:
            print(f"  ✗ {e}")
            failed += 1

        time.sleep(5)

    print(f"\n{'='*60}")
    print(f"Done: {success} OK, {failed} failed, {skipped} skipped")
    print(f"{'='*60}\n")

    # Print the JS image map
    print("📋 Add to CollectionBanners.tsx:")
    for team in TEAMS:
        tid = team["id"]
        if (OUTPUT_DIR / f"{tid}.jpg").exists():
            print(f'  // {team["name_he"]}: image: \'/images/nations/{tid}.jpg\',')


if __name__ == "__main__":
    main()
