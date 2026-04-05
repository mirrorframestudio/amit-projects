"""Central configuration loaded from .env"""
import os
from pathlib import Path
from dotenv import load_dotenv

_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env)

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./adcampaigner.db")

# Facebook OAuth
FB_APP_ID = os.getenv("FB_APP_ID", "")
FB_APP_SECRET = os.getenv("FB_APP_SECRET", "")

# Claude API
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Server
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# JWT
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
ALGORITHM = "HS256"
