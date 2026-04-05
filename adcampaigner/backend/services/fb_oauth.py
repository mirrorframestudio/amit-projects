"""
Facebook OAuth service — exchange tokens, get long-lived tokens.
Used for multi-tenant Facebook Login flow.
"""
import logging
import requests
from datetime import datetime, timedelta, timezone

from .. import config

logger = logging.getLogger(__name__)

BASE = "https://graph.facebook.com/v22.0"


def exchange_for_long_lived_token(short_lived_token: str) -> dict:
    """
    Exchange a short-lived FB token (from JS SDK) for a long-lived one (~60 days).
    Returns: {"access_token": "...", "expires_in": seconds}
    """
    url = f"{BASE}/oauth/access_token"
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": config.FB_APP_ID,
        "client_secret": config.FB_APP_SECRET,
        "fb_exchange_token": short_lived_token,
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    logger.info("Exchanged token, expires_in=%s", data.get("expires_in"))
    return {
        "access_token": data["access_token"],
        "expires_in": data.get("expires_in", 5184000),  # default ~60 days
    }


def get_fb_user_info(access_token: str) -> dict:
    """Get basic user info from Facebook."""
    url = f"{BASE}/me"
    params = {
        "access_token": access_token,
        "fields": "id,name,email",
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()
    return {
        "fb_user_id": data["id"],
        "name": data.get("name", ""),
        "email": data.get("email", ""),
    }


def calculate_token_expiry(expires_in: int) -> datetime:
    """Calculate absolute expiry datetime from expires_in seconds."""
    return datetime.now(timezone.utc) + timedelta(seconds=expires_in)
