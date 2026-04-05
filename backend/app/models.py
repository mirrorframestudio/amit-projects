"""
SQLAlchemy models — each class maps to one table in PostgreSQL.

Hierarchy:
  Campaign
    └── AdSet   (one campaign has many ad sets)
          └── Ad  (one ad set has many ads)
                └── AdInsightDaily  (daily metrics per ad)
"""

from sqlalchemy import Column, Integer, BigInteger, String, Numeric, Date, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class Campaign(Base):
    """
    Top-level advertising campaign (e.g. "Summer Sale 2026").
    Everything else belongs to a campaign.
    """
    __tablename__ = "campaigns"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(255), nullable=False)
    status      = Column(String(50),  default="active")   # active | paused | archived
    budget      = Column(Numeric(10, 2), default=0.00)
    spend       = Column(Numeric(10, 2), default=0.00)
    impressions = Column(Integer, default=0)
    clicks      = Column(Integer, default=0)

    # --- Meta Ads fields (empty for now, filled when we connect the API) ---
    meta_campaign_id = Column(String(100), nullable=True, index=True)  # ID from Meta
    objective        = Column(String(100), nullable=True)              # e.g. "LINK_CLICKS"

    created_at = Column(DateTime, server_default=func.now())

    # One campaign → many ad sets
    adsets = relationship("AdSet", back_populates="campaign")


class AdSet(Base):
    """
    An ad set lives inside a campaign.
    Controls WHO sees the ads (targeting) and WHEN (schedule + budget).
    """
    __tablename__ = "adsets"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String(255), nullable=False)
    status      = Column(String(50),  default="active")

    # Which campaign does this ad set belong to?
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)

    # --- Meta Ads fields ---
    meta_adset_id = Column(String(100), nullable=True, index=True)
    daily_budget  = Column(Numeric(10, 2), nullable=True)   # Daily spend limit
    start_date    = Column(Date, nullable=True)
    end_date      = Column(Date, nullable=True)

    # Targeting stored as flexible JSON
    # Example: {"age_min": 25, "age_max": 45, "countries": ["US", "CA"]}
    targeting = Column(JSON, nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    campaign = relationship("Campaign", back_populates="adsets")
    ads      = relationship("Ad", back_populates="adset")


class Ad(Base):
    """
    A single ad inside an ad set.
    Holds the creative: the title and body text shown to people.
    """
    __tablename__ = "ads"

    id      = Column(Integer, primary_key=True, index=True)
    name    = Column(String(255), nullable=False)
    status  = Column(String(50),  default="active")

    # Which ad set does this ad belong to?
    adset_id = Column(Integer, ForeignKey("adsets.id"), nullable=False)

    # --- Meta Ads fields ---
    meta_ad_id     = Column(String(100), nullable=True, index=True)
    creative_title = Column(String(255),  nullable=True)   # Headline shown in the ad
    creative_body  = Column(String(1000), nullable=True)   # Body / description text

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    adset          = relationship("AdSet", back_populates="ads")
    daily_insights = relationship("AdInsightDaily", back_populates="ad")


class AdInsightDaily(Base):
    """
    Daily performance numbers for a single ad.
    One row = one ad on one calendar day.

    This is the main table we'll fill from the Meta Ads API later.
    """
    __tablename__ = "ad_insights_daily"

    id      = Column(Integer, primary_key=True, index=True)
    ad_id   = Column(Integer, ForeignKey("ads.id"), nullable=False)  # Which ad?
    date_start = Column(Date, nullable=False)   # The day these numbers cover

    # --- Volume ---
    impressions = Column(Integer, default=0)   # Times the ad was shown
    clicks      = Column(Integer, default=0)   # Times it was clicked
    reach       = Column(Integer, default=0)   # Unique people who saw it

    # --- Money ---
    spend = Column(Numeric(10, 2), default=0.00)  # Amount spent (USD)
    cpm   = Column(Numeric(10, 4), nullable=True)  # Cost per 1,000 impressions
    cpc   = Column(Numeric(10, 4), nullable=True)  # Cost per click
    ctr   = Column(Numeric(8,  6), nullable=True)  # Click-through rate (e.g. 0.023 = 2.3%)

    # --- Conversions ---
    conversions = Column(Integer, default=0)   # Purchases, sign-ups, etc.

    created_at = Column(DateTime, server_default=func.now())

    # Relationship
    ad = relationship("Ad", back_populates="daily_insights")


# =============================================================================
# P&L Feature Models
# =============================================================================

class ShopifyOrder(Base):
    __tablename__ = "shopify_orders"

    id                 = Column(Integer, primary_key=True, index=True)
    shopify_order_id   = Column(BigInteger, unique=True, nullable=False, index=True)
    order_number       = Column(String(50))
    created_at_shopify = Column(DateTime, nullable=False)
    financial_status   = Column(String(50))
    fulfillment_status = Column(String(50))
    total_price        = Column(Numeric(12, 2), nullable=False)
    subtotal_price     = Column(Numeric(12, 2), nullable=False)
    total_shipping     = Column(Numeric(10, 2), default=0)
    total_tax          = Column(Numeric(10, 2), default=0)
    total_discounts    = Column(Numeric(10, 2), default=0)
    total_refunded     = Column(Numeric(12, 2), default=0)
    currency           = Column(String(10), default="ILS")
    synced_at          = Column(DateTime, server_default=func.now())
    created_at         = Column(DateTime, server_default=func.now())

    items = relationship("ShopifyOrderItem", back_populates="order", cascade="all, delete-orphan")


class ShopifyOrderItem(Base):
    __tablename__ = "shopify_order_items"

    id                 = Column(Integer, primary_key=True, index=True)
    order_id           = Column(Integer, ForeignKey("shopify_orders.id", ondelete="CASCADE"), nullable=False)
    shopify_product_id = Column(BigInteger)
    shopify_variant_id = Column(BigInteger)
    sku                = Column(String(100), index=True)
    title              = Column(String(500))
    quantity           = Column(Integer, default=1)
    price              = Column(Numeric(10, 2), nullable=False)
    total_discount     = Column(Numeric(10, 2), default=0)
    created_at         = Column(DateTime, server_default=func.now())

    order = relationship("ShopifyOrder", back_populates="items")


class ProductCost(Base):
    __tablename__ = "product_costs"

    id                 = Column(Integer, primary_key=True, index=True)
    sku                = Column(String(100), index=True)
    shopify_product_id = Column(BigInteger)
    product_name       = Column(String(500))
    cost_price         = Column(Numeric(10, 2), nullable=False)
    effective_date     = Column(Date, nullable=False)
    end_date           = Column(Date)
    notes              = Column(Text)
    created_at         = Column(DateTime, server_default=func.now())


class ManualExpense(Base):
    __tablename__ = "manual_expenses"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(255), nullable=False)
    category   = Column(String(100), nullable=False)
    amount     = Column(Numeric(12, 2), nullable=False)
    frequency  = Column(String(20), nullable=False, default="monthly")
    start_date = Column(Date, nullable=False)
    end_date   = Column(Date)
    notes      = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class ShopifySyncLog(Base):
    __tablename__ = "shopify_sync_log"

    id            = Column(Integer, primary_key=True, index=True)
    started_at    = Column(DateTime, server_default=func.now())
    finished_at   = Column(DateTime)
    status        = Column(String(20), default="running")
    orders_synced = Column(Integer, default=0)
    error_message = Column(Text)
