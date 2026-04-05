"""
pnl_shared.exchange_rate — fetches live USD/ILS exchange rate.

Uses the free exchangerate-api.com endpoint (no key required for this pair).
Falls back to the configured USD_TO_ILS value in settings if the fetch fails.

Usage:
    from pnl_shared.exchange_rate import get_usd_to_ils
    rate = get_usd_to_ils(fallback=3.2)
"""
from __future__ import annotations

import logging
import time

logger = logging.getLogger(__name__)

# Cache: (rate, fetched_at_timestamp) — valid for 6 hours
_cache: tuple[float, float] | None = None
_CACHE_TTL = 6 * 3600  # seconds

# Free APIs tried in order — first success wins
_ENDPOINTS = [
    # Open Exchange Rates (no auth needed for base=USD, limited currencies)
    "https://open.er-api.com/v6/latest/USD",
    # Frankfurter (ECB data, includes ILS)
    "https://api.frankfurter.app/latest?from=USD&to=ILS",
]


def _fetch_from_open_er(url: str) -> float | None:
    """Parse response from open.er-api.com format."""
    import requests
    resp = requests.get(url, timeout=8)
    resp.raise_for_status()
    data = resp.json()
    rate = data.get("rates", {}).get("ILS")
    return float(rate) if rate else None


def _fetch_from_frankfurter(url: str) -> float | None:
    """Parse response from frankfurter.app format."""
    import requests
    resp = requests.get(url, timeout=8)
    resp.raise_for_status()
    data = resp.json()
    rate = data.get("rates", {}).get("ILS")
    return float(rate) if rate else None


_PARSERS = [_fetch_from_open_er, _fetch_from_frankfurter]


def get_usd_to_ils(fallback: float = 3.2) -> float:
    """
    Return the current USD → ILS exchange rate.

    Caches the result for 6 hours so the pipeline doesn't hammer the API.
    If all sources fail, returns ``fallback`` (from settings.USD_TO_ILS).

    Args:
        fallback: Rate to use if live fetch fails. Should come from settings.USD_TO_ILS.

    Returns:
        float — exchange rate (e.g. 3.71)
    """
    global _cache

    # Return cached value if still fresh
    if _cache is not None:
        rate, fetched_at = _cache
        if time.time() - fetched_at < _CACHE_TTL:
            logger.debug("Exchange rate (cached): 1 USD = %.4f ILS", rate)
            return rate

    # Try each endpoint
    for url, parser in zip(_ENDPOINTS, _PARSERS):
        try:
            rate = parser(url)
            if rate and 2.0 < rate < 10.0:  # sanity check: ILS is roughly 3-5 per USD
                _cache = (rate, time.time())
                logger.info("Live exchange rate: 1 USD = %.4f ILS (source: %s)", rate, url)
                return rate
        except Exception as exc:
            logger.warning("Exchange rate fetch failed (%s): %s", url, exc)

    logger.warning(
        "All exchange rate sources failed — using fallback: 1 USD = %.4f ILS", fallback
    )
    return fallback
