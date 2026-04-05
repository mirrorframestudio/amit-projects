"""
Product description generator for OneZoneJersey.
Fetches top 50 best-selling products, generates Hebrew descriptions via Claude API,
and updates WooCommerce.

Usage:
  python generate_descriptions.py          # run for real (updates WooCommerce)
  python generate_descriptions.py --test   # dry run, prints descriptions only
  python generate_descriptions.py --limit 5 --test   # test only 5 products
"""

import os
import re
import sys
import time
import base64
import requests
import anthropic
from pathlib import Path

# ── Load credentials from .env files ──────────────────────────────────────────
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

WOO_URL    = os.getenv("WOO_URL", "").rstrip("/")
WOO_KEY    = os.getenv("WOO_CONSUMER_KEY", "")
WOO_SECRET = os.getenv("WOO_CONSUMER_SECRET", "")
ANTH_KEY   = os.getenv("ANTHROPIC_API_KEY", "")

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# ── Footer appended to every description ──────────────────────────────────────
FOOTER = (
    '<p>מידות: מומלץ להיעזר ב"עוזר המידות" שלנו באתר כדי לבחור את המידה המדויקת והמושלמת עבורך.<br>'
    "שמירה על החולצה: כביסה עדינה במים קרים (הפוכה), ללא מייבש.</p>"
    "<p><strong>בחר מידה והזמן עכשיו מ-OneZoneJersey!</strong></p>"
)

# ── Claude system prompt ───────────────────────────────────────────────────────
SYSTEM_PROMPT = """אתה כותב תיאורי מוצר בעברית לחנות חולצות כדורגל בשם OneZoneJersey.

כללים קשוחים - אסור להפר:
- אסור לכתוב: "מקורי", "רשמי", "Authentic", "1:1", "רפליקה", "העתק", "חיקוי", "חולצת אוהדים"
- אין קלישאות שיווקיות
- עברית פשוטה וקצרה - כאילו מסביר לחבר

פורמט הפלט - רק זה, ללא תוספות:
<p>[2-3 משפטים: תאר את העיצוב והצבעים לפי התמונה. ציין <strong>סמל ולוגו רקומים</strong> ו<strong>בד פוליאסטר נושם</strong>. אם רטרו - הוסף משפט היסטורי עובדתי אחד בלבד.]</p>

כלל רטרו: אם שם המוצר מכיל שנה לפני 2023 (למשל 1998, 2006, 2014/15) - הוסף משפט עובדתי אחד על הישג היסטורי שקשור לאותה חולצה.
אם לא רטרו - אל תזכיר שנה בכלל.

חשוב: 3 משפטים מקסימום. פשוט וישיר."""


def is_retro(name: str) -> bool:
    return bool(re.search(r'\b(19\d{2}|200\d|201\d|2020|2021|2022)\b', name))


def get_image_b64(url: str) -> tuple:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=15)
    r.raise_for_status()
    media_type = r.headers.get("content-type", "image/jpeg").split(";")[0]
    if media_type not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
        media_type = "image/jpeg"
    return base64.standard_b64encode(r.content).decode(), media_type


def generate_description(product_name: str, image_url: str, client: anthropic.Anthropic) -> str:
    content = []

    if image_url:
        try:
            img_data, media_type = get_image_b64(image_url)
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": img_data}
            })
        except Exception as e:
            print(f"    ⚠ לא ניתן לטעון תמונה: {e}")

    retro_note = " [חולצה רטרו - הוסף עובדה היסטורית]" if is_retro(product_name) else ""
    content.append({
        "type": "text",
        "text": f"שם המוצר: {product_name}{retro_note}\n\nכתוב תיאור מוצר בעברית לפי ההנחיות."
    })

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}]
    )
    return response.content[0].text.strip()


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


def update_product(product_id: int, description: str):
    full = description + FOOTER
    r = requests.put(
        f"{WOO_URL}/wp-json/wc/v3/products/{product_id}",
        json={"description": full},
        auth=(WOO_KEY, WOO_SECRET),
        headers={"User-Agent": UA},
        timeout=30
    )
    r.raise_for_status()


def main():
    test_mode = "--test" in sys.argv
    limit = 50
    for i, arg in enumerate(sys.argv):
        if arg == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])

    if test_mode:
        print(f"🧪 מצב בדיקה — לא מעדכן WooCommerce (limit={limit})")
    else:
        print(f"🚀 מצב אמיתי — מעדכן {limit} מוצרים ב-WooCommerce")

    if not all([WOO_URL, WOO_KEY, WOO_SECRET, ANTH_KEY]):
        print("❌ חסרים פרטי חיבור ב-.env")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=ANTH_KEY)

    print(f"\nמושך {limit} מוצרים הכי נמכרים...")
    products = get_top_products(limit)
    print(f"נמצאו {len(products)} מוצרים\n")

    success, failed = 0, 0

    for i, product in enumerate(products, 1):
        pid   = product["id"]
        name  = product["name"]
        imgs  = product.get("images", [])
        img_url = imgs[0]["src"] if imgs else None

        print(f"[{i}/{len(products)}] {name}")

        try:
            desc = generate_description(name, img_url, client)
            print(f"  → {desc[:120]}...")

            if not test_mode:
                update_product(pid, desc)
                print("  ✓ עודכן")
            else:
                print("  ✓ (test - לא נשמר)")

            success += 1

        except Exception as e:
            print(f"  ✗ שגיאה: {e}")
            failed += 1

        time.sleep(1.5)  # rate limit

    print(f"\n{'='*50}")
    print(f"סיום: {success} הצליחו, {failed} נכשלו")


if __name__ == "__main__":
    main()
