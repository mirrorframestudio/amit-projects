"""
Order mapper: converts raw Monday.com item data into normalized order dicts.

╔══════════════════════════════════════════════════════════════════════╗
║  COLUMN MAPPING — MATCHED TO YOUR ACTUAL MONDAY BOARD              ║
║  Board: "Orders" (ID: 2131896795)                                  ║
║                                                                     ║
║  To find/verify column IDs:                                        ║
║    Monday Dev → API Playground                                      ║
║    Query: { boards(ids: [2131896795]) { columns { id title } } }   ║
╚══════════════════════════════════════════════════════════════════════╝
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ┌─────────────────────────────────────────────────────────────────┐
# │  MONDAY COLUMN ID MAPPING — YOUR ACTUAL BOARD COLUMNS          │
# │                                                                  │
# │  Parent item "name" field = Customer Name                       │
# │  Subitems = individual products in the order                    │
# └─────────────────────────────────────────────────────────────────┘
COLUMN_MAP = {
    # Parent item columns
    "order_date":       "date__1",             # Date column
    "status":           "status",              # Status: New, Sent, etc.
    "phone":            "phone__1",            # Phone
    "email":            "email__1",            # Email
    "location":         "location5__1",        # Address (long text)
    "notes":            "text_mkw9g1j0",       # הערות (Notes)
    "tracking_num":     "text__1",             # Tracking NUM
    "shipping_type":    "text_mkvgab6q",       # SHIPPING D2D? (Home vs Pickup)
    "deadline":         "date_1__1",           # Dead-Line
    "product_type":     "status_1__1",         # סוג מוצר (Product Type)
    "order_price":      "numeric_mkvge6mf",    # מחיר ההזמנה (Order Price, ILS)
}

# Subitem columns (from Subitems of Orders board, ID: 2131896855)
SUBITEM_COLUMN_MAP = {
    "size":            "size__1",          # Size
    "quantity":        "numbers4__1",      # Quantity
    "cost":            "numbers1__1",      # Cost (if manually filled)
    "patch":           "status__1",        # Patch (league name = has patch, "No" = no patch)
    "pants":           "status4__1",       # Pants: "Yes" / "No"
    "long_shirt":      "status8__1",       # Long shirt: "Yes" / "No"
    "player_version":  "status5__1",       # Player version: "Yes" / "No"
    "socks":           "color_mkvfyevx",   # Socks: "Yes" / "No"
    "name_number":     "text5__1",         # Name & Number (e.g. "MESSI 10")
}


def _extract_column_text(col: dict) -> str | None:
    """Extract a usable string value from a Monday column_values entry."""
    text = col.get("text")
    if text and text.strip():
        return text.strip()

    raw_value = col.get("value")
    if not raw_value:
        return None
    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, dict):
            if "label" in parsed:
                return str(parsed["label"])
            if "date" in parsed:
                return str(parsed["date"])
            if "value" in parsed:
                return str(parsed["value"])
            if "text" in parsed:
                return str(parsed["text"])
            if "phone" in parsed:
                return str(parsed["phone"])
            if "email" in parsed:
                return str(parsed["email"])
        if isinstance(parsed, (str, int, float)):
            return str(parsed)
    except (json.JSONDecodeError, TypeError):
        pass
    return None


def _safe_float(value: str | None) -> float | None:
    """Convert a string to float, returning None on failure."""
    if value is None:
        return None
    cleaned = value.replace(",", "").replace("₪", "").replace("$", "").strip()
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _is_yes(value: str | None) -> bool:
    """Check if a Monday status value means 'Yes'."""
    if not value:
        return False
    return value.strip().lower() == "yes"


def _has_name_number(value: str | None) -> bool:
    """Check if name & number field has a real value (not empty/No)."""
    if not value:
        return False
    v = value.strip().lower()
    return v != "" and v != "no"


def _is_retro(product_name: str) -> bool:
    """Check if product name indicates a retro shirt."""
    return "retro" in product_name.lower()


def _parse_subitems(subitems: list[dict]) -> list[dict[str, Any]]:
    """Parse subitems (products) from an order with all cost flags."""
    products = []
    for si in subitems:
        col_lookup = {cv["id"]: cv for cv in si.get("column_values", [])}

        def get_sub_text(field: str) -> str | None:
            col_id = SUBITEM_COLUMN_MAP.get(field)
            if not col_id or col_id not in col_lookup:
                return None
            return _extract_column_text(col_lookup[col_id])

        name = si.get("name", "")
        products.append({
            "product_name": name,
            "size": get_sub_text("size"),
            "quantity": int(_safe_float(get_sub_text("quantity")) or 1),
            "cost_override": _safe_float(get_sub_text("cost")),
            "is_retro": _is_retro(name),
            "is_player_version": _is_yes(get_sub_text("player_version")),
            "has_name_number": _has_name_number(get_sub_text("name_number")),
            "has_pants": _is_yes(get_sub_text("pants")),
            "is_long_shirt": _is_yes(get_sub_text("long_shirt")),
            "has_socks": _is_yes(get_sub_text("socks")),
            "has_patch": get_sub_text("patch") not in (None, "No", "no"),
        })
    return products


def normalize_item(item: dict[str, Any]) -> dict[str, Any]:
    """
    Convert a raw Monday item into a normalized order dict.
    Missing fields are set to None (never crashes).
    """
    col_lookup = {cv["id"]: cv for cv in item.get("column_values", [])}

    def get_text(logical_field: str) -> str | None:
        col_id = COLUMN_MAP.get(logical_field)
        if not col_id or col_id not in col_lookup:
            return None
        return _extract_column_text(col_lookup[col_id])

    def get_float(logical_field: str) -> float | None:
        return _safe_float(get_text(logical_field))

    # Order ID = Monday item ID (unique)
    order_id = str(item.get("id", ""))

    # Customer name = item name
    customer_name = item.get("name", "")

    # Order date
    order_date_str = get_text("order_date")
    order_date = None
    if order_date_str:
        try:
            order_date = datetime.fromisoformat(order_date_str.split(" ")[0]).date()
        except (ValueError, IndexError):
            pass
    if order_date is None:
        created = item.get("created_at")
        if created:
            try:
                order_date = datetime.fromisoformat(
                    created.replace("Z", "+00:00")
                ).date()
            except ValueError:
                pass

    # Shipping type: "D2D" or "TO DOOR" in text → Home, else Pickup
    shipping_raw = (get_text("shipping_type") or "").strip().lower()
    if "d2d" in shipping_raw or "door" in shipping_raw or "home" in shipping_raw or "deliver" in shipping_raw:
        shipping_type = "Home"
    elif shipping_raw == "":
        shipping_type = "Pickup"  # default when empty
    else:
        shipping_type = "Pickup"

    # Parse subitems (products)
    subitems = item.get("subitems", [])
    products = _parse_subitems(subitems)
    total_qty = sum(p["quantity"] for p in products)
    product_names = ", ".join(p["product_name"] for p in products if p["product_name"])

    return {
        "order_id": order_id,
        "customer_name": customer_name,
        "order_date": order_date,
        "status": get_text("status"),
        "order_price": get_float("order_price"),       # gross sales (ILS)
        "shipping_type": shipping_type,
        "product_type": get_text("product_type"),
        "phone": get_text("phone"),
        "email": get_text("email"),
        "location": get_text("location"),
        "tracking_num": get_text("tracking_num"),
        "deadline": get_text("deadline"),
        "notes": get_text("notes"),
        "num_products": len(products),
        "total_qty": int(total_qty),
        "product_names": product_names,
        "products": products,  # full subitem details for COGS calc
        "created_at": datetime.fromisoformat(
            item["created_at"].replace("Z", "+00:00")
        ).strftime("%Y-%m-%d %H:%M:%S") if item.get("created_at") else None,
        "last_synced_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
    }


def validate_board_columns(items: list[dict[str, Any]]) -> None:
    """
    Validate that expected Monday.com column IDs exist in the fetched data.
    Raises ValueError with a diagnostic message if critical columns are missing.

    Call this once before normalize_all() to catch board schema changes early.
    """
    if not items:
        logger.warning("validate_board_columns: no items to validate against")
        return

    # Collect all column IDs seen in the first item
    sample_item = items[0]
    seen_parent_ids = {cv["id"] for cv in sample_item.get("column_values", [])}

    # Collect subitem column IDs from the first subitem of the first item that has one
    seen_sub_ids: set[str] = set()
    for item in items:
        subitems = item.get("subitems", [])
        if subitems:
            seen_sub_ids = {cv["id"] for cv in subitems[0].get("column_values", [])}
            break

    # Critical parent columns — missing any of these breaks P&L calculation
    critical_parent = {"order_date", "order_price", "shipping_type"}
    # Critical subitem columns — missing these breaks COGS calculation
    critical_sub = {"quantity", "pants", "player_version", "name_number"}

    missing_parent = []
    for field in critical_parent:
        col_id = COLUMN_MAP.get(field)
        if col_id and col_id not in seen_parent_ids:
            missing_parent.append(f"  '{field}' → expected column ID '{col_id}'")

    missing_sub = []
    if seen_sub_ids:  # only validate if subitems exist
        for field in critical_sub:
            col_id = SUBITEM_COLUMN_MAP.get(field)
            if col_id and col_id not in seen_sub_ids:
                missing_sub.append(f"  '{field}' → expected column ID '{col_id}'")

    if missing_parent or missing_sub:
        lines = ["Monday.com board column mismatch detected!"]
        lines.append("The following expected columns were NOT found in the board data.")
        lines.append("The board may have been renamed or restructured.")
        lines.append("")
        if missing_parent:
            lines.append("Missing parent item columns:")
            lines.extend(missing_parent)
        if missing_sub:
            lines.append("Missing subitem columns:")
            lines.extend(missing_sub)
        lines.append("")
        lines.append("To fix: open Monday Dev → API Playground and run:")
        lines.append("  { boards(ids: [BOARD_ID]) { columns { id title } } }")
        lines.append("Then update COLUMN_MAP / SUBITEM_COLUMN_MAP in order_mapper.py")
        raise ValueError("\n".join(lines))

    logger.info(
        "Column validation passed (%d parent columns, %d subitem columns seen)",
        len(seen_parent_ids), len(seen_sub_ids),
    )


def normalize_all(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize a list of raw Monday items into order dicts."""
    # Validate column schema before processing any items
    validate_board_columns(items)

    orders = []
    for item in items:
        try:
            orders.append(normalize_item(item))
        except Exception:
            logger.exception("Failed to normalize item id=%s", item.get("id"))
    logger.info("Normalized %d / %d items", len(orders), len(items))
    return orders
