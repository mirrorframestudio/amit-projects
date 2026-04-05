from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/product-costs", tags=["product-costs"])


@router.get("/", response_model=List[schemas.ProductCost])
def get_product_costs(db: Session = Depends(get_db)):
    return db.query(models.ProductCost).order_by(models.ProductCost.sku).all()


@router.get("/{cost_id}", response_model=schemas.ProductCost)
def get_product_cost(cost_id: int, db: Session = Depends(get_db)):
    cost = db.query(models.ProductCost).filter(models.ProductCost.id == cost_id).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Product cost not found")
    return cost


@router.post("/", response_model=schemas.ProductCost)
def create_product_cost(cost: schemas.ProductCostCreate, db: Session = Depends(get_db)):
    db_cost = models.ProductCost(**cost.model_dump())
    db.add(db_cost)
    db.commit()
    db.refresh(db_cost)
    return db_cost


@router.put("/{cost_id}", response_model=schemas.ProductCost)
def update_product_cost(cost_id: int, cost: schemas.ProductCostCreate, db: Session = Depends(get_db)):
    db_cost = db.query(models.ProductCost).filter(models.ProductCost.id == cost_id).first()
    if not db_cost:
        raise HTTPException(status_code=404, detail="Product cost not found")
    for key, value in cost.model_dump().items():
        setattr(db_cost, key, value)
    db.commit()
    db.refresh(db_cost)
    return db_cost


@router.delete("/{cost_id}")
def delete_product_cost(cost_id: int, db: Session = Depends(get_db)):
    db_cost = db.query(models.ProductCost).filter(models.ProductCost.id == cost_id).first()
    if not db_cost:
        raise HTTPException(status_code=404, detail="Product cost not found")
    db.delete(db_cost)
    db.commit()
    return {"ok": True}
