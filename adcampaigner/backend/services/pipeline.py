"""
Analysis pipeline — orchestrates fetch → analyze → save.
Multi-tenant: takes user credentials, returns structured results.
"""
import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..models import AnalysisRun, User
from . import fb_client, analyzer

logger = logging.getLogger(__name__)


def run_analysis(user: User, db: Session,
                 since: str | None = None, until: str | None = None) -> AnalysisRun:
    """
    Run full analysis pipeline for a user.
    Fetches data, analyzes, saves results to DB.
    """
    if not since:
        since = (date.today() - timedelta(days=90)).isoformat()
    if not until:
        until = date.today().isoformat()

    # Create run record
    run = AnalysisRun(
        user_id=user.id,
        since_date=since,
        until_date=until,
        status="running",
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        token = user.fb_access_token
        account = user.ad_account_id

        # Step 1: Fetch all data
        logger.info("Pipeline: fetching data for user %s, account %s", user.name, account)
        campaigns_raw = fb_client.fetch_campaigns(token, account, since, until)
        adsets_raw = fb_client.fetch_adsets(token, account, since, until)
        ads_raw = fb_client.fetch_ads(token, account, since, until)
        daily_raw = fb_client.fetch_ads_daily(token, account, since, until)
        demo_raw = fb_client.fetch_demographics(token, account, since, until)
        placement_raw = fb_client.fetch_placements(token, account, since, until)

        # Step 2: Analyze
        logger.info("Pipeline: analyzing performance...")
        campaign_analysis = analyzer.analyze_campaigns(campaigns_raw)
        ad_analysis = analyzer.analyze_ads(ads_raw)
        trend_analysis = analyzer.analyze_trends(daily_raw)
        demo_analysis = analyzer.analyze_demographics(demo_raw)
        placement_analysis = analyzer.analyze_placements(placement_raw)
        period_comparison = analyzer.analyze_period_comparison(trend_analysis)
        fatigue_data = analyzer.detect_creative_fatigue(daily_raw)

        # Step 3: Recommendations
        recommendations = analyzer.generate_recommendations(
            campaign_analysis, ad_analysis, demo_analysis, trend_analysis,
            adset_data=adsets_raw, fatigue_data=fatigue_data,
        )
        rec_strings = analyzer.recommendations_to_strings(recommendations)

        # Build result
        # Clean infinity values for JSON serialization
        def _clean_inf(obj):
            if isinstance(obj, float) and (obj == float("inf") or obj == float("-inf")):
                return None
            if isinstance(obj, dict):
                return {k: _clean_inf(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [_clean_inf(v) for v in obj]
            return obj

        result = _clean_inf({
            "campaigns": campaign_analysis,
            "ads": ad_analysis,
            "trends": trend_analysis,
            "demographics": demo_analysis,
            "placements": placement_analysis,
            "period_comparison": period_comparison,
            "fatigue": fatigue_data,
            "recommendations": recommendations,
            "recommendation_strings": rec_strings,
        })

        # Update run record
        run.status = "completed"
        run.result_json = result
        run.total_spend = campaign_analysis.get("total_spend", 0)
        run.total_purchases = campaign_analysis.get("total_purchases", 0)
        run.total_roas = campaign_analysis.get("total_roas", 0)
        run.recommendations_count = len(recommendations)
        run.completed_at = datetime.now(timezone.utc)

        # Build summary
        summary_parts = [
            f"הוצאה: ₪{run.total_spend:,.0f}",
            f"רכישות: {run.total_purchases}",
            f"ROAS: {run.total_roas:.2f}",
            f"המלצות: {run.recommendations_count}",
        ]
        if fatigue_data:
            summary_parts.append(f"שחיקת קריאייטיב: {len(fatigue_data)} מודעות")
        run.summary = " | ".join(summary_parts)

        db.commit()
        db.refresh(run)

        logger.info("Pipeline completed: %s", run.summary)
        return run

    except Exception as e:
        logger.exception("Pipeline failed for user %s", user.name)
        run.status = "failed"
        run.summary = f"שגיאה: {str(e)}"
        run.completed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(run)
        raise
