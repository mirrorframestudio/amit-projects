"""
Meta Ads router — endpoints related to the Meta (Facebook) Ads integration.

Available routes:
    GET /meta/status        → checks whether env variables are set
    GET /meta/test          → makes one live request to verify the token
    GET /meta/campaigns     → (placeholder) will return campaign list
    GET /meta/ads           → (placeholder) will return ads for an ad set
    GET /meta/ad-insights   → (placeholder) will return daily metrics for an ad
"""

from fastapi import APIRouter, Query
from ..services import meta as meta_service

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/test")
def meta_test():
    """
    Makes one real HTTP request to the Meta Graph API and returns the result.

    Success:  {"ok": true,  "account": {"id": "act_...", "name": "..."}}
    Failure:  {"ok": false, "meta_error": { raw error from Meta }}
    """
    return meta_service.test_connection()


@router.get("/status")
def meta_status():
    """
    Checks whether the Meta Ads connector is ready to use.

    Returns the status of each required environment variable
    WITHOUT revealing the actual secret values.

    Possible responses:
        configured    = True  → both variables are set, ready to connect
        configured    = False → one or more variables are missing
    """
    config = meta_service.get_config()

    return {
        "configured": config["is_configured"],
        "variables": {
            # "set" / "missing" — never expose the real token value
            "META_ACCESS_TOKEN" : "set" if config["access_token"]  else "missing",
            "META_AD_ACCOUNT_ID": "set" if config["ad_account_id"] else "missing",
        },
        "next_step": (
            "Ready to connect to Meta Ads API."
            if config["is_configured"]
            else "Add META_ACCESS_TOKEN and META_AD_ACCOUNT_ID to your .env file."
        ),
    }


# ---------------------------------------------------------------------------
# Placeholder routes — return friendly messages until real sync is built
# ---------------------------------------------------------------------------

@router.get("/campaigns")
def get_campaigns():
    """
    [PLACEHOLDER] Will return all campaigns from your Meta Ads account.

    Right now it returns a friendly message explaining the feature is coming.
    Once fetch_campaigns() is implemented in services/meta.py, this will return
    real campaign data (id, name, status, objective, daily_budget).
    """
    return meta_service.fetch_campaigns()


@router.get("/ads")
def get_ads(
    adset_id: str = Query(..., description="The Meta ad set ID to fetch ads for"),
):
    """
    [PLACEHOLDER] Will return all ads inside a given ad set.

    Query params:
        adset_id  (required) — the Meta ad set ID

    Once fetch_ads() is implemented, this will return real ad data
    (id, name, status, creative).
    """
    return meta_service.fetch_ads(adset_id=adset_id)


@router.get("/ad-insights")
def get_ad_insights(
    ad_id: str = Query(..., description="The Meta ad ID to fetch insights for"),
    date_start: str = Query(..., description="Start date in YYYY-MM-DD format"),
    date_end: str   = Query(..., description="End date in YYYY-MM-DD format"),
):
    """
    [PLACEHOLDER] Will return daily performance metrics for a single ad.

    Query params:
        ad_id       (required) — the Meta ad ID
        date_start  (required) — start of the date range, e.g. 2024-01-01
        date_end    (required) — end of the date range,   e.g. 2024-01-31

    Once fetch_ad_insights() is implemented, this will return one row per day
    with impressions, clicks, spend, CPM, CPC, CTR, and conversions.
    """
    return meta_service.fetch_ad_insights(
        ad_id=ad_id,
        date_start=date_start,
        date_end=date_end,
    )
