"""
P&L accounting engine — transforms raw Shopify orders into per-order P&L rows
and weekly summary aggregates.
"""
import logging
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Dict, List, Optional

from .settings import SETTINGS

logger = logging.getLogger(__name__)


@dataclass
class OrderPnL:
    """Single order P&L row."""
    week_start: date
    week_end: date
    order_id: int
    order_name: str
    created_at: str
    financial_status: str
    fulfillment_status: str
    currency: str

    shipping_title: str
    shipping_type: str  # PICKUP_POINT | HOME_DELIVERY | UNKNOWN

    subtotal: float
    discounts: float
    shipping_revenue: float
    tax_amount: float
    total_paid: float

    revenue_base: float
    vat_removed: float
    net_sales_ex_vat: float

    processing_fee: float
    marketing_allocated: float
    shipping_cost: float
    cogs: float

    net_profit: float
    net_margin: float  # fraction, e.g. 0.15

    refund_amount: float
    flags: List[str] = field(default_factory=list)


@dataclass
class WeeklySummary:
    """Aggregate P&L for the week."""
    week_start: date
    week_end: date
    order_count: int

    total_revenue_base: float
    total_vat_removed: float
    total_net_sales_ex_vat: float
    total_processing_fees: float
    total_marketing_from_csv: float
    total_marketing_allocated: float
    total_shipping_cost: float
    total_cogs: float
    total_net_profit: float
    net_margin: float

    missing_cost_count: int
    unknown_shipping_count: int
    marketing_missing: bool
    warnings: List[str] = field(default_factory=list)


def detect_shipping_type(shipping_title: str) -> str:
    """Classify shipping line title into PICKUP_POINT, HOME_DELIVERY, or UNKNOWN."""
    if not shipping_title:
        return "UNKNOWN"
    title_lower = shipping_title.lower()
    for kw in SETTINGS.PICKUP_KEYWORDS:
        if kw.lower() in title_lower:
            return "PICKUP_POINT"
    for kw in SETTINGS.HOME_DELIVERY_KEYWORDS:
        if kw.lower() in title_lower:
            return "HOME_DELIVERY"
    return "UNKNOWN"


def _get_shop_money(price_set: Optional[Dict], fallback: float = 0.0) -> float:
    """Extract shop_money amount from a Shopify price_set, fallback to provided value."""
    if price_set and isinstance(price_set, dict):
        shop = price_set.get("shop_money", {})
        if shop and shop.get("amount") is not None:
            return float(shop["amount"])
    return fallback


