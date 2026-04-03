from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class WorkoutExerciseBase(BaseModel):
    name: str
    sets: Optional[int] = None
    reps: Optional[str] = None
    rest_seconds: Optional[int] = None
    notes: Optional[str] = None
    order_index: int = 0


class WorkoutExerciseResponse(WorkoutExerciseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class WorkoutPlanBase(BaseModel):
    name: str
    muscle_groups: list[str]
    difficulty: str
    duration_mins: Optional[int] = None
    notes: Optional[str] = None


class WorkoutPlanCreate(WorkoutPlanBase):
    pass


class WorkoutPlanUpdate(BaseModel):
    name: Optional[str] = None
    muscle_groups: Optional[list[str]] = None
    difficulty: Optional[str] = None
    duration_mins: Optional[int] = None
    notes: Optional[str] = None


class WorkoutPlanResponse(WorkoutPlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    exercises: list[WorkoutExerciseResponse] = []
    created_at: datetime


class GenerateWorkoutRequest(BaseModel):
    muscle_groups: list[str]
    difficulty: str = "intermediate"
    duration_mins: int = 60
    notes: str = ""
