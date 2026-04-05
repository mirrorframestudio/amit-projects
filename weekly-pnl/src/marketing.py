"""
Load weekly marketing spend.

Priority order:
1. Meta Ads invoices from Gmail (automatic)
2. Meta invoice CSVs from local folder (./inputs/meta_invoices/)
3. Manual marketing_spend.csv (fallback)
"""
import logging
import os
from datetime import date
from typing import Optional, Tuple

import pandas as pd

from .settings import SETTINGS

logger = logging.getLogger(__name__)


def load_marketing_spend(
    week_start: date,
    week_end: date,
    csv_path: Optional[str] = None,
) -> Tuple[float, bool, str]:
    """
    Load marketing spend for a specific week.

    Returns:
        (spend_usd, found, source) — spend amount, whether found, and source description.
    """
    # --- 1. Try Meta Gmail ---
    try:
        from .meta_gmail import fetch_meta_spend_from_gmail

        spend, found = fetch_meta_spend_from_gmail(week_start, week_end)
        if found:
            logger.info(f"Marketing from Gmail Meta invoices: ${spend:.2f}")
            return spend, True, "Gmail Meta Ads"
        logger.info("No Meta spend found in Gmail, trying local folder...")
    except Exception as e:
        logger.warning(f"Gmail fetch failed ({e}), trying local folder...")

    # --- 2. Try local Meta invoice CSVs ---
    try:
        from .meta_gmail import load_meta_invoices_from_folder

        spend, found = load_meta_invoices_from_folder(week_start, week_end)
        if found:
            logger.info(f"Marketing from local Meta CSVs: ${spend:.2f}")
            return spend, True, "Meta CSV (local)"
    except Exception as e:
        logger.warning(f"Local Meta CSV failed: {e}")

    # --- 3. Fallback: manual marketing_spend.csv ---
    return _load_from_manual_csv(week_start, week_end, csv_path)


def _load_from_manual_csv(
    week_start: date,
    week_end: date,
    csv_path: Optional[str] = None,
) -> Tuple[float, bool, str]:
    """Fallback: read from manual marketing_spend.csv."""
    path = csv_path or SETTINGS.MARKETING_CSV_PATH
    if not os.path.isfile(path):
        logger.warning(f"Marketing CSV not found at {path}")
        return 0.0, False, "none"

    try:
        df = pd.read_csv(path, parse_dates=["week_start", "week_end"])
    except Exception as e:
        logger.error(f"Failed to read marketing CSV: {e}")
        return 0.0, False, "none"

    ws = pd.Timestamp(week_start)
    we = pd.Timestamp(week_end)

    match = df[(df["week_start"] == ws) & (df["week_end"] == we)]
    if match.empty:
        logger.warning(f"No marketing row for {week_start} – {week_end}")
        return 0.0, False, "none"

    spend = float(match.iloc[0]["spend_usd"])
    logger.info(f"Marketing from manual CSV: ${spend:.2f}")
    return spend, True, "Manual CSV"
