"""
Pydantic schemas — used by FastAPI to validate request/response data.

Each model has two schema classes:
  - <Model>Base   : shared fields
  - <Model>       : adds `id` and timestamps (returned in API responses)
"""

from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, Any


# ---------------------------------------------------------------------------
# Campaign
# ---------------------------------------------------------------------------

class CampaignBase(BaseModel):
    name        : str
    status      : str           = "active"
    budget      : float         = 0.0
    spend       : float         = 0.0
    impressions : int           = 0
    clicks      : int           = 0
    meta_campaign_id : Optional[str]   = None
    objective        : Optional[str]   = None


class CampaignCreate(CampaignBase):
    pass


class Campaign(CampaignBase):
    id         : int
    created_at : Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# AdSet
# ---------------------------------------------------------------------------

class AdSetBase(BaseModel):
    name         : str
    status       : str          = "active"
    campaign_id  : int
    meta_adset_id: Optional[str]   = None
    daily_budget : Optional[float] = None
    start_date   : Optional[date]  = None
    end_date     : Optional[date]  = None
    targeting    : Optional[Any]   = None   # Free-form JSON


class AdSetCreate(AdSetBase):
    pass


class AdSet(AdSetBase):
    id         : int
    created_at : Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Ad
# ---------------------------------------------------------------------------

class AdBase(BaseModel):
    name           : str
    status         : str         = "active"
    adset_id       : int
    meta_ad_id     : Optional[str] = None
    creative_title : Optional[str] = None
    creative_body  : Optional[str] = None


class AdCreate(AdBase):
    pass


class Ad(AdBase):
    id         : int
    created_at : Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# AdInsightDaily
# ---------------------------------------------------------------------------

class AdInsightDailyBase(BaseModel):
    ad_id       : int
    date_start  : date
    impressions : int           = 0
    clicks      : int           = 0
    reach       : int           = 0
    spend       : float         = 0.0
    cpm         : Optional[float] = None
    cpc         : Optional[float] = None
    ctr         : Optional[float] = None
    conversions : int           = 0


class AdInsightDailyCreate(AdInsightDailyBase):
    pass


class AdInsightDaily(AdInsightDailyBase):
    id         : int
    created_at : Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# ShopifyOrder
# ---------------------------------------------------------------------------

class ShopifyOrderBase(BaseModel):
    shopify_order_id   : int
    order_number       : Optional[str]   = None
    created_at_shopify : datetime
    financial_status   : Optional[str]   = None
    fulfillment_status : Optional[str]   = None
    total_price        : float
    subtotal_price     : float
    total_shipping     : float           = 0
    total_tax          : float           = 0
    total_discounts    : float           = 0
    total_refunded     : float           = 0
    currency           : str             = "ILS"


class ShopifyOrder(ShopifyOrderBase):
    id        : int
    synced_at : Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# ShopifyOrderItem
# ---------------------------------------------------------------------------

class ShopifyOrderItemBase(BaseModel):
    order_id           : int
    shopify_product_id : Optional[int] = None
    shopify_variant_id : Optional[int] = None
    sku                : Optional[str] = None
    title              : Optional[str] = None
    quantity           : int           = 1
    price              : float
    total_discount     : float         = 0


class ShopifyOrderItem(ShopifyOrderItemBase):
    id        : int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# ProductCost (COGS)
# ---------------------------------------------------------------------------

class ProductCostBase(BaseModel):
    sku                : Optional[str]  = None
    shopify_product_id : Optional[int]  = None
    product_name       : Optional[str]  = None
    cost_price         : float
    effective_date     : date
    end_date           : Optional[date] = None
    notes              : Optional[str]  = None


class ProductCostCreate(ProductCostBase):
    pass


class ProductCost(ProductCostBase):
    id        : int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# ManualExpense (ad spend, rent, salary, etc.)
# ---------------------------------------------------------------------------

class ManualExpenseBase(BaseModel):
    name       : str
    category   : str             # ad_spend, rent, salary, subscription, other
    amount     : float
    frequency  : str             = "monthly"   # monthly, annual, one_time, daily
    start_date : date
    end_date   : Optional[date]  = None
    notes      : Optional[str]   = None


class ManualExpenseCreate(ManualExpenseBase):
    pass


class ManualExpense(ManualExpenseBase):
    id        : int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# P&L Summary (response-only, not stored in DB)
# ---------------------------------------------------------------------------

class PnLLineItem(BaseModel):
    period         : str     # "2026-01-01" or "2026-W05" or "2026-01"
    revenue        : float
    refunds        : float
    net_revenue    : float
    cogs           : float
    gross_profit   : float
    gross_margin   : float   # percentage
    ad_spend       : float
    shipping       : float
    platform_fees  : float
    fixed_expenses : float
    total_expenses : float
    net_profit     : float
    net_margin     : float   # percentage


class PnLSummary(BaseModel):
    start_date : date
    end_date   : date
    resolution : str          # daily, weekly, monthly
    currency   : str          = "ILS"
    rows       : list[PnLLineItem]
    totals     : PnLLineItem
