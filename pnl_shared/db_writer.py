"""
pnl_shared.db_writer — writes daily pipeline results to PostgreSQL.

Saves one snapshot row per day for both the ads pipeline and the P&L pipeline.
Existing rows (same report_date) are updated via upsert so re-runs don't duplicate.

Requires psycopg2:
    pip install psycopg2-binary --break-system-packages

Connection is read from environment variables:
    DB_HOST     (default: localhost)
    DB_PORT     (default: 5432)
    DB_NAME     (default: ads_dashboard)
    DB_USER     (default: postgres)
    DB_PASSWORD (default: postgres)

Usage:
    from pnl_shared.db_writer import save_ads_snapshot, save_pnl_snapshot
    save_ads_snapshot(report_date, campaign_analysis, ad_analysis, trend_data, ...)
    save_pnl_snapshot(report_date, orders)
"""
from __future__ import annotations

import logging
import os
from datetime import date
from typing import Any

logger = logging.getLogger(__name__)


def _get_conn():
    """Open a psycopg2 connection using env vars. Returns None if unavailable."""
    try:
        import psycopg2
        return psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", 5432)),
            dbname=os.getenv("DB_NAME", "ads_dashboard"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "postgres"),
            connect_timeout=5,
        )
    except ImportError:
        logger.warning("psycopg2 not installed — skipping DB write (pip install psycopg2-binary)")
        return None
    except Exception as exc:
        logger.warning("DB connection failed (skipping snapshot): %s", exc)
        return None


def save_ads_snapshot(
    report_date: date,
    campaign_analysis: dict[str, Any],
    ad_analysis: dict[str, Any],
    trend_data: dict[str, Any],
    usd_to_ils: float = 3.2,
    drive_link: str | None = None,
    fatigue_data: list | None = None,
    recommendations: list | None = None,
) -> bool:
    """
    Upsert one row into ads_daily_snapshot for report_date.

    Args:
        report_date:       The day being reported (usually yesterday).
        campaign_analysis: Output of analyze_campaigns().
        ad_analysis:       Output of analyze_ads().
        trend_data:        Output of analyze_trends() — used to extract yesterday's row.
        usd_to_ils:        Exchange rate used in this run.
        drive_link:        Google Drive URL for the Excel report.
        fatigue_data:      List of fatigued ads (from detect_creative_fatigue).
        recommendations:   List of recommendation dicts.

    Returns:
        True on success, False on failure (non-fatal).
    """
    conn = _get_conn()
    if conn is None:
        return False

    try:
        # Pull yesterday's row from trend data if available
        date_str = report_date.isoformat()
        daily_rows = trend_data.get("daily", [])
        day_data = next((d for d in daily_rows if d.get("date") == date_str), {})

        spend         = float(day_data.get("spend") or campaign_analysis.get("total_spend", 0))
        impressions   = int(day_data.get("impressions") or campaign_analysis.get("total_impressions", 0))
        clicks        = int(day_data.get("clicks") or campaign_analysis.get("total_clicks", 0))
        reach         = int(day_data.get("reach", 0))
        atc           = int(day_data.get("add_to_cart") or campaign_analysis.get("total_atc", 0))
        checkout      = int(day_data.get("initiate_checkout", 0))
        purchases     = int(day_data.get("purchases") or campaign_analysis.get("total_purchases", 0))
        revenue       = float(day_data.get("purchase_value") or campaign_analysis.get("total_purchase_value", 0))
        roas          = float(day_data.get("roas") or campaign_analysis.get("total_roas", 0))
        ctr           = float(day_data.get("ctr") or campaign_analysis.get("avg_ctr", 0))
        cpc           = float(day_data.get("cpc", 0))
        cpp           = spend / purchases if purchases > 0 else 0

        active_campaigns = len([c for c in campaign_analysis.get("campaigns", []) if c.get("spend", 0) > 0])
        active_ads       = ad_analysis.get("active_ads", 0)
        fatigued         = len(fatigue_data) if fatigue_data else 0
        rec_count        = len(recommendations) if recommendations else 0

        sql = """
            INSERT INTO ads_daily_snapshot (
                report_date, total_spend, total_impressions, total_clicks, total_reach,
                total_atc, total_checkout, total_purchases, total_revenue,
                roas, ctr, cpc, cost_per_purchase,
                usd_to_ils, active_campaigns, active_ads, fatigued_ads,
                recommendations_count, drive_link
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (report_date) DO UPDATE SET
                total_spend           = EXCLUDED.total_spend,
                total_impressions     = EXCLUDED.total_impressions,
                total_clicks          = EXCLUDED.total_clicks,
                total_reach           = EXCLUDED.total_reach,
                total_atc             = EXCLUDED.total_atc,
                total_checkout        = EXCLUDED.total_checkout,
                total_purchases       = EXCLUDED.total_purchases,
                total_revenue         = EXCLUDED.total_revenue,
                roas                  = EXCLUDED.roas,
                ctr                   = EXCLUDED.ctr,
                cpc                   = EXCLUDED.cpc,
                cost_per_purchase     = EXCLUDED.cost_per_purchase,
                usd_to_ils            = EXCLUDED.usd_to_ils,
                active_campaigns      = EXCLUDED.active_campaigns,
                active_ads            = EXCLUDED.active_ads,
                fatigued_ads          = EXCLUDED.fatigued_ads,
                recommendations_count = EXCLUDED.recommendations_count,
                drive_link            = EXCLUDED.drive_link;
        """
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql, (
                    report_date, spend, impressions, clicks, reach,
                    atc, checkout, purchases, revenue,
                    roas, ctr, cpc, cpp,
                    usd_to_ils, active_campaigns, active_ads, fatigued, rec_count, drive_link,
                ))
        logger.info("ads_daily_snapshot saved for %s (spend=%.0f, purchases=%d, roas=%.2f)",
                    report_date, spend, purchases, roas)
        return True

    except Exception:
        logger.exception("Failed to save ads_daily_snapshot for %s", report_date)
        return False
    finally:
        conn.close()


