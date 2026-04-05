"""
WhatsApp notifier — sends ONE unified daily summary.
Yesterday's performance + P&L profit + 3 top recommendations.
Clean Hebrew RTL format.
"""

import logging
from datetime import date, timedelta
from pathlib import Path

import requests

from . import settings

logger = logging.getLogger(__name__)

API_URL = "https://graph.facebook.com/v22.0/{phone_id}/messages"

# Path to the P&L Excel file from monday-pnl
PNL_EXCEL_PATH = Path(__file__).resolve().parent.parent.parent / "monday-pnl" / "P&L.xlsx"


def _read_pnl_data(target_date: date | None = None) -> dict:
    """Read P&L summary for a specific date from the monday-pnl Excel file."""
    if target_date is None:
        target_date = date.today() - timedelta(days=1)

    result = {
        "total_revenue": 0,
        "total_profit": 0,
        "total_vat": 0,
        "total_cogs": 0,
        "total_shipping": 0,
        "total_payment_fee": 0,
        "total_orders": 0,
        "avg_margin": 0,
        "date": target_date.strftime("%d/%m/%Y"),
    }

    if not PNL_EXCEL_PATH.exists():
        logger.warning("P&L Excel not found at %s", PNL_EXCEL_PATH)
        return result

    try:
        from openpyxl import load_workbook
        wb = load_workbook(PNL_EXCEL_PATH, read_only=True, data_only=True)

        # Try to read from the calculation sheet
        sheet_name = None
        for name in wb.sheetnames:
            if name in ("חישוב", "Calc", "calc"):
                sheet_name = name
                break

        if not sheet_name:
            for name in wb.sheetnames:
                if name not in ("הגדרות", "Settings"):
                    sheet_name = name
                    break

        if not sheet_name:
            logger.warning("No calculation sheet found in P&L Excel")
            wb.close()
            return result

        ws = wb[sheet_name]

        # Find column indices from header row
        headers = {}
        for col_idx, cell in enumerate(ws[1], 1):
            if cell.value:
                val = str(cell.value).strip()
                headers[val] = col_idx

        # Map Hebrew/English column names
        col_map = {
            "order_price": ["מחיר הזמנה", "order_price", "מחיר מכירה", "sell_price"],
            "profit": ["רווח", "profit"],
            "vat": ["מע״מ", "vat"],
            "cogs": ["עלות סחורה", "cogs"],
            "shipping": ["משלוח", "shipping"],
            "payment_fee": ["עמלת סליקה", "payment_fee"],
            "order_date": ["תאריך יצירה", "created_at", "תאריך הזמנה", "order_date"],
        }

        col_indices = {}
        for key, possible_names in col_map.items():
            for name in possible_names:
                if name in headers:
                    col_indices[key] = headers[name]
                    break

        if "profit" not in col_indices or "order_date" not in col_indices:
            logger.warning("Missing profit or order_date column in P&L Excel")
            wb.close()
            return result

        # Read rows and filter by target date
        total_revenue = 0
        total_profit = 0
        total_vat = 0
        total_cogs = 0
        total_shipping = 0
        total_payment_fee = 0
        total_orders = 0

        for row in ws.iter_rows(min_row=2, values_only=False):
            try:
                # Get order date
                date_val = row[col_indices["order_date"] - 1].value
                if date_val is None:
                    continue

                # Parse date — could be datetime, date, or string
                order_date = None
                if hasattr(date_val, 'date'):
                    order_date = date_val.date()
                elif isinstance(date_val, date):
                    order_date = date_val
                elif isinstance(date_val, str):
                    # Try common formats (including datetime strings with time component)
                    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y", "%m/%d/%Y"):
                        try:
                            from datetime import datetime
                            order_date = datetime.strptime(date_val.strip(), fmt).date()
                            break
                        except ValueError:
                            continue

                if order_date != target_date:
                    continue

                # This order is from the target date — sum it up
                order_price = 0
                profit = 0
                vat = 0
                cogs = 0
                shipping = 0
                payment_fee = 0

                if "order_price" in col_indices:
                    val = row[col_indices["order_price"] - 1].value
                    order_price = float(val) if val else 0

                if "profit" in col_indices:
                    val = row[col_indices["profit"] - 1].value
                    profit = float(val) if val else 0

                if "vat" in col_indices:
                    val = row[col_indices["vat"] - 1].value
                    vat = float(val) if val else 0

                if "cogs" in col_indices:
                    val = row[col_indices["cogs"] - 1].value
                    cogs = float(val) if val else 0

                if "shipping" in col_indices:
                    val = row[col_indices["shipping"] - 1].value
                    shipping = float(val) if val else 0

                if "payment_fee" in col_indices:
                    val = row[col_indices["payment_fee"] - 1].value
                    payment_fee = float(val) if val else 0

                if order_price > 0:
                    total_revenue += order_price
                    total_profit += profit
                    total_vat += vat
                    total_cogs += cogs
                    total_shipping += shipping
                    total_payment_fee += payment_fee
                    total_orders += 1

            except (ValueError, TypeError, IndexError):
                continue

        wb.close()

        result["total_revenue"] = round(total_revenue, 2)
        result["total_profit"] = round(total_profit, 2)
        result["total_vat"] = round(total_vat, 2)
        result["total_cogs"] = round(total_cogs, 2)
        result["total_shipping"] = round(total_shipping, 2)
        result["total_payment_fee"] = round(total_payment_fee, 2)
        result["total_orders"] = total_orders
        result["avg_margin"] = round(total_profit / total_revenue * 100, 1) if total_revenue > 0 else 0

        logger.info("P&L for %s: %d orders, revenue=%.0f, profit=%.0f, margin=%.1f%%",
                     target_date.strftime("%d/%m"), total_orders, total_revenue, total_profit, result["avg_margin"])

    except Exception:
        logger.exception("Failed to read P&L Excel")

    return result


