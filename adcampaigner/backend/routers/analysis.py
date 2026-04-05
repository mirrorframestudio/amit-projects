"""Analysis router — run analysis, get results, AI agent."""
import logging

from anthropic import Anthropic
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, AnalysisRun
from ..schemas import AnalysisRequest, AnalysisRunResponse, AnalysisDetailResponse
from ..auth import get_current_user
from ..services import pipeline
from .. import config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.post("/run", response_model=AnalysisRunResponse)
def run_analysis(
    req: AnalysisRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run a new analysis for the current user."""
    if not user.ad_account_id:
        raise HTTPException(status_code=400, detail="לא הוגדר חשבון מודעות. יש לבחור חשבון קודם")

    try:
        run = pipeline.run_analysis(user, db, since=req.since, until=req.until)
        return run
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בניתוח: {e}")


@router.get("/runs", response_model=list[AnalysisRunResponse])
def list_runs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    runs = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.user_id == user.id)
        .order_by(AnalysisRun.created_at.desc())
        .limit(50)
        .all()
    )
    return runs


@router.get("/runs/{run_id}", response_model=AnalysisDetailResponse)
def get_run(
    run_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.id == run_id, AnalysisRun.user_id == user.id)
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="ניתוח לא נמצא")
    return run


@router.get("/latest")
def get_latest_analysis(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.user_id == user.id, AnalysisRun.status == "completed")
        .order_by(AnalysisRun.created_at.desc())
        .first()
    )
    if not run:
        raise HTTPException(status_code=404, detail="אין ניתוח זמין. יש להריץ ניתוח קודם")

    return {
        "id": run.id,
        "since_date": run.since_date,
        "until_date": run.until_date,
        "summary": run.summary,
        "total_spend": run.total_spend,
        "total_purchases": run.total_purchases,
        "total_roas": run.total_roas,
        "recommendations_count": run.recommendations_count,
        "result": run.result_json,
        "created_at": run.created_at.isoformat(),
    }


@router.post("/ai-agent")
def ai_agent_analysis(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    AI Campaigner Agent — sends ALL analysis data to Claude
    and gets back a comprehensive professional campaigner analysis.
    """
    if not config.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=400, detail="חסר ANTHROPIC_API_KEY")

    # Get latest analysis
    run = (
        db.query(AnalysisRun)
        .filter(AnalysisRun.user_id == user.id, AnalysisRun.status == "completed")
        .order_by(AnalysisRun.created_at.desc())
        .first()
    )
    if not run or not run.result_json:
        raise HTTPException(status_code=404, detail="אין ניתוח זמין. הרץ ניתוח קודם")

    result = run.result_json

    # Build comprehensive data summary for the AI
    data_parts = []

    # Business profile
    profile = user.business_profile or {}
    user_input = profile.get("user_input", {})
    if user_input:
        data_parts.append(f"""פרטי העסק:
- שם: {user_input.get('business_name', user.business_name or '')}
- תיאור: {user_input.get('description', '')}
- מוצרים: {user_input.get('products', '')}
- קהל יעד: {user_input.get('audience', '')}
- יתרון תחרותי: {user_input.get('usp', '')}""")

    # Campaign overview
    campaigns = result.get("campaigns", {})
    data_parts.append(f"""סיכום כללי (תקופה: {run.since_date} עד {run.until_date}):
- הוצאה כוללת: ₪{campaigns.get('total_spend', 0):,.0f}
- רכישות: {campaigns.get('total_purchases', 0)}
- ROAS: {campaigns.get('total_roas', 0):.2f}
- חשיפות: {campaigns.get('total_impressions', 0):,}
- קליקים: {campaigns.get('total_clicks', 0):,}
- CTR ממוצע: {campaigns.get('avg_ctr', 0):.2f}%
- הוספות לעגלה: {campaigns.get('total_atc', 0)}
- התחלת תשלום: {campaigns.get('total_ic', 0)}
- הכנסות: ₪{campaigns.get('total_purchase_value', 0):,.0f}
- תדירות ממוצעת: {campaigns.get('avg_frequency', 0):.1f}""")

    # Per-campaign data
    campaign_list = campaigns.get("campaigns", [])
    if campaign_list:
        camp_lines = []
        for c in campaign_list:
            cpp = c.get('cost_per_result')
            cpp_str = f"₪{cpp:,.0f}" if cpp and cpp != float('inf') and cpp is not None else "אין"
            camp_lines.append(
                f"  - {c.get('campaign_name', '?')}: "
                f"הוצאה ₪{c.get('spend', 0):,.0f}, "
                f"{c.get('purchases', 0)} רכישות, "
                f"ROAS {c.get('roas', 0):.2f}, "
                f"CTR {c.get('ctr', 0):.2f}%, "
                f"ATC {c.get('add_to_cart', 0)}, "
                f"IC {c.get('initiate_checkout', 0)}, "
                f"עלות/רכישה {cpp_str}, "
                f"תדירות {c.get('frequency', 0):.1f}"
            )
        data_parts.append("קמפיינים:\n" + "\n".join(camp_lines))

    # Top/bottom ads
    ads = result.get("ads", {})
    top5 = ads.get("top5", [])
    bottom5 = ads.get("bottom5", [])
    if top5:
        top_lines = []
        for a in top5[:5]:
            cpp = a.get('cost_per_result')
            cpp_str = f"₪{cpp:,.0f}" if cpp and cpp != float('inf') and cpp is not None else "אין"
            top_lines.append(
                f"  - [{a.get('campaign_name', '')} → {a.get('adset_name', '')} → {a.get('ad_name', '')}]: "
                f"₪{a.get('spend', 0):,.0f}, {a.get('purchases', 0)} רכישות, "
                f"ROAS {a.get('roas', 0):.2f}, ATC {a.get('add_to_cart', 0)}, "
                f"עלות/רכישה {cpp_str}"
            )
        data_parts.append("5 מודעות מובילות:\n" + "\n".join(top_lines))

    if bottom5:
        bottom_lines = []
        for a in bottom5[-5:]:
            bottom_lines.append(
                f"  - [{a.get('campaign_name', '')} → {a.get('ad_name', '')}]: "
                f"₪{a.get('spend', 0):,.0f}, {a.get('purchases', 0)} רכישות, "
                f"ATC {a.get('add_to_cart', 0)}"
            )
        data_parts.append("5 מודעות חלשות:\n" + "\n".join(bottom_lines))

    # Trends
    trends = result.get("trends", {})
    trend_direction = trends.get("trend", "unknown")
    td = trends.get("trend_details", {})
    if td:
        data_parts.append(f"""מגמה ({trend_direction}):
- שינוי ROAS: {td.get('roas_change', 0):.1f}%
- שינוי רכישות: {td.get('purchases_change', 0):.1f}%
- שינוי הוצאה: {td.get('spend_change', 0):.1f}%
- שינוי ATC: {td.get('atc_change', 0):.1f}%
- שינוי תדירות: {td.get('frequency_change', 0):.1f}%""")

    # Monthly data
    monthly = trends.get("monthly", [])
    if monthly:
        month_lines = []
        for m in monthly[-3:]:
            month_lines.append(
                f"  - {m.get('month', '?')}: "
                f"הוצאה ₪{m.get('spend', 0):,.0f}, "
                f"{m.get('purchases', 0)} רכישות, "
                f"ROAS {m.get('roas', 0):.2f}, "
                f"CTR {m.get('ctr', 0):.2f}%, "
                f"ATC {m.get('add_to_cart', 0)}, "
                f"תדירות {m.get('frequency', 0):.1f}"
            )
        data_parts.append("חודשים אחרונים:\n" + "\n".join(month_lines))

    # Weekly data
    weekly = trends.get("weekly", [])
    if weekly:
        week_lines = []
        for w in weekly[-4:]:
            week_lines.append(
                f"  - שבוע {w.get('week_start', '?')}: "
                f"₪{w.get('spend', 0):,.0f}, "
                f"{w.get('purchases', 0)} רכישות, "
                f"ROAS {w.get('roas', 0):.2f}, "
                f"ATC {w.get('add_to_cart', 0)}"
            )
        data_parts.append("שבועות אחרונים:\n" + "\n".join(week_lines))

    # Period comparison
    comparison = result.get("period_comparison", {})
    if comparison:
        for period_key, period_name in [("week", "שבוע"), ("month", "חודש")]:
            pdata = comparison.get(period_key)
            if pdata:
                changes = pdata.get("changes", [])
                change_lines = []
                for ch in changes:
                    arrow = "↑" if ch["pct_change"] > 0 else "↓" if ch["pct_change"] < 0 else "→"
                    change_lines.append(
                        f"  - {ch['label']}: {arrow} {abs(ch['pct_change']):.1f}% ({ch['direction']})"
                    )
                data_parts.append(
                    f"השוואת {period_name} ({pdata.get('previous_label', '')} → {pdata.get('current_label', '')}):\n"
                    + "\n".join(change_lines)
                )

    # Demographics
    demo = result.get("demographics", {})
    best_age = demo.get("best_age")
    best_gender = demo.get("best_gender")
    if best_age:
        data_parts.append(f"דמוגרפיה — גיל הכי טוב: {best_age.get('age', '')} (ROAS {best_age.get('roas', 0):.2f})")
    if best_gender:
        gender_heb = {"male": "גברים", "female": "נשים"}.get(best_gender.get("gender", ""), best_gender.get("gender", ""))
        data_parts.append(f"דמוגרפיה — מגדר הכי טוב: {gender_heb} (ROAS {best_gender.get('roas', 0):.2f})")

    # Fatigue
    fatigue = result.get("fatigue", [])
    if fatigue:
        fatigue_lines = []
        for f in fatigue:
            fatigue_lines.append(
                f"  - {f.get('ad_name', '')}: {f.get('severity', '')} — "
                f"CTR ירד {abs(f.get('ctr_change_pct', 0)):.0f}%, "
                f"תדירות {f.get('freq_second', 0):.1f}"
            )
        data_parts.append("שחיקת קריאייטיב:\n" + "\n".join(fatigue_lines))
    else:
        data_parts.append("שחיקת קריאייטיב: לא זוהתה שחיקה")

    # Existing recommendations
    recs = result.get("recommendations", [])
    if recs:
        rec_lines = [f"  - {r.get('icon', '')} {r.get('text', '')}" for r in recs[:10]]
        data_parts.append("המלצות מערכת:\n" + "\n".join(rec_lines))

    full_data = "\n\n".join(data_parts)

    # Send to Claude
    prompt = f"""אתה סוכן AI שהוא קמפיינר מקצועי ברמה הגבוהה ביותר. אתה מנהל קמפיינים בפייסבוק ואינסטגרם.
קיבלת את כל הנתונים של חשבון מודעות. תנתח אותם לעומק ותן ניתוח מקצועי מלא.

{full_data}

תן ניתוח מקצועי שכולל:

## 📊 סיכום מנהלים
2-3 משפטים על המצב הכללי של החשבון.

## ✅ מה עובד טוב
פרט מה הולך טוב — אילו קמפיינים/מודעות מצליחים ולמה.

## ⚠️ מה דורש תשומת לב
בעיות שזיהית — הוצאה בזבזנית, שחיקה, תדירות גבוהה, פאנל שבור.

## 💰 הקצאת תקציב
איפה להגדיל תקציב, איפה להקטין, ולמה. תן מספרים ספציפיים.

## 📈 ניתוח מגמות
מה קורה ברמה חודשית ושבועית? האם יש מגמה? מה גורם לה?

## 🔻 ניתוח משפך
איפה הנשירה הכי גדולה? (חשיפות → קליקים → ATC → checkout → רכישה)
מה הפתרון?

## 👥 ניתוח קהל
איזה קהל עובד הכי טוב? מה כדאי לבדוק?

## 🎯 5 פעולות מיידיות
רשימה ממוספרת של 5 דברים שצריך לעשות עכשיו, מהדחוף ביותר לפחות.

ענה בעברית. היה ספציפי — תן שמות קמפיינים, מספרים, אחוזים.
אל תהיה גנרי — תתבסס רק על הנתונים שקיבלת.
"""

    try:
        client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
        analysis_text = response.content[0].text
        logger.info("AI Agent analysis generated (%d chars)", len(analysis_text))
        return {"analysis": analysis_text, "status": "ok"}
    except Exception as e:
        logger.exception("AI Agent analysis failed")
        raise HTTPException(status_code=500, detail=f"שגיאה בניתוח AI: {e}")
