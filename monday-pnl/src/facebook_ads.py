"""
Facebook Ads — pulls ad spend data from Meta Marketing API.

Returns daily and weekly breakdowns for the current month.
"""

import logging
from datetime import date, timedelta
from typing import Any

import requests

from . import settings

logger = logging.getLogger(__name__)

API_URL = "https://graph.facebook.com/v22.0/{account_id}/insights"


def _fetch_insights(time_range: dict, breakdowns: str | None = None) -> list[dict]:
    """Fetch insights from Facebook Ads API for a given time range."""
    if not settings.FB_AD_ACCOUNT_ID or not settings.FB_ACCESS_TOKEN:
        logger.warning("Facebook Ads credentials not configured, skipping")
        return []

    url = API_URL.format(account_id=settings.FB_AD_ACCOUNT_ID)
    params = {
        "access_token": settings.FB_ACCESS_TOKEN,
        "fields": "spend,impressions,clicks,actions,cost_per_action_type",
        "time_range": str(time_range).replace("'", '"'),
        "level": "account",
    }

    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json().get("data", [])
        return data
    except Exception:
        logger.exception("Failed to fetch Facebook Ads insights")
        return []


def _get_purchases(actions: list[dict] | None) -> int:
    """Extract purchase count from actions list."""
    if not actions:
        return 0
    for a in actions:
        if a.get("action_type") in ("purchase", "offsite_conversion.fb_pixel_purchase"):
            return int(a.get("value", 0))
    return 0


def _get_cost_per_purchase(cost_per_action: list[dict] | None) -> float:
    """Extract cost per purchase from cost_per_action_type list."""
    if not cost_per_action:
        return 0.0
    for a in cost_per_action:
        if a.get("action_type") in ("purchase", "offsite_conversion.fb_pixel_purchase"):
            return float(a.get("value", 0))
    return 0.0


def fetch_monthly_total() -> dict[str, Any]:
    """Fetch total ad spend for the current month."""
    today = date.today()
    first_day = today.replace(day=1)
    time_range = {"since": first_day.isoformat(), "until": today.isoformat()}

    data = _fetch_insights(time_range)
    if not data:
        return {"spend": 0, "impressions": 0, "clicks": 0, "purchases": 0,
                "cost_per_purchase": 0, "date_start": first_day.isoformat(),
                "date_stop": today.isoformat()}

    row = data[0]
    return {
        "spend": float(row.get("spend", 0)),
        "impressions": int(row.get("impressions", 0)),
        "clicks": int(row.get("clicks", 0)),
        "purchases": _get_purchases(row.get("actions")),
        "cost_per_purchase": _get_cost_per_purchase(row.get("cost_per_action_type")),
        "date_start": row.get("date_start", first_day.isoformat()),
        "date_stop": row.get("date_stop", today.isoformat()),
    }


def fetch_daily_breakdown() -> list[dict[str, Any]]:
    """Fetch daily ad spend breakdown for the current month."""
    today = date.today()
    first_day = today.replace(day=1)

    if not settings.FB_AD_ACCOUNT_ID or not settings.FB_ACCESS_TOKEN:
        return []

    url = API_URL.format(account_id=settings.FB_AD_ACCOUNT_ID)
    time_range = {"since": first_day.isoformat(), "until": today.isoformat()}
    params = {
        "access_token": settings.FB_ACCESS_TOKEN,
        "fields": "spend,impressions,clicks,actions",
        "time_range": str(time_range).replace("'", '"'),
        "time_increment": "1",
        "level": "account",
        "limit": "31",
    }

    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        rows = resp.json().get("data", [])
        result = []
        for row in rows:
            result.append({
                "date": row.get("date_start", ""),
                "spend": float(row.get("spend", 0)),
                "impressions": int(row.get("impressions", 0)),
                "clicks": int(row.get("clicks", 0)),
                "purchases": _get_purchases(row.get("actions")),
            })
        logger.info("Fetched %d days of Facebook Ads data", len(result))
        return result
    except Exception:
        logger.exception("Failed to fetch daily Facebook Ads breakdown")
        return []


def fetch_weekly_breakdown() -> list[dict[str, Any]]:
    """Aggregate daily data into weekly breakdown for the current month."""
    daily = fetch_daily_breakdown()
    if not daily:
        return []

    today = date.today()
    first_day = today.replace(day=1)

    # Build weeks (Sun-Sat or by calendar week starting from 1st)
    weeks: list[dict[str, Any]] = []
    week_start = first_day
    week_num = 1

    while week_start <= today:
        # Week ends on Saturday or end of month
        days_until_sat = (5 - week_start.weekday()) % 7
        if days_until_sat == 0 and week_start != first_day:
            days_until_sat = 7
        week_end = min(week_start + timedelta(days=days_until_sat), today)

        week_spend = 0.0
        week_impressions = 0
        week_clicks = 0
        week_purchases = 0

        for d in daily:
            d_date = date.fromisoformat(d["date"])
            if week_start <= d_date <= week_end:
                week_spend += d["spend"]
                week_impressions += d["impressions"]
                week_clicks += d["clicks"]
                week_purchases += d["purchases"]

        weeks.append({
            "week": week_num,
            "start": week_start.isoformat(),
            "end": week_end.isoformat(),
            "start_display": week_start.strftime("%d/%m"),
            "end_display": week_end.strftime("%d/%m"),
            "spend": round(week_spend, 2),
            "impressions": week_impressions,
            "clicks": week_clicks,
            "purchases": week_purchases,
            "days": (week_end - week_start).days + 1,
        })

        week_start = week_end + timedelta(days=1)
        week_num += 1

    return weeks