def _build_daily_summary(
    campaign_data: dict,
    trend_data: dict,
    recommendations: list[dict],
    drive_link: str | None = None,
) -> str:
    """Build a clean Hebrew daily summary — yesterday's data + P&L + 3 recommendations."""
    yesterday = date.today() - timedelta(days=1)

    # ── Extract yesterday's data from daily breakdown ──
    daily_rows = trend_data.get("daily", [])
    yesterday_str = yesterday.isoformat()
    yesterday_data = None
    for d in daily_rows:
        if d.get("date") == yesterday_str:
            yesterday_data = d
            break

    # Fallback: use overall totals if no yesterday data
    if yesterday_data:
        spend = yesterday_data.get("spend", 0)
        purchases = yesterday_data.get("purchases", 0)
        roas = yesterday_data.get("roas", 0)
        atc = yesterday_data.get("add_to_cart", 0)
        revenue = yesterday_data.get("purchase_value", 0)
    else:
        spend = campaign_data.get("total_spend", 0)
        purchases = campaign_data.get("total_purchases", 0)
        roas = campaign_data.get("total_roas", 0)
        atc = campaign_data.get("total_atc", 0)
        revenue = campaign_data.get("total_purchase_value", 0)

    cost_per_purchase = spend / purchases if purchases > 0 else 0

    # ── Read P&L data for yesterday specifically ──
    pnl = _read_pnl_data(target_date=yesterday)

    # Calculate net profit: profit from orders minus ad spend for that day
    net_profit = pnl["total_profit"] - spend

    # ── Build message ──
    lines = [
        f"*OneZone Jersey - סיכום יומי*",
        f"*{yesterday.strftime('%d/%m/%Y')}*",
        "",
        "*--- פרסום ---*",
        f"💸 הוצאה: ₪{spend:,.0f}",
        f"🛒 רכישות מפרסום: {purchases}",
        f"🛍 הוספות לעגלה: {atc}",
        f"💰 הכנסות מפרסום: ₪{revenue:,.0f}",
        f"📈 ROAS: {roas:.2f}",
        f"💵 עלות לרכישה: ₪{cost_per_purchase:,.0f}",
    ]

    # ── P&L section for that specific day ──
    if pnl["total_orders"] > 0:
        lines.append("")
        lines.append(f"*--- רווחיות {yesterday.strftime('%d/%m')} ---*")
        lines.append(f"📦 הזמנות: {pnl['total_orders']}")
        lines.append(f"💳 הכנסות: ₪{pnl['total_revenue']:,.0f}")
        lines.append(f"🏷 מע״מ: -₪{pnl['total_vat']:,.0f}")
        lines.append(f"📋 עלות סחורה: -₪{pnl['total_cogs']:,.0f}")
        lines.append(f"💸 עלות פרסום: -₪{spend:,.0f}")
        lines.append(f"{'✅' if net_profit >= 0 else '❌'} *רווח נקי: ₪{net_profit:,.0f}*")
        # Net margin after ads
        net_margin = net_profit / pnl["total_revenue"] * 100 if pnl["total_revenue"] > 0 else 0
        lines.append(f"📊 מרג'ין נקי: {net_margin:.1f}%")
    else:
        lines.append("")
        lines.append(f"📦 אין הזמנות ב-{yesterday.strftime('%d/%m')}")

    # ── Top 3 recommendations (concise) ──
    if recommendations:
        lines.append("")
        lines.append("*--- המלצות ---*")
        for rec in recommendations[:3]:
            # Build short path
            parts = []
            if rec.get("campaign") and rec["campaign"] != "כללי":
                parts.append(rec["campaign"])
            if rec.get("ad"):
                parts.append(rec["ad"])
            path = " → ".join(parts)

            text = rec.get("text", "")
            icon = rec.get("icon", "")

            if path:
                lines.append(f"{icon} *{path}:* {text}")
            else:
                lines.append(f"{icon} {text}")

    # ── WooCommerce site stats ──
    from .woo_client import get_daily_stats
    woo = get_daily_stats(target_date=yesterday)
    if woo["visitors"] > 0:
        lines.append("")
        lines.append("*--- אתר ---*")
        lines.append(f"👁 מבקרים: {woo['visitors']:,}")
        lines.append(f"🛒 הזמנות באתר: {woo['orders']}")
        lines.append(f"🎯 יחס המרה: {woo['conversion_rate']:.2f}%")

    # ── Drive link ──
    if drive_link:
        lines.append("")
        lines.append(f"📎 דוח מלא: {drive_link}")

    return "\n".join(lines)


