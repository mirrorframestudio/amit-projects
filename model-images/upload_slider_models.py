"""
Upload model images for the products slider to WordPress,
then patch slider_code.js with the live URLs.
"""
import sys, os, json, requests
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

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
load_env(ROOT / "model-images" / ".env")

WOO_URL = os.getenv("WOO_URL", "https://onezonejersey.com").rstrip("/")
WP_USER = os.getenv("WP_USER", "")
WP_PASS = os.getenv("WP_APP_PASSWORD", "")
UA = "Mozilla/5.0"

OUTPUT_DIR = Path(__file__).resolve().parent / "output"
SLIDER_JS  = ROOT / "nations-slider" / "slider_code.js"

# Map: product key → (local filename, js variable name in slider_code.js)
PRODUCTS = [
    {"key": "arg_away",  "file": "199894_ארגנטינה חוץ מונדיאל 2026 מסי.jpg",  "team": "ארגנטינה חוץ מסי"},
    {"key": "bra_away",  "file": "194283_ברזיל חוץ מונדיאל 2026.jpg",          "team": "ברזיל חוץ"},
    {"key": "ger_home",  "file": "183483_גרמניה בית מונדיאל 2026.jpg",          "team": "גרמניה"},
    {"key": "ned_home",  "file": "207418_הולנד בית מונדיאל 2026.jpg",           "team": "הולנד"},
    {"key": "esp_away",  "file": "200417_ספרד חוץ מונדיאל 2026.jpg",            "team": "ספרד חוץ"},
    {"key": "por_away",  "file": "201293_פורטוגל חוץ מונדיאל 2026.jpg",         "team": "פורטוגל חוץ"},
    {"key": "fra_home",  "file": "208017_צרפת_בית.jpg",                          "team": "צרפת"},
    {"key": "eng_home",  "file": "206060_אנגליה_בית.jpg",                        "team": "אנגליה"},
    {"key": "arg_home",  "file": "182690_ארגנטינה בית מונדיאל 2026.jpg",        "team": "ארגנטינה בית"},
    {"key": "bra_home",  "file": "207820_ברזיל בית מונדיאל 2026.jpg",           "team": "ברזיל בית"},
    {"key": "esp_home",  "file": "183874_ספרד בית מונדיאל 2026.jpg",            "team": "ספרד בית"},
    {"key": "por_home",  "file": "125303_פורטוגל בית עונת 2025.jpg",            "team": "פורטוגל בית"},
]

urls_path = OUTPUT_DIR / "slider_model_urls.json"
urls = {}
if urls_path.exists():
    with open(urls_path, encoding="utf-8") as f:
        urls = json.load(f)

print(f"\n{'='*55}")
print("  העלאת תמונות דוגמנים לסליידר")
print(f"{'='*55}\n")

for p in PRODUCTS:
    key = p["key"]
    if key in urls:
        print(f"  ✓ {p['team']} — כבר הועלה")
        continue

    fpath = OUTPUT_DIR / p["file"]
    if not fpath.exists():
        print(f"  ✗ {p['team']} — קובץ לא נמצא: {p['file']}")
        continue

    print(f"  ↑ מעלה: {p['team']}...")
    with open(fpath, "rb") as f:
        img_bytes = f.read()

    safe_name = "model_" + key + ".jpg"
    r = requests.post(
        f"{WOO_URL}/wp-json/wp/v2/media",
        headers={
            "User-Agent": UA,
            "Content-Disposition": f'attachment; filename="{safe_name}"',
            "Content-Type": "image/jpeg",
        },
        data=img_bytes,
        auth=(WP_USER, WP_PASS),
        timeout=60
    )
    if not r.ok:
        print(f"  ✗ שגיאה {r.status_code}: {r.text[:100]}")
        continue

    wp_url = r.json()["source_url"]
    urls[key] = wp_url
    with open(urls_path, "w", encoding="utf-8") as f:
        json.dump(urls, f, ensure_ascii=False, indent=2)
    print(f"  ✅ {p['team']} → {wp_url}")

print(f"\n{'='*55}")
print(f"  הועלו {len(urls)}/12 תמונות")
print(f"{'='*55}\n")

# Print mapping for slider_code.js
print("URLs לסליידר:")
for p in PRODUCTS:
    url = urls.get(p["key"], "MISSING")
    print(f"  {p['team']}: {url}")
