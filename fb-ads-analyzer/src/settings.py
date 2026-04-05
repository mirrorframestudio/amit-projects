"""Central settings loaded from .env"""
import os, pathlib
from dotenv import load_dotenv

_env = pathlib.Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env)

FB_AD_ACCOUNT_ID = os.getenv("FB_AD_ACCOUNT_ID", "")
FB_ACCESS_TOKEN = os.getenv("FB_ACCESS_TOKEN", "")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "reports")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# WhatsApp Business Cloud API
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_TO = os.getenv("WHATSAPP_TO", "")
WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")

# Google Drive
DRIVE_FOLDER = os.getenv("DRIVE_FOLDER", "OneZoneJersey Ads Reports")

# Schedule
SCHEDULE_CRON = os.getenv("SCHEDULE_CRON", "0 9 * * *")
SCHEDULE_TZ = os.getenv("SCHEDULE_TZ", "Asia/Jerusalem")

# WooCommerce REST API
WOO_URL = os.getenv("WOO_URL", "")
WOO_CONSUMER_KEY = os.getenv("WOO_CONSUMER_KEY", "")
WOO_CONSUMER_SECRET = os.getenv("WOO_CONSUMER_SECRET", "")