def _send_via_template(
    yesterday: date,
    spend: float,
    purchases: int,
    roas: float,
    pnl_orders: int,
    net_profit: float,
) -> bool:
    """Send the daily report using the approved 'onezone_daily_report' template."""
    url = API_URL.format(phone_id=settings.WHATSAPP_PHONE_NUMBER_ID)
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": settings.WHATSAPP_TO,
        "type": "template",
        "template": {
            "name": "onezone_daily_report",
            "language": {"code": "he"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": yesterday.strftime("%d/%m/%Y")},
                        {"type": "text", "text": f"{spend:,.0f}"},
                        {"type": "text", "text": str(purchases)},
                        {"type": "text", "text": f"{roas:.2f}"},
                        {"type": "text", "text": str(pnl_orders)},
                        {"type": "text", "text": f"{net_profit:,.0f}"},
                    ],
                }
            ],
        },
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        msg_id = resp.json().get("messages", [{}])[0].get("id", "unknown")
        logger.info("Template report sent (ID: %s)", msg_id)
        return True
    except requests.exceptions.HTTPError as e:
        logger.error("Template send failed: %s — %s", e, resp.text)
        return False
    except Exception:
        logger.exception("Failed to send template report")
        return False


def _send_via_hello_world_then_text(message: str) -> bool:
    """Fallback: send hello_world to open window, then send full text report."""
    import time

    url = API_URL.format(phone_id=settings.WHATSAPP_PHONE_NUMBER_ID)
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    # Step 1: Open conversation window
    opener = {
        "messaging_product": "whatsapp",
        "to": settings.WHATSAPP_TO,
        "type": "template",
        "template": {"name": "hello_world", "language": {"code": "en_US"}},
    }
    try:
        resp = requests.post(url, json=opener, headers=headers, timeout=30)
        resp.raise_for_status()
        logger.info("hello_world opener sent — waiting 5s")
        time.sleep(5)
    except Exception:
        logger.exception("hello_world opener failed")
        return False

    # Step 2: Send full text report
    text_payload = {
        "messaging_product": "whatsapp",
        "to": settings.WHATSAPP_TO,
        "type": "text",
        "text": {"body": message},
    }
    try:
        resp = requests.post(url, json=text_payload, headers=headers, timeout=30)
        resp.raise_for_status()
        msg_id = resp.json().get("messages", [{}])[0].get("id", "unknown")
        logger.info("Text report sent (ID: %s)", msg_id)
        return True
    except requests.exceptions.HTTPError as e:
        logger.error("Text report failed: %s — %s", e, resp.text)
        return False
    except Exception:
        logger.exception("Failed to send text report")
        return False


def send_error_alert(pipeline: str, error: str) -> bool:
    """
    Send a WhatsApp alert when a pipeline run fails.
    Uses hello_world to open the conversation window, then sends the error.
    """
    if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        logger.warning("WhatsApp credentials not configured, cannot send error alert")
        return False
    if not settings.WHATSAPP_TO:
        return False

    import time

    url = API_URL.format(phone_id=settings.WHATSAPP_PHONE_NUMBER_ID)
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    # Truncate long errors so message stays readable
    error_short = error[:300] + "..." if len(error) > 300 else error

    message = (
        f"⚠️ *שגיאה ב-{pipeline}*\n"
        f"📅 {date.today().strftime('%d/%m/%Y %H:%M')}\n\n"
        f"הדוח היומי *לא נשלח* בגלל שגיאה:\n"
        f"```{error_short}```\n\n"
        f"בדוק את הלוגים ב-logs/ads.log"
    )

    # Open 24h conversation window first
    opener = {
        "messaging_product": "whatsapp",
        "to": settings.WHATSAPP_TO,
        "type": "template",
        "template": {"name": "hello_world", "language": {"code": "en_US"}},
    }
    try:
        resp = requests.post(url, json=opener, headers=headers, timeout=30)
        resp.raise_for_status()
        time.sleep(3)
    except Exception:
        logger.exception("Error alert: hello_world opener failed")
        return False

    text_payload = {
        "messaging_product": "whatsapp",
        "to": settings.WHATSAPP_TO,
        "type": "text",
        "text": {"body": message},
    }
    try:
        resp = requests.post(url, json=text_payload, headers=headers, timeout=30)
        resp.raise_for_status()
        logger.info("Error alert sent for pipeline '%s'", pipeline)
        return True
    except Exception:
        logger.exception("Failed to send error alert")
        return False


