"""
Shopify Admin API client — fetches orders + inventory costs for a date range.
Uses REST Admin API (2024-01) for broad compatibility.
"""
import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import requests

from .settings import SETTINGS

logger = logging.getLogger(__name__)

API_VERSION = "2024-01"


class ShopifyClient:
    """Thin wrapper around Shopify Admin REST API."""

    def __init__(self):
        self.domain = SETTINGS.shopify_domain
        self.token = SETTINGS.shopify_token
        self.base_url = f"https://{self.domain}/admin/api/{API_VERSION}"
        self.session = requests.Session()
        self.session.headers.update({
            "X-Shopify-Access-Token": self.token,
            "Content-Type": "application/json",
        })

    # ------------------------------------------------------------------
    # Orders
    # ------------------------------------------------------------------
    def fetch_orders(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch all orders created within [start_date, end_date] (inclusive)."""
        all_orders: List[Dict[str, Any]] = []
        params: Dict[str, Any] = {
            "status": "any",
            "created_at_min": start_date.strftime("%Y-%m-%dT00:00:00Z"),
            "created_at_max": end_date.strftime("%Y-%m-%dT23:59:59Z"),
            "limit": 250,
            "fields": (
                "id,name,created_at,financial_status,fulfillment_status,"
                "cancelled_at,test,currency,subtotal_price,total_discounts,"
                "total_tax,total_shipping_price_set,total_price,"
                "shipping_lines,line_items,refunds,"
                "subtotal_price_set,total_discounts_set,total_tax_set,"
                "total_price_set"
            ),
        }
        url: Optional[str] = f"{self.base_url}/orders.json"

        while url:
            resp = self._get(url, params=params if url.endswith("orders.json") else None)
            data = resp.json()
            orders = data.get("orders", [])
            all_orders.extend(orders)
            logger.info(f"Fetched {len(orders)} orders (total so far: {len(all_orders)})")

            # Pagination via Link header
            url = self._next_page_url(resp)
            params = None  # params are embedded in the next-page URL

        return all_orders

    # ------------------------------------------------------------------
    # Inventory item cost (COGS)
    # ------------------------------------------------------------------
    def fetch_variant_cost(self, variant_id: int) -> Optional[float]:
        """Get unit cost for a variant via its inventory item."""
        try:
            resp = self._get(f"{self.base_url}/variants/{variant_id}.json")
            variant = resp.json().get("variant", {})
            inv_item_id = variant.get("inventory_item_id")
            if not inv_item_id:
                return None
            resp2 = self._get(f"{self.base_url}/inventory_items/{inv_item_id}.json")
            inv_item = resp2.json().get("inventory_item", {})
            cost = inv_item.get("cost")
            if cost is not None:
                return float(cost)
            return None
        except Exception as e:
            logger.warning(f"Could not fetch cost for variant {variant_id}: {e}")
            return None

    def fetch_variant_costs_bulk(self, variant_ids: List[int]) -> Dict[int, Optional[float]]:
        """Fetch costs for multiple variants (batched by inventory_items endpoint)."""
        costs: Dict[int, Optional[float]] = {}
        # First, resolve variant_id -> inventory_item_id
        inv_map: Dict[int, int] = {}  # variant_id -> inventory_item_id
        for vid in variant_ids:
            if vid in costs:
                continue
            try:
                resp = self._get(f"{self.base_url}/variants/{vid}.json")
                variant = resp.json().get("variant", {})
                iid = variant.get("inventory_item_id")
                if iid:
                    inv_map[vid] = iid
            except Exception as e:
                logger.warning(f"Variant {vid} lookup failed: {e}")

        # Batch fetch inventory items (up to 100 per request)
        inv_id_to_variant: Dict[int, int] = {v: k for k, v in inv_map.items()}
        inv_ids = list(inv_map.values())

        for i in range(0, len(inv_ids), 100):
            batch = inv_ids[i:i + 100]
            ids_param = ",".join(str(x) for x in batch)
            try:
                resp = self._get(
                    f"{self.base_url}/inventory_items.json",
                    params={"ids": ids_param, "limit": 100},
                )
                items = resp.json().get("inventory_items", [])
                for item in items:
                    iid = item["id"]
                    vid = inv_id_to_variant.get(iid)
                    if vid is not None:
                        c = item.get("cost")
                        costs[vid] = float(c) if c is not None else None
            except Exception as e:
                logger.warning(f"Bulk inventory fetch failed: {e}")

        # Fill missing
        for vid in variant_ids:
            if vid not in costs:
                costs[vid] = None

        return costs

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _get(self, url: str, params: Optional[Dict] = None) -> requests.Response:
        """GET with basic rate-limit handling."""
        for attempt in range(3):
            resp = self.session.get(url, params=params, timeout=30)
            if resp.status_code == 429:
                retry_after = float(resp.headers.get("Retry-After", "2"))
                logger.warning(f"Rate limited, sleeping {retry_after}s")
                time.sleep(retry_after)
                continue
            resp.raise_for_status()
            return resp
        resp.raise_for_status()
        return resp

    @staticmethod
    def _next_page_url(resp: requests.Response) -> Optional[str]:
        """Parse Shopify cursor-based pagination from Link header."""
        link = resp.headers.get("Link", "")
        for part in link.split(","):
            if 'rel="next"' in part:
                url = part.split("<")[1].split(">")[0]
                return url
        return None
