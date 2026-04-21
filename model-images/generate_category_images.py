"""
Generate category hero images for the OneZone Next.js site.
Uses Gemini to create photorealistic marketing photos per category.
Images are saved to onezone-next/public/images/categories/ as static assets.

Usage:
  python generate_category_images.py             # generate all categories
  python generate_category_images.py --ids retro,yeladim,nba  # specific categories
  python generate_category_images.py --force     # re-generate even if exists
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

OUTPUT_DIR = ROOT / "onezone-next" / "public" / "images" / "categories"

# ─────────────────────────────────────────────────────────────────────────────
# Category definitions — slug, Hebrew name, and Gemini prompt
# ─────────────────────────────────────────────────────────────────────────────
CATEGORIES = [
    {
        "id": "mondial-2026",
        "name_he": "מונדיאל 2026",
        "prompt": """Create a stunning professional sports marketing photo for a World Cup 2026 football jersey store category banner.

Show 2-3 completely fictional, non-recognizable male football players (age 22-30, athletic, diverse nationalities)
wearing different national team jerseys — one in light blue and white stripes, one in dark blue, one in red.
Players are celebrating together, arms around each other, euphoric expressions, mid-celebration.
World Cup trophy subtly visible in background bokeh.

Background: dramatic packed stadium at night with colorful supporter sections, confetti falling,
vibrant atmosphere, slightly blurred depth of field.

Lighting: dramatic golden spotlight from above, professional sports photography.
Mood: triumphant, electric, world-class.

IMPORTANT:
- Players must NOT resemble any real athlete, celebrity or public figure
- No text, numbers, names or real team badges on jerseys
- No flags or political symbols
- Square format 800x800px, sharp focus on players
- Ultra-realistic photographic quality"""
    },
    {
        "id": "liga-anglit",
        "name_he": "ליגה אנגלית",
        "prompt": """Create a professional sports marketing photo for a Premier League football jersey store category banner.

Show a completely fictional, non-recognizable male football player (age 23-28, athletic, confident)
wearing a premium purple and white football jersey (Premier League style, no real team logos).
Dynamic action pose — player mid-sprint, ball at his feet, powerful stride forward.

Background: iconic English stadium with packed green and white crowd stands, dramatic afternoon lighting,
slightly blurred bokeh effect.

Lighting: bright natural daylight, sharp crisp English weather feel.
Mood: powerful, dynamic, premium quality.

IMPORTANT:
- Player must NOT resemble any real Premier League player
- Jersey must have NO real team logos, sponsor names, or recognizable badges
- No text or numbers
- Square format 800x800px
- Ultra-realistic photographic quality, professional sports photography"""
    },
    {
        "id": "liga-sparadit",
        "name_he": "ליגה ספרדית",
        "prompt": """Create a professional sports marketing photo for a La Liga football jersey store category banner.

Show a completely fictional, non-recognizable male football player (age 22-28, athletic, stylish)
wearing a striking red and gold football jersey (La Liga inspired, no real team logos).
Elegant technical skill pose — player doing a precise ball control move, focused expression.

Background: beautiful Spanish stadium at golden hour, warm amber light, passionate crowd stands blurred.
Lighting: warm Spanish golden hour sun, cinematic quality.
Mood: technical elegance, passion, Mediterranean flair.

IMPORTANT:
- Player must NOT resemble any real La Liga player
- No real team logos, sponsor names, or recognizable badges on jersey
- Square format 800x800px
- Ultra-realistic photographic quality"""
    },
    {
        "id": "retro",
        "name_he": "רטרו",
        "prompt": """Create a nostalgic professional sports marketing photo for a retro football jersey store category banner.

Show a completely fictional, non-recognizable male football player (age 25-35, athletic)
wearing a classic 1990s-style football jersey — thick collar, bold color blocks,
retro stripes, old-school fabric look (think early 90s Champions League era aesthetic).
Timeless standing pose, slight smile, hands on hips.

