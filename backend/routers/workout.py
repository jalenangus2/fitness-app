"""Workout plans router: CRUD + AI generation + activation."""
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.workout import WorkoutExercise, WorkoutPlan
from ..routers.auth import get_current_user
from ..models.user import User
from ..schemas.workout import (
    GenerateWorkoutRequest, WorkoutExerciseBase, WorkoutExerciseResponse, WorkoutPlanCreate,
    WorkoutPlanResponse, WorkoutPlanUpdate,
)
from ..services import claude_service

router = APIRouter()

def _serialize_plan(plan: WorkoutPlan) -> WorkoutPlanResponse:
    muscle_groups = json.loads(plan.muscle_groups or "[]")
    exercises = [
        WorkoutExerciseResponse(
            id=ex.id, name=ex.name, sets=ex.sets, reps=ex.reps,
            weight_lbs=ex.weight_lbs, duration_secs=ex.duration_secs,
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
@router.get("", response_model=list[WorkoutPlanResponse])
def list_workout_plans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = db.query(WorkoutPlan).filter(WorkoutPlan.user_id == current_user.id).all()
    return [_serialize_plan(p) for p in plans]

@router.post("", response_model=WorkoutPlanResponse, status_code=status.HTTP_201_CREATED)
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
            reps=ex_data.reps, weight_lbs=ex_data.weight_lbs,
            duration_secs=ex_data.duration_secs,
            rest_seconds=ex_data.rest_seconds,
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

@router.patch("/{plan_id}", response_model=WorkoutPlanResponse)
def update_workout_plan(plan_id: int, data: WorkoutPlanUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id).first()
    if not plan: raise HTTPException(status_code=404, detail="Plan not found")
    if data.name is not None: plan.name = data.name.strip()
    if data.muscle_groups is not None: plan.muscle_groups = json.dumps(data.muscle_groups)
    if data.difficulty is not None: plan.difficulty = data.difficulty
    if data.duration_mins is not None: plan.duration_mins = data.duration_mins
    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)

@router.patch("/{plan_id}/activate", response_model=WorkoutPlanResponse)
def activate_workout_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id).first()
    if not plan: raise HTTPException(status_code=404, detail="Plan not found")
    db.query(WorkoutPlan).filter(WorkoutPlan.user_id == current_user.id, WorkoutPlan.id != plan_id).update({"is_active": False})
    plan.is_active = True
    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)

@router.patch("/{plan_id}/deactivate", response_model=WorkoutPlanResponse)
def deactivate_workout_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id).first()
    if not plan: raise HTTPException(status_code=404, detail="Plan not found")
    plan.is_active = False
    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)

@router.put("/{plan_id}/exercises", response_model=WorkoutPlanResponse)
def replace_exercises(plan_id: int, exercises: list[WorkoutExerciseBase], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(WorkoutPlan).filter(WorkoutPlan.id == plan_id, WorkoutPlan.user_id == current_user.id).first()
    if not plan: raise HTTPException(status_code=404, detail="Plan not found")
    db.query(WorkoutExercise).filter(WorkoutExercise.plan_id == plan_id).delete()
    for i, ex in enumerate(exercises):
        db.add(WorkoutExercise(
            plan_id=plan_id, name=ex.name, sets=ex.sets, reps=ex.reps,
            weight_lbs=ex.weight_lbs, duration_secs=ex.duration_secs,
            rest_seconds=ex.rest_seconds, notes=ex.notes, order_index=i
        ))
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

