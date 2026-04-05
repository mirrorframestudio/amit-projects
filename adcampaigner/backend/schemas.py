"""Pydantic schemas for API request/response."""
from pydantic import BaseModel
from datetime import datetime


# ── Auth ──────────────────────────────────────────────
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str
    ad_account_id: str


class FacebookLoginRequest(BaseModel):
    fb_access_token: str  # short-lived token from FB Login SDK


class SetAdAccountRequest(BaseModel):
    ad_account_id: str  # e.g. "act_1020824739687760"


# ── Onboarding ────────────────────────────────────────
class OnboardingRequest(BaseModel):
    business_name: str
    description: str
    website: str = ""
    products: str = ""
    audience: str = ""
    usp: str = ""


# ── Analysis ──────────────────────────────────────────
class AnalysisRequest(BaseModel):
    since: str | None = None  # YYYY-MM-DD, default last 90 days
    until: str | None = None


class AnalysisRunResponse(BaseModel):
    id: int
    since_date: str
    until_date: str
    status: str
    total_spend: float
    total_purchases: int
    total_roas: float
    recommendations_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisDetailResponse(BaseModel):
    id: int
    since_date: str
    until_date: str
    status: str
    result_json: dict | None
    summary: str
    created_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


# ── Creative ──────────────────────────────────────────
class CreativeRequest(BaseModel):
    campaign_name: str = ""
    context: str = ""  # e.g. "ads for football jerseys, audience: men 18-35"
    suggestion_type: str = "copy"  # copy, visual, audience, hook


class CreativeResponse(BaseModel):
    id: int
    suggestion_type: str
    content: str
    context: str
    campaign_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────
class AdAccountInfo(BaseModel):
    ad_account_id: str
    name: str
    currency: str
    status: str


class UserProfile(BaseModel):
    name: str
    email: str
    business_name: str
    ad_account_id: str
    total_runs: int
