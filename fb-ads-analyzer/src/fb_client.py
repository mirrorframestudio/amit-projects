"""
Facebook Marketing API client — pulls campaign, adset, and ad-level data
with full funnel metrics (ATC, Initiate Checkout, Purchase, ROAS).
"""
import logging
import time
from datetime import date, timedelta
from typing import Any

import requests

from . import settings

logger = logging.getLogger(__name__)

BASE = "https://graph.facebook.com/v22.0"

# ── Retry configuration ──────────────────────────────────────
_MAX_RETRIES = 5
_INITIAL_BACKOFF = 2.0

# ── Core fields for all levels ──────────────────────────────
_COMMON_FIELDS = (
    "spend,impressions,clicks,reach,"
    "actions,action_values,cost_per_action_type,"
    "cpc,cpm,ctr,frequency"
)

# ── Filter: only ACTIVE campaigns ───────────────────────────
_ACTIVE_CAMPAIGN_FILTER = '[{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE"]}]'


def _get_with_retry(url: str, params: dict) -> dict:
    """Single GET request to Graph API with exponential backoff on transient errors."""
    backoff = _INITIAL_BACKOFF

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            resp = requests.get(url, params=params, timeout=30)

            # Rate limit — respect Retry-After header
            if resp.status_code == 429:
                retry_after = float(resp.headers.get("Retry-After", backoff))
                logger.warning(
                    "Rate limited (429). Waiting %.1fs (attempt %d/%d)",
                    retry_after, attempt, _MAX_RETRIES,
                )
                time.sleep(retry_after)
                backoff *= 2
                continue

            # Server-side errors — retry
            if resp.status_code >= 500:
                logger.warning(
                    "Server error %d. Retrying in %.1fs (attempt %d/%d)",
                    resp.status_code, backoff, attempt, _MAX_RETRIES,
                )
                time.sleep(backoff)
                backoff *= 2
                continue

            resp.raise_for_status()
            body = resp.json()

            # Graph API error codes that indicate transient throttling
            error = body.get("error", {})
            if error:
                code = error.get("code")
                msg = error.get("message", "")
                # Code 17 = API User Too Many Calls, 32 = Page Request Limit Reached
                if code in (17, 32, 613) or "rate" in msg.lower() or "limit" in msg.lower():
                    logger.warning(
                        "Graph API rate error (code=%s): %s. Waiting %.1fs (attempt %d/%d)",
                        code, msg, backoff, attempt, _MAX_RETRIES,
                    )
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                raise RuntimeError(f"Facebook Graph API error (code={code}): {msg}")

            return body

        except requests.exceptions.ConnectionError as exc:
            logger.warning(
                "Connection error: %s. Retrying in %.1fs (attempt %d/%d)",
                exc, backoff, attempt, _MAX_RETRIES,
            )
            time.sleep(backoff)
            backoff *= 2

        except requests.exceptions.Timeout as exc:
            logger.warning(
                "Request timed out: %s. Retrying in %.1fs (attempt %d/%d)",
                exc, backoff, attempt, _MAX_RETRIES,
            )
            time.sleep(backoff)
            backoff *= 2

    raise RuntimeError(f"Meta API request failed after {_MAX_RETRIES} attempts: {url}")


def check_token_expiry() -> int | None:
    """
    Check how many days remain until the Facebook access token expires.

    Returns:
        int  — days remaining (0 = expires today, negative = already expired)
        None — token is permanent / expiry unknown / request failed

    Sends a WhatsApp warning automatically if ≤ 7 days remain.
    """
    if not settings.FB_ACCESS_TOKEN or not settings.FB_AD_ACCOUNT_ID:
        logger.warning("check_token_expiry: credentials not set, skipping")
        return None

    try:
        resp = requests.get(
            f"{BASE}/debug_token",
            params={
                "input_token": settings.FB_ACCESS_TOKEN,
                "access_token": settings.FB_ACCESS_TOKEN,
            },
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})

        expires_at = data.get("expires_at")  # Unix timestamp, 0 = never expires
        if not expires_at:
            logger.info("Token expiry: permanent or unknown")
            return None

        expires_at = int(expires_at)
        if expires_at == 0:
            logger.info("Token is long-lived / permanent")
            return None

        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        expiry_dt = datetime.fromtimestamp(expires_at, tz=timezone.utc)
        days_left = (expiry_dt.date() - now.date()).days

        logger.info("Token expires %s (%d days left)", expiry_dt.strftime("%Y-%m-%d"), days_left)

        if days_left <= 7:
            logger.warning("Token expiry WARNING: %d days left — sending WhatsApp alert", days_left)
            try:
                from .whatsapp_notifier import send_token_expiry_warning
                send_token_expiry_warning(days_left)
            except Exception:
                logger.exception("Failed to send token expiry WhatsApp warning")

        return days_left

    except Exception:
        logger.exception("check_token_expiry failed (non-critical, continuing)")
        return None


