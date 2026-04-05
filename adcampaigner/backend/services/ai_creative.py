"""
AI Creative Suggestions — uses Claude API to generate
ad copy, visual ideas, audience suggestions, and hooks.
Now powered by the auto-researched business profile.
"""
import logging
from anthropic import Anthropic

from .. import config

logger = logging.getLogger(__name__)


def _get_client() -> Anthropic | None:
    if not config.ANTHROPIC_API_KEY:
        logger.warning("No ANTHROPIC_API_KEY set — AI creative suggestions disabled")
        return None
    return Anthropic(api_key=config.ANTHROPIC_API_KEY)


def generate_creative_suggestion(
    suggestion_type: str,
    business_context: str,
    campaign_data: dict | None = None,
    business_profile: dict | None = None,
    language: str = "he",
) -> str:
    """
    Generate a creative suggestion using Claude.
    Uses the auto-researched business profile for deep context.
    """
    client = _get_client()
    if not client:
        return "שירות הצעות הקריאייטיב לא מוגדר (חסר ANTHROPIC_API_KEY)"

    lang_instruction = "ענה בעברית." if language == "he" else "Answer in English."

    type_prompts = {
        "copy": (
            "כתוב 3 גרסאות של טקסט למודעת פייסבוק/אינסטגרם. "
            "כל גרסה צריכה לכלול: כותרת, טקסט ראשי, וקריאה לפעולה (CTA). "
            "תהיה יצירתי, ישיר, ותשתמש בשפה שמדברת לקהל היעד. "
            "תתבסס על מה שאתה יודע על העסק, המוצרים והקהל."
        ),
        "visual": (
            "תן 3 רעיונות ויזואליים למודעה. "
            "לכל רעיון תאר: את התמונה/סרטון, צבעים מומלצים, סגנון, "
            "ואיזה אלמנטים חשוב לכלול. התבסס על המותג והמוצרים של העסק."
        ),
        "audience": (
            "הצע 3 קהלי יעד חדשים לבדוק בפייסבוק. "
            "לכל קהל תן: טירגוט מדויק (גיל, מגדר, תחומי עניין, התנהגויות), "
            "גודל משוער, ולמה הקהל הזה מתאים לעסק הספציפי הזה."
        ),
        "hook": (
            "כתוב 5 פתיחים (hooks) חזקים למודעות וידאו. "
            "כל hook צריך להיות 1-2 משפטים שתופסים תשומת לב מיידית "
            "בשניות הראשונות. תשתמש בטריגרים רגשיים, סקרנות, או כאב "
            "שרלוונטי ללקוחות של העסק הזה."
        ),
    }

    type_prompt = type_prompts.get(suggestion_type, type_prompts["copy"])

    # Build rich context from business profile
    profile_context = ""
    if business_profile:
        ai_profile = business_profile.get("ai_profile", "")
        if ai_profile:
            profile_context = f"\n\nפרופיל העסק (מחקר אוטומטי):\n{ai_profile}\n"

        page_info = business_profile.get("page_info", {})
        if page_info:
            profile_context += f"\nשם הדף: {page_info.get('page_name', '')}"
            profile_context += f"\nקטגוריה: {page_info.get('category', '')}"
            if page_info.get('fan_count'):
                profile_context += f"\nעוקבים: {page_info['fan_count']:,}"

        products = business_profile.get("products_sample", [])
        if products:
            product_list = ", ".join([p.get("name", "") for p in products[:10]])
            profile_context += f"\nמוצרים: {product_list}"

    # Performance context
    perf_context = ""
    if campaign_data:
        perf_context = "\n\nנתוני ביצועים נוכחיים:\n"
        if "total_spend" in campaign_data:
            perf_context += f"- הוצאה כוללת: {campaign_data['total_spend']:,.0f}\n"
        if "total_roas" in campaign_data:
            perf_context += f"- ROAS: {campaign_data['total_roas']:.2f}\n"
        if "total_purchases" in campaign_data:
            perf_context += f"- רכישות: {campaign_data['total_purchases']}\n"
        if "avg_ctr" in campaign_data:
            perf_context += f"- CTR ממוצע: {campaign_data['avg_ctr']:.2f}%\n"

    prompt = f"""אתה מומחה שיווק דיגיטלי ופרסום בפייסבוק/אינסטגרם.
אתה מכיר את העסק הזה לעומק ונותן המלצות ספציפיות ומותאמות.

מידע שהמשתמש נתן:
{business_context}
{profile_context}
{perf_context}

המשימה:
{type_prompt}

חשוב:
- תהיה ספציפי לעסק הזה — אל תכתוב טקסטים גנריים
- תשתמש בשם העסק, במוצרים שלו, ובקהל היעד שזיהית
- תתבסס על הנתונים שיש לך
{lang_instruction}
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        result = response.content[0].text
        logger.info("Generated %s suggestion (%d chars)", suggestion_type, len(result))
        return result
    except Exception as e:
        logger.exception("AI creative suggestion failed")
        return f"שגיאה ביצירת הצעה: {e}"
