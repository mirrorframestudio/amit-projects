"""
Facebook Marketing API client — MULTI-TENANT version.
Each function takes access_token + ad_account_id as parameters.
Reusable across multiple users / businesses.
"""
import logging
from datetime import date, timedelta
from typing import Any

import requests

logger = logging.getLogger(__name__)

BASE = "https://graph.facebook.com/v22.0"

_COMMON_FIELDS = (
    "spend,impressions,clicks,reach,"
    "actions,action_values,cost_per_action_type,"
    "cpc,cpm,ctr,frequency"
)

_ACTIVE_CAMPAIGN_FILTER = '[{"field":"campaign.effective_status","operator":"IN","value":["ACTIVE"]}]'


# ── Generic paginated GET ────────────────────────────────
def _get(endpoint: str, params: dict, access_token: str) -> list[dict]:
    """Generic paginated GET from Graph API."""
    params["access_token"] = access_token
    url = f"{BASE}/{endpoint}"
    all_data: list[dict] = []

    while url:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        body = resp.json()
        all_data.extend(body.get("data", []))
        url = body.get("paging", {}).get("next")
        params = {}
    return all_data


# ── Campaigns ─────────────────────────────────────────────
def fetch_campaigns(access_token: str, ad_account_id: str,
                    since: str | None = None, until: str | None = None) -> list[dict]:
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
    data = _get(f"{ad_account_id}/insights", params, access_token)
    logger.info("Fetched %d campaign rows for %s", len(data), ad_account_id)
    return [_parse_row(r, "campaign") for r in data]


# ── Ad Sets ───────────────────────────────────────────────
def fetch_adsets(access_token: str, ad_account_id: str,
                 since: str | None = None, until: str | None = None) -> list[dict]:
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
    data = _get(f"{ad_account_id}/insights", params, access_token)
    logger.info("Fetched %d adset rows for %s", len(data), ad_account_id)
    return [_parse_row(r, "adset") for r in data]


# ── Ads ────────────────────────────────────────────────────
def fetch_ads(access_token: str, ad_account_id: str,
              since: str | None = None, until: str | None = None) -> list[dict]:
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
    data = _get(f"{ad_account_id}/insights", params, access_token)
    logger.info("Fetched %d ad rows for %s", len(data), ad_account_id)
    return [_parse_row(r, "ad") for r in data]


# ── Daily breakdown ──────────────────────────────────────
def fetch_ads_daily(access_token: str, ad_account_id: str,
                    since: str | None = None, until: str | None = None) -> list[dict]:
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
    data = _get(f"{ad_account_id}/insights", params, access_token)
    logger.info("Fetched %d daily ad rows for %s", len(data), ad_account_id)
    return [_parse_row(r, "ad") for r in data]


# ── Demographics ──────────────────────────────────────────
def fetch_demographics(access_token: str, ad_account_id: str,
                       since: str | None = None, until: str | None = None) -> list[dict]:
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
    data = _get(f"{ad_account_id}/insights", params, access_token)
    logger.info("Fetched %d demographic rows for %s", len(data), ad_account_id)
    results = []
    for r in data:
        parsed = _parse_row(r, "account")
        parsed["age"] = r.get("age", "")
        parsed["gender"] = r.get("gender", "")
        results.append(parsed)
    return results


# ── Placements ────────────────────────────────────────────
def fetch_placements(access_token: str, ad_account_id: str,
                     since: str | None = None, until: str | None = None) -> list[dict]:
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
    data = _get(f"{ad_account_id}/insights", params, access_token)
    logger.info("Fetched %d placement rows for %s", len(data), ad_account_id)
    results = []
    for r in data:
        parsed = _parse_row(r, "account")
        parsed["platform"] = r.get("publisher_platform", "")
        results.append(parsed)
    return results


# ── Get user's ad accounts ────────────────────────────────
def get_ad_accounts(access_token: str) -> list[dict]:
    """Fetch list of ad accounts the user has access to."""
    url = f"{BASE}/me/adaccounts"
    params = {
        "access_token": access_token,
        "fields": "name,account_id,currency,account_status",
        "limit": 50,
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    accounts = resp.json().get("data", [])
    return [
        {
            "ad_account_id": f"act_{a['account_id']}",
            "name": a.get("name", ""),
            "currency": a.get("currency", ""),
            "status": {1: "ACTIVE", 2: "DISABLED", 3: "UNSETTLED"}.get(
                a.get("account_status", 0), "UNKNOWN"
            ),
        }
        for a in accounts
    ]


# ── Helpers ───────────────────────────────────────────────
def _extract_action(actions: list[dict] | None, action_type: str) -> int:
    if not actions:
        return 0
    for a in actions:
        if a.get("action_type") == action_type:
            return int(float(a.get("value", 0)))
    return 0


def _extract_action_value(action_values: list[dict] | None, action_type: str) -> float:
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
        "add_to_cart": add_to_cart,
        "initiate_checkout": initiate_checkout,
        "purchases": purchases,
        "purchase_value": purchase_value,
        "cost_per_purchase": cost_per_purchase,
        "roas": roas,
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
