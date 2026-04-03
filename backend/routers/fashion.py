"""Fashion releases router: CRUD + alerts."""
from datetime import datetime, timedelta, date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.fashion import FashionAlert, FashionRelease
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.fashion import (
    FashionAlertCreate,
    FashionAlertResponse,
    FashionReleaseCreate,
    FashionReleaseResponse,
    FashionReleaseUpdate,
)

router = APIRouter()


@router.get("/", response_model=list[FashionReleaseResponse])
def list_releases(
    category: str = Query(None),
    upcoming: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(FashionRelease).filter(FashionRelease.user_id == current_user.id)
    if category:
        query = query.filter(FashionRelease.category == category)
    if upcoming:
        query = query.filter(FashionRelease.release_date >= date.today())
    releases = query.order_by(FashionRelease.release_date.asc()).all()
    return [_serialize(r) for r in releases]


@router.post("/", response_model=FashionReleaseResponse, status_code=status.HTTP_201_CREATED)
def create_release(
    data: FashionReleaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = FashionRelease(**data.model_dump(), user_id=current_user.id)
    db.add(release)
    db.commit()
    db.refresh(release)
    return _serialize(release)


@router.get("/{release_id}", response_model=FashionReleaseResponse)
def get_release(
    release_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = _get_or_404(db, release_id, current_user.id)
    return _serialize(release)


@router.put("/{release_id}", response_model=FashionReleaseResponse)
def update_release(
    release_id: int,
    data: FashionReleaseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = _get_or_404(db, release_id, current_user.id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(release, field, value)
    release.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(release)
    return _serialize(release)


@router.delete("/{release_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_release(
    release_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = _get_or_404(db, release_id, current_user.id)
    db.delete(release)
    db.commit()


@router.post("/{release_id}/alerts", response_model=FashionAlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    release_id: int,
    data: FashionAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    release = _get_or_404(db, release_id, current_user.id)
    alert_date = release.release_date - timedelta(days=data.alert_days_before)
    alert = FashionAlert(
        release_id=release_id,
        user_id=current_user.id,
        alert_days_before=data.alert_days_before,
        alert_date=alert_date,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return FashionAlertResponse(
        id=alert.id,
        release_id=alert.release_id,
        alert_days_before=alert.alert_days_before,
        alert_date=alert.alert_date,
        notified=alert.notified,
    )


@router.delete("/{release_id}/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(
    release_id: int,
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(FashionAlert).filter(
        FashionAlert.id == alert_id,
        FashionAlert.release_id == release_id,
        FashionAlert.user_id == current_user.id,
    ).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    db.delete(alert)
    db.commit()


# --- helpers ---

def _get_or_404(db: Session, release_id: int, user_id: int) -> FashionRelease:
    release = db.query(FashionRelease).filter(
        FashionRelease.id == release_id,
        FashionRelease.user_id == user_id,
    ).first()
    if not release:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Release not found")
    return release


def _serialize(release: FashionRelease) -> FashionReleaseResponse:
    return FashionReleaseResponse(
        id=release.id,
        brand=release.brand,
        name=release.name,
        category=release.category,
        release_date=release.release_date,
        price_cents=release.price_cents,
        colorway=release.colorway,
        sku=release.sku,
        image_url=release.image_url,
        retailer_url=release.retailer_url,
        notes=release.notes,
        created_at=release.created_at,
        alerts=[
            FashionAlertResponse(
                id=a.id,
                release_id=a.release_id,
                alert_days_before=a.alert_days_before,
                alert_date=a.alert_date,
                notified=a.notified,
            )
            for a in release.alerts
        ],
    )
