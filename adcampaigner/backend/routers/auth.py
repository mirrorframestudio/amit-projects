"""Auth router — Facebook Login + JWT + Business Research."""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db, SessionLocal
from ..models import User
from ..schemas import TokenResponse, FacebookLoginRequest, SetAdAccountRequest, OnboardingRequest
from ..auth import create_access_token, get_current_user
from ..services import fb_oauth, fb_client, business_intel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _run_business_research(user_id: int):
    """Background task: research the business and save profile."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return

        logger.info("Starting business research for %s...", user.name)
        profile = business_intel.research_business(
            user.fb_access_token,
            user.ad_account_id or "",
        )

        user.business_profile = profile

        # Set business name from page info
        page_name = profile.get("page_info", {}).get("page_name", "")
        if page_name and not user.business_name:
            user.business_name = page_name

        db.commit()
        logger.info("Business research complete for %s: %s", user.name, profile.get("status"))
    except Exception as e:
        logger.exception("Business research failed for user %d", user_id)
    finally:
        db.close()


@router.post("/facebook-login", response_model=TokenResponse)
def facebook_login(
    req: FacebookLoginRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Facebook Login flow:
    1. Receive short-lived token from JS SDK
    2. Exchange for long-lived token
    3. Get user info
    4. Create/update user in DB
    5. Kick off business research in background
    6. Return JWT
    """
    try:
        token_data = fb_oauth.exchange_for_long_lived_token(req.fb_access_token)
        long_token = token_data["access_token"]
        expires = fb_oauth.calculate_token_expiry(token_data["expires_in"])
        user_info = fb_oauth.get_fb_user_info(long_token)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"שגיאת התחברות לפייסבוק: {e}")

    # Find or create user
    user = db.query(User).filter(User.fb_user_id == user_info["fb_user_id"]).first()
    is_new = user is None

    if user:
        user.fb_access_token = long_token
        user.fb_token_expires = expires
        user.name = user_info["name"]
        user.email = user_info.get("email", user.email)
        user.last_login = datetime.now(timezone.utc)
    else:
        user = User(
            fb_user_id=user_info["fb_user_id"],
            name=user_info["name"],
            email=user_info.get("email", ""),
            fb_access_token=long_token,
            fb_token_expires=expires,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Auto-research business on first login or if no profile yet
    if is_new or not user.business_profile:
        background_tasks.add_task(_run_business_research, user.id)

    jwt_token = create_access_token(user.id)

    return TokenResponse(
        access_token=jwt_token,
        user_name=user.name,
        ad_account_id=user.ad_account_id or "",
    )


@router.get("/ad-accounts")
def list_ad_accounts(user: User = Depends(get_current_user)):
    """List ad accounts the user has access to."""
    try:
        accounts = fb_client.get_ad_accounts(user.fb_access_token)
        return {"accounts": accounts}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"שגיאה בטעינת חשבונות: {e}")


@router.post("/set-ad-account")
def set_ad_account(
    req: SetAdAccountRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set the active ad account and re-run business research with catalog data."""
    user.ad_account_id = req.ad_account_id
    db.commit()

    # Re-research with ad account context (catalog, ad creatives)
    background_tasks.add_task(_run_business_research, user.id)

    return {"status": "ok", "ad_account_id": req.ad_account_id}


@router.post("/onboarding")
def save_onboarding(
    req: OnboardingRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save business info from onboarding + trigger AI research."""
    user.business_name = req.business_name

    # Build profile from user input
    user_input = {
        "business_name": req.business_name,
        "description": req.description,
        "website": req.website,
        "products": req.products,
        "audience": req.audience,
        "usp": req.usp,
    }

    # Start with user-provided data
    profile = user.business_profile or {}
    profile["user_input"] = user_input
    profile["status"] = "researching"
    user.business_profile = profile

    db.commit()

    # Run AI research in background (scrape website + AI analysis)
    background_tasks.add_task(_run_onboarding_research, user.id)

    return {"status": "ok", "message": "פרטי העסק נשמרו, מריץ מחקר ברקע"}


def _run_onboarding_research(user_id: int):
    """Background: scrape website + AI analysis based on user input."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.business_profile:
            return

        profile = user.business_profile
        user_input = profile.get("user_input", {})

        # Scrape website if provided
        website_data = {}
        if user_input.get("website"):
            website_data = business_intel.scrape_website(user_input["website"])
            profile["website"] = website_data

        # Fetch ad creatives for additional context
        ad_creatives = []
        if user.ad_account_id:
            ad_creatives = business_intel.fetch_recent_ads_creative(
                user.fb_access_token, user.ad_account_id
            )

        # Build AI profile using user input + scraped data
        profile_result = business_intel.build_business_profile_from_input(
            user_input=user_input,
            website_data=website_data,
            ad_creatives=ad_creatives,
        )

        profile["ai_profile"] = profile_result.get("ai_profile", "")
        profile["status"] = "complete"
        user.business_profile = profile

        db.commit()
        logger.info("Onboarding research complete for %s", user.business_name)
    except Exception as e:
        logger.exception("Onboarding research failed for user %d", user_id)
    finally:
        db.close()


@router.get("/business-profile")
def get_business_profile(user: User = Depends(get_current_user)):
    """Get the business research profile."""
    if not user.business_profile:
        return {"status": "pending", "profile": None}

    return {
        "status": user.business_profile.get("status", "unknown"),
        "profile": user.business_profile,
    }


@router.post("/refresh-research")
def refresh_research(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    """Manually trigger a fresh business research."""
    background_tasks.add_task(_run_business_research, user.id)
    return {"status": "started", "message": "מחקר עסקי התחיל ברקע"}


@router.get("/me")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile."""
    from ..models import AnalysisRun
    total_runs = db.query(AnalysisRun).filter(AnalysisRun.user_id == user.id).count()

    result = {
        "name": user.name,
        "email": user.email,
        "business_name": user.business_name,
        "ad_account_id": user.ad_account_id or "",
        "total_runs": total_runs,
        "has_business_profile": bool(user.business_profile),
    }

    # Include AI profile summary if available
    if user.business_profile and user.business_profile.get("ai_profile"):
        result["business_summary"] = user.business_profile["ai_profile"][:500]

    return result