Background: vintage film photography look — grainy texture, slight vignette, faded color tones,
nostalgic stadium terraces in background, warm sepia-ish color grading.
Film grain effect, Kodachrome style color palette.

Lighting: soft diffused natural light with vintage feel.
Mood: nostalgic, classic, heritage, timeless.

IMPORTANT:
- Player must NOT resemble any real footballer
- Jersey must have retro aesthetic — NO modern slim fits or current team logos
- Apply subtle film grain / vintage photographic processing to final image
- Square format 800x800px
- High quality retro-photographic style"""
    },
    {
        "id": "yeladim",
        "name_he": "ילדים",
        "prompt": """Create a joyful professional sports marketing photo for a children's football kit store category banner.

Show 2 completely fictional, non-recognizable children (age 8-11, one boy one girl,
big bright smiles, full of energy) both wearing matching premium football kits —
bright red jersey with white shorts, team-style look (no real team logos).
Kids in a playful action pose — jumping, arms raised in celebration, pure joy.

Background: green football pitch with goal in background, beautiful sunny day,
vibrant fresh green grass, bright cheerful atmosphere.

Lighting: warm bright sunshine, happy and energetic.
Mood: pure joy, excitement, childhood fun, sporty.

IMPORTANT:
- Children must NOT resemble any real person, and be completely fictional
- No real team logos or recognizable branding on kits
- No faces that could be identified
- Safe, appropriate, family-friendly image
- Square format 800x800px
- Ultra-realistic photographic quality"""
    },
    {
        "id": "nba",
        "name_he": "NBA",
        "prompt": """Create a dramatic professional sports marketing photo for an NBA basketball jersey store category banner.

Show a completely fictional, non-recognizable male basketball player (age 22-30,
very tall athletic build, powerful physique, confident expression) wearing a premium
NBA-style jersey — bright purple and gold sleeveless jersey with white shorts
(no real team logos or player names).
Dynamic pose: player holding basketball above head in a power move, intense focused expression.

Background: iconic NBA arena at night — dramatic arena lighting, packed crowd in background blurred,
spotlights creating dramatic shadows, premium arena atmosphere.

Lighting: dramatic arena spotlights, high contrast, cinematic.
Mood: powerful, elite, premium, dramatic.

IMPORTANT:
- Player must NOT resemble any real NBA player
- No real team logos, player names, or numbers on jersey
- Square format 800x800px
- Ultra-realistic photographic quality, professional sports photography"""
    },
    {
        "id": "nbachrot",
        "name_he": "נבחרות",
        "prompt": """Create a patriotic professional sports marketing photo for a national team football jersey store category banner.

Show a completely fictional, non-recognizable male football player (age 24-30, athletic, proud)
wearing a white national team style jersey with light blue stripe — clean, classic
national team aesthetic (no real country badge or recognizable flag design).
Heroic standing pose — player with chest out, chin up, proud expression,
one hand over heart like a national anthem moment.

Background: massive international stadium filled with colorful flags and banners (no recognizable flags),
dramatic floodlit night game atmosphere, fans blurred in background.

Lighting: dramatic floodlights from multiple angles, cinematic epic feel.
Mood: pride, patriotism, international prestige, emotional.

IMPORTANT:
- Player must NOT resemble any real national team player
- No real country flags, badges, or identifiable national symbols
- Square format 800x800px
- Ultra-realistic photographic quality"""
    },
    {
        "id": "special",
        "name_he": "ספיישל",
        "prompt": """Create a premium professional sports marketing photo for a special edition football jersey store category banner.

Show a completely fictional, non-recognizable male model (age 25-35, very stylish,
fashion-forward, confident) wearing a stunning special edition football jersey —
deep black jersey with intricate gold geometric patterns, premium fabric texture visible,
ultra-limited-edition aesthetic, fashion meets sport.
Sophisticated fashion-forward pose — slight angle, one hand in pocket,
direct confident look at camera.

Background: minimalist dark studio with subtle golden light rays,
luxury product photography aesthetic, dramatic chiaroscuro lighting.

Lighting: dramatic studio spotlight, golden rim light, high fashion photography.
Mood: exclusive, luxury, limited edition, premium fashion.

