"""
Facebook Ads Analyzer — main pipeline.
Fetches data from Meta Marketing API, analyzes performance, generates Excel report.
Uploads to Google Drive and sends WhatsApp summary.
"""
import argparse
import logging
import time
from logging.handlers import RotatingFileHandler
from pathlib import Path

import sys
from pathlib import Path

from . import settings
from .fb_client import (
    fetch_campaigns, fetch_ads, fetch_ads_daily,
    fetch_adsets, fetch_demographics, fetch_placements,
    fetch_hourly_breakdown, fetch_video_metrics,
    check_token_expiry,
)
from .analyzer import (
    analyze_campaigns, analyze_ads, analyze_trends,
    analyze_demographics, analyze_placements, generate_recommendations,
    recommendations_to_strings, analyze_period_comparison,
    detect_creative_fatigue,
)
from .excel_report import write_report
from .drive_uploader import upload as drive_upload
from .whatsapp_notifier import send_summary as whatsapp_send, send_error_alert

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from pnl_shared.report_cleanup import cleanup_old_reports  # noqa: E402
from pnl_shared.db_writer import save_ads_snapshot          # noqa: E402


def setup_logging():
    """Console + rotating file logging."""
    log_dir = Path(__file__).resolve().parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)

    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.LOG_LEVEL, logging.INFO))

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)-7s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    # Console
    console = logging.StreamHandler()
    console.setFormatter(fmt)
    root.addHandler(console)

    # File (5MB, 5 backups)
    file_handler = RotatingFileHandler(
        log_dir / "ads.log", maxBytes=5_000_000, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(fmt)
    root.addHandler(file_handler)


setup_logging()
logger = logging.getLogger(__name__)


def run(since: str | None = None, until: str | None = None):
    start = time.time()
    logger.info("=" * 60)
    logger.info("Facebook Ads Analyzer — Deep Analysis")
    logger.info("Ad Account: %s", settings.FB_AD_ACCOUNT_ID)
    logger.info("=" * 60)

    # ── Token expiry check (runs before anything else) ────
    logger.info("Pre-flight: checking Facebook token expiry...")
    check_token_expiry()

    # ── Step 1: Fetch data ────────────────────────────────
    from datetime import date, timedelta as _td
    yesterday_str = (date.today() - _td(days=1)).isoformat()

    logger.info("Step 1/6: Fetching data from Facebook (active campaigns only)...")
    campaigns_raw  = fetch_campaigns(since, until)
    adsets_raw     = fetch_adsets(since, until)
    ads_raw        = fetch_ads(since, until)
    daily_raw      = fetch_ads_daily(since, until)
    demo_raw       = fetch_demographics(since, until)
    placement_raw  = fetch_placements(since, until)
    hourly_raw     = fetch_hourly_breakdown(yesterday_str)
    video_raw      = fetch_video_metrics(yesterday_str)

    # ── Step 2: Analyze ───────────────────────────────────
    logger.info("Step 2/6: Analyzing performance (4 granularities + funnel)...")
    campaign_analysis = analyze_campaigns(campaigns_raw)
    ad_analysis = analyze_ads(ads_raw)
    trend_analysis = analyze_trends(daily_raw)
    demo_analysis = analyze_demographics(demo_raw)
    placement_analysis = analyze_placements(placement_raw)

    # Period comparison (week vs week, month vs month)
    period_comparison = analyze_period_comparison(trend_analysis)

    # Creative fatigue detection
    fatigue_data = detect_creative_fatigue(daily_raw)
    if fatigue_data:
        logger.info("Detected %d fatigued ads:", len(fatigue_data))
        for f in fatigue_data:
            logger.info("  %s %s — CTR %+.0f%%, freq %.1f",
                        {"critical": "🔥", "warning": "😴", "watch": "👀"}.get(f["severity"], ""),
                        f["ad_name"], f["ctr_change_pct"], f["freq_second"])
    else:
        logger.info("No creative fatigue detected")

    # ── Step 3: Generate structured recommendations ──────
    logger.info("Step 3/6: Generating structured recommendations...")
    recommendations = generate_recommendations(
        campaign_analysis, ad_analysis, demo_analysis, trend_analysis,
        adset_data=adsets_raw, fatigue_data=fatigue_data,
    )
    rec_strings = recommendations_to_strings(recommendations)
    for rec in rec_strings:
        logger.info("  %s", rec)

    # ── Step 4: Write Excel report ────────────────────────
    logger.info("Step 4/6: Writing Excel report (11 sheets)...")
    report_path = write_report(
        campaign_analysis, ad_analysis, trend_analysis,
        demo_analysis, placement_analysis, recommendations,
        period_comparison=period_comparison,
        fatigue_data=fatigue_data,
    )

    # ── Step 5: Upload to Google Drive ─────────────────────
    drive_link = None
    try:
        logger.info("Step 5/6: Uploading to Google Drive...")
        drive_link = drive_upload(report_path)
        logger.info("Drive link: %s", drive_link)
    except Exception:
        logger.exception("Drive upload failed (skipping)")

    # ── Step 6: Send WhatsApp summary (unified daily message) ──
    logger.info("Step 6/6: Sending WhatsApp summary...")
    whatsapp_send(campaign_analysis, ad_analysis, trend_analysis,
                  rec_strings, drive_link, structured_recs=recommendations,
                  hourly_data=hourly_raw, video_data=video_raw)

    # ── Save daily snapshot to PostgreSQL ─────────────────
    from datetime import date, timedelta
    yesterday = date.today() - timedelta(days=1)
    try:
        save_ads_snapshot(
            report_date=yesterday,
            campaign_analysis=campaign_analysis,
            ad_analysis=ad_analysis,
            trend_data=trend_analysis,
            drive_link=drive_link,
            fatigue_data=fatigue_data,
            recommendations=recommendations,
        )
    except Exception:
        logger.exception("DB snapshot failed (non-critical, continuing)")

    # ── Cleanup old reports (keep 30 days) ────────────────
    reports_dir = Path(report_path).parent
    cleanup_old_reports(reports_dir, keep_days=30, pattern="ads_report_*.xlsx")

    elapsed = time.time() - start
    logger.info("=" * 60)
    logger.info("Done in %.1fs — Report: %s", elapsed, report_path)
    if drive_link:
        logger.info("Drive: %s", drive_link)
    logger.info("=" * 60)
    return report_path


def main():
    parser = argparse.ArgumentParser(description="Facebook Ads Analyzer")
    parser.add_argument("--since", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--until", help="End date (YYYY-MM-DD)")
    args = parser.parse_args()

    try:
        run(since=args.since, until=args.until)
    except Exception as exc:
        logger.exception("Pipeline FAILED — sending WhatsApp error alert")
        send_error_alert("Ads Analyzer", str(exc))
        raise


if __name__ == "__main__":
    main()
