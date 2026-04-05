"""
Business Intelligence — automatically research a business
from Facebook Page data + website scraping + AI analysis.
Builds a rich business profile used for all recommendations and creative.
"""
import logging
import re
import requests
from anthropic import Anthropic

from .. import config

logger = logging.getLogger(__name__)

BASE = "https://graph.facebook.com/v22.0"


# ── Step 1: Fetch Facebook Page info ─────────────────────
def fetch_fb_page_info(access_token: str) -> dict:
    """
    Get business info from the user's Facebook pages.
    Returns: name, category, website, about, description, fan_count, etc.
    """
    url = f"{BASE}/me/accounts"
    params = {
        "access_token": access_token,
        "fields": "name,category,website,about,description,fan_count,link,cover,picture",
        "limit": 10,
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        pages = resp.json().get("data", [])
        if not pages:
            return {}

        # Return the first/main page
        page = pages[0]
        return {
            "page_name": page.get("name", ""),
            "category": page.get("category", ""),
            "website": page.get("website", ""),
            "about": page.get("about", ""),
            "description": page.get("description", ""),
            "fan_count": page.get("fan_count", 0),
            "page_link": page.get("link", ""),
            "all_pages": [
                {"name": p.get("name", ""), "category": p.get("category", "")}
                for p in pages
            ],
        }
    except Exception as e:
        logger.warning("Failed to fetch FB page info: %s", e)
        return {}


# ── Step 2: Fetch catalog/products info ──────────────────
def fetch_catalog_info(access_token: str, ad_account_id: str) -> list[dict]:
    """Fetch product catalog items for business context."""
    if not ad_account_id:
        return []

    try:
        # Get product catalogs
        url = f"{BASE}/{ad_account_id}/product_catalogs"
        params = {"access_token": access_token, "fields": "name,product_count", "limit": 5}
        resp = requests.get(url, params=params, timeout=15)

        if resp.status_code != 200:
            return []

        catalogs = resp.json().get("data", [])
        if not catalogs:
            return []

        # Get sample products from first catalog
        catalog_id = catalogs[0].get("id")
        if not catalog_id:
            return []

        url = f"{BASE}/{catalog_id}/products"
        params = {
            "access_token": access_token,
            "fields": "name,description,price,currency,category,url,image_url",
            "limit": 20,
        }
        resp = requests.get(url, params=params, timeout=15)
        if resp.status_code != 200:
            return []

        products = resp.json().get("data", [])
        return [
            {
                "name": p.get("name", ""),
                "description": p.get("description", ""),
                "price": p.get("price", ""),
                "currency": p.get("currency", ""),
                "category": p.get("category", ""),
            }
            for p in products[:20]
        ]
    except Exception as e:
        logger.warning("Failed to fetch catalog: %s", e)
        return []


# ── Step 3: Scrape website ────────────────────────────────
def scrape_website(url: str) -> dict:
    """
    Scrape basic content from the business website.
    Returns: title, meta_description, headings, sample text.
    """
    if not url:
        return {}

    # Clean URL
    url = url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        resp = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        resp.raise_for_status()
        html = resp.text[:50000]  # Limit to 50KB

        # Extract title
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else ""

        # Extract meta description
        meta_match = re.search(
            r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']',
            html, re.IGNORECASE
        )
        if not meta_match:
            meta_match = re.search(
                r'<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']description["\']',
                html, re.IGNORECASE
            )
        meta_desc = meta_match.group(1).strip() if meta_match else ""

        # Extract visible text (simplified)
        # Remove scripts and styles
        clean = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        clean = re.sub(r'<style[^>]*>.*?</style>', '', clean, flags=re.DOTALL | re.IGNORECASE)
        clean = re.sub(r'<[^>]+>', ' ', clean)
        clean = re.sub(r'\s+', ' ', clean).strip()

        # Extract headings
        headings = re.findall(r'<h[1-3][^>]*>(.*?)</h[1-3]>', html, re.IGNORECASE | re.DOTALL)
        headings = [re.sub(r'<[^>]+>', '', h).strip() for h in headings[:15]]

        return {
            "url": url,
            "title": title,
            "meta_description": meta_desc,
            "headings": headings,
            "text_sample": clean[:3000],  # First 3000 chars of visible text
        }
    except Exception as e:
        logger.warning("Failed to scrape website %s: %s", url, e)
        return {"url": url, "error": str(e)}


# ── Step 4: Fetch recent ad creatives ─────────────────────
def fetch_recent_ads_creative(access_token: str, ad_account_id: str) -> list[dict]:
    """Fetch recent ad creative text/headlines for context."""
    if not ad_account_id:
        return []

    try:
        url = f"{BASE}/{ad_account_id}/ads"
        params = {
            "access_token": access_token,
            "fields": "name,creative{title,body,link_url,call_to_action_type,image_url}",
            "effective_status": '["ACTIVE"]',
            "limit": 10,
        }
        resp = requests.get(url, params=params, timeout=15)
        if resp.status_code != 200:
            return []

        ads = resp.json().get("data", [])
        creatives = []
        for ad in ads:
            creative = ad.get("creative", {})
            if creative:
                creatives.append({
                    "ad_name": ad.get("name", ""),
                    "title": creative.get("title", ""),
                    "body": creative.get("body", ""),
                    "cta": creative.get("call_to_action_type", ""),
                })
        return creatives
    except Exception as e:
        logger.warning("Failed to fetch ad creatives: %s", e)
        return []


# ── Step 5: AI Analysis — Build Business Profile ─────────
def build_business_profile(
    page_info: dict,
    website_data: dict,
    products: list[dict],
    ad_creatives: list[dict],
) -> dict:
    """
    Use Claude to analyze all gathered data and build a comprehensive
    business profile for future recommendations and creative.
    """
    client = _get_client()
    if not client:
        return _build_basic_profile(page_info, website_data, products)

    # Build context for AI
    context_parts = []

    if page_info:
        context_parts.append(f"""דף פייסבוק:
- שם: {page_info.get('page_name', '')}
- קטגוריה: {page_info.get('category', '')}
- אתר: {page_info.get('website', '')}
- אודות: {page_info.get('about', '')}
- תיאור: {page_info.get('description', '')}
- עוקבים: {page_info.get('fan_count', 0):,}""")

    if website_data and not website_data.get("error"):
        context_parts.append(f"""אתר:
- כותרת: {website_data.get('title', '')}
- תיאור: {website_data.get('meta_description', '')}
- כותרות ראשיות: {', '.join(website_data.get('headings', [])[:10])}
- טקסט (דוגמה): {website_data.get('text_sample', '')[:1500]}""")

    if products:
        product_list = "\n".join([
            f"  - {p['name']} ({p.get('price', '')} {p.get('currency', '')}): {p.get('description', '')[:100]}"
            for p in products[:10]
        ])
        context_parts.append(f"מוצרים בקטלוג:\n{product_list}")

    if ad_creatives:
        creative_list = "\n".join([
            f"  - {c['ad_name']}: {c.get('title', '')} | {c.get('body', '')[:100]}"
            for c in ad_creatives[:5]
        ])
        context_parts.append(f"מודעות פעילות:\n{creative_list}")

    full_context = "\n\n".join(context_parts)

    prompt = f"""אתה מומחה שיווק דיגיטלי. קיבלת מידע על עסק. תנתח את המידע ותבנה פרופיל עסקי מלא.

המידע שנאסף:
{full_context}

תחזיר תשובה בפורמט הבא (בעברית):

1. **סיכום העסק**: 2-3 משפטים שמתארים מה העסק עושה
2. **מוצרים/שירותים עיקריים**: רשימה של המוצרים/שירותים המרכזיים
3. **קהל יעד משוער**: מי הלקוחות הטיפוסיים (גיל, מגדר, תחומי עניין)
4. **USP (יתרון תחרותי)**: מה מייחד את העסק
5. **טון מותג**: איך העסק מדבר (רשמי/צעיר/מקצועי/ידידותי)
6. **מתחרים אפשריים**: סוגי עסקים מתחרים
7. **הזדמנויות פרסום**: 3-5 רעיונות לכיווני פרסום שיכולים לעבוד
8. **נקודות כאב של הלקוח**: מה הלקוח מחפש / מה הבעיה שהעסק פותר

ענה בעברית בלבד. היה ספציפי ומעשי.
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        ai_profile = response.content[0].text
        logger.info("Built AI business profile (%d chars)", len(ai_profile))

        return {
            "ai_profile": ai_profile,
            "page_info": page_info,
            "website": website_data,
            "products_count": len(products),
            "products_sample": products[:5],
            "ad_creatives_count": len(ad_creatives),
            "status": "complete",
        }
    except Exception as e:
        logger.exception("AI profile generation failed")
        return _build_basic_profile(page_info, website_data, products)


def build_business_profile_from_input(
    user_input: dict,
    website_data: dict | None = None,
    ad_creatives: list[dict] | None = None,
) -> dict:
    """
    Build AI business profile from user-provided info + scraped website.
    This is the main flow — the user tells us about their business.
    """
    client = _get_client()
    if not client:
        return {"ai_profile": "", "status": "basic"}

    # Build context
    context_parts = []

    context_parts.append(f"""מידע מהבעלים:
- שם העסק: {user_input.get('business_name', '')}
- תיאור: {user_input.get('description', '')}
- מוצרים/שירותים: {user_input.get('products', '')}
- קהל יעד: {user_input.get('audience', '')}
- יתרון תחרותי: {user_input.get('usp', '')}
- אתר: {user_input.get('website', '')}""")

    if website_data and not website_data.get("error"):
        context_parts.append(f"""מידע מהאתר ({website_data.get('url', '')}):
- כותרת: {website_data.get('title', '')}
- תיאור: {website_data.get('meta_description', '')}
- כותרות: {', '.join(website_data.get('headings', [])[:10])}
- תוכן: {website_data.get('text_sample', '')[:2000]}""")

    if ad_creatives:
        creative_list = "\n".join([
            f"  - {c['ad_name']}: {c.get('title', '')} | {c.get('body', '')[:100]}"
            for c in ad_creatives[:5]
        ])
        context_parts.append(f"מודעות פעילות כרגע:\n{creative_list}")

    full_context = "\n\n".join(context_parts)

    prompt = f"""אתה מומחה שיווק דיגיטלי. קיבלת מידע על עסק מהבעלים ומהאתר שלו.
תנתח הכל ותבנה פרופיל עסקי מלא שישמש אותנו ליצירת המלצות ורעיונות לקריאייטיב.

{full_context}

בנה פרופיל מפורט שכולל:

1. **סיכום העסק**: 3-4 משפטים שמתארים את העסק, מה הוא מוכר ולמי
2. **מוצרים/שירותים**: רשימה מסודרת של מה שהעסק מציע
3. **קהל יעד מפורט**: דמוגרפיה (גיל, מגדר, מיקום), תחומי עניין, התנהגויות רכישה
4. **USP — מה מייחד**: למה לקוח יבחר בעסק הזה ולא במתחרה
5. **טון מותג**: איך העסק צריך לדבר במודעות (רשמי/צעיר/שובב/מקצועי)
6. **נקודות כאב של הלקוח**: מה הבעיות שהעסק פותר, מה הלקוח מחפש
7. **טריגרים רגשיים לפרסום**: מה יגרום ללקוח ללחוץ על מודעה (FOMO, סקרנות, הנחה, חברתי)
8. **מתחרים בתחום**: סוגי עסקים/מותגים מתחרים
9. **5 כיווני פרסום מומלצים**: רעיונות ספציפיים לקמפיינים שיכולים לעבוד
10. **Do's and Don'ts**: מה כן ומה לא לעשות בפרסום של העסק הזה

ענה בעברית. היה ספציפי לעסק הזה — לא טיפים גנריים.
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        ai_profile = response.content[0].text
        logger.info("Built AI business profile from user input (%d chars)", len(ai_profile))
        return {"ai_profile": ai_profile, "status": "complete"}
    except Exception as e:
        logger.exception("AI profile from input failed")
        return {"ai_profile": "", "status": "basic", "error": str(e)}


def _build_basic_profile(page_info: dict, website_data: dict, products: list[dict]) -> dict:
    """Fallback profile without AI."""
    return {
        "ai_profile": "",
        "page_info": page_info,
        "website": website_data,
        "products_count": len(products),
        "products_sample": products[:5],
        "status": "basic",
    }


# ── Full research pipeline ────────────────────────────────
def research_business(access_token: str, ad_account_id: str = "") -> dict:
    """
    Run the full business research pipeline:
    1. Facebook Page info
    2. Website scraping
    3. Product catalog
    4. Ad creatives
    5. AI analysis
    """
    logger.info("Starting business research...")

    # Step 1: Facebook Page
    page_info = fetch_fb_page_info(access_token)
    logger.info("Page info: %s", page_info.get("page_name", "none"))

    # Step 2: Website
    website_url = page_info.get("website", "")
    website_data = scrape_website(website_url) if website_url else {}
    logger.info("Website scraped: %s", bool(website_data))

    # Step 3: Catalog
    products = fetch_catalog_info(access_token, ad_account_id) if ad_account_id else []
    logger.info("Products found: %d", len(products))

    # Step 4: Ad creatives
    ad_creatives = fetch_recent_ads_creative(access_token, ad_account_id) if ad_account_id else []
    logger.info("Ad creatives found: %d", len(ad_creatives))

    # Step 5: AI Profile
    profile = build_business_profile(page_info, website_data, products, ad_creatives)
    logger.info("Business profile status: %s", profile.get("status"))

    return profile


def _get_client() -> Anthropic | None:
    if not config.ANTHROPIC_API_KEY:
        return None
    return Anthropic(api_key=config.ANTHROPIC_API_KEY)
