"""Creative suggestions router — AI-powered ad ideas."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, CreativeSuggestion, AnalysisRun
from ..schemas import CreativeRequest, CreativeResponse
from ..auth import get_current_user
from ..services import ai_creative

router = APIRouter(prefix="/api/creative", tags=["creative"])


@router.post("/suggest", response_model=CreativeResponse)
def generate_suggestion(
    req: CreativeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an AI creative suggestion based on business context + performance data."""
    # Get latest analysis for context
    latest_run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.user_id == user.id, AnalysisRun.status == "completed")
        .order_by(AnalysisRun.created_at.desc())
        .first()
    )

    campaign_data = None
    if latest_run and latest_run.result_json:
        campaign_data = latest_run.result_json.get("campaigns", {})

    # Build business context
    context_parts = []
    if user.business_name:
        context_parts.append(f"שם העסק: {user.business_name}")
    if req.context:
        context_parts.append(req.context)
    if req.campaign_name:
        context_parts.append(f"קמפיין: {req.campaign_name}")

    business_context = "\n".join(context_parts) if context_parts else "עסק קטן שמפרסם בפייסבוק"

    # Generate — pass business profile for deep context
    content = ai_creative.generate_creative_suggestion(
        suggestion_type=req.suggestion_type,
        business_context=business_context,
        campaign_data=campaign_data,
        business_profile=user.business_profile,
    )

    # Save to DB
    suggestion = CreativeSuggestion(
        user_id=user.id,
        analysis_run_id=latest_run.id if latest_run else None,
        campaign_name=req.campaign_name,
        suggestion_type=req.suggestion_type,
        content=content,
        context=req.context,
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)

    return suggestion


@router.get("/history", response_model=list[CreativeResponse])
def list_suggestions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List past creative suggestions."""
    suggestions = (
        db.query(CreativeSuggestion)
        .filter(CreativeSuggestion.user_id == user.id)
        .order_by(CreativeSuggestion.created_at.desc())
        .limit(30)
        .all()
    )
    return suggestions
