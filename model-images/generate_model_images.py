"""
Model image generator for OneZoneJersey.
Takes jersey product images, sends to Gemini to generate model photos,
and optionally uploads back to WooCommerce.

Usage:
  python generate_model_images.py --preview            # save images locally, don't upload
  python generate_model_images.py --preview --limit 5  # only 5 products
  python generate_model_images.py --upload             # upload to WooCommerce (after review)
  python generate_model_images.py --upload --limit 10  # upload 10 products
"""

import os
import sys
import time
import json
import requests
from pathlib import Path
from datetime import datetime

# Fix Hebrew output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# ── Load credentials ───────────────────────────────────────────────────────────
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
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
WP_USER    = os.getenv("WP_USER", "")
WP_PASS    = os.getenv("WP_APP_PASSWORD", "")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

OUTPUT_DIR = Path(__file__).resolve().parent / "output"

# ── Gemini prompts ─────────────────────────────────────────────────────────────
POSES_ADULT = [
    "pointing with one index finger at the team logo on the chest, other hand relaxed at the side, proud confident stance",
    "both hands on hips, chest out, standing tall, direct confident look at camera",
    "one hand relaxed at side, other hand slightly pulling the bottom hem of the shirt outward, casual confident smile",
    "arms crossed loosely at chest level, slight forward lean, relaxed confident expression",
    "one arm slightly raised with thumb up, other hand on hip, big friendly smile",
    "standing slightly sideways, turning head toward camera, one hand in pocket, relaxed cool pose",
    "hands clasped together in front, slight forward lean, warm confident smile",
    "one hand touching the collar lightly, other arm relaxed, natural casual stance",
]

POSES_KIDS = [
    "big happy smile, both arms slightly raised with excitement, joyful energy",
    "thumbs up with both hands, big grin, playful stance",
    "one hand pointing at the team logo on the chest, proud happy smile",
    "arms at sides, bright happy smile, looking directly at camera",
    "playful pose with one leg slightly forward, hands on hips, big smile",
]

import random as _random

def get_prompt(is_kids: bool = False) -> str:
    if is_kids:
        pose = _random.choice(POSES_KIDS)
        return f"""Create a photorealistic e-commerce product photo using the uploaded football kit image as reference.

Show a completely fictional, generic, non-recognizable child (age 7-10, either boy or girl, friendly face) wearing this exact football kit (shirt + shorts matching the kit in the image). The child must NOT resemble any real person. Full body shot from knees up, centered, face clearly visible.

Pose: the child is {pose}.

Kit rules — STRICT:
- Copy the exact color scheme and pattern from the input image for BOTH the shirt and shorts
- Include ONLY the logos and graphics that are clearly visible in the input image — do NOT add, invent, or guess any sponsor logos, badges, or text not in the input
- If a logo is unclear, leave that area plain
- Same shirt and shorts style as the input

Professional studio setting: pure white background, soft even lighting, sharp focus on the child and kit.

Output: square image optimized for 700x700 product display."""
    else:
        pose = _random.choice(POSES_ADULT)
        return f"""Create a photorealistic e-commerce model photo using the uploaded football shirt image as reference.

Show a completely fictional, generic, non-recognizable male model (age 20-30, athletic build, confident smile, face clearly visible) wearing this exact shirt. The model must NOT resemble any real person, celebrity, athlete, or public figure. Full upper body shot including face, centered.

Pose: the model is {pose}.

Shirt rules — STRICT:
- Copy the exact color scheme and pattern from the input image
- Include ONLY the logos and graphics that are clearly visible in the input image — do NOT add, invent, or guess any sponsor logos, badges, patches, or text that are not in the input image
- If a logo is unclear, leave that area plain — never substitute with a different logo
- Same shirt style and cut as the input

Professional studio setting: pure white background, soft even lighting, sharp focus on the model and shirt.

Output: square image optimized for 700x700 product display."""

# ── WooCommerce helpers ────────────────────────────────────────────────────────
def get_top_products(n: int = 50) -> list:
    r = requests.get(
        f"{WOO_URL}/wp-json/wc/v3/products",
        params={"orderby": "popularity", "order": "desc", "per_page": n, "status": "publish"},
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=30
    )
    r.raise_for_status()
    return r.json()


