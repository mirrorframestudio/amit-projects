"""
P&L calculation engine.

COGS per subitem:
  Base:  Regular shirt = $11, Retro = $13, Player version = $13
  Add-ons: Name & Number +$2, Pants +$5, Long shirt +$2, Socks $0, Patch $0
  Shipping: Home delivery +$4 per order, Pickup = $0
"""

import logging
import sys
from pathlib import Path
from typing import Any

from . import settings

# Live exchange rate (fetched once per session, cached 6h)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from pnl_shared.exchange_rate import get_usd_to_ils  # noqa: E402

logger = logging.getLogger(__name__)


def _get_rate() -> float:
    """Return live USD/ILS rate, falling back to settings value if unavailable."""
    return get_usd_to_ils(fallback=settings.USD_TO_ILS)


def _calc_item_cogs(product: dict[str, Any]) -> float:
    """Calculate COGS for a single subitem (product)."""
    qty = product.get("quantity", 1) or 1

    # Base cost: retro or player version = $13, regular = $11
    if product.get("is_retro"):
        base = settings.COST_RETRO
    elif product.get("is_player_version"):
        base = settings.COST_PLAYER_VERSION
    else:
        base = settings.COST_SHIRT

    # Add-ons
    extras = 0.0
    if product.get("has_name_number"):
        extras += settings.COST_NAME_NUMBER
    if product.get("has_pants"):
        extras += settings.COST_PANTS
    if product.get("is_long_shirt"):
        extras += settings.COST_LONG_SHIRT
    if product.get("has_socks"):
        extras += settings.COST_SOCKS
    if product.get("has_patch"):
        extras += settings.COST_PATCH

    return (base + extras) * qty


def compute(order: dict[str, Any], usd_to_ils: float | None = None) -> dict[str, Any]:
    """
    Compute P&L fields for a single order.

    Args:
        order:       Normalized order dict from order_mapper.
        usd_to_ils:  Exchange rate to use. If None, fetches the live rate.
                     Pass a pre-fetched rate when processing many orders (via compute_all)
                     to avoid redundant API calls.
    """
    rate = usd_to_ils if usd_to_ils is not None else _get_rate()

    order_price = order.get("order_price") or 0.0
    shipping_type = (order.get("shipping_type") or "Pickup").strip()
    products = order.get("products", [])

    # ── VAT (extracted from price, since prices include VAT) ────
    if settings.MODE == "INCLUDES_VAT" and order_price > 0:
        vat = order_price * settings.VAT_RATE / (1 + settings.VAT_RATE)
    else:
        vat = 0.0

    # ── COGS (calculated per subitem, USD -> ILS) ───────────────
    if products:
        cogs_usd = sum(_calc_item_cogs(p) for p in products)
    else:
        cogs_usd = settings.COST_SHIRT
    cogs = cogs_usd * rate

    # ── Shipping cost (per order, USD -> ILS) ──────────────────
    if shipping_type.lower() == "home":
        shipping = settings.COST_HOME_DELIVERY * rate
    else:
        shipping = 0.0

    # ── Payment processing fee ──────────────────────────────────
    payment_fee = (order_price * settings.PAYMENT_FEE_RATE) + settings.PAYMENT_FEE_FIXED

    # ── Profit = Price - VAT - COGS - Shipping - Payment Fee ───
    profit = order_price - vat - cogs - shipping - payment_fee

    # ── Profit margin (safe divide) ─────────────────────────────
    margin = profit / order_price if order_price else 0.0

    result = dict(order)
    result.pop("products", None)
    result.update({
        "order_price": round(order_price, 2),
        "sell_price": round(order_price, 2),
        "vat": round(vat, 2),
        "cogs": round(cogs, 2),
        "shipping": round(shipping, 2),
        "payment_fee": round(payment_fee, 2),
        "profit": round(profit, 2),
        "profit_margin": round(margin, 4),
    })
    return result


def compute_all(orders: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Compute P&L for a list of orders using a single live exchange rate for the batch."""
    # Fetch rate once for the entire batch (cached internally for 6h)
    live_rate = _get_rate()
    logger.info("Using exchange rate: 1 USD = %.4f ILS", live_rate)

    results = []
    for order in orders:
        try:
            results.append(compute(order, usd_to_ils=live_rate))
        except Exception:
            logger.exception("Failed to compute P&L for order_id=%s", order.get("order_id"))
    logger.info("Computed P&L for %d / %d orders", len(results), len(orders))
    return results
