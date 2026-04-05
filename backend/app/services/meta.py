"""
Meta Ads connector — skeleton file.

This is where all communication with the Meta (Facebook) Ads API will live.
Right now it only reads config from environment variables.
No real API calls are made yet.

When it's time to connect for real, each stub function below will be filled in
with an actual HTTP request to Meta's Graph API.
"""

import os
import httpx


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def get_config() -> dict:
    """
    Reads the Meta credentials from environment variables and returns them
    as a plain dictionary.

    Returns a dict with:
        - access_token      : the Meta access token (or None if not set)
        - ad_account_id     : the Meta ad account ID (or None if not set)
        - is_configured     : True only when BOTH variables are present
    """
    access_token   = os.getenv("META_ACCESS_TOKEN")
    ad_account_id  = os.getenv("META_AD_ACCOUNT_ID")

    return {
        "access_token"  : access_token,
        "ad_account_id" : ad_account_id,
        "is_configured" : bool(access_token and ad_account_id),
    }


# ---------------------------------------------------------------------------
# Live test — one real HTTP call to verify the token + account are working
# ---------------------------------------------------------------------------

META_GRAPH_URL = "https://graph.facebook.com/v21.0"

def test_connection() -> dict:
    """
    Makes a single real request to the Meta Graph API:
        GET /act_{ad_account_id}?fields=name,id&access_token=...

    Returns whatever Meta sends back — success or error — as a plain dict.
    """
    config = get_config()

    if not config["is_configured"]:
        return {
            "ok": False,
            "error": "META_ACCESS_TOKEN or META_AD_ACCOUNT_ID is not set in .env",
        }

    url = f"{META_GRAPH_URL}/act_{config['ad_account_id']}"
    params = {
        "fields": "name,id",
        "access_token": config["access_token"],
    }

    response = httpx.get(url, params=params, timeout=10)
    data = response.json()

    if "error" in data:
        # Meta returned an error — pass it through so the user can see it
        return {"ok": False, "meta_error": data["error"]}

    return {"ok": True, "account": data}


# ---------------------------------------------------------------------------
# Stub functions — to be implemented when we connect Meta
# ---------------------------------------------------------------------------
# Each function below is a placeholder.
# Its docstring explains what it will do in the future.
#
# Instead of crashing with an exception, each stub:
#   1. Checks whether the token is configured  →  friendly "not connected" message
#   2. Otherwise returns a clear "not yet implemented" message
#
# This means calling these endpoints gives a readable JSON response, not a 500 error.
# ---------------------------------------------------------------------------

# Friendly message returned whenever credentials are not set up yet
_NOT_CONFIGURED_MESSAGE = (
    "Meta Ads is not connected yet. "
    "Add META_ACCESS_TOKEN and META_AD_ACCOUNT_ID to your .env file to get started."
)


def fetch_campaigns() -> dict:
    """
    Fetch all campaigns from the Meta Ads account.

    Calls:
        GET /act_{ad_account_id}/campaigns
            ?fields=id,name,status,objective
            &access_token=...

    Success response:
        {"ok": True, "campaigns": [{"id": "...", "name": "...", ...}, ...]}

    Failure response:
        {"ok": False, "message": "...", "meta_error": {...}}   ← if Meta returns an error
        {"ok": False, "message": "..."}                        ← if credentials are missing
                                                                  or a network error occurs
    """
    config = get_config()

    if not config["is_configured"]:
        return {"ok": False, "message": _NOT_CONFIGURED_MESSAGE}

    url = f"{META_GRAPH_URL}/act_{config['ad_account_id']}/campaigns"
    params = {
        "fields": "id,name,status,objective",
        "access_token": config["access_token"],
    }

    try:
        response = httpx.get(url, params=params, timeout=10)
        data = response.json()
    except httpx.TimeoutException:
        return {
            "ok": False,
            "message": "The request to Meta timed out. Check your internet connection and try again.",
        }
    except httpx.RequestError as e:
        return {
            "ok": False,
            "message": f"Could not reach the Meta API: {e}",
        }

    # Meta signals errors inside the JSON body, not via HTTP status codes
    if "error" in data:
        return {
            "ok": False,
            "message": "Meta returned an error. See 'meta_error' for details.",
            "meta_error": data["error"],
        }

    # "data" is the list of campaigns; "paging" is also present but we don't need it
    campaigns = data.get("data", [])

    return {"ok": True, "campaigns": campaigns}


def fetch_adsets(campaign_id: str) -> dict:
    """
    [FUTURE] Fetch all ad sets that belong to a given campaign.

    Will call:
        GET /{campaign_id}/adsets
            ?fields=id,name,status,daily_budget,start_time,end_time,targeting
            &access_token=...

    Args:
        campaign_id: The Meta campaign ID whose ad sets you want.
    """
    config = get_config()

    if not config["is_configured"]:
        return {"ok": False, "message": _NOT_CONFIGURED_MESSAGE}

    # --- implementation goes here ---
    return {
        "ok": False,
        "message": (
            f"fetch_adsets is not yet implemented. "
            f"When ready it will return ad sets for campaign '{campaign_id}'."
        ),
    }


def fetch_ads(adset_id: str) -> dict:
    """
    [FUTURE] Fetch all ads that belong to a given ad set.

    Will call:
        GET /{adset_id}/ads
            ?fields=id,name,status,creative
            &access_token=...

    Args:
        adset_id: The Meta ad set ID whose ads you want.
    """
    config = get_config()

    if not config["is_configured"]:
        return {"ok": False, "message": _NOT_CONFIGURED_MESSAGE}

    # --- implementation goes here ---
    return {
        "ok": False,
        "message": (
            f"fetch_ads is not yet implemented. "
            f"When ready it will return ads for ad set '{adset_id}'."
        ),
    }


def fetch_ad_insights(ad_id: str, date_start: str, date_end: str) -> dict:
    """
    [FUTURE] Fetch daily performance metrics for a single ad.

    Will call:
        GET /{ad_id}/insights
            ?fields=impressions,clicks,reach,spend,cpm,cpc,ctr,conversions
            &time_increment=1           ← one row per day
            &time_range={"since": date_start, "until": date_end}
            &access_token=...

    Args:
        ad_id:      The Meta ad ID to pull metrics for.
        date_start: Start of the date range  (YYYY-MM-DD).
        date_end:   End of the date range    (YYYY-MM-DD).
    """
    config = get_config()

    if not config["is_configured"]:
        return {"ok": False, "message": _NOT_CONFIGURED_MESSAGE}

    # --- implementation goes here ---
    return {
        "ok": False,
        "message": (
            f"fetch_ad_insights is not yet implemented. "
            f"When ready it will return daily impressions, clicks, spend, CPM, CPC, "
            f"CTR, and conversions for ad '{ad_id}' from {date_start} to {date_end}."
        ),
    }
