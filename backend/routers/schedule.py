"""Schedule router: events and tasks CRUD."""
from datetime import datetime, date
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


# ─── Events ──────────────────────────────────────────────────────────────────

@router.get("/events", response_model=list[EventResponse])
def list_events(
    start: Optional[str] = Query(None, description="ISO datetime filter start"),
    end: Optional[str] = Query(None, description="ISO datetime filter end"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Event).filter(Event.user_id == current_user.id)

    if start:
        try:
            start_dt = datetime.fromisoformat(start)
            query = query.filter(Event.start_datetime >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start datetime format. Use ISO 8601.",
            )

    if end:
        try:
            end_dt = datetime.fromisoformat(end)
            query = query.filter(Event.start_datetime <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end datetime format. Use ISO 8601.",
            )

    events = query.order_by(Event.start_datetime).all()
    return events


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
    return event


@router.get("/events/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(
        Event.id == event_id, Event.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(
        Event.id == event_id, Event.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if data.title is not None:
        event.title = data.title
    if data.description is not None:
        event.description = data.description
    if data.start_datetime is not None:
        event.start_datetime = data.start_datetime
    if data.end_datetime is not None:
        event.end_datetime = data.end_datetime
    if data.all_day is not None:
        event.all_day = data.all_day
    if data.color is not None:
        event.color = data.color
    if data.recurrence_rule is not None:
        event.recurrence_rule = data.recurrence_rule

    event.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(
        Event.id == event_id, Event.user_id == current_user.id
    ).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()


# ─── Tasks ───────────────────────────────────────────────────────────────────

@router.get("/tasks", response_model=list[TaskResponse])
def list_tasks(
    due_date: Optional[date] = Query(None, description="Filter by due date (YYYY-MM-DD)"),
    is_completed: Optional[bool] = Query(None, description="Filter by completion status"),
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
    task = db.query(Task).filter(
        Task.id == task_id, Task.user_id == current_user.id
    ).first()
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
    task = db.query(Task).filter(
        Task.id == task_id, Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if data.title is not None:
        task.title = data.title
    if data.due_date is not None:
        task.due_date = data.due_date
    if data.is_completed is not None:
        task.is_completed = data.is_completed
    if data.priority is not None:
        task.priority = data.priority
    if data.category is not None:
        task.category = data.category

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
    task = db.query(Task).filter(
        Task.id == task_id, Task.user_id == current_user.id
    ).first()
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
    task = db.query(Task).filter(
        Task.id == task_id, Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task.is_completed = True
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task