IMPORTANT:
- Model must NOT resemble any real person
- Jersey design must look genuinely special and unique — no generic plain jersey
- Square format 800x800px
- Ultra-realistic high-fashion photography quality"""
    },
    {
        "id": "kapuchon",
        "name_he": "קפוצ'ונים",
        "prompt": """Create a cool lifestyle professional photo for a football hoodie/sweatshirt store category banner.

Show a completely fictional, non-recognizable male model (age 20-28, casual athletic style,
relaxed cool vibe) wearing a premium football club hoodie — dark navy blue with
white details, quality fleece material visible, hood up casually.
Relaxed lifestyle pose — leaning against a wall, hands in pockets,
cool casual confident smile, streetwear meets sport aesthetic.

Background: urban setting — clean modern street or stadium exterior,
golden hour light, soft background bokeh.

Lighting: warm golden hour natural light, lifestyle photography.
Mood: cool, casual, street-style, urban athletic.

IMPORTANT:
- Model must NOT resemble any real person or athlete
- Hoodie must have NO real team logos or recognizable branding
- Square format 800x800px
- Ultra-realistic lifestyle photography quality"""
    },
    {
        "id": "onat-2526",
        "name_he": "עונת 25/26",
        "prompt": """Create an exciting professional sports marketing photo for a 2025/26 season new football jerseys category banner.

Show a completely fictional, non-recognizable male football player (age 22-28, athletic,
electric energy) wearing a stunning modern 2025/26 season style football jersey —
bright electric blue with innovative gradient pattern, cutting-edge modern design,
latest athletic fabric technology visible.
Dynamic energetic pose — player running at full speed toward camera,
explosive power, hair and jersey moving in the air.

Background: state-of-the-art modern stadium, LED-lit, nighttime, vibrant crowd,
dynamic motion blur in background suggesting speed.

Lighting: dramatic modern stadium lights, sharp crisp clarity on player.
Mood: new era, exciting, fresh, modern, energetic.

IMPORTANT:
- Player must NOT resemble any real footballer
- Jersey must look genuinely modern and new — innovative design
- Square format 800x800px
- Ultra-realistic sports photography quality"""
    },
    {
        "id": "chalipot-arukhot",
        "name_he": "חליפות ארוכות",
        "prompt": """Create a professional sports marketing photo for a full football tracksuit store category banner.

Show a completely fictional, non-recognizable male model (age 22-30, athletic professional build)
wearing a premium full football training tracksuit — sleek navy blue and white
long-sleeve jacket with matching pants, modern athletic cut, premium fabric.
Professional athletic pose — player walking with purpose, jacket slightly open,
confident professional athlete look.

Background: professional football training facility or stadium tunnel,
clean modern athletic environment, slightly blurred.

Lighting: professional indoor training facility lighting, clean and bright.
Mood: professional, athletic, training intensity, premium quality.

IMPORTANT:
- Model must NOT resemble any real athlete
- Tracksuit must have NO real team logos — generic premium sports brand aesthetic
- Square format 800x800px
- Ultra-realistic photography quality"""
    },
    {
        "id": "tsaifim",
        "name_he": "צעיפים",
        "prompt": """Create a vibrant professional sports photo for a football scarves/fan merchandise store category banner.

Show a completely fictional, non-recognizable enthusiastic football fan (age 25-35,
passionate happy expression, could be male or female) holding a colorful football scarf
above their head with both hands stretched wide — classic fan celebration pose.
The scarf has red and white stripes, team supporter aesthetic.

Background: packed stadium with thousands of fans in team colors, confetti in the air,
massive crowd atmosphere, electrifying match day energy.

Lighting: bright stadium floodlights, festive atmosphere.
Mood: fan passion, celebration, unity, stadium energy, joy.

IMPORTANT:
- Fan must NOT resemble any real person
- Scarf must have NO real team names or recognizable logos
- Square format 800x800px
- Ultra-realistic photography quality"""
    },
    {
        "id": "mystery-box",
        "name_he": "מיסטרי בוקס",
        "prompt": """Create a dramatic and exciting professional product photo for a mystery box football jersey store category banner.

