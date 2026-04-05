"""
Configurable settings for the Weekly P&L Report.
Override via environment variables or modify defaults here.
"""
import json
import os
from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class Settings:
    # --- Currency (everything in ILS) ---
    ILS_USD_RATE: float = 3.2  # 1 USD = 3.2 ILS (only used if USD conversion needed)
    CURRENCY: str = "ILS"

    # --- Tax & Fees ---
    VAT_RATE: float = 0.18
    EXTERNAL_PROCESSING_FEE_PERCENT: float = 0.014  # 1.4%
    EXTERNAL_PROCESSING_FEE_FIXED: float = 0.0       # ILS per order

    # --- Product cost (flat COGS per unit, ILS) ---
    DEFAULT_UNIT_COST: float = 36.48  # ~$11.40 × 3.2 ILS fallback when Shopify has no cost

    # --- Shipping costs (ILS) ---
    SHIPPING_COSTS: Dict[str, float] = field(default_factory=lambda: {
        "PICKUP_POINT": 0.0,
        "HOME_DELIVERY": 24.0,  # ~$7.50 × 3.2
        "UNKNOWN": 0.0,
    })

    # --- Shipping detection keywords (case-insensitive) ---
    PICKUP_KEYWORDS: list = field(default_factory=lambda: [
        "pickup", "pick up", "collection", "point", "locker",
        "pickup point", "נק", "איסוף",
    ])
    HOME_DELIVERY_KEYWORDS: list = field(default_factory=lambda: [
        "home", "delivery", "door", "courier", "עד הבית", "שליח",
    ])

    # --- Marketing ---
    MARKETING_CSV_PATH: str = "./inputs/marketing_spend.csv"
    MARKETING_ALLOCATION: str = "proportional"  # "proportional" | "equal"

    # --- Order inclusion ---
    INCLUDE_FINANCIAL_STATUSES: list = field(default_factory=lambda: [
        "paid", "authorized", "partially_paid", "partially_refunded",
    ])

    # --- Week definition ---
    WEEK_START_DAY: int = 0  # 0=Monday

    # --- Output ---
    OUTPUT_DIR: str = "./output"
    LOG_DIR: str = "./output/logs"

    # --- Shopify credentials ---
    @property
    def shopify_domain(self) -> str:
        return os.environ.get("SHOPIFY_SHOP_DOMAIN", "")

    @property
    def shopify_token(self) -> str:
        # First check env var (legacy shpat_ token)
        env_token = os.environ.get("SHOPIFY_ACCESS_TOKEN", "")
        if env_token and not env_token.startswith("shpat_xxx"):
            return env_token
        # Then check saved OAuth token
        return self._load_oauth_token() or ""

    @property
    def has_shopify_credentials(self) -> bool:
        return bool(self.shopify_domain and self.shopify_token)

    @staticmethod
    def _load_oauth_token() -> Optional[str]:
        """Load access token from shopify_token.json (OAuth flow)."""
        token_file = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "shopify_token.json"
        )
        if os.path.isfile(token_file):
            try:
                with open(token_file) as f:
                    data = json.load(f)
                return data.get("access_token")
            except Exception:
                pass
        return None


# Singleton
SETTINGS = Settings()
