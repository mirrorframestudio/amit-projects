"""Dashboard router — quick stats and overview."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, AnalysisRun, CreativeSuggestion
from ..auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get quick dashboard stats for the user."""
    # Latest completed run
    latest_run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.user_id == user.id, AnalysisRun.status == "completed")
        .order_by(AnalysisRun.created_at.desc())
        .first()
    )

    total_runs = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.user_id == user.id)
        .count()
    )

    total_suggestions = (
        db.query(CreativeSuggestion)
        .filter(CreativeSuggestion.user_id == user.id)
        .count()
    )

    # Business profile status
    profile = user.business_profile or {}
    profile_status = profile.get("status", "none")

    stats = {
        "user_name": user.name,
        "business_name": user.business_name,
        "ad_account_id": user.ad_account_id or "",
        "total_runs": total_runs,
        "total_suggestions": total_suggestions,
        "latest_run": None,
        "business_profile_status": profile_status,
        "business_summary": profile.get("ai_profile", "")[:600] if profile else "",
    }

    if latest_run:
        stats["latest_run"] = {
            "id": latest_run.id,
            "summary": latest_run.summary,
            "total_spend": latest_run.total_spend,
            "total_purchases": latest_run.total_purchases,
            "total_roas": latest_run.total_roas,
            "recommendations_count": latest_run.recommendations_count,
            "created_at": latest_run.created_at.isoformat(),
        }

        # Extract key metrics from result_json
        if latest_run.result_json:
            result = latest_run.result_json
            recommendations = result.get("recommendations", [])
            urgent = [r for r in recommendations if r.get("priority", 5) <= 2]
            stats["urgent_recommendations"] = len(urgent)

            # Top recommendation
            if recommendations:
                top_rec = recommendations[0]
                stats["top_recommendation"] = f"{top_rec['icon']} {top_rec['text']}"

            # Trend
            trends = result.get("trends", {})
            stats["trend"] = trends.get("trend", "unknown")
            stats["trend_details"] = trends.get("trend_details", {})

    return stats