def _get(endpoint: str, params: dict) -> list[dict]:
    """Generic paginated GET from Graph API with retry on every page."""
    params["access_token"] = settings.FB_ACCESS_TOKEN
    url = f"{BASE}/{endpoint}"
    all_data: list[dict] = []

    while url:
        body = _get_with_retry(url, params)
        all_data.extend(body.get("data", []))
        url = body.get("paging", {}).get("next")
        params = {}  # next-page URL already contains all params
    return all_data


# ── Campaigns ─────────────────────────────────────────────
def fetch_campaigns(since: str | None = None, until: str | None = None) -> list[dict]:
    if not since:
        since = (date.today() - timedelta(days=90)).isoformat()
    if not until:
        until = date.today().isoformat()

    params = {
        "fields": f"campaign_name,campaign_id,{_COMMON_FIELDS}",
        "time_range": f'{{"since":"{since}","until":"{until}"}}',
        "filtering": _ACTIVE_CAMPAIGN_FILTER,
        "level": "campaign",
        "limit": 500,
    }
    data = _get(f"{settings.FB_AD_ACCOUNT_ID}/insights", params)
    logger.info("Fetched %d campaign rows", len(data))
    return [_parse_row(r, "campaign") for r in data]


# ── Ad Sets ───────────────────────────────────────────────
def fetch_adsets(since: str | None = None, until: str | None = None) -> list[dict]:
    if not since:
        since = (date.today() - timedelta(days=90)).isoformat()
    if not until:
        until = date.today().isoformat()

    params = {
        "fields": f"campaign_name,adset_name,adset_id,{_COMMON_FIELDS}",
        "time_range": f'{{"since":"{since}","until":"{until}"}}',
        "filtering": _ACTIVE_CAMPAIGN_FILTER,
        "level": "adset",
        "limit": 500,
    }
    data = _get(f"{settings.FB_AD_ACCOUNT_ID}/insights", params)
    logger.info("Fetched %d adset rows", len(data))
    return [_parse_row(r, "adset") for r in data]


# ── Ads (individual creatives) ────────────────────────────
def fetch_ads(since: str | None = None, until: str | None = None) -> list[dict]:
    if not since:
        since = (date.today() - timedelta(days=90)).isoformat()
    if not until:
        until = date.today().isoformat()

    params = {
        "fields": f"campaign_name,adset_name,ad_name,ad_id,{_COMMON_FIELDS}",
        "time_range": f'{{"since":"{since}","until":"{until}"}}',
        "filtering": _ACTIVE_CAMPAIGN_FILTER,
        "level": "ad",
        "limit": 500,
    }
    data = _get(f"{settings.FB_AD_ACCOUNT_ID}/insights", params)
    logger.info("Fetched %d ad rows", len(data))
    return [_parse_row(r, "ad") for r in data]


# ── Daily breakdown (for trend analysis) ──────────────────
def fetch_ads_daily(since: str | None = None, until: str | None = None) -> list[dict]:
    if not since:
        since = (date.today() - timedelta(days=90)).isoformat()
    if not until:
        until = date.today().isoformat()

    params = {
        "fields": f"campaign_name,adset_name,ad_name,ad_id,{_COMMON_FIELDS}",
        "time_range": f'{{"since":"{since}","until":"{until}"}}',
        "filtering": _ACTIVE_CAMPAIGN_FILTER,
        "time_increment": 1,
        "level": "ad",
        "limit": 5000,
    }
    data = _get(f"{settings.FB_AD_ACCOUNT_ID}/insights", params)
    logger.info("Fetched %d daily ad rows", len(data))
    return [_parse_row(r, "ad") for r in data]


# ── Age & Gender breakdown ────────────────────────────────
def fetch_demographics(since: str | None = None, until: str | None = None) -> list[dict]:
    if not since:
        since = (date.today() - timedelta(days=90)).isoformat()
    if not until:
        until = date.today().isoformat()

    params = {
        "fields": f"{_COMMON_FIELDS}",
        "time_range": f'{{"since":"{since}","until":"{until}"}}',
        "filtering": _ACTIVE_CAMPAIGN_FILTER,
        "breakdowns": "age,gender",
        "limit": 500,
    }
    data = _get(f"{settings.FB_AD_ACCOUNT_ID}/insights", params)
    logger.info("Fetched %d demographic rows", len(data))
    results = []
    for r in data:
        parsed = _parse_row(r, "account")
        parsed["age"] = r.get("age", "")
        parsed["gender"] = r.get("gender", "")
        results.append(parsed)
    return results


