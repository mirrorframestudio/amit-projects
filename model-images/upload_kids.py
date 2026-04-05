"""
Upload already-generated kids preview images to WooCommerce.
Does NOT call Gemini — reads existing files from output/ directory.

Usage:
  python upload_kids.py           # upload all kids with uploaded=false
  python upload_kids.py --force   # also re-upload 40716, 40946, 40986
"""
import os, sys, json, requests
from pathlib import Path
from datetime import datetime

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
WP_USER    = os.getenv("WP_USER", "")
WP_PASS    = os.getenv("WP_APP_PASSWORD", "")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

OUTPUT_DIR = Path(__file__).resolve().parent / "output"

# Kids that were uploaded with adult models — need replacement
FORCE_IDS = {40716, 40946, 40986}


def compress_image(image_bytes: bytes, quality: int = 75, max_size: int = 900) -> bytes:
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    if img.width > max_size or img.height > max_size:
        img.thumbnail((max_size, max_size), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def upload_image_to_wp(image_bytes: bytes, filename: str) -> int:
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
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["id"]


def get_product(pid: int) -> dict:
    r = requests.get(
        f"{WOO_URL}/wp-json/wc/v3/products/{pid}",
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def update_product_image(product_id: int, media_id: int, existing_images: list):
    n = len(existing_images)
    if n <= 1:
        new_images = [{"id": img["id"], "position": i} for i, img in enumerate(existing_images)]
        new_images.append({"id": media_id, "position": n})
    else:
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
        timeout=30,
    )
    r.raise_for_status()


def main():
    force_mode = "--force" in sys.argv

    log_path = OUTPUT_DIR / "progress.json"
    with open(log_path, encoding="utf-8") as f:
        progress = json.load(f)

    # Collect targets: all kids with uploaded=false + FORCE_IDS if --force
    targets = []
    for pid_str, entry in progress.items():
        pid = int(pid_str)
        if entry.get("is_kids") and not entry.get("uploaded"):
            targets.append((pid, entry))
        elif force_mode and pid in FORCE_IDS:
            targets.append((pid, entry))

    print(f"\n{'='*55}")
    print(f"  Upload kids images — {len(targets)} products")
    if force_mode:
        print(f"  --force: will re-upload {FORCE_IDS}")
    print(f"{'='*55}\n")

    success, failed = 0, 0

    for i, (pid, entry) in enumerate(targets, 1):
        name = entry["name"]
        filename = entry.get("file", "")
        file_path = OUTPUT_DIR / filename if filename else None

        print(f"[{i}/{len(targets)}] {name} (ID: {pid})")

        if not file_path or not file_path.exists():
            print(f"  ✗ קובץ לא נמצא: {filename}")
            failed += 1
            continue

        try:
            img_bytes = file_path.read_bytes()
            print(f"  🗜 דוחס ({len(img_bytes)//1024}KB)...")
            upload_bytes = compress_image(img_bytes)
            print(f"  📦 {len(img_bytes)//1024}KB → {len(upload_bytes)//1024}KB")

            print(f"  ↑ מעלה לWordPress...")
            media_id = upload_image_to_wp(upload_bytes, filename)

            print(f"  🔗 מושך מוצר מ-WooCommerce...")
            product = get_product(pid)
            existing_imgs = product.get("images", [])

            update_product_image(pid, media_id, existing_imgs)
            print(f"  ✅ עודכן! (media_id={media_id}, {len(existing_imgs)} תמונות קיימות)")

            progress[str(pid)]["uploaded"] = True
            progress[str(pid)]["timestamp"] = datetime.now().isoformat()
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(progress, f, ensure_ascii=False, indent=2)

            success += 1

        except Exception as e:
            print(f"  ✗ שגיאה: {e}")
            import traceback; traceback.print_exc()
            failed += 1

    print(f"\n{'='*55}")
    print(f"סיום: {success} הועלו, {failed} נכשלו")
    print(f"{'='*55}\n")


if __name__ == "__main__":
    main()
