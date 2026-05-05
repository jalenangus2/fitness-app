"""In-app notification system."""
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models.notification import Notification
from ..models.user import User
from ..routers.auth import get_current_user

router = APIRouter()


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: Optional[str] = None
    type: str
    read: bool
    source_type: Optional[str] = None
    source_id: Optional[int] = None
    created_at: datetime


def _generate_notifications(user_id: int, db: Session) -> None:
    """Lazily create notifications for upcoming events (runs on each list request)."""
    tomorrow = date.today() + timedelta(days=1)
    today = date.today()

    # Fashion releases tomorrow or today
    try:
        from ..models.fashion import FashionRelease
        upcoming = db.query(FashionRelease).filter(
            FashionRelease.user_id == user_id,
            FashionRelease.release_date.in_([tomorrow, today]),
        ).all()
        for release in upcoming:
            already = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.source_type == "fashion",
                Notification.source_id == release.id,
            ).first()
            if not already:
                when = "today" if release.release_date == today else "tomorrow"
                db.add(Notification(
                    user_id=user_id,
                    title=f"Drop {when}: {release.brand} {release.name}",
                    body=f"Releasing {release.release_date.strftime('%b %d')}",
                    type="reminder",
                    source_type="fashion",
                    source_id=release.id,
                ))
    except Exception:
        pass

    # Tasks due today or overdue
    try:
        from ..models.task import Task
        due_tasks = db.query(Task).filter(
            Task.user_id == user_id,
            Task.completed == False,
            Task.due_date <= today,
        ).all()
        for task in due_tasks:
            already = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.source_type == "task",
                Notification.source_id == task.id,
            ).first()
            if not already:
                overdue = task.due_date < today
                db.add(Notification(
                    user_id=user_id,
                    title=f"{'Overdue' if overdue else 'Due today'}: {task.title}",
                    type="alert" if overdue else "reminder",
                    source_type="task",
                    source_id=task.id,
                ))
    except Exception:
        pass

    db.commit()


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _generate_notifications(current_user.id, db)
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/unread-count")
def unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _generate_notifications(current_user.id, db)
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).count()
    return {"count": count}


@router.patch("/{notif_id}/read")
def mark_read(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.read = True
        db.commit()
    return {"ok": True}


@router.patch("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).update({"read": True})
    db.commit()
    return {"ok": True}


@router.delete("/{notif_id}")
def delete_notification(notif_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(
        Notification.id == notif_id, Notification.user_id == current_user.id
    ).first()
    if notif:
        db.delete(notif)
        db.commit()
    return {"ok": True}
