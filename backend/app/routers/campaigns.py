from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("/", response_model=List[schemas.Campaign])
def get_campaigns(db: Session = Depends(get_db)):
    return db.query(models.Campaign).all()


@router.get("/{campaign_id}", response_model=schemas.Campaign)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.post("/", response_model=schemas.Campaign)
def create_campaign(campaign: schemas.CampaignCreate, db: Session = Depends(get_db)):
    db_campaign = models.Campaign(**campaign.model_dump())
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign
