"""Workout plans router: CRUD + AI generation + activation + live tracking."""
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.workout import WorkoutExercise, WorkoutPlan, WorkoutSession, ExerciseLog
from ..routers.auth import get_current_user
from ..models.user import User
from ..schemas.workout import (
    GenerateWorkoutRequest, WorkoutExerciseResponse, WorkoutPlanCreate,
    WorkoutPlanResponse, WorkoutPlanUpdate, WorkoutSessionCreate,
    WorkoutSessionResponse, ExerciseLogCreate, ExerciseLogResponse
)
from ..services import claude_service

router = APIRouter()

def _serialize_plan(plan: WorkoutPlan) -> WorkoutPlanResponse:
    muscle_groups = json.loads(plan.muscle_groups or "[]")
    exercises = [
        WorkoutExerciseResponse(
            id=ex.id, name=ex.name, sets=ex.sets, reps=ex.reps,
            rest_seconds=ex.rest_seconds, notes=ex.notes, order_index=ex.order_index,
        )
        for ex in sorted(plan.exercises, key=lambda e: e.order_index)
    ]
    return WorkoutPlanResponse(
        id=plan.id, name=plan.name, muscle_groups=muscle_groups,
        difficulty=plan.difficulty, duration_mins=plan.duration_mins,
        notes=plan.notes, is_active=plan.is_active, is_ai_generated=plan.is_ai_generated,
        exercises=exercises, created_at=plan.created_at,
    )

# --- PLAN CRUD ---
@router.get("/", response_model=list[WorkoutPlanResponse])
def list_workout_plans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = db.query(WorkoutPlan).filter(WorkoutPlan.user_id == current_user.id).all()
    return [_serialize_plan(p) for p in plans]

@router.post("/", response_model=WorkoutPlanResponse, status_code=status.HTTP_201_CREATED)
def create_workout_plan(data: WorkoutPlanCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = WorkoutPlan(
        user_id=current_user.id, name=data.name,
        muscle_groups=json.dumps(data.muscle_groups),
        difficulty=data.difficulty, duration_mins=data.duration_mins,
        notes=data.notes, is_ai_generated=data.is_ai_generated
    )
    db.add(plan)
    db.flush() 

    for ex_data in data.exercises:
        exercise = WorkoutExercise(
            plan_id=plan.id, name=ex_data.name, sets=ex_data.sets,
            reps=ex_data.reps, rest_seconds=ex_data.rest_seconds,
            notes=ex_data.notes, order_index=ex_data.order_index
        )
        db.add(exercise)

    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)

@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workout_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id).first()
    if not plan: raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()

@router.patch("/{plan_id}/activate", response_model=WorkoutPlanResponse)
def activate_workout_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id).first()
    if not plan: raise HTTPException(status_code=404, detail="Plan not found")
    db.query(WorkoutPlan).filter(WorkoutPlan.user_id == current_user.id, WorkoutPlan.id != plan_id).update({"is_active": False})
    plan.is_active = True
    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)

@router.post("/generate", response_model=WorkoutPlanResponse, status_code=status.HTTP_201_CREATED)
def generate_workout_plan(data: GenerateWorkoutRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    generated = claude_service.generate_workout_plan(
        muscle_groups=data.muscle_groups, difficulty=data.difficulty,
        duration_mins=data.duration_mins, notes=data.notes,
    )
    plan = WorkoutPlan(
        user_id=current_user.id, name=generated["name"],
        muscle_groups=json.dumps(data.muscle_groups),
        difficulty=data.difficulty, duration_mins=data.duration_mins,
        notes=data.notes if data.notes else None, is_ai_generated=True
    )
    db.add(plan) 
    db.flush()
    for ex_data in generated.get("exercises", []):
        exercise = WorkoutExercise(
            plan_id=plan.id, name=ex_data.get("name", ""), sets=ex_data.get("sets"),
            reps=ex_data.get("reps"), rest_seconds=ex_data.get("rest_seconds"),
            notes=ex_data.get("notes"), order_index=ex_data.get("order_index", 0)
        )
        db.add(exercise)
    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)

# --- LIVE TRACKING (SESSIONS) ---
@router.post("/sessions", response_model=WorkoutSessionResponse)
def start_session(data: WorkoutSessionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = WorkoutSession(user_id=current_user.id, plan_id=data.plan_id, notes=data.notes)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.post("/sessions/{session_id}/logs", response_model=ExerciseLogResponse)
def log_exercise_set(session_id: int, data: ExerciseLogCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id, WorkoutSession.user_id == current_user.id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    
    log = ExerciseLog(
        session_id=session.id, exercise_name=data.exercise_name,
        set_number=data.set_number, reps_completed=data.reps_completed,
        weight_lbs=data.weight_lbs, duration_seconds=data.duration_seconds
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.patch("/sessions/{session_id}/finish", response_model=WorkoutSessionResponse)
def finish_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id, WorkoutSession.user_id == current_user.id).first()
    if not session: raise HTTPException(status_code=404, detail="Session not found")
    session.end_time = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session