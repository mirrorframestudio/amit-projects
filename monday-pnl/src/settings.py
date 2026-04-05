"""
Centralized settings loaded from .env file.
All P&L parameters are defined here and also written to the Excel Settings sheet.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root (one level up from src/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)


def _float(key: str, default: float) -> float:
    val = os.getenv(key)
    if val is None or val.strip() == "":
        return default
    return float(val)


def _str(key: str, default: str) -> str:
    return os.getenv(key, default).strip()


# ── Monday.com API ──────────────────────────────────────────────
MONDAY_API_TOKEN: str = _str("MONDAY_API_TOKEN", "")
MONDAY_BOARD_ID: str = _str("MONDAY_BOARD_ID", "")
MONDAY_API_URL: str = "https://api.monday.com/v2"

# ── COGS per item ──────────────────────────────────────────────
COST_SHIRT: float = _float("COST_SHIRT", 11.0)
COST_RETRO: float = _float("COST_RETRO", 13.0)
COST_PLAYER_VERSION: float = _float("COST_PLAYER_VERSION", 13.0)
COST_NAME_NUMBER: float = _float("COST_NAME_NUMBER", 2.0)
COST_PANTS: float = _float("COST_PANTS", 5.0)
COST_LONG_SHIRT: float = _float("COST_LONG_SHIRT", 2.0)
COST_SOCKS: float = _float("COST_SOCKS", 0.0)
COST_PATCH: float = _float("COST_PATCH", 0.0)
COST_HOME_DELIVERY: float = _float("COST_HOME_DELIVERY", 4.0)

# ── P&L Parameters ─────────────────────────────────────────────
VAT_RATE: float = _float("VAT_RATE", 0.18)
PAYMENT_FEE_RATE: float = _float("PAYMENT_FEE_RATE", 0.014)
PAYMENT_FEE_FIXED: float = _float("PAYMENT_FEE_FIXED", 0.0)
DEFAULT_AD_COST: float = _float("DEFAULT_AD_COST", 0.0)
MODE: str = _str("MODE", "INCLUDES_VAT")
CURRENCY: str = _str("CURRENCY", "ILS")
USD_TO_ILS: float = _float("USD_TO_ILS", 3.2)

# ── Output ──────────────────────────────────────────────────────
OUTPUT_FILE: str = _str("OUTPUT_FILE", "P&L.xlsx")

# ── Schedule ────────────────────────────────────────────────────
SCHEDULE_CRON: str = _str("SCHEDULE_CRON", "0 9 * * *")
SCHEDULE_TZ: str = _str("SCHEDULE_TZ", "Asia/Jerusalem")

# ── Facebook Ads API ──────────────────────────────────────────
FB_AD_ACCOUNT_ID: str = _str("FB_AD_ACCOUNT_ID", "")
FB_ACCESS_TOKEN: str = _str("FB_ACCESS_TOKEN", "")

# ── WhatsApp Business Cloud API ───────────────────────────────
WHATSAPP_PHONE_NUMBER_ID: str = _str("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_BUSINESS_ACCOUNT_ID: str = _str("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
WHATSAPP_ACCESS_TOKEN: str = _str("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_TO: str = _str("WHATSAPP_TO", "")

# ── Logging ─────────────────────────────────────────────────────
LOG_LEVEL: str = _str("LOG_LEVEL", "INFO")


def as_dict() -> dict:
    """Return all settings as a dict for the Excel Settings sheet."""
    return {
        "MONDAY_BOARD_ID": MONDAY_BOARD_ID,
        "COST_SHIRT": COST_SHIRT,
        "COST_RETRO": COST_RETRO,
        "COST_PLAYER_VERSION": COST_PLAYER_VERSION,
        "COST_NAME_NUMBER": COST_NAME_NUMBER,
        "COST_PANTS": COST_PANTS,
        "COST_LONG_SHIRT": COST_LONG_SHIRT,
        "COST_SOCKS": COST_SOCKS,
        "COST_PATCH": COST_PATCH,
        "COST_HOME_DELIVERY": COST_HOME_DELIVERY,
        "VAT_RATE": VAT_RATE,
        "PAYMENT_FEE_RATE": PAYMENT_FEE_RATE,
        "PAYMENT_FEE_FIXED": PAYMENT_FEE_FIXED,
        "DEFAULT_AD_COST": DEFAULT_AD_COST,
        "MODE": MODE,
        "CURRENCY": CURRENCY,
    }