def send_token_expiry_warning(days_left: int) -> bool:
    """Send a WhatsApp warning when the Facebook API token is about to expire."""
    if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        return False
    if not settings.WHATSAPP_TO:
        return False

    import time

    url = API_URL.format(phone_id=settings.WHATSAPP_PHONE_NUMBER_ID)
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    urgency = "🔴" if days_left <= 3 else "🟡"
    message = (
        f"{urgency} *טוקן פייסבוק פג בעוד {days_left} ימים*\n\n"
        f"הטוקן של Meta Ads API יפוג בקרוב.\n"
        f"אם לא תחדש אותו — הדוחות היומיים יפסיקו לעבוד.\n\n"
        f"*איך לחדש:*\n"
        f"1. כנס ל-business.facebook.com\n"
        f"2. System Users → Generate Token\n"
        f"3. עדכן את FB_ACCESS_TOKEN בקובץ .env"
    )

    opener = {
        "messaging_product": "whatsapp",
        "to": settings.WHATSAPP_TO,
        "type": "template",
        "template": {"name": "hello_world", "language": {"code": "en_US"}},
    }
    try:
        resp = requests.post(url, json=opener, headers=headers, timeout=30)
        resp.raise_for_status()
        time.sleep(3)
    except Exception:
        logger.exception("Token warning: opener failed")
        return False

    try:
        resp = requests.post(url, json={
            "messaging_product": "whatsapp",
            "to": settings.WHATSAPP_TO,
            "type": "text",
            "text": {"body": message},
        }, headers=headers, timeout=30)
        resp.raise_for_status()
        logger.info("Token expiry warning sent (%d days left)", days_left)
        return True
    except Exception:
        logger.exception("Failed to send token expiry warning")
        return False


def send_summary(
    campaign_data: dict,
    ad_data: dict,
    trend_data: dict,
    recommendations: list,
    drive_link: str | None = None,
    structured_recs: list[dict] | None = None,
) -> bool:
    """Send unified daily summary via WhatsApp. Returns True on success."""
    if not settings.WHATSAPP_ACCESS_TOKEN or not settings.WHATSAPP_PHONE_NUMBER_ID:
        logger.warning("WhatsApp credentials not configured, skipping notification")
        return False

    if not settings.WHATSAPP_TO:
        logger.warning("WhatsApp recipient not configured (WHATSAPP_TO), skipping")
        return False

    yesterday = date.today() - timedelta(days=1)

    # ── Extract yesterday's data ──
    daily_rows = trend_data.get("daily", [])
    yesterday_str = yesterday.isoformat()
    yesterday_data = None
    for d in daily_rows:
        if d.get("date") == yesterday_str:
            yesterday_data = d
            break

    if yesterday_data:
        spend = yesterday_data.get("spend", 0)
        purchases = yesterday_data.get("purchases", 0)
        roas = yesterday_data.get("roas", 0)
    else:
        spend = campaign_data.get("total_spend", 0)
        purchases = campaign_data.get("total_purchases", 0)
        roas = campaign_data.get("total_roas", 0)

    pnl = _read_pnl_data(target_date=yesterday)
    net_profit = pnl["total_profit"] - spend

    # ── Try template first (always works on test number) ──
    if _send_via_template(yesterday, spend, purchases, roas,
                          pnl["total_orders"], net_profit):
        return True

    # ── Fallback: hello_world opener + full text message ──
    logger.warning("Template failed — falling back to hello_world + text")

    # Use structured recs if available, otherwise wrap strings
    recs = structured_recs or []
    if not recs and recommendations:
        recs = [{"icon": "", "text": r, "campaign": "", "ad": ""} for r in recommendations]

    message = _build_daily_summary(campaign_data, trend_data, recs, drive_link)
    return _send_via_hello_world_then_text(message)
