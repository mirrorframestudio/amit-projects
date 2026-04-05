"""
CLI entry point for generating the weekly P&L report.

Usage:
    python -m src.run_weekly_pnl --last-completed-week
    python -m src.run_weekly_pnl --week-start 2026-02-16 --week-end 2026-02-22
"""
import argparse
import logging
import os
import sys
from datetime import date, datetime, timedelta

from dotenv import load_dotenv
load_dotenv()  # Load .env file

from .settings import SETTINGS

logger = logging.getLogger("weekly_pnl")


def _setup_logging():
    """Configure console + file logging."""
    # Force UTF-8 on Windows console
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    os.makedirs(SETTINGS.LOG_DIR, exist_ok=True)
    log_file = os.path.join(
        SETTINGS.LOG_DIR,
        f"pnl_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log",
    )

    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(fmt)

    file_h = logging.FileHandler(log_file, encoding="utf-8")
    file_h.setLevel(logging.DEBUG)
    file_h.setFormatter(fmt)

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    root.addHandler(console)
    root.addHandler(file_h)

    logger.info(f"Log file: {log_file}")


def _last_completed_week() -> tuple:
    """Return (monday, sunday) of the most recently completed Mon-Sun week."""
    today = date.today()
    # days_since_monday: Monday=0 ... Sunday=6
    days_since_monday = today.weekday()
    # Last Sunday
    last_sunday = today - timedelta(days=days_since_monday + 1)
    last_monday = last_sunday - timedelta(days=6)
    return last_monday, last_sunday


def _collect_all_variant_ids(orders):
    """Extract unique variant IDs from all order line items."""
    ids = set()
    for order in orders:
        for li in order.get("line_items", []):
            vid = li.get("variant_id")
            if vid:
                ids.add(vid)
    return list(ids)


def run(week_start: date, week_end: date):
    """Main pipeline: fetch data → compute P&L → generate Excel."""
    from .marketing import load_marketing_spend
    from .pnl_engine import build_weekly_pnl
    from .excel_report import generate_report

    logger.info(f"═══ Weekly P&L Report: {week_start} to {week_end} ═══")

    # ── 1. Marketing spend ─────────────────────────────────────────
    marketing_spend, marketing_found, marketing_source = load_marketing_spend(week_start, week_end)
    logger.info(f"Marketing spend: ₪{marketing_spend:.2f} (found={marketing_found}, source={marketing_source})")

    # ── 2. Shopify orders + costs ──────────────────────────────────
    if SETTINGS.has_shopify_credentials:
        from .shopify_client import ShopifyClient

        client = ShopifyClient()
        logger.info("Fetching orders from Shopify API...")
        orders = client.fetch_orders(
            start_date=datetime.combine(week_start, datetime.min.time()),
            end_date=datetime.combine(week_end, datetime.min.time()),
        )
        logger.info(f"Fetched {len(orders)} orders from Shopify")

        # Fetch COGS
        variant_ids = _collect_all_variant_ids(orders)
        logger.info(f"Fetching costs for {len(variant_ids)} variants...")
        variant_costs = client.fetch_variant_costs_bulk(variant_ids)
    else:
        logger.warning("═══ SHOPIFY CREDENTIALS MISSING — using MOCK DATA ═══")
        from .mock_data import generate_mock_orders

        orders, variant_costs = generate_mock_orders(week_start, week_end)
        logger.info(f"Generated {len(orders)} mock orders")

    # ── 3. Compute P&L ─────────────────────────────────────────────
    pnl_rows, summary = build_weekly_pnl(
        orders=orders,
        variant_costs=variant_costs,
        weekly_marketing=marketing_spend,
        marketing_found=marketing_found,
        week_start=week_start,
        week_end=week_end,
    )

    # ── 4. Generate Excel ──────────────────────────────────────────
    filepath = generate_report(pnl_rows, summary, week_start, week_end)

    # ── 5. Console summary ─────────────────────────────────────────
    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║         WEEKLY P&L SUMMARY                      ║")
    print("╠══════════════════════════════════════════════════╣")
    print(f"║  Week:              {week_start} – {week_end}  ║")
    print(f"║  Orders:            {summary.order_count:<27}║")
    print(f"║  Revenue Base:      ₪{summary.total_revenue_base:>12,.2f}            ║")
    print(f"║  Net Sales ex VAT:  ₪{summary.total_net_sales_ex_vat:>12,.2f}            ║")
    print(f"║  COGS:              ₪{summary.total_cogs:>12,.2f}            ║")
    print(f"║  Processing Fees:   ₪{summary.total_processing_fees:>12,.2f}            ║")
    print(f"║  Marketing:         ₪{summary.total_marketing_from_csv:>12,.2f}            ║")
    print(f"║  Shipping Cost:     ₪{summary.total_shipping_cost:>12,.2f}            ║")
    print(f"║  ─────────────────────────────────────────────  ║")
    print(f"║  NET PROFIT:        ₪{summary.total_net_profit:>12,.2f}            ║")
    print(f"║  Net Margin:        {summary.net_margin:>12.1%}            ║")
    print("╠══════════════════════════════════════════════════╣")
    if summary.warnings:
        print("║  WARNINGS:                                      ║")
        for w in summary.warnings:
            print(f"║    • {w:<43}║")
    print("╚══════════════════════════════════════════════════╝")
    print(f"\n📄 Report saved: {filepath}")

    # ── 6. WhatsApp weekly summary ─────────────────────────────────
    _send_whatsapp_weekly(week_start, week_end, summary)

    # ── 7. Cleanup old report files (keep 30 days) ─────────────────
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
        from pnl_shared.report_cleanup import cleanup_old_reports
        cleanup_old_reports(Path(filepath).parent, keep_days=30, pattern="P&L_*.xlsx")
    except Exception:
        logger.exception("Report cleanup failed (non-critical)")

    return filepath, summary


