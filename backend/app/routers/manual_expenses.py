from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/manual-expenses", tags=["manual-expenses"])


@router.get("/", response_model=List[schemas.ManualExpense])
def get_expenses(category: str = None, db: Session = Depends(get_db)):
    query = db.query(models.ManualExpense)
    if category:
        query = query.filter(models.ManualExpense.category == category)
    return query.order_by(models.ManualExpense.start_date.desc()).all()


@router.get("/{expense_id}", response_model=schemas.ManualExpense)
def get_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.query(models.ManualExpense).filter(models.ManualExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense


@router.post("/", response_model=schemas.ManualExpense)
def create_expense(expense: schemas.ManualExpenseCreate, db: Session = Depends(get_db)):
    db_expense = models.ManualExpense(**expense.model_dump())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.put("/{expense_id}", response_model=schemas.ManualExpense)
def update_expense(expense_id: int, expense: schemas.ManualExpenseCreate, db: Session = Depends(get_db)):
    db_expense = db.query(models.ManualExpense).filter(models.ManualExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for key, value in expense.model_dump().items():
        setattr(db_expense, key, value)
    db.commit()
    db.refresh(db_expense)
    return db_expense


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    db_expense = db.query(models.ManualExpense).filter(models.ManualExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(db_expense)
    db.commit()
    return {"ok": True}
