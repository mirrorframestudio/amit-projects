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

for pid in [40986, 40946, 40716]:
    r = requests.get(
        f"{WOO_URL}/wp-json/wc/v3/products/{pid}",
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=30
    )
    p = r.json()
    print(f"\nProduct {pid} — {p['name']}")
    for i, img in enumerate(p.get("images", [])):
        print(f"  [{i}] id={img['id']}  {img['src'][-70:]}")
