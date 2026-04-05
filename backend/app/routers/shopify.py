from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from .. import models, schemas
from ..database import get_db
from ..services.shopify import get_config, sync_orders

router = APIRouter(prefix="/shopify", tags=["shopify"])


@router.get("/status")
def shopify_status(db: Session = Depends(get_db)):
    config = get_config()

    last_sync = db.query(models.ShopifySyncLog).order_by(
        models.ShopifySyncLog.id.desc()
    ).first()

    return {
        "is_configured": config["is_configured"],
        "store_url": config["store_url"] if config["is_configured"] else None,
        "last_sync": {
            "status": last_sync.status,
            "started_at": last_sync.started_at.isoformat() if last_sync.started_at else None,
            "finished_at": last_sync.finished_at.isoformat() if last_sync.finished_at else None,
            "orders_synced": last_sync.orders_synced,
            "error_message": last_sync.error_message,
        } if last_sync else None,
        "total_orders_in_db": db.query(models.ShopifyOrder).count(),
    }


@router.post("/sync")
def trigger_sync(
    since_date: Optional[date] = Query(None, description="Only sync orders created after this date"),
    db: Session = Depends(get_db),
):
    result = sync_orders(db, since_date=since_date)
    return {"ok": True, **result}


@router.get("/orders", response_model=list[schemas.ShopifyOrder])
def list_orders(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return db.query(models.ShopifyOrder).order_by(
        models.ShopifyOrder.created_at_shopify.desc()
    ).offset(skip).limit(limit).all()
