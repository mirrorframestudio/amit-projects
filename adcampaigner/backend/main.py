"""
AdCampaigner — FastAPI application entry point.
"""
import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware

from .database import create_tables
from .routers import auth, analysis, creative, dashboard
from . import config

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)-7s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# App
app = FastAPI(
    title="AdCampaigner",
    description="AI-Powered Ad Campaign Analyzer for Small Businesses",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files & templates
static_dir = Path(__file__).parent / "static"
templates_dir = Path(__file__).parent.parent / "templates"

app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
templates = Jinja2Templates(directory=str(templates_dir))

# Routers
app.include_router(auth.router)
app.include_router(analysis.router)
app.include_router(creative.router)
app.include_router(dashboard.router)


@app.on_event("startup")
def on_startup():
    logger.info("Creating database tables...")
    create_tables()
    logger.info("AdCampaigner ready!")


@app.get("/")
async def index(request: Request):
    """Serve the main SPA page."""
    return templates.TemplateResponse("index.html", {
        "request": request,
        "fb_app_id": config.FB_APP_ID,
    })


@app.get("/health")
def health():
    return {"status": "ok", "app": "AdCampaigner", "version": "1.0.0"}
