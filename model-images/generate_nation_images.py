"""
Generate national team hero images for the homepage slider.
Uses Gemini to create a fictional star player per team,
then overlays large Hebrew country name text with Pillow.

Usage:
  python generate_nation_images.py --preview       # generate & save locally
  python generate_nation_images.py --upload        # generate & upload to WP
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

WOO_URL    = os.getenv("WOO_URL", "").rstrip("/")
WOO_KEY    = os.getenv("WOO_CONSUMER_KEY", "")
WOO_SECRET = os.getenv("WOO_CONSUMER_SECRET", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
WP_USER    = os.getenv("WP_USER", "")
WP_PASS    = os.getenv("WP_APP_PASSWORD", "")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

OUTPUT_DIR = Path(__file__).resolve().parent / "output" / "nations"

# ── Teams config ──────────────────────────────────────────────────────────────
TEAMS = [
    {
        "id": "argentina",
        "name_he": "ארגנטינה",
        "jersey": "light blue and white vertical striped World Cup 2026 Argentina national team jersey (AFA badge visible)",
        "style": "Latin flair, passionate expression",
        "bg": "vibrant Buenos Aires stadium crowd in blue and white",
        "text_color": "#ffffff",
        "text_shadow": "#1a5fa8",
    },
    {
        "id": "brazil",
        "name_he": "ברזיל",
        "jersey": "bright yellow Brazil World Cup 2026 national team jersey (CBF badge visible) with green shorts",
        "style": "joyful confident smile, Brazilian flair",
        "bg": "colourful Brazilian crowd background in yellow and green",
        "text_color": "#ffdd00",
        "text_shadow": "#006400",
    },
    {
        "id": "france",
        "name_he": "צרפת",
        "jersey": "dark navy blue France World Cup 2026 national team jersey (FFF badge visible)",
        "style": "cool composed expression, French elegance",
        "bg": "blue crowd atmosphere, Parisian stadium feel",
        "text_color": "#ffffff",
        "text_shadow": "#002395",
    },
    {
        "id": "spain",
        "name_he": "ספרד",
        "jersey": "red Spain World Cup 2026 national team jersey (RFEF badge visible)",
        "style": "intense passionate look, Spanish passion",
        "bg": "red and yellow crowd background",
        "text_color": "#ffcc00",
        "text_shadow": "#c60b1e",
    },
    {
        "id": "portugal",
        "name_he": "פורטוגל",
        "jersey": "deep red Portugal World Cup 2026 national team jersey (FPF badge visible) with green details",
        "style": "intense powerful expression, determined look",
        "bg": "red and green Portuguese crowd atmosphere",
        "text_color": "#ffffff",
        "text_shadow": "#006600",
    },
    {
        "id": "england",
        "name_he": "אנגליה",
        "jersey": "white England World Cup 2026 national team jersey (Three Lions badge visible) with red detail",
        "style": "focused composed British expression",
        "bg": "white and red Wembley crowd atmosphere",
        "text_color": "#cf142b",
        "text_shadow": "#000000",
    },
    {
        "id": "germany",
        "name_he": "גרמניה",
        "jersey": "white Germany World Cup 2026 national team jersey (DFB eagle badge visible) with black details",
        "style": "sharp focused determined expression",
        "bg": "black red gold German crowd atmosphere",
        "text_color": "#ffcc00",
        "text_shadow": "#000000",
    },
    {
        "id": "italy",
        "name_he": "איטליה",
        "jersey": "deep azure blue Italy World Cup 2026 national team jersey (FIGC badge visible)",
        "style": "elegant stylish Italian expression",
        "bg": "blue Azzurri crowd atmosphere",
        "text_color": "#ffffff",
        "text_shadow": "#003399",
    },
    {
        "id": "morocco",
        "name_he": "מרוקו",
        "jersey": "red Morocco World Cup 2026 national team jersey (FRMF badge visible) with green star",
        "style": "fierce proud expression, North African pride",
        "bg": "red and green Moroccan crowd atmosphere",
        "text_color": "#ffffff",
        "text_shadow": "#c1272d",
    },
    {
        "id": "netherlands",
        "name_he": "הולנד",
        "jersey": "bright orange Netherlands World Cup 2026 national team jersey (KNVB badge visible)",
        "style": "bold confident Dutch expression",
        "bg": "vibrant orange Dutch crowd atmosphere",
        "text_color": "#ffffff",
        "text_shadow": "#ae1c28",
    },
    {
        "id": "belgium",
        "name_he": "בלגיה",
        "jersey": "red Belgium World Cup 2026 national team jersey (RBFA badge visible) with black sleeves",
        "style": "intense focused Belgian expression",
        "bg": "black yellow red Belgian crowd atmosphere",
        "text_color": "#fdda24",
        "text_shadow": "#000000",
    },
    {
        "id": "israel",
        "name_he": "ישראל",
        "jersey": "white Israel national team jersey (IFA badge visible) with blue Star of David design",
        "style": "proud confident Israeli expression",
        "bg": "blue and white Israeli crowd atmosphere",
        "text_color": "#0038b8",
        "text_shadow": "#ffffff",
    },
]


def build_prompt(team: dict) -> str:
    return f"""Create a professional sports marketing photo for a football/soccer national team hero image.

Show a completely fictional, non-recognizable male football star (age 22-28, athletic build, short hair, no beard) wearing the {team['jersey']}.
The player has a {team['style']}.
Full upper body shot, slight upward angle, player centered.
Background: {team['bg']}, slightly blurred (bokeh effect).
Dramatic studio-quality sports lighting, sharp focus on player.
Professional sports photography style — similar to FIFA official promotional imagery.

IMPORTANT:
- The player must NOT resemble any real celebrity, athlete or public figure
- Show the jersey clearly with correct colors
- No text or logos in the image
- Square format, optimized for 600x600px card display"""


def generate_image_gemini(prompt: str) -> bytes:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_KEY)
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[types.Part.from_text(text=prompt)],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"]
        )
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            data = part.inline_data.data
            return data if isinstance(data, bytes) else data.encode('latin-1')
    raise ValueError("Gemini returned no image")


def add_text_overlay(image_bytes: bytes, team: dict) -> bytes:
    """Add large Hebrew country name overlay at the top of the image."""
    from PIL import Image, ImageDraw, ImageFont
    import io as _io

    img = Image.open(_io.BytesIO(image_bytes)).convert("RGBA")
    w, h = img.size

    # Resize to square 600x600
    img = img.resize((600, 600), Image.LANCZOS)
    w, h = 600, 600

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Dark gradient at top for text readability
    for i in range(180):
        alpha = int(180 * (1 - i / 180))
        draw.rectangle([(0, i), (w, i + 1)], fill=(0, 0, 0, alpha))

    # Try to load a Hebrew-capable font
    font = None
    font_size = 72
    candidates = [
        "C:/Windows/Fonts/Arial.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/David.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
        "C:/Windows/Fonts/trebucbd.ttf",
    ]
    for fp in candidates:
        try:
            font = ImageFont.truetype(fp, font_size)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    text = team["name_he"]
    # Measure text
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (w - tw) // 2
    ty = 30

    # Shadow
    shadow_rgb = _hex_to_rgb(team["text_shadow"])
    draw.text((tx + 3, ty + 3), text, font=font, fill=(*shadow_rgb, 200))
    # Main text
    text_rgb = _hex_to_rgb(team["text_color"])
    draw.text((tx, ty), text, font=font, fill=(*text_rgb, 255))

    # Merge overlay
    composite = Image.alpha_composite(img, overlay)
    composite = composite.convert("RGB")

    buf = _io.BytesIO()
    composite.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


def _hex_to_rgb(hex_color: str):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def upload_image_to_wp(image_bytes: bytes, filename: str) -> int:
    r = requests.post(
        f"{WOO_URL}/wp-json/wp/v2/media",
        headers={
            "User-Agent": UA,
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "image/jpeg",
        },
        data=image_bytes,
        auth=(WP_USER, WP_PASS),
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["id"], r.json()["source_url"]


def main():
    preview_mode = "--preview" in sys.argv
    upload_mode  = "--upload"  in sys.argv

    if not preview_mode and not upload_mode:
        print("Usage: python generate_nation_images.py --preview")
        print("       python generate_nation_images.py --upload")
        sys.exit(1)

    if not GEMINI_KEY:
        print("❌ Missing GEMINI_API_KEY")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results_path = OUTPUT_DIR / "results.json"
    results = {}
    if results_path.exists():
        with open(results_path, encoding="utf-8") as f:
            results = json.load(f)

    print(f"\n{'='*55}")
    print(f"  National Team Images — {'PREVIEW' if preview_mode else 'UPLOAD'}")
    print(f"  Teams: {len(TEAMS)}")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"{'='*55}\n")

    for team in TEAMS:
        tid = team["id"]
        print(f"[{tid}] {team['name_he']}")

        if tid in results and results[tid].get("file"):
            out_path = OUTPUT_DIR / results[tid]["file"]
            if out_path.exists():
                print(f"  ✓ Already done, skipping")
                continue

        try:
            print(f"  🤖 Generating via Gemini...")
            prompt = build_prompt(team)
            raw_bytes = generate_image_gemini(prompt)

            print(f"  🎨 Adding text overlay...")
            final_bytes = add_text_overlay(raw_bytes, team)

            filename = f"nation_{tid}.jpg"
            out_path = OUTPUT_DIR / filename
            with open(out_path, "wb") as f:
                f.write(final_bytes)
            print(f"  💾 Saved: {filename} ({len(final_bytes)//1024}KB)")

            wp_url = None
            if upload_mode:
                print(f"  ↑ Uploading to WordPress...")
                media_id, wp_url = upload_image_to_wp(final_bytes, filename)
                print(f"  ✅ Uploaded — URL: {wp_url}")

            results[tid] = {
                "name_he": team["name_he"],
                "file": filename,
                "wp_url": wp_url,
            }
            with open(results_path, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

        except Exception as e:
            print(f"  ✗ Error: {e}")

        time.sleep(4)

    print(f"\n{'='*55}")
    print(f"Done. Results saved to {results_path}")
    if preview_mode:
        print(f"\n📁 Images in: {OUTPUT_DIR}")
        print("Review them, then run with --upload to publish")
    print(f"{'='*55}\n")

    # Print JS snippet for the slider URLs
    print("\n📋 Image URLs for Custom JS slider:")
    for team in TEAMS:
        tid = team["id"]
        url = results.get(tid, {}).get("wp_url", "PENDING")
        print(f'  {{id:"{tid}", name_he:"{team["name_he"]}", img:"{url}"}},')


if __name__ == "__main__":
    main()