Show a sleek matte black gift box (slightly open) with a premium football jersey
partially visible inside — glowing golden light emanating from within the box,
magical reveal effect. Jersey peeking out is colorful and intriguing.
Small cloud of golden sparkles/glitter floating above the opening.
Box is centered, shot slightly from above at an angle.

Background: deep dark background with subtle purple/gold gradient,
scattered tiny golden bokeh lights creating a magical premium feel.

Lighting: dramatic internal glow from box, rim lighting, magical atmosphere.
Mood: mystery, excitement, surprise, premium, magical reveal, anticipation.

IMPORTANT:
- No text in image
- No real team logos visible on the jersey inside
- Must look genuinely exciting and premium
- Square format 800x800px
- Ultra-realistic commercial product photography quality"""
    },
]

# ─────────────────────────────────────────────────────────────────────────────

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


def compress_image(image_bytes: bytes, quality: int = 82, max_size: int = 900) -> bytes:
    from PIL import Image
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def main():
    force_mode = "--force" in sys.argv

    # Parse --ids flag
    target_ids = []
    for i, arg in enumerate(sys.argv):
        if arg == "--ids" and i + 1 < len(sys.argv):
            target_ids = [x.strip() for x in sys.argv[i + 1].split(",")]

    if not GEMINI_KEY:
        print("❌ Missing GEMINI_API_KEY in .env")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    categories = CATEGORIES
    if target_ids:
        categories = [c for c in CATEGORIES if c["id"] in target_ids]
        if not categories:
            print(f"❌ No categories found for: {target_ids}")
            sys.exit(1)

    log_path = OUTPUT_DIR / "_results.json"
    results = {}
    if log_path.exists():
        with open(log_path, encoding="utf-8") as f:
            results = json.load(f)

    print(f"\n{'='*60}")
    print(f"  OneZone Category Images Generator (Gemini)")
    print(f"  Categories: {len(categories)}")
    print(f"  Output: {OUTPUT_DIR}")
    print(f"{'='*60}\n")

    success, failed, skipped = 0, 0, 0

    for cat in categories:
        cid = cat["id"]
        name = cat["name_he"]
        filename = f"{cid}.jpg"
        out_path = OUTPUT_DIR / filename

        print(f"[{cid}] {name}")

        # Skip if already generated (unless --force)
        if out_path.exists() and not force_mode:
            print(f"  ✓ Already exists, skipping (use --force to regenerate)")
            skipped += 1
            continue

        try:
            print(f"  🤖 Generating with Gemini...")
            raw_bytes = generate_image_gemini(cat["prompt"])

            print(f"  🗜  Compressing...")
            final_bytes = compress_image(raw_bytes)

            with open(out_path, "wb") as f:
                f.write(final_bytes)

            size_kb = len(final_bytes) // 1024
            print(f"  ✅ Saved: {filename} ({size_kb}KB)")

            results[cid] = {
                "name_he": name,
                "file": filename,
                "path": f"/images/categories/{filename}",
                "size_kb": size_kb,
            }
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)

            success += 1

        except Exception as e:
            print(f"  ✗ Error: {e}")
            import traceback; traceback.print_exc()
            failed += 1

        time.sleep(5)  # Rate limiting

    print(f"\n{'='*60}")
    print(f"Done: {success} generated, {failed} failed, {skipped} skipped")
    print(f"\n📁 Images saved to:")
    print(f"   {OUTPUT_DIR}")

    # Print JS config snippet for easy copy-paste
    print(f"\n📋 Next.js staticImages config (copy to page.tsx):")
    print("const CATEGORY_STATIC_IMAGES: Record<string, string> = {")
    for cat in CATEGORIES:
        cid = cat["id"]
        if (OUTPUT_DIR / f"{cid}.jpg").exists():
            print(f'  \'{cid}\': \'/images/categories/{cid}.jpg\',')
    print("};")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
