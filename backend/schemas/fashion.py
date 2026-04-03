from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date


class FashionAlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    release_id: int
    alert_days_before: int
    alert_date: date
    notified: bool


class FashionAlertCreate(BaseModel):
    alert_days_before: int = 1


class FashionReleaseBase(BaseModel):
    brand: str
    name: str
    category: str
    release_date: date
    price_cents: Optional[int] = None
    colorway: Optional[str] = None
    sku: Optional[str] = None
    image_url: Optional[str] = None
    retailer_url: Optional[str] = None
    notes: Optional[str] = None


class FashionReleaseCreate(FashionReleaseBase):
    pass


class FashionReleaseUpdate(BaseModel):
    brand: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    release_date: Optional[date] = None
    price_cents: Optional[int] = None
    colorway: Optional[str] = None
    sku: Optional[str] = None
    image_url: Optional[str] = None
    retailer_url: Optional[str] = None
    notes: Optional[str] = None


class FashionReleaseResponse(FashionReleaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    alerts: list[FashionAlertResponse] = []
