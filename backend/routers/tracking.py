"""Tracking router: workout sessions, nutrition log, body metrics, sleep, recovery, analytics."""
import json
from collections import defaultdict
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models.tracking import (
    BodyMetric, FoodLogEntry, RecoveryLog, SleepLog,
    WaterLog, WorkoutSession, WorkoutSetLog,
)
from ..models.finance import MealPlan, Transaction
from ..routers.auth import get_current_user
from ..models.user import User
from ..schemas.tracking import (
    BodyMetricCreate, BodyMetricResponse,
    CrossModuleResponse,
    DailyNutritionSummary,
    FoodLogEntryCreate, FoodLogEntryResponse,
    RecoveryLogCreate, RecoveryLogResponse,
    SleepLogCreate, SleepLogResponse,
    WaterLogCreate, WaterLogResponse,
    WeightForecastRequest, WeightForecastResponse,
    WorkoutSessionCreate, WorkoutSessionResponse, WorkoutSessionUpdate,
    WorkoutSetLogCreate, WorkoutSetLogResponse,
)
from ..services import analytics_service

router = APIRouter()

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _session_or_404(session_id: int, user_id: int, db: Session) -> WorkoutSession:
    s = db.query(WorkoutSession).filter(
        WorkoutSession.id == session_id,
        WorkoutSession.user_id == user_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Workout session not found")
    return s


def _serialize_session(s: WorkoutSession) -> WorkoutSessionResponse:
    return WorkoutSessionResponse(
        id=s.id,
        user_id=s.user_id,
        plan_id=s.plan_id,
        name=s.name,
        session_date=s.session_date,
        duration_mins=s.duration_mins,
        overall_rpe=s.overall_rpe,
        notes=s.notes,
        set_logs=[
            WorkoutSetLogResponse(
                id=sl.id,
                session_id=sl.session_id,
                exercise_name=sl.exercise_name,
                set_number=sl.set_number,
                reps=sl.reps,
                weight_lbs=sl.weight_lbs,
                duration_secs=sl.duration_secs,
                rest_secs=sl.rest_secs,
                rpe=sl.rpe,
                notes=sl.notes,
                created_at=sl.created_at,
            )
            for sl in s.set_logs
        ],
        created_at=s.created_at,
    )


# ─── Workout Sessions ─────────────────────────────────────────────────────────

@router.get("/sessions", response_model=list[WorkoutSessionResponse])
def list_sessions(
    limit: int = Query(50, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.session_date.desc())
        .limit(limit)
        .all()
    )
    return [_serialize_session(s) for s in sessions]


@router.post("/sessions", response_model=WorkoutSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    data: WorkoutSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = WorkoutSession(
        user_id=current_user.id,
        plan_id=data.plan_id,
        name=data.name,
        session_date=data.session_date,
        duration_mins=data.duration_mins,
        overall_rpe=data.overall_rpe,
        notes=data.notes,
    )
    db.add(session)
    db.flush()

    for sl_data in data.set_logs:
        db.add(WorkoutSetLog(
            session_id=session.id,
            exercise_name=sl_data.exercise_name,
            set_number=sl_data.set_number,
            reps=sl_data.reps,
            weight_lbs=sl_data.weight_lbs,
            duration_secs=sl_data.duration_secs,
            rest_secs=sl_data.rest_secs,
            rpe=sl_data.rpe,
            notes=sl_data.notes,
        ))

    db.commit()
    db.refresh(session)
    return _serialize_session(session)


@router.get("/sessions/{session_id}", response_model=WorkoutSessionResponse)
def get_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _serialize_session(_session_or_404(session_id, current_user.id, db))


@router.put("/sessions/{session_id}", response_model=WorkoutSessionResponse)
def update_session(
    session_id: int,
    data: WorkoutSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _session_or_404(session_id, current_user.id, db)
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(session, field, val)
    db.commit()
    db.refresh(session)
    return _serialize_session(session)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = _session_or_404(session_id, current_user.id, db)
    db.delete(session)
    db.commit()


@router.post("/sessions/{session_id}/sets", response_model=WorkoutSetLogResponse,
             status_code=status.HTTP_201_CREATED)
def add_set(
    session_id: int,
    data: WorkoutSetLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _session_or_404(session_id, current_user.id, db)
    sl = WorkoutSetLog(session_id=session_id, **data.model_dump())
    db.add(sl)
    db.commit()
    db.refresh(sl)
    return WorkoutSetLogResponse(
        id=sl.id, session_id=sl.session_id, exercise_name=sl.exercise_name,
        set_number=sl.set_number, reps=sl.reps, weight_lbs=sl.weight_lbs,
        duration_secs=sl.duration_secs, rest_secs=sl.rest_secs,
        rpe=sl.rpe, notes=sl.notes, created_at=sl.created_at,
    )


@router.delete("/sessions/{session_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(
    session_id: int,
    set_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _session_or_404(session_id, current_user.id, db)
    sl = db.query(WorkoutSetLog).filter(
        WorkoutSetLog.id == set_id,
        WorkoutSetLog.session_id == session_id,
    ).first()
    if not sl:
        raise HTTPException(status_code=404, detail="Set log not found")
    db.delete(sl)
    db.commit()


# ─── Food Log ─────────────────────────────────────────────────────────────────

@router.get("/nutrition", response_model=DailyNutritionSummary)
def get_nutrition(
    log_date: date = Query(default_factory=date.today),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(FoodLogEntry)
        .filter(FoodLogEntry.user_id == current_user.id, FoodLogEntry.log_date == log_date)
        .order_by(FoodLogEntry.created_at)
        .all()
    )
    water_rows = db.query(WaterLog).filter(
        WaterLog.user_id == current_user.id, WaterLog.log_date == log_date
    ).all()
    water_oz = sum(w.amount_oz for w in water_rows)

    def _sum(attr: str) -> float:
        return round(sum(getattr(e, attr) or 0 for e in entries), 1)

    return DailyNutritionSummary(
        log_date=log_date,
        calories=_sum("calories"),
        protein_g=_sum("protein_g"),
        carbs_g=_sum("carbs_g"),
        fat_g=_sum("fat_g"),
        fiber_g=_sum("fiber_g"),
        water_oz=round(water_oz, 1),
        entries=[FoodLogEntryResponse.model_validate(e) for e in entries],
    )


@router.post("/nutrition", response_model=FoodLogEntryResponse, status_code=status.HTTP_201_CREATED)
def add_food_entry(
    data: FoodLogEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = FoodLogEntry(user_id=current_user.id, **data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return FoodLogEntryResponse.model_validate(entry)


@router.delete("/nutrition/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(FoodLogEntry).filter(
        FoodLogEntry.id == entry_id, FoodLogEntry.user_id == current_user.id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Food log entry not found")
    db.delete(entry)
    db.commit()


# ─── Water Log ────────────────────────────────────────────────────────────────

@router.post("/water", response_model=WaterLogResponse, status_code=status.HTTP_201_CREATED)
def log_water(
    data: WaterLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wl = WaterLog(user_id=current_user.id, **data.model_dump())
    db.add(wl)
    db.commit()
    db.refresh(wl)
    return WaterLogResponse.model_validate(wl)


@router.delete("/water/{water_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_water(
    water_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wl = db.query(WaterLog).filter(
        WaterLog.id == water_id, WaterLog.user_id == current_user.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Water log not found")
    db.delete(wl)
    db.commit()


# ─── Body Metrics ─────────────────────────────────────────────────────────────

@router.get("/metrics", response_model=list[BodyMetricResponse])
def list_metrics(
    limit: int = Query(90, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(BodyMetric)
        .filter(BodyMetric.user_id == current_user.id)
        .order_by(BodyMetric.metric_date.desc())
        .limit(limit)
        .all()
    )
    return [BodyMetricResponse.model_validate(r) for r in rows]


@router.post("/metrics", response_model=BodyMetricResponse, status_code=status.HTTP_201_CREATED)
def add_metric(
    data: BodyMetricCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    metric = BodyMetric(user_id=current_user.id, **data.model_dump())
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return BodyMetricResponse.model_validate(metric)


@router.delete("/metrics/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_metric(
    metric_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    metric = db.query(BodyMetric).filter(
        BodyMetric.id == metric_id, BodyMetric.user_id == current_user.id
    ).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Body metric not found")
    db.delete(metric)
    db.commit()


# ─── Sleep Log ────────────────────────────────────────────────────────────────

@router.get("/sleep", response_model=list[SleepLogResponse])
def list_sleep(
    limit: int = Query(30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(SleepLog)
        .filter(SleepLog.user_id == current_user.id)
        .order_by(SleepLog.sleep_date.desc())
        .limit(limit)
        .all()
    )
    return [SleepLogResponse.model_validate(r) for r in rows]


@router.post("/sleep", response_model=SleepLogResponse, status_code=status.HTTP_201_CREATED)
def add_sleep(
    data: SleepLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sl = SleepLog(user_id=current_user.id, **data.model_dump())
    db.add(sl)
    db.commit()
    db.refresh(sl)
    return SleepLogResponse.model_validate(sl)


@router.delete("/sleep/{sleep_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sleep(
    sleep_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sl = db.query(SleepLog).filter(
        SleepLog.id == sleep_id, SleepLog.user_id == current_user.id
    ).first()
    if not sl:
        raise HTTPException(status_code=404, detail="Sleep log not found")
    db.delete(sl)
    db.commit()


# ─── Recovery Log ─────────────────────────────────────────────────────────────

@router.get("/recovery", response_model=list[RecoveryLogResponse])
def list_recovery(
    limit: int = Query(30, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(RecoveryLog)
        .filter(RecoveryLog.user_id == current_user.id)
        .order_by(RecoveryLog.log_date.desc())
        .limit(limit)
        .all()
    )
    out = []
    for r in rows:
        out.append(RecoveryLogResponse(
            id=r.id, user_id=r.user_id, log_date=r.log_date,
            overall_soreness=r.overall_soreness, fatigue_level=r.fatigue_level,
            mood=r.mood, stress_level=r.stress_level,
            muscle_soreness=json.loads(r.muscle_soreness) if r.muscle_soreness else None,
            notes=r.notes, created_at=r.created_at,
        ))
    return out


@router.post("/recovery", response_model=RecoveryLogResponse, status_code=status.HTTP_201_CREATED)
def add_recovery(
    data: RecoveryLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rl = RecoveryLog(
        user_id=current_user.id,
        log_date=data.log_date,
        overall_soreness=data.overall_soreness,
        fatigue_level=data.fatigue_level,
        mood=data.mood,
        stress_level=data.stress_level,
        muscle_soreness=json.dumps(data.muscle_soreness) if data.muscle_soreness else None,
        notes=data.notes,
    )
    db.add(rl)
    db.commit()
    db.refresh(rl)
    return RecoveryLogResponse(
        id=rl.id, user_id=rl.user_id, log_date=rl.log_date,
        overall_soreness=rl.overall_soreness, fatigue_level=rl.fatigue_level,
        mood=rl.mood, stress_level=rl.stress_level,
        muscle_soreness=data.muscle_soreness,
        notes=rl.notes, created_at=rl.created_at,
    )


@router.delete("/recovery/{recovery_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recovery(
    recovery_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rl = db.query(RecoveryLog).filter(
        RecoveryLog.id == recovery_id, RecoveryLog.user_id == current_user.id
    ).first()
    if not rl:
        raise HTTPException(status_code=404, detail="Recovery log not found")
    db.delete(rl)
    db.commit()


# ─── Analytics ────────────────────────────────────────────────────────────────

@router.post("/analytics/weight-forecast", response_model=WeightForecastResponse)
def weight_forecast(
    data: WeightForecastRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(BodyMetric)
        .filter(
            BodyMetric.user_id == current_user.id,
            BodyMetric.weight_lbs.isnot(None),
        )
        .order_by(BodyMetric.metric_date)
        .all()
    )
    dates = [r.metric_date for r in rows]
    weights = [r.weight_lbs for r in rows]

    result = analytics_service.forecast_weight(dates, weights, goal_weight=data.goal_weight)

    return WeightForecastResponse(
        slope_lbs_per_day=result["slope_lbs_per_day"],
        r_squared=result["r_squared"],
        data_points=result["data_points"],
        historical=[
            {"date": h["date"], "actual_weight": h["actual_weight"], "fitted_weight": h["fitted_weight"]}
            for h in result["historical"]
        ],
        projection=[
            {"date": p["date"], "predicted_weight": p["predicted_weight"]}
            for p in result["projection"]
        ],
        goal_date=result["goal_date"],
        goal_weight=result["goal_weight"],
        insufficient_data=result["insufficient_data"],
    )


@router.get("/analytics/cross-module", response_model=CrossModuleResponse)
def cross_module(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Grocery spend from Plaid — categories that contain "Groceries" or "Food"
    GROCERY_KEYWORDS = ("groceries", "food", "supermarket", "market", "trader joe",
                        "whole foods", "walmart", "kroger", "costco", "aldi", "publix")

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .all()
    )

    grocery_by_month: dict[str, float] = defaultdict(float)
    for txn in transactions:
        cat = (txn.custom_category or txn.category or "").lower()
        name = (txn.merchant_name or txn.name or "").lower()
        if any(k in cat or k in name for k in GROCERY_KEYWORDS):
            month = txn.date[:7] if isinstance(txn.date, str) else txn.date.strftime("%Y-%m")
            grocery_by_month[month] += abs(txn.amount)

    # Caloric intake per day from food log
    food_rows = db.query(FoodLogEntry).filter(FoodLogEntry.user_id == current_user.id).all()
    calories_by_date: dict[str, float] = defaultdict(float)
    for f in food_rows:
        key = f.log_date.isoformat() if hasattr(f.log_date, "isoformat") else str(f.log_date)
        calories_by_date[key] += f.calories or 0

    # Pull goal calories from active meal plan if available
    from ..models.meal import MealPlan as MealPlanModel
    active_plan = (
        db.query(MealPlanModel)
        .filter(MealPlanModel.user_id == current_user.id, MealPlanModel.is_active.is_(True))
        .first()
    )
    goal_calories = active_plan.target_calories if active_plan else None

    result = analytics_service.cross_module_insights(
        grocery_by_month=dict(grocery_by_month),
        calories_by_date=dict(calories_by_date),
        goal_calories=goal_calories,
    )

    return CrossModuleResponse(**result)