# ── Platform / Placement breakdown ────────────────────────
def fetch_placements(since: str | None = None, until: str | None = None) -> list[dict]:
    if not since:
        since = (date.today() - timedelta(days=90)).isoformat()
    if not until:
        until = date.today().isoformat()

    params = {
        "fields": f"{_COMMON_FIELDS}",
        "time_range": f'{{"since":"{since}","until":"{until}"}}',
        "filtering": _ACTIVE_CAMPAIGN_FILTER,
        "breakdowns": "publisher_platform",
        "limit": 500,
    }
    data = _get(f"{settings.FB_AD_ACCOUNT_ID}/insights", params)
    logger.info("Fetched %d placement rows", len(data))
    results = []
    for r in data:
        parsed = _parse_row(r, "account")
        parsed["platform"] = r.get("publisher_platform", "")
        results.append(parsed)
    return results


# ── Helpers ───────────────────────────────────────────────
def _extract_action(actions: list[dict] | None, action_type: str) -> int:
    if not actions:
        return 0
    for a in actions:
        if a.get("action_type") == action_type:
            return int(float(a.get("value", 0)))
    return 0


def _extract_action_value(action_values: list[dict] | None, action_type: str) -> float:
    """Extract monetary value from action_values (for ROAS calculation)."""
    if not action_values:
        return 0.0
    for a in action_values:
        if a.get("action_type") == action_type:
            return float(a.get("value", 0))
    return 0.0


def _extract_cost(cost_actions: list[dict] | None, action_type: str) -> float:
    if not cost_actions:
        return 0.0
    for a in cost_actions:
        if a.get("action_type") == action_type:
            return float(a.get("value", 0))
    return 0.0


def _parse_row(row: dict, level: str) -> dict:
    """Normalize a Graph API insights row into a flat dict with full funnel."""
    actions = row.get("actions")
    action_values = row.get("action_values")
    cost_actions = row.get("cost_per_action_type")

    purchases = _extract_action(actions, "omni_purchase") or _extract_action(actions, "purchase")
    add_to_cart = _extract_action(actions, "add_to_cart")
    initiate_checkout = _extract_action(actions, "initiate_checkout")
    link_clicks = _extract_action(actions, "link_click")
    landing_page_views = _extract_action(actions, "landing_page_view")
    view_content = _extract_action(actions, "view_content")

    # Revenue from action_values (for ROAS)
    purchase_value = (
        _extract_action_value(action_values, "omni_purchase")
        or _extract_action_value(action_values, "purchase")
    )

    cost_per_purchase = (
        _extract_cost(cost_actions, "omni_purchase")
        or _extract_cost(cost_actions, "purchase")
    )

    spend = float(row.get("spend", 0))
    roas = purchase_value / spend if spend > 0 else 0.0

    parsed = {
        "date_start": row.get("date_start", ""),
        "date_stop": row.get("date_stop", ""),
        "spend": spend,
        "impressions": int(row.get("impressions", 0)),
        "clicks": int(row.get("clicks", 0)),
        "reach": int(row.get("reach", 0)),
        "cpc": float(row.get("cpc", 0) or 0),
        "cpm": float(row.get("cpm", 0) or 0),
        "ctr": float(row.get("ctr", 0) or 0),
        "frequency": float(row.get("frequency", 0) or 0),
        # ── Full funnel ──
        "add_to_cart": add_to_cart,
        "initiate_checkout": initiate_checkout,
        "purchases": purchases,
        "purchase_value": purchase_value,
        "cost_per_purchase": cost_per_purchase,
        "roas": roas,
        # ── Engagement ──
        "link_clicks": link_clicks,
        "landing_page_views": landing_page_views,
        "view_content": view_content,
    }

    if level == "campaign":
        parsed["campaign_name"] = row.get("campaign_name", "")
        parsed["campaign_id"] = row.get("campaign_id", "")
    elif level == "adset":
        parsed["campaign_name"] = row.get("campaign_name", "")
        parsed["adset_name"] = row.get("adset_name", "")
        parsed["adset_id"] = row.get("adset_id", "")
    elif level == "ad":
        parsed["campaign_name"] = row.get("campaign_name", "")
        parsed["adset_name"] = row.get("adset_name", "")
        parsed["ad_name"] = row.get("ad_name", "")
        parsed["ad_id"] = row.get("ad_id", "")

    return parsed
