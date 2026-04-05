"""
Shopify Admin REST API client.

Reads SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN from environment.
Uses Shopify REST Admin API 2024-01.
"""

import os
import logging
from datetime import datetime, date
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from .. import models

logger = logging.getLogger(__name__)

SHOPIFY_API_VERSION = "2024-01"


def get_config() -> dict:
    store_url = os.getenv("SHOPIFY_STORE_URL", "")
    token = os.getenv("SHOPIFY_ACCESS_TOKEN", "")
    return {
        "store_url": store_url,
        "is_configured": bool(store_url and token),
    }


def _headers() -> dict:
    return {
        "X-Shopify-Access-Token": os.getenv("SHOPIFY_ACCESS_TOKEN", ""),
        "Content-Type": "application/json",
    }


def _base_url() -> str:
    store = os.getenv("SHOPIFY_STORE_URL", "").rstrip("/")
    return f"{store}/admin/api/{SHOPIFY_API_VERSION}"


def sync_orders(db: Session, since_date: Optional[date] = None) -> dict:
    """
    Fetch orders from Shopify and upsert into the database.
    Returns a summary dict with orders_synced count.
    """
    config = get_config()
    if not config["is_configured"]:
        raise ValueError("Shopify credentials not configured. Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN.")

    # Create sync log entry
    sync_log = models.ShopifySyncLog(status="running")
    db.add(sync_log)
    db.commit()
    db.refresh(sync_log)

    try:
        orders_synced = 0
        url = f"{_base_url()}/orders.json"
        params = {
            "status": "any",
            "limit": 250,
        }
        if since_date:
            params["created_at_min"] = f"{since_date}T00:00:00Z"

        with httpx.Client(timeout=30.0) as client:
            while url:
                response = client.get(url, headers=_headers(), params=params)
                response.raise_for_status()
                data = response.json()

                for order_data in data.get("orders", []):
                    orders_synced += _upsert_order(db, order_data)

                # Handle pagination via Link header
                url = _get_next_page_url(response.headers.get("Link", ""))
                params = {}  # params only needed for first request

        db.commit()

        # Update sync log
        sync_log.status = "completed"
        sync_log.orders_synced = orders_synced
        sync_log.finished_at = datetime.utcnow()
        db.commit()

        return {"status": "completed", "orders_synced": orders_synced}

    except Exception as e:
        logger.exception("Shopify sync failed")
        sync_log.status = "failed"
        sync_log.error_message = str(e)
        sync_log.finished_at = datetime.utcnow()
        db.commit()
        raise


def _upsert_order(db: Session, order_data: dict) -> int:
    """Upsert a single Shopify order + its line items. Returns 1 if created/updated."""
    shopify_id = order_data["id"]

    # Calculate total refunded
    total_refunded = 0.0
    for refund in order_data.get("refunds", []):
        for txn in refund.get("transactions", []):
            total_refunded += float(txn.get("amount", 0))

    # Calculate total shipping
    total_shipping = sum(
        float(line.get("price", 0))
        for line in order_data.get("shipping_lines", [])
    )

    existing = db.query(models.ShopifyOrder).filter(
        models.ShopifyOrder.shopify_order_id == shopify_id
    ).first()

    if existing:
        # Update
        existing.financial_status = order_data.get("financial_status")
        existing.fulfillment_status = order_data.get("fulfillment_status")
        existing.total_price = float(order_data.get("total_price", 0))
        existing.subtotal_price = float(order_data.get("subtotal_price", 0))
        existing.total_shipping = total_shipping
        existing.total_tax = float(order_data.get("total_tax", 0))
        existing.total_discounts = float(order_data.get("total_discounts", 0))
        existing.total_refunded = total_refunded
        existing.synced_at = datetime.utcnow()
        order_obj = existing
    else:
        # Insert
        order_obj = models.ShopifyOrder(
            shopify_order_id=shopify_id,
            order_number=order_data.get("name", ""),
            created_at_shopify=datetime.fromisoformat(
                order_data["created_at"].replace("Z", "+00:00")
            ),
            financial_status=order_data.get("financial_status"),
            fulfillment_status=order_data.get("fulfillment_status"),
            total_price=float(order_data.get("total_price", 0)),
            subtotal_price=float(order_data.get("subtotal_price", 0)),
            total_shipping=total_shipping,
            total_tax=float(order_data.get("total_tax", 0)),
            total_discounts=float(order_data.get("total_discounts", 0)),
            total_refunded=total_refunded,
            currency=order_data.get("currency", "ILS"),
        )
        db.add(order_obj)
        db.flush()

    # Upsert line items: delete old ones and re-insert
    db.query(models.ShopifyOrderItem).filter(
        models.ShopifyOrderItem.order_id == order_obj.id
    ).delete()

    for item in order_data.get("line_items", []):
        db.add(models.ShopifyOrderItem(
            order_id=order_obj.id,
            shopify_product_id=item.get("product_id"),
            shopify_variant_id=item.get("variant_id"),
            sku=item.get("sku", ""),
            title=item.get("title", ""),
            quantity=item.get("quantity", 1),
            price=float(item.get("price", 0)),
            total_discount=float(item.get("total_discount", 0)),
        ))

    return 1


def _get_next_page_url(link_header: str) -> Optional[str]:
    """Parse Shopify Link header for next page URL."""
    if not link_header:
        return None
    for part in link_header.split(","):
        if 'rel="next"' in part:
            url = part.split(";")[0].strip().strip("<>")
            return url
    return None
