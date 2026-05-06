from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime


# ─── Workout Session ──────────────────────────────────────────────────────────

class WorkoutSetLogCreate(BaseModel):
    exercise_name: str
    set_number: int = 1
    reps: Optional[int] = None
    weight_lbs: Optional[float] = None
    duration_secs: Optional[int] = None
    rest_secs: Optional[int] = None
    rpe: Optional[float] = None
    notes: Optional[str] = None


class WorkoutSetLogResponse(WorkoutSetLogCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    created_at: datetime


class WorkoutSessionCreate(BaseModel):
    name: str
    session_date: date
    plan_id: Optional[int] = None
    duration_mins: Optional[int] = None
    overall_rpe: Optional[float] = None
    notes: Optional[str] = None
    set_logs: list[WorkoutSetLogCreate] = []


class WorkoutSetLogUpdate(BaseModel):
    exercise_name: Optional[str] = None
    set_number: Optional[int] = None
    reps: Optional[int] = None
    weight_lbs: Optional[float] = None
    duration_secs: Optional[int] = None


class WorkoutSessionUpdate(BaseModel):
    name: Optional[str] = None
    plan_id: Optional[int] = None
    session_date: Optional[date] = None
    duration_mins: Optional[int] = None
    overall_rpe: Optional[float] = None
    notes: Optional[str] = None


class WorkoutSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    plan_id: Optional[int]
    name: str
    session_date: date
    duration_mins: Optional[int]
    overall_rpe: Optional[float]
    notes: Optional[str]
    set_logs: list[WorkoutSetLogResponse] = []
    created_at: datetime


# ─── Food Log ─────────────────────────────────────────────────────────────────

class FoodLogEntryCreate(BaseModel):
    log_date: date
    meal_type: str
    food_name: str
    brand: Optional[str] = None
    serving_size: Optional[float] = None
    serving_unit: Optional[str] = None
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    notes: Optional[str] = None


class FoodLogEntryResponse(FoodLogEntryCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime


class DailyNutritionSummary(BaseModel):
    log_date: date
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float
    water_oz: float
    entries: list[FoodLogEntryResponse]


# ─── Water Log ────────────────────────────────────────────────────────────────

class WaterLogCreate(BaseModel):
    log_date: date
    amount_oz: float


class WaterLogResponse(WaterLogCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime


# ─── Body Metrics ─────────────────────────────────────────────────────────────

class BodyMetricCreate(BaseModel):
    metric_date: date
    weight_lbs: Optional[float] = None
    body_fat_pct: Optional[float] = None
    chest_in: Optional[float] = None
    waist_in: Optional[float] = None
    hips_in: Optional[float] = None
    bicep_in: Optional[float] = None
    thigh_in: Optional[float] = None
    notes: Optional[str] = None


class BodyMetricResponse(BodyMetricCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime


# ─── Sleep Log ────────────────────────────────────────────────────────────────

class SleepLogCreate(BaseModel):
    sleep_date: date
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None
    duration_hours: Optional[float] = None
    quality_rating: Optional[int] = None
    notes: Optional[str] = None


class SleepLogResponse(SleepLogCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime


# ─── Recovery Log ─────────────────────────────────────────────────────────────

class RecoveryLogCreate(BaseModel):
    log_date: date
    overall_soreness: Optional[int] = None
    fatigue_level: Optional[int] = None
    mood: Optional[int] = None
    stress_level: Optional[int] = None
    muscle_soreness: Optional[dict] = None
    notes: Optional[str] = None


class RecoveryLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    log_date: date
    overall_soreness: Optional[int]
    fatigue_level: Optional[int]
    mood: Optional[int]
    stress_level: Optional[int]
    muscle_soreness: Optional[dict]
    notes: Optional[str]
    created_at: datetime


# ─── Analytics ────────────────────────────────────────────────────────────────

class WeightForecastRequest(BaseModel):
    goal_weight: Optional[float] = None


class WeightDataPoint(BaseModel):
    date: str
    actual_weight: float
    fitted_weight: float


class WeightProjectionPoint(BaseModel):
    date: str
    predicted_weight: float


class WeightForecastResponse(BaseModel):
    slope_lbs_per_day: Optional[float]
    r_squared: Optional[float]
    data_points: int
    historical: list[WeightDataPoint]
    projection: list[WeightProjectionPoint]
    goal_date: Optional[str]
    goal_weight: Optional[float]
    insufficient_data: bool


class CrossModuleInsight(BaseModel):
    month: str
    grocery_spend_dollars: float
    avg_daily_calories: float
    caloric_adherence_pct: Optional[float]


class CrossModuleResponse(BaseModel):
    insights: list[CrossModuleInsight]
    correlation_note: str
    has_finance_data: bool
    has_nutrition_data: bool
