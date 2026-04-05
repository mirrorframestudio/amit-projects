"""SQLAlchemy models — users, analysis runs, creative suggestions."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    fb_user_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, default="")
    fb_access_token = Column(Text, nullable=False)  # long-lived token
    fb_token_expires = Column(DateTime, nullable=True)
    ad_account_id = Column(String, default="")  # act_XXXXXXX
    business_name = Column(String, default="")
    business_profile = Column(JSON, nullable=True)  # AI-generated business research
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    analysis_runs = relationship("AnalysisRun", back_populates="user")
    creative_suggestions = relationship("CreativeSuggestion", back_populates="user")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    since_date = Column(String, nullable=False)
    until_date = Column(String, nullable=False)
    status = Column(String, default="running")  # running, completed, failed
    result_json = Column(JSON, nullable=True)  # full analysis result
    summary = Column(Text, default="")
    total_spend = Column(Float, default=0)
    total_purchases = Column(Integer, default=0)
    total_roas = Column(Float, default=0)
    recommendations_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="analysis_runs")


class CreativeSuggestion(Base):
    __tablename__ = "creative_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id"), nullable=True)
    campaign_name = Column(String, default="")
    suggestion_type = Column(String, default="")  # copy, visual, audience, hook
    content = Column(Text, nullable=False)  # The AI-generated suggestion
    context = Column(Text, default="")  # What data prompted this
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="creative_suggestions")