def compute_order_pnl(
    order: Dict[str, Any],
    variant_costs: Dict[int, Optional[float]],
    weekly_marketing: float,
    total_net_sales_ex_vat_all: float,
    order_count: int,
    week_start: date,
    week_end: date,
) -> OrderPnL:
    """Compute P&L for a single order."""
    flags: List[str] = []

    order_id = order["id"]
    order_name = order.get("name", "")
    created_at = order.get("created_at", "")
    financial_status = order.get("financial_status", "")
    fulfillment_status = order.get("fulfillment_status", "") or ""
    currency = order.get("currency", "USD")

    # --- Shipping line ---
    shipping_lines = order.get("shipping_lines", [])
    shipping_title = shipping_lines[0].get("title", "") if shipping_lines else ""
    shipping_type = detect_shipping_type(shipping_title)
    if shipping_type == "UNKNOWN" and shipping_title:
        flags.append("סוג משלוח לא מזוהה")

    # --- Amounts (prefer shop_money for USD normalization) ---
    subtotal = float(order.get("subtotal_price", 0))
    discounts = float(order.get("total_discounts", 0))
    tax_amount = float(order.get("total_tax", 0))
    total_paid = float(order.get("total_price", 0))

    # Shipping revenue from shipping_price_set or shipping_lines
    shipping_rev_set = order.get("total_shipping_price_set")
    if shipping_rev_set:
        shipping_revenue = _get_shop_money(shipping_rev_set, 0.0)
    elif shipping_lines:
        shipping_revenue = float(shipping_lines[0].get("price", 0))
    else:
        shipping_revenue = 0.0

    # --- COGS (only for glasses, skip free gifts/test items) ---
    SKIP_KEYWORDS = ["במתנה", "בדיקה"]
    cogs = 0.0
    used_default_cost = False
    for li in order.get("line_items", []):
        title = li.get("title", "").lower()
        # Skip free gifts and test items
        if any(kw in title for kw in SKIP_KEYWORDS):
            continue
        vid = li.get("variant_id")
        qty = int(li.get("quantity", 1))
        unit_cost = variant_costs.get(vid) if vid else None
        if unit_cost is not None:
            cogs += unit_cost * qty
        elif SETTINGS.DEFAULT_UNIT_COST > 0:
            cogs += SETTINGS.DEFAULT_UNIT_COST * qty
            used_default_cost = True
        else:
            flags.append("חסרה עלות מוצר")

    # --- Refunds ---
    refund_amount = 0.0
    refunds = order.get("refunds", [])
    for refund in refunds:
        for txn in refund.get("transactions", []):
            refund_amount += float(txn.get("amount", 0))
        # Also check refund_line_items for partial refunds
        for rli in refund.get("refund_line_items", []):
            subtotal_val = rli.get("subtotal_set")
            if subtotal_val:
                refund_amount += _get_shop_money(subtotal_val, 0.0)
            elif rli.get("subtotal"):
                refund_amount += float(rli["subtotal"])
    if refund_amount > 0:
        flags.append("הוחזר/החזר חלקי")

    # --- Accounting ---
    # Revenue = total amount paid by customer
    revenue_base = total_paid

    # VAT: use Shopify total_tax if available, otherwise derive from price
    # (assumes prices INCLUDE VAT when Shopify reports tax=0)
    if tax_amount > 0:
        vat_removed = tax_amount
    else:
        # Prices include VAT: VAT = revenue_base * rate / (1 + rate)
        vat_removed = revenue_base * SETTINGS.VAT_RATE / (1 + SETTINGS.VAT_RATE)

    net_sales_ex_vat = revenue_base - vat_removed

    processing_fee = (
        net_sales_ex_vat * SETTINGS.EXTERNAL_PROCESSING_FEE_PERCENT
        + SETTINGS.EXTERNAL_PROCESSING_FEE_FIXED
    )

    # Marketing allocation
    if SETTINGS.MARKETING_ALLOCATION == "equal" and order_count > 0:
        marketing_allocated = weekly_marketing / order_count
    elif total_net_sales_ex_vat_all > 0:
        marketing_allocated = weekly_marketing * (net_sales_ex_vat / total_net_sales_ex_vat_all)
    else:
        marketing_allocated = 0.0

    shipping_cost = SETTINGS.SHIPPING_COSTS.get(shipping_type, 0.0)

    net_profit = net_sales_ex_vat - processing_fee - marketing_allocated - shipping_cost - cogs
    net_margin = (net_profit / net_sales_ex_vat) if net_sales_ex_vat else 0.0

    return OrderPnL(
        week_start=week_start,
        week_end=week_end,
        order_id=order_id,
        order_name=order_name,
        created_at=created_at,
        financial_status=financial_status,
        fulfillment_status=fulfillment_status,
        currency=currency,
        shipping_title=shipping_title,
        shipping_type=shipping_type,
        subtotal=subtotal,
        discounts=discounts,
        shipping_revenue=shipping_revenue,
        tax_amount=tax_amount,
        total_paid=total_paid,
        revenue_base=revenue_base,
        vat_removed=vat_removed,
        net_sales_ex_vat=net_sales_ex_vat,
        processing_fee=processing_fee,
        marketing_allocated=marketing_allocated,
        shipping_cost=shipping_cost,
        cogs=cogs,
        net_profit=net_profit,
        net_margin=net_margin,
        refund_amount=refund_amount,
        flags=flags,
    )


