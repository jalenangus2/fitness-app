from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: Optional[datetime] = None
    all_day: bool = False
    color: str = "#6366f1"
    recurrence_rule: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    all_day: Optional[bool] = None
    color: Optional[str] = None
    recurrence_rule: Optional[str] = None


class EventResponse(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    is_recurring_instance: bool = False


class TaskBase(BaseModel):
    title: str
    due_date: Optional[date] = None
    priority: str = "medium"
    category: Optional[str] = None
    recurrence_rule: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[date] = None
    is_completed: Optional[bool] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    recurrence_rule: Optional[str] = None


class TaskResponse(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_completed: bool
    created_at: datetime