def _send_whatsapp_weekly(week_start: date, week_end: date, summary) -> None:
    """Send a Hebrew WhatsApp summary of the weekly P&L."""
    try:
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent
                               / "fb-ads-analyzer"))
        from src.whatsapp_notifier import _send_via_hello_world_then_text, send_error_alert
        from src import settings as wa_settings

        if not wa_settings.WHATSAPP_ACCESS_TOKEN or not wa_settings.WHATSAPP_TO:
            logger.info("WhatsApp credentials not configured for weekly-pnl, skipping")
            return

        profit_icon = "✅" if summary.total_net_profit >= 0 else "❌"
        margin_pct = summary.net_margin * 100

        lines = [
            f"*📊 סיכום שבועי — OneZone Jersey*",
            f"*{week_start.strftime('%d/%m')} – {week_end.strftime('%d/%m/%Y')}*",
            "",
            f"📦 הזמנות: {summary.order_count}",
            f"💳 הכנסות: ₪{summary.total_revenue_base:,.0f}",
            f"🏷 מע״מ: -₪{summary.total_vat_removed:,.0f}",
            f"📋 עלות סחורה: -₪{summary.total_cogs:,.0f}",
            f"💸 עמלות: -₪{summary.total_processing_fees:,.0f}",
            f"🚚 משלוחים: -₪{summary.total_shipping_cost:,.0f}",
            f"📣 פרסום: -₪{summary.total_marketing_from_csv:,.0f}",
            "",
            f"{profit_icon} *רווח נקי: ₪{summary.total_net_profit:,.0f}*",
            f"📊 מרג'ין: {margin_pct:.1f}%",
        ]

        if summary.warnings:
            lines.append("")
            lines.append("⚠️ *אזהרות:*")
            for w in summary.warnings[:3]:
                lines.append(f"  • {w}")

        message = "\n".join(lines)
        _send_via_hello_world_then_text(message)
        logger.info("Weekly WhatsApp summary sent")

    except Exception as exc:
        logger.exception("Failed to send weekly WhatsApp summary: %s", exc)


def main():
    parser = argparse.ArgumentParser(
        description="Generate weekly P&L report from Shopify data"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--last-completed-week",
        action="store_true",
        help="Generate for the last completed Mon-Sun week",
    )
    group.add_argument(
        "--week-start",
        type=str,
        help="Week start date (YYYY-MM-DD)",
    )
    group.add_argument(
        "--month",
        type=str,
        help="Generate for a full month (YYYY-MM, e.g. 2026-02)",
    )
    group.add_argument(
        "--last-month",
        action="store_true",
        help="Generate for the previous calendar month",
    )
    parser.add_argument(
        "--week-end",
        type=str,
        help="End date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--email",
        type=str,
        help="Send report to this email address",
    )

    args = parser.parse_args()

    _setup_logging()

    if args.last_completed_week:
        ws, we = _last_completed_week()
    elif args.last_month:
        import calendar
        today = date.today()
        # First day of current month, then go back one day to get last month
        first_of_this_month = today.replace(day=1)
        last_of_prev = first_of_this_month - timedelta(days=1)
        ws = last_of_prev.replace(day=1)
        we = last_of_prev
    elif args.month:
        # Parse YYYY-MM → first and last day of month
        import calendar
        parts = args.month.split("-")
        year, month = int(parts[0]), int(parts[1])
        ws = date(year, month, 1)
        last_day = calendar.monthrange(year, month)[1]
        we = date(year, month, last_day)
    else:
        ws = date.fromisoformat(args.week_start)
        if args.week_end:
            we = date.fromisoformat(args.week_end)
        else:
            we = ws + timedelta(days=6)

    filepath, summary = run(ws, we)

    # Send email if requested
    if args.email:
        from .email_report import send_pnl_report

        month_name = ws.strftime("%B %Y")
        subject = f"Meluvo P&L Report — {month_name}"
        body = (
            f"P&L Report: {ws} to {we}\n\n"
            f"Orders: {summary.order_count}\n"
            f"Revenue: ₪{summary.total_revenue_base:,.2f}\n"
            f"Net Sales ex VAT: ₪{summary.total_net_sales_ex_vat:,.2f}\n"
            f"COGS: ₪{summary.total_cogs:,.2f}\n"
            f"Meta Ads: ₪{summary.total_marketing_from_csv:,.2f}\n"
            f"Net Profit: ₪{summary.total_net_profit:,.2f}\n"
            f"Net Margin: {summary.net_margin:.1%}\n"
        )
        send_pnl_report(args.email, subject, body, filepath)


if __name__ == "__main__":
    main()