def build_weekly_pnl(
    orders: List[Dict[str, Any]],
    variant_costs: Dict[int, Optional[float]],
    weekly_marketing: float,
    marketing_found: bool,
    week_start: date,
    week_end: date,
) -> tuple:
    """
    Process all orders and return (list[OrderPnL], WeeklySummary).
    Two-pass: first compute net_sales_ex_vat totals for proportional allocation,
    then compute full P&L per order.
    """
    # --- Pass 1: compute net_sales_ex_vat per order for allocation ---
    preliminary = []
    for order in orders:
        shipping_lines = order.get("shipping_lines", [])
        shipping_rev_set = order.get("total_shipping_price_set")
        if shipping_rev_set:
            sr = _get_shop_money(shipping_rev_set, 0.0)
        elif shipping_lines:
            sr = float(shipping_lines[0].get("price", 0))
        else:
            sr = 0.0

        total_p = float(order.get("total_price", 0))
        tax = float(order.get("total_tax", 0))
        rev_base = total_p
        # Derive VAT if Shopify doesn't report it
        if tax > 0:
            vat = tax
        else:
            vat = rev_base * SETTINGS.VAT_RATE / (1 + SETTINGS.VAT_RATE)
        ns = rev_base - vat
        preliminary.append(ns)

    total_net_sales = sum(preliminary)
    order_count = len(orders)

    # --- Pass 2: full P&L ---
    pnl_rows: List[OrderPnL] = []
    for order in orders:
        row = compute_order_pnl(
            order=order,
            variant_costs=variant_costs,
            weekly_marketing=weekly_marketing,
            total_net_sales_ex_vat_all=total_net_sales,
            order_count=order_count,
            week_start=week_start,
            week_end=week_end,
        )
        pnl_rows.append(row)

    # --- Summary ---
    total_revenue_base = sum(r.revenue_base for r in pnl_rows)
    total_vat_removed = sum(r.vat_removed for r in pnl_rows)
    total_net_ex = sum(r.net_sales_ex_vat for r in pnl_rows)
    total_proc = sum(r.processing_fee for r in pnl_rows)
    total_mkt_alloc = sum(r.marketing_allocated for r in pnl_rows)
    total_ship = sum(r.shipping_cost for r in pnl_rows)
    total_cogs = sum(r.cogs for r in pnl_rows)
    total_np = sum(r.net_profit for r in pnl_rows)
    margin = (total_np / total_net_ex) if total_net_ex else 0.0

    missing_cost_count = sum(1 for r in pnl_rows if "חסרה עלות מוצר" in r.flags)
    unknown_ship_count = sum(1 for r in pnl_rows if "סוג משלוח לא מזוהה" in r.flags)

    warnings = []
    if not marketing_found:
        warnings.append("חסרה שורת שיווק בקובץ")
    if missing_cost_count:
        warnings.append(f"{missing_cost_count} הזמנות עם עלות מוצר חסרה")
    if unknown_ship_count:
        warnings.append(f"{unknown_ship_count} הזמנות עם סוג משלוח לא מזוהה")

    summary = WeeklySummary(
        week_start=week_start,
        week_end=week_end,
        order_count=order_count,
        total_revenue_base=total_revenue_base,
        total_vat_removed=total_vat_removed,
        total_net_sales_ex_vat=total_net_ex,
        total_processing_fees=total_proc,
        total_marketing_from_csv=weekly_marketing,
        total_marketing_allocated=total_mkt_alloc,
        total_shipping_cost=total_ship,
        total_cogs=total_cogs,
        total_net_profit=total_np,
        net_margin=margin,
        missing_cost_count=missing_cost_count,
        unknown_shipping_count=unknown_ship_count,
        marketing_missing=not marketing_found,
        warnings=warnings,
    )

    return pnl_rows, summary