def download_image(url: str) -> bytes:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=15)
    r.raise_for_status()
    return r.content


def upload_image_to_wp(image_bytes: bytes, filename: str, product_name: str) -> int:
    """Upload image to WordPress media library. Returns media ID."""
    # Use ASCII-only filename in header (Hebrew chars break latin-1 encoding)
    safe_filename = "".join(c if c.isascii() and c not in '"\\' else "_" for c in filename)
    r = requests.post(
        f"{WOO_URL}/wp-json/wp/v2/media",
        headers={
            "User-Agent": UA,
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Content-Type": "image/jpeg",
        },
        data=image_bytes,
        auth=(WP_USER, WP_PASS),
        timeout=60
    )
    r.raise_for_status()
    media = r.json()
    return media["id"]


def compress_image(image_bytes: bytes, quality: int = 75, max_size: int = 900) -> bytes:
    """Compress and resize image to reduce file size."""
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def update_product_image(product_id: int, media_id: int, existing_images: list):
    """Insert model image as 3rd image (index 2). If only 1 existing image, insert as 2nd."""
    n = len(existing_images)
    if n <= 1:
        # 1 or 0 existing: put model at position 1 (2nd slot)
        new_images = []
        for i, img in enumerate(existing_images):
            new_images.append({"id": img["id"], "position": i})
        new_images.append({"id": media_id, "position": n})
    else:
        # 2+ existing: insert model at position 2 (3rd slot), shift the rest
        new_images = [{"id": existing_images[0]["id"], "position": 0},
                      {"id": existing_images[1]["id"], "position": 1},
                      {"id": media_id, "position": 2}]
        for i, img in enumerate(existing_images[2:], start=3):
            new_images.append({"id": img["id"], "position": i})

    r = requests.put(
        f"{WOO_URL}/wp-json/wc/v3/products/{product_id}",
        json={"images": new_images},
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=30
    )
    r.raise_for_status()


