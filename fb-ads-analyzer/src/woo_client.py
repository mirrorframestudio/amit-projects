"""
WooCommerce client — fetches yesterday's site stats (visitors, orders, CVR).
Uses WooCommerce REST API + Jetpack stats via wc-analytics performance indicators.
"""

import logging
from datetime import date, timedelta

import requests

from . import settings

logger = logging.getLogger(__name__)

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def get_daily_stats(target_date: date | None = None) -> dict:
    """
    Fetch site stats for a given date from WooCommerce + Jetpack.
    Returns: visitors, orders, conversion_rate, revenue.
    """
    if target_date is None:
        target_date = date.today() - timedelta(days=1)

    result = {"visitors": 0, "orders": 0, "conversion_rate": 0.0, "revenue": 0.0, "date": target_date}

    if not all([settings.WOO_URL, settings.WOO_CONSUMER_KEY, settings.WOO_CONSUMER_SECRET]):
        logger.warning("WooCommerce credentials not configured — skipping site stats")
        return result

    after = f"{target_date.isoformat()}T00:00:00"
    before = f"{target_date.isoformat()}T23:59:59"
    params = f"stats=jetpack/stats/visitors,orders/orders_count,revenue/net_revenue&after={after}&before={before}"

    try:
        r = requests.get(
            f"{settings.WOO_URL}/wp-json/wc-analytics/reports/performance-indicators?{params}",
            auth=(settings.WOO_CONSUMER_KEY, settings.WOO_CONSUMER_SECRET),
            headers={"User-Agent": _UA},
            timeout=20,
        )
        r.raise_for_status()

        for item in r.json():
            stat = item.get("stat")
            value = item.get("value") or 0
            if stat == "jetpack/stats/visitors":
                result["visitors"] = int(value)
            elif stat == "orders/orders_count":
                result["orders"] = int(value)
            elif stat == "revenue/net_revenue":
                result["revenue"] = float(value)

        if result["visitors"] > 0:
            result["conversion_rate"] = round(result["orders"] / result["visitors"] * 100, 2)

        logger.info(
            "WooCommerce %s: %d מבקרים, %d הזמנות, CVR %.2f%%",
            target_date.strftime("%d/%m"),
            result["visitors"],
            result["orders"],
            result["conversion_rate"],
        )

    except Exception:
        logger.exception("Failed to fetch WooCommerce stats")

    return result
