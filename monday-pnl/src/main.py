"""
Main orchestrator — runs the full P&L pipeline:
  1. Fetch orders from Monday.com
  2. Normalize into order dicts
  3. Compute P&L calculations
  4. Write/update Excel workbook
  5. Upload to Google Drive

Usage:
    python -m src.main              # single run
    python -m src.main --no-upload  # skip Drive upload
"""

import argparse
import logging
import logging.handlers
import sys
import time
from pathlib import Path

from . import settings
from .monday_client import fetch_all_items
from .order_mapper import normalize_all
from .pnl_engine import compute_all
from .excel_writer import write_workbook


def setup_logging() -> None:
    """Configure console + rotating file logging."""
    log_dir = Path(__file__).resolve().parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)

    root = logging.getLogger()
    root.setLevel(getattr(logging, settings.LOG_LEVEL, logging.INFO))

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)-7s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    ))
    root.addHandler(console)

    # Rotating file handler (5 MB, keep 5 backups)
    file_handler = logging.handlers.RotatingFileHandler(
        log_dir / "pnl.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)-7s] %(name)s (%(filename)s:%(lineno)d): %(message)s",
    ))
    root.addHandler(file_handler)


def run_pipeline(upload: bool = True) -> None:
    """Execute the full P&L pipeline once."""
    logger = logging.getLogger(__name__)

    logger.info("=" * 60)
    logger.info("Starting P&L pipeline")
    logger.info("Board ID: %s | Mode: %s | Currency: %s",
                settings.MONDAY_BOARD_ID, settings.MODE, settings.CURRENCY)
    logger.info("=" * 60)

    start = time.monotonic()

    # Step 1: Fetch from Monday
    logger.info("Step 1/4: Fetching items from Monday.com...")
    raw_items = fetch_all_items()

    # Step 2: Normalize
    logger.info("Step 2/4: Normalizing orders...")
    orders = normalize_all(raw_items)

    if not orders:
        logger.warning("No orders found. Writing empty workbook.")

    # Step 3: Compute P&L
    logger.info("Step 3/7: Computing P&L...")
    calc_orders = compute_all(orders)

    # Step 4: Fetch Facebook Ads data
    logger.info("Step 4/7: Fetching Facebook Ads data...")
    ads_data = {}
    try:
        from .facebook_ads import fetch_monthly_total, fetch_weekly_breakdown, fetch_daily_breakdown
        ads_data = {
            "monthly": fetch_monthly_total(),
            "weekly": fetch_weekly_breakdown(),
            "daily": fetch_daily_breakdown(),
        }
        logger.info("Ad spend this month: %.2f", ads_data["monthly"]["spend"])
    except Exception:
        logger.exception("Facebook Ads fetch failed (continuing without ads data)")

    # Step 5: Write Excel
    logger.info("Step 5/7: Writing Excel workbook...")
    output_path = write_workbook(orders, calc_orders, ads_data=ads_data)

    # Step 6: Upload to Google Drive
    if upload:
        logger.info("Step 6/7: Uploading to Google Drive...")
        try:
            from .drive_uploader import upload as drive_upload
            link = drive_upload(output_path)
            logger.info("Drive link: %s", link)
        except Exception:
            logger.exception("Drive upload failed (pipeline still succeeded)")
    else:
        logger.info("Step 6/7: Skipping Drive upload (--no-upload)")

    # Step 7: Save daily snapshot to PostgreSQL
    logger.info("Step 7/7: Saving daily P&L snapshot to database...")
    try:
        import sys
        from datetime import date, timedelta
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
        from pnl_shared.db_writer import save_pnl_snapshot
        from pnl_shared.exchange_rate import get_usd_to_ils

        yesterday = date.today() - timedelta(days=1)
        live_rate = get_usd_to_ils(fallback=settings.USD_TO_ILS)

        # Get today's ad spend from ads_data if available
        daily_ads = ads_data.get("daily", {})
        yest_str = yesterday.isoformat()
        ad_spend_today = float(
            daily_ads.get(yest_str, {}).get("spend", 0)
            if isinstance(daily_ads, dict)
            else 0
        )

        save_pnl_snapshot(
            report_date=yesterday,
            orders=calc_orders,
            ad_spend=ad_spend_today,
            usd_to_ils=live_rate,
        )
    except Exception:
        logger.exception("DB snapshot failed (non-critical, continuing)")

    elapsed = time.monotonic() - start
    logger.info("=" * 60)
    logger.info("Pipeline complete in %.1fs - %d orders -> %s",
                elapsed, len(calc_orders), output_path)
    logger.info("=" * 60)


def _send_whatsapp_error(pipeline: str, error: str) -> None:
    """Send a WhatsApp failure alert — reuses fb-ads-analyzer's notifier."""
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "fb-ads-analyzer"))
        from src.whatsapp_notifier import send_error_alert
        send_error_alert(pipeline, error)
    except Exception:
        logger.exception("Could not send WhatsApp error alert for %s", pipeline)


def main() -> None:
    parser = argparse.ArgumentParser(description="Monday.com -> P&L Excel pipeline")
    parser.add_argument("--no-upload", action="store_true",
                        help="Skip Google Drive upload")
    args = parser.parse_args()

    setup_logging()
    try:
        run_pipeline(upload=not args.no_upload)
    except Exception as exc:
        logger.exception("Pipeline FAILED — sending WhatsApp error alert")
        _send_whatsapp_error("Monday P&L", str(exc))
        raise


if __name__ == "__main__":
    main()
