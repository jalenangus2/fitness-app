"""Schedule router: events and tasks CRUD."""
import calendar as cal_module
from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.schedule import Event, Task
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.schedule import (
    EventCreate,
    EventResponse,
    EventUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)

router = APIRouter()


# ─── Recurrence helpers ───────────────────────────────────────────────────────

def _add_recurrence_delta(dt: datetime, rule: str) -> datetime:
    if rule == 'DAILY':
        return dt + timedelta(days=1)
    elif rule == 'WEEKLY':
        return dt + timedelta(weeks=1)
    elif rule == 'MONTHLY':
        month = dt.month + 1
        year = dt.year + (1 if month > 12 else 0)
        month = month if month <= 12 else month - 12
        day = min(dt.day, cal_module.monthrange(year, month)[1])
        return dt.replace(year=year, month=month, day=day)
    elif rule == 'YEARLY':
        return dt.replace(year=dt.year + 1)
    return dt


def _next_date(current: date, rule: str) -> date:
    if rule == 'DAILY':
        return current + timedelta(days=1)
    elif rule == 'WEEKLY':
        return current + timedelta(weeks=1)
    elif rule == 'MONTHLY':
        month = current.month + 1
        year = current.year + (1 if month > 12 else 0)
        month = month if month <= 12 else month - 12
        day = min(current.day, cal_module.monthrange(year, month)[1])
        return current.replace(year=year, month=month, day=day)
    elif rule == 'YEARLY':
        return current.replace(year=current.year + 1)
    return current


def _expand_event(event: Event, start_dt: datetime, end_dt: datetime) -> list[EventResponse]:
    rule = event.recurrence_rule
    if not rule or event.start_datetime > end_dt:
        return []

    duration: Optional[timedelta] = None
    if event.end_datetime and event.start_datetime:
        duration = event.end_datetime - event.start_datetime

    current = event.start_datetime

    # Advance to first occurrence >= start_dt
    advances = 0
    while current < start_dt and advances < 2000:
        current = _add_recurrence_delta(current, rule)
        advances += 1

    occurrences: list[EventResponse] = []
    count = 0
    while current <= end_dt and count < 200:
        occurrences.append(EventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            start_datetime=current,
            end_datetime=current + duration if duration else None,
            all_day=event.all_day,
            color=event.color,
            recurrence_rule=event.recurrence_rule,
            created_at=event.created_at,
            is_recurring_instance=True,
        ))
        current = _add_recurrence_delta(current, rule)
        count += 1

    return occurrences


# ─── Events ──────────────────────────────────────────────────────────────────

@router.get("/events", response_model=list[EventResponse])
def list_events(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    start_dt: Optional[datetime] = None
    end_dt: Optional[datetime] = None

    if start:
        try:
            start_dt = datetime.fromisoformat(start)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid start datetime format.")

    if end:
        try:
            end_dt = datetime.fromisoformat(end)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid end datetime format.")

    base_query = db.query(Event).filter(Event.user_id == current_user.id)

    if start_dt and end_dt:
        # Non-recurring: filter by date range
        one_time = base_query.filter(
            Event.recurrence_rule.is_(None),
            Event.start_datetime >= start_dt,
            Event.start_datetime <= end_dt,
        ).all()
        # Recurring: fetch all (to expand occurrences within range)
        recurring = base_query.filter(Event.recurrence_rule.isnot(None)).all()
    else:
        one_time = base_query.filter(Event.recurrence_rule.is_(None)).order_by(Event.start_datetime).all()
        recurring = base_query.filter(Event.recurrence_rule.isnot(None)).order_by(Event.start_datetime).all()

    result: list[EventResponse] = [EventResponse.model_validate(e) for e in one_time]

    for ev in recurring:
        if start_dt and end_dt:
            result.extend(_expand_event(ev, start_dt, end_dt))
        else:
            result.append(EventResponse.model_validate(ev))

    result.sort(key=lambda e: e.start_datetime)
    return result


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = Event(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        all_day=data.all_day,
        color=data.color,
        recurrence_rule=data.recurrence_rule,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventResponse.model_validate(event)


@router.get("/events/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return EventResponse.model_validate(event)


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    event.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    return EventResponse.model_validate(event)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id, Event.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()


# ─── Fashion sync ─────────────────────────────────────────────────────────────

@router.post("/fashion-sync")
def fashion_sync(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ..models.fashion import FashionRelease

    today = date.today()
    releases = db.query(FashionRelease).filter(
        FashionRelease.user_id == current_user.id,
        FashionRelease.release_date >= today,
    ).all()

    created = 0
    for release in releases:
        title = f"🛍 {release.brand} – {release.name}"
        release_dt = datetime.combine(release.release_date, datetime.min.time())
        existing = db.query(Event).filter(
            Event.user_id == current_user.id,
            Event.title == title,
        ).first()
        if not existing:
            parts = [release.category]
            if release.colorway:
                parts.append(release.colorway)
            if release.notes:
                parts.append(release.notes)
            event = Event(
                user_id=current_user.id,
                title=title,
                description=" · ".join(parts),
                start_datetime=release_dt,
                all_day=True,
                color="#f59e0b",
            )
            db.add(event)
            created += 1

    db.commit()
    return {"synced": created}


# ─── Tasks ───────────────────────────────────────────────────────────────────

@router.get("/tasks", response_model=list[TaskResponse])
def list_tasks(
    due_date: Optional[date] = Query(None),
    is_completed: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if due_date is not None:
        query = query.filter(Task.due_date == due_date)

    if is_completed is not None:
        query = query.filter(Task.is_completed == is_completed)

    tasks = query.order_by(Task.due_date.nullslast(), Task.created_at).all()
    return tasks


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = Task(
        user_id=current_user.id,
        title=data.title,
        due_date=data.due_date,
        priority=data.priority,
        category=data.category,
        recurrence_rule=data.recurrence_rule,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    db.delete(task)
    db.commit()


@router.patch("/tasks/{task_id}/complete", response_model=TaskResponse)
def complete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.is_completed = True
    task.updated_at = datetime.utcnow()

    # Auto-spawn next occurrence for recurring tasks
    if task.recurrence_rule and task.due_date:
        next_due = _next_date(task.due_date, task.recurrence_rule)
        next_task = Task(
            user_id=task.user_id,
            title=task.title,
            due_date=next_due,
            priority=task.priority,
            category=task.category,
            recurrence_rule=task.recurrence_rule,
        )
        db.add(next_task)

    db.commit()
    db.refresh(task)
    return task