def save_pnl_snapshot(
    report_date: date,
    orders: list[dict[str, Any]],
    ad_spend: float = 0.0,
    usd_to_ils: float = 3.2,
) -> bool:
    """
    Upsert one row into pnl_daily_snapshot for report_date.

    Args:
        report_date: The day being reported.
        orders:      List of computed order dicts (output of compute_all).
        ad_spend:    Total ad spend for that day (from fb-ads-analyzer data).
        usd_to_ils:  Exchange rate used.

    Returns:
        True on success, False on failure (non-fatal).
    """
    conn = _get_conn()
    if conn is None:
        return False

    try:
        # Filter orders for this specific date
        date_orders = [
            o for o in orders
            if o.get("order_date") and str(o["order_date"]) == report_date.isoformat()
        ]

        if not date_orders:
            logger.info("pnl_daily_snapshot: no orders for %s, saving zeros", report_date)

        total_orders    = len(date_orders)
        total_revenue   = sum(float(o.get("order_price") or 0) for o in date_orders)
        total_vat       = sum(float(o.get("vat") or 0) for o in date_orders)
        total_cogs      = sum(float(o.get("cogs") or 0) for o in date_orders)
        total_shipping  = sum(float(o.get("shipping") or 0) for o in date_orders)
        total_fee       = sum(float(o.get("payment_fee") or 0) for o in date_orders)
        total_profit    = sum(float(o.get("profit") or 0) for o in date_orders)
        avg_margin      = total_profit / total_revenue if total_revenue > 0 else 0.0
        net_after_ads   = total_profit - ad_spend

        sql = """
            INSERT INTO pnl_daily_snapshot (
                report_date, total_orders, total_revenue, total_vat,
                total_cogs, total_shipping, total_payment_fee, total_profit,
                avg_margin, ad_spend, net_profit_after_ads, usd_to_ils
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (report_date) DO UPDATE SET
                total_orders          = EXCLUDED.total_orders,
                total_revenue         = EXCLUDED.total_revenue,
                total_vat             = EXCLUDED.total_vat,
                total_cogs            = EXCLUDED.total_cogs,
                total_shipping        = EXCLUDED.total_shipping,
                total_payment_fee     = EXCLUDED.total_payment_fee,
                total_profit          = EXCLUDED.total_profit,
                avg_margin            = EXCLUDED.avg_margin,
                ad_spend              = EXCLUDED.ad_spend,
                net_profit_after_ads  = EXCLUDED.net_profit_after_ads,
                usd_to_ils            = EXCLUDED.usd_to_ils;
        """
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql, (
                    report_date, total_orders, total_revenue, total_vat,
                    total_cogs, total_shipping, total_fee, total_profit,
                    avg_margin, ad_spend, net_after_ads, usd_to_ils,
                ))
        logger.info(
            "pnl_daily_snapshot saved for %s (%d orders, revenue=₪%.0f, profit=₪%.0f)",
            report_date, total_orders, total_revenue, total_profit,
        )
        return True

    except Exception:
        logger.exception("Failed to save pnl_daily_snapshot for %s", report_date)
        return False
    finally:
        conn.close()
