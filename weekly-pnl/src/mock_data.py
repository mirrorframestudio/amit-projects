"""
Generate mock Shopify order data for demo/testing when credentials are missing.
"""
import random
from datetime import date, timedelta
from typing import Any, Dict, List, Tuple


SAMPLE_PRODUCTS = [
    {"sku": "JERSEY-001", "title": "חולצת כדורגל - ברצלונה", "price": 89.99, "cost": 22.00},
    {"sku": "JERSEY-002", "title": "חולצת כדורגל - ריאל מדריד", "price": 94.99, "cost": 24.00},
    {"sku": "JERSEY-003", "title": "חולצת כדורגל - מנצ'סטר יונייטד", "price": 84.99, "cost": 20.00},
    {"sku": "JERSEY-004", "title": "חולצת כדורגל - פ.ס.ז", "price": 99.99, "cost": 26.00},
    {"sku": "JERSEY-005", "title": "חולצת כדורגל - באיירן מינכן", "price": 79.99, "cost": 18.00},
    {"sku": "SHORTS-001", "title": "מכנסי כדורגל - שחור", "price": 39.99, "cost": 9.00},
    {"sku": "SOCKS-001", "title": "גרביים ספורטיביות", "price": 14.99, "cost": 3.50},
    {"sku": "CAP-001", "title": "כובע מצחייה - ליגת האלופות", "price": 29.99, "cost": 6.00},
]

SHIPPING_OPTIONS = [
    ("Pickup Point - Box", "PICKUP_POINT"),
    ("נקודת איסוף - בוקס", "PICKUP_POINT"),
    ("Home Delivery", "HOME_DELIVERY"),
    ("משלוח עד הבית", "HOME_DELIVERY"),
    ("שליח עד הדלת", "HOME_DELIVERY"),
]

FINANCIAL_STATUSES = ["paid", "paid", "paid", "paid", "authorized", "partially_refunded"]


def generate_mock_orders(
    week_start: date,
    week_end: date,
    count: int = 25,
    seed: int = 42,
) -> Tuple[List[Dict[str, Any]], Dict[int, float]]:
    """
    Generate mock orders and variant costs.
    Returns (orders_list, variant_costs_dict).
    """
    rng = random.Random(seed)
    orders = []
    variant_costs: Dict[int, float] = {}

    for i in range(count):
        order_id = 6000000 + i
        order_name = f"#ONZ{1200 + i}"

        # Random day within the week
        day_offset = rng.randint(0, (week_end - week_start).days)
        order_date = week_start + timedelta(days=day_offset)
        created_at = f"{order_date}T{rng.randint(8, 22):02d}:{rng.randint(0,59):02d}:00+00:00"

        # Random items (1-3 per order)
        num_items = rng.randint(1, 3)
        chosen_products = rng.sample(SAMPLE_PRODUCTS, min(num_items, len(SAMPLE_PRODUCTS)))

        line_items = []
        subtotal = 0.0
        for j, prod in enumerate(chosen_products):
            variant_id = 44000000 + i * 10 + j
            qty = rng.randint(1, 2)
            item_price = prod["price"] * qty
            subtotal += item_price
            variant_costs[variant_id] = prod["cost"]

            line_items.append({
                "id": 11000000 + i * 10 + j,
                "variant_id": variant_id,
                "product_id": 8000000 + j,
                "title": prod["title"],
                "sku": prod["sku"],
                "quantity": qty,
                "price": str(prod["price"]),
            })

        # Discount (20% chance)
        discount = round(subtotal * rng.uniform(0.05, 0.15), 2) if rng.random() < 0.2 else 0.0

        # Shipping
        ship_choice = rng.choice(SHIPPING_OPTIONS)
        shipping_price = round(rng.uniform(15, 35), 2)

        # Tax (18% VAT on subtotal - discount)
        taxable = subtotal - discount + shipping_price
        tax = round(taxable * 0.18, 2)

        total_price = round(subtotal - discount + shipping_price + tax, 2)

        financial_status = rng.choice(FINANCIAL_STATUSES)

        # Refund (only for partially_refunded)
        refunds = []
        if financial_status == "partially_refunded":
            refund_amt = round(subtotal * rng.uniform(0.1, 0.3), 2)
            refunds = [{
                "id": 900000 + i,
                "transactions": [{"amount": str(refund_amt)}],
                "refund_line_items": [],
            }]

        order = {
            "id": order_id,
            "name": order_name,
            "created_at": created_at,
            "financial_status": financial_status,
            "fulfillment_status": rng.choice(["fulfilled", "fulfilled", "unfulfilled", None]),
            "cancelled_at": None,
            "test": False,
            "currency": "USD",
            "subtotal_price": str(round(subtotal, 2)),
            "total_discounts": str(round(discount, 2)),
            "total_tax": str(round(tax, 2)),
            "total_price": str(round(total_price, 2)),
            "total_shipping_price_set": {
                "shop_money": {"amount": str(round(shipping_price, 2)), "currency_code": "USD"},
            },
            "shipping_lines": [
                {"title": ship_choice[0], "price": str(round(shipping_price, 2))},
            ],
            "line_items": line_items,
            "refunds": refunds,
        }
        orders.append(order)

    # Simulate a few missing costs (remove 2 variants)
    keys = list(variant_costs.keys())
    if len(keys) > 4:
        for k in keys[:2]:
            del variant_costs[k]

    return orders, variant_costs