# ── Gemini image generation ────────────────────────────────────────────────────
def generate_model_image(jersey_bytes: bytes, is_kids: bool = False) -> bytes:
    """Send jersey image to Gemini, get back model photo as bytes."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=GEMINI_KEY)

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[
            types.Part.from_bytes(data=jersey_bytes, mime_type="image/jpeg"),
            types.Part.from_text(text=get_prompt(is_kids=is_kids)),
        ],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"]
        )
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            data = part.inline_data.data
            return data if isinstance(data, bytes) else data.encode('latin-1')

    raise ValueError("Gemini did not return an image")


def get_products_by_ids(ids: list) -> list:
    """Fetch specific products by ID list from WooCommerce."""
    products = []
    for pid in ids:
        r = requests.get(
            f"{WOO_URL}/wp-json/wc/v3/products/{pid}",
            auth=(WOO_KEY, WOO_SECRET),
            headers={"User-Agent": UA},
            timeout=30
        )
        if r.status_code == 200:
            products.append(r.json())
        else:
            print(f"  ⚠ Could not fetch product {pid}: {r.status_code}")
    return products


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    preview_mode = "--preview" in sys.argv
    upload_mode  = "--upload"  in sys.argv
    force_mode   = "--force"   in sys.argv   # reprocess even if in progress.json

    if not preview_mode and not upload_mode:
        print("Usage: python generate_model_images.py --preview [--limit N] [--ids 123,456]")
        print("       python generate_model_images.py --upload  [--limit N] [--ids 123,456] [--force]")
        sys.exit(1)

    limit = 50
    target_ids = []
    for i, arg in enumerate(sys.argv):
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])
        if arg == "--ids" and i + 1 < len(sys.argv):
            target_ids = [int(x.strip()) for x in sys.argv[i + 1].split(",")]

    if not all([WOO_URL, WOO_KEY, WOO_SECRET]):
        print("❌ חסרים פרטי WooCommerce ב-.env")
        sys.exit(1)
    if not GEMINI_KEY:
        print("❌ חסר GEMINI_API_KEY ב-.env")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    mode_label = "PREVIEW (שמירה מקומית בלבד)" if preview_mode else "UPLOAD (מעלה לWooCommerce)"
    print(f"\n{'='*55}")
    print(f"  מצב: {mode_label}")
    if target_ids:
        print(f"  מוצרים ממוקדים: {target_ids}")
    else:
        print(f"  מוצרים: top {limit}")
    print(f"  תיקיית פלט: {OUTPUT_DIR}")
    print(f"{'='*55}\n")

    if target_ids:
        print(f"מושך {len(target_ids)} מוצרים לפי ID...")
        products = get_products_by_ids(target_ids)
    else:
        print(f"מושך {limit} מוצרים הכי נמכרים...")
        products = get_top_products(limit)
    print(f"נמצאו {len(products)} מוצרים\n")

    # Load progress log
    log_path = OUTPUT_DIR / "progress.json"
    progress = {}
    if log_path.exists():
        with open(log_path, encoding="utf-8") as f:
            progress = json.load(f)

    success, failed, skipped = 0, 0, 0

    for i, product in enumerate(products, 1):
        pid     = product["id"]
        name    = product["name"]
        imgs    = product.get("images", [])
        img_url = imgs[0]["src"] if imgs else None
        is_kids = "חליפת ילדים" in name or "חליפות ילדים" in name

        print(f"[{i}/{len(products)}] {'👦 ' if is_kids else ''}  {name} (ID: {pid})")

        if not img_url:
            print("  ⚠ אין תמונה, מדלג")
            skipped += 1
            continue

        # Skip already-done unless --force
        if str(pid) in progress and not force_mode:
            entry = progress[str(pid)]
            if entry.get("uploaded") or (preview_mode and entry.get("file")):
                print(f"  ✓ כבר עובד קודם, מדלג (השתמש ב--force לדריסה)")
                skipped += 1
                continue

        # Skip מיסטרי בוקס / צעיפים always
        skip_keywords = ["מיסטרי בוקס", "צעיף", "צעיפים"]
        if any(kw in name for kw in skip_keywords):
            print(f"  ✗ מדלג (מוצר לא מתאים)")
            skipped += 1
            continue

        try:
            print("  ↓ מוריד תמונת חולצה...")
            jersey_bytes = download_image(img_url)

            model_type = "ילד 👦" if is_kids else "מבוגר"
            print(f"  🤖 שולח לGemini — דגמן {model_type}...")
            model_img_bytes = generate_model_image(jersey_bytes, is_kids=is_kids)

            safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in name)[:60]
            filename = f"{pid}_{safe_name}.jpg"
            out_path = OUTPUT_DIR / filename

            with open(out_path, "wb") as f:
                f.write(model_img_bytes)
            print(f"  💾 נשמר: {out_path.name} ({len(model_img_bytes)//1024}KB)")

            if upload_mode:
                print("  🗜 דוחס תמונה...")
                upload_bytes = compress_image(model_img_bytes)
                print(f"  📦 {len(model_img_bytes)//1024}KB → {len(upload_bytes)//1024}KB")
                print("  ↑ מעלה לWordPress...")
                media_id = upload_image_to_wp(upload_bytes, filename, name)
                update_product_image(pid, media_id, imgs)
                print(f"  ✅ עודכן! ({len(imgs)} תמונות קיימות נשמרו)")

            progress[str(pid)] = {
                "name": name,
                "file": filename,
                "uploaded": upload_mode,
                "is_kids": is_kids,
                "timestamp": datetime.now().isoformat()
            }
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(progress, f, ensure_ascii=False, indent=2)

            success += 1

        except Exception as e:
            print(f"  ✗ שגיאה: {e}")
            import traceback; traceback.print_exc()
            failed += 1

        time.sleep(3)

    print(f"\n{'='*55}")
    print(f"סיום: {success} הצליחו, {failed} נכשלו, {skipped} דולגו")
    if preview_mode:
        print(f"\n📁 תמונות שמורות ב: {OUTPUT_DIR}")
        print("בדוק ואז הרץ עם --upload --ids ... להעלאה")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()
