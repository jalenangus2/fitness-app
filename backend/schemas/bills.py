from pydantic import BaseModel, ConfigDict
from datetime import datetime, date


class BillCreate(BaseModel):
    name: str
    amount_cents: int = 0
    due_day: int  # 1-31


class BillResponse(BillCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    created_at: datetime


class PaycheckConfigCreate(BaseModel):
    reference_date: date
    frequency_days: int = 14
    amount_cents: int = 0


class PaycheckConfigResponse(PaycheckConfigCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
