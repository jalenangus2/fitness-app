from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.bills import Bill, PaycheckConfig
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.bills import BillCreate, BillResponse, PaycheckConfigCreate, PaycheckConfigResponse

router = APIRouter()


@router.get("", response_model=list[BillResponse])
def list_bills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Bill).filter(Bill.user_id == current_user.id).order_by(Bill.due_day).all()


@router.post("", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
def create_bill(data: BillCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not 1 <= data.due_day <= 31:
        raise HTTPException(status_code=400, detail="due_day must be between 1 and 31")
    bill = Bill(user_id=current_user.id, **data.model_dump())
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return bill


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bill(bill_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bill = db.query(Bill).filter(Bill.id == bill_id, Bill.user_id == current_user.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    db.delete(bill)
    db.commit()


@router.get("/paycheck", response_model=PaycheckConfigResponse | None)
def get_paycheck(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(PaycheckConfig).filter(PaycheckConfig.user_id == current_user.id).first()


@router.post("/paycheck", response_model=PaycheckConfigResponse)
def upsert_paycheck(data: PaycheckConfigCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(PaycheckConfig).filter(PaycheckConfig.user_id == current_user.id).first()
    if config:
        for k, v in data.model_dump().items():
            setattr(config, k, v)
    else:
        config = PaycheckConfig(user_id=current_user.id, **data.model_dump())
        db.add(config)
    db.commit()
    db.refresh(config)
    return config
