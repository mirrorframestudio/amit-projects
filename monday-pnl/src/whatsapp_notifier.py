"""
WhatsApp notifier — sends daily P&L summary via WhatsApp Business Cloud API.
"""

import logging
from typing import Any

import requests

from . import settings

logger = logging.getLogger(__name__)

API_URL = "https://graph.facebook.com/v22.0/{phone_id}/messages"


def _build_summary(orders: list[dict[str, Any]], ads_data: dict[str, Any] | None = None) -> str:
    """Build a short Hebrew daily ads summary: spend, purchases, ROAS."""
    from datetime import date
    today = date.today()

    # Today's revenue (for ROAS calculation)
    today_orders = [o for o in orders if o.get("order_date") == today]
    today_revenue = sum(o.get("order_price", 0) or 0 for o in today_orders)

    # Extract today's ads data from daily breakdown
    daily = ads_data.get("daily", []) if ads_data else []
    today_str = today.isoformat()
    today_ads = next((d for d in daily if d.get("date") == today_str), None)

    spend = today_ads["spend"] if today_ads else 0
    purchases = today_ads["purchases"] if today_ads else 0
    roas = today_revenue / spend if spend > 0 else 0

    lines = [
        f"📊 *סיכום פרסום יומי*",
        f"📅 {today.strftime('%d/%m/%Y')}",
        "",
        f"💸 הוצאה: *₪{spend:,.0f}*",
        f"🛒 רכישות: *{purchases}*",
        f"💰 סה״כ רכישות: *₪{today_revenue:,.0f}*",
        f"🎯 ROAS: *{roas:.2f}x*",
    ]

    return "\n".join(lines)


def send_summary(orders: list[dict[str, Any]], ads_data: dict[str, Any] | None = None) -> bool:
    """Send P&L summary via WhatsApp. Returns True on success."""
    if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        logger.warning("WhatsApp credentials not configured, skipping notification")
        return False

    if not settings.WHATSAPP_TO:
        logger.warning("WhatsApp recipient not configured (WHATSAPP_TO), skipping")
        return False

    message = _build_summary(orders, ads_data)

    url = API_URL.format(phone_id=settings.WHATSAPP_PHONE_NUMBER_ID)
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": settings.WHATSAPP_TO,
        "type": "text",
        "text": {"body": message},
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        msg_id = data.get("messages", [{}])[0].get("id", "unknown")
        logger.info("WhatsApp message sent (ID: %s)", msg_id)
        return True
    except requests.exceptions.HTTPError as e:
        logger.error("WhatsApp API error: %s — %s", e, resp.text)
        return False
    except Exception:
        logger.exception("Failed to send WhatsApp message")
        return False
