"""Remove old adult model image and keep only original + new child model for 3 products."""
import os, sys, requests
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
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
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# For each product: old adult model media ID to remove
# [0]=original, [1]=old adult model (remove), [2]=new child model (keep as [1])
FIXES = {
    40986: {"old_model_id": 210317, "new_model_id": 210390},
    40946: {"old_model_id": 210336, "new_model_id": 210391},
    40716: {"old_model_id": 210369, "new_model_id": 210392},
}

for pid, fix in FIXES.items():
    r = requests.get(
        f"{WOO_URL}/wp-json/wc/v3/products/{pid}",
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=30
    )
    p = r.json()
    all_imgs = p.get("images", [])
    print(f"\nProduct {pid} — {p['name']}")
    print(f"  Current images: {[img['id'] for img in all_imgs]}")

    # Keep all except the old adult model
    new_images = []
    pos = 0
    for img in all_imgs:
        if img["id"] == fix["old_model_id"]:
            print(f"  Removing old adult model: id={img['id']}")
            continue
        new_images.append({"id": img["id"], "position": pos})
        pos += 1

    print(f"  New image order: {[img['id'] for img in new_images]}")

    r2 = requests.put(
        f"{WOO_URL}/wp-json/wc/v3/products/{pid}",
        json={"images": new_images},
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=30
    )
    r2.raise_for_status()
    result = r2.json()
    print(f"  Updated: {[img['id'] for img in result.get('images', [])]}")
    print(f"  OK")
