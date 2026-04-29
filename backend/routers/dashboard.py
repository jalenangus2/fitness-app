"""Dashboard router: aggregate summary for all features."""
from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.fashion import FashionRelease
from ..models.meal import MealPlan, Meal
from ..models.schedule import Event, Task
from ..models.shopping import ShoppingList
from ..models.workout import WorkoutPlan
from ..models.user import User
from ..routers.auth import get_current_user
from ..services.weather_service import get_daily_weather

router = APIRouter()


class WeatherResponse(BaseModel):
    current_temp_f: float
    temp_high_f: float
    temp_low_f: float
    weather_code: int
    condition: str
    location: str


@router.get("/weather", response_model=WeatherResponse)
async def get_weather(current_user: User = Depends(get_current_user)):
    try:
        return await get_daily_weather()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service unavailable.",
        )


class ActiveWorkoutSummary(BaseModel):
    id: int
    name: str
    muscle_groups: list[str]
    difficulty: str
    exercise_count: int


class TodayMeal(BaseModel):
    meal_type: str
    name: str
    calories: Optional[int]
    protein_g: Optional[float]
    carbs_g: Optional[float]
    fat_g: Optional[float]


class ActiveMealSummary(BaseModel):
    id: int
    name: str
    goal: str
    today_meals: list[TodayMeal]
    target_calories: Optional[int]
    target_protein_g: Optional[int]
    target_carbs_g: Optional[int]
    target_fat_g: Optional[int]


class MacroToday(BaseModel):
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float


class EventSummary(BaseModel):
    id: int
    title: str
    start_datetime: datetime
    end_datetime: Optional[datetime]
    all_day: bool
    color: str


class TaskSummary(BaseModel):
    id: int
    title: str
    due_date: Optional[date]
    priority: str
    is_completed: bool
    category: Optional[str]


class FashionReleaseSummary(BaseModel):
    id: int
    brand: str
    name: str
    category: str
    release_date: date
    price_cents: Optional[int]
    image_url: Optional[str]
    has_alert: bool


class DashboardSummary(BaseModel):
    active_workout_plan: Optional[ActiveWorkoutSummary]
    active_meal_plan: Optional[ActiveMealSummary]
    today_tasks: list[TaskSummary]
    upcoming_events: list[EventSummary]
    upcoming_fashion_releases: list[FashionReleaseSummary]
    shopping_list_count: int
    macro_today: Optional[MacroToday]


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    now = datetime.utcnow()

    # Active workout plan
    active_workout = db.query(WorkoutPlan).filter(
        WorkoutPlan.user_id == current_user.id,
        WorkoutPlan.is_active.is_(True),
    ).first()

    active_workout_summary = None
    if active_workout:
        import json
        muscle_groups = json.loads(active_workout.muscle_groups or "[]")
        active_workout_summary = ActiveWorkoutSummary(
            id=active_workout.id,
            name=active_workout.name,
            muscle_groups=muscle_groups,
            difficulty=active_workout.difficulty,
            exercise_count=len(active_workout.exercises),
        )

    # Active meal plan + today's meals
    active_meal = db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id,
        MealPlan.is_active.is_(True),
    ).first()

    active_meal_summary = None
    macro_today = None
    if active_meal:
        # Day number = days since plan created (1-indexed), capped at duration
        days_since = (today - active_meal.created_at.date()).days
        day_number = min(days_since + 1, active_meal.duration_days)

        today_meals = db.query(Meal).filter(
            Meal.plan_id == active_meal.id,
            Meal.day_number == day_number,
        ).all()

        today_meal_list = [
            TodayMeal(
                meal_type=m.meal_type,
                name=m.name,
                calories=m.calories,
                protein_g=m.protein_g,
                carbs_g=m.carbs_g,
                fat_g=m.fat_g,
            )
            for m in today_meals
        ]

        active_meal_summary = ActiveMealSummary(
            id=active_meal.id,
            name=active_meal.name,
            goal=active_meal.goal,
            today_meals=today_meal_list,
            target_calories=active_meal.target_calories,
            target_protein_g=active_meal.target_protein_g,
            target_carbs_g=active_meal.target_carbs_g,
            target_fat_g=active_meal.target_fat_g,
        )

        if today_meals:
            macro_today = MacroToday(
                calories=sum(m.calories or 0 for m in today_meals),
                protein_g=sum(m.protein_g or 0 for m in today_meals),
                carbs_g=sum(m.carbs_g or 0 for m in today_meals),
                fat_g=sum(m.fat_g or 0 for m in today_meals),
            )

    # All incomplete tasks, sorted by due date (overdue first, then upcoming, then no date)
    today_tasks_db = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.is_completed.is_(False),
    ).order_by(Task.due_date.asc().nullslast(), Task.priority.desc()).limit(10).all()

    today_tasks = [
        TaskSummary(
            id=t.id,
            title=t.title,
            due_date=t.due_date,
            priority=t.priority,
            is_completed=t.is_completed,
            category=t.category,
        )
        for t in today_tasks_db
    ]

    # Upcoming events (next 7 days)
    seven_days = now + timedelta(days=7)
    upcoming_events_db = db.query(Event).filter(
        Event.user_id == current_user.id,
        Event.start_datetime >= now,
        Event.start_datetime <= seven_days,
    ).order_by(Event.start_datetime.asc()).limit(5).all()

    upcoming_events = [
        EventSummary(
            id=e.id,
            title=e.title,
            start_datetime=e.start_datetime,
            end_datetime=e.end_datetime,
            all_day=e.all_day,
            color=e.color,
        )
        for e in upcoming_events_db
    ]

    # Upcoming fashion releases (next 30 days)
    thirty_days = today + timedelta(days=30)
    upcoming_fashion_db = db.query(FashionRelease).filter(
        FashionRelease.user_id == current_user.id,
        FashionRelease.release_date >= today,
        FashionRelease.release_date <= thirty_days,
    ).order_by(FashionRelease.release_date.asc()).limit(10).all()

    upcoming_fashion = [
        FashionReleaseSummary(
            id=r.id,
            brand=r.brand,
            name=r.name,
            category=r.category,
            release_date=r.release_date,
            price_cents=r.price_cents,
            image_url=r.image_url,
            has_alert=len(r.alerts) > 0,
        )
        for r in upcoming_fashion_db
    ]

    # Shopping list count
    shopping_count = db.query(ShoppingList).filter(
        ShoppingList.user_id == current_user.id
    ).count()

    return DashboardSummary(
        active_workout_plan=active_workout_summary,
        active_meal_plan=active_meal_summary,
        today_tasks=today_tasks,
        upcoming_events=upcoming_events,
        upcoming_fashion_releases=upcoming_fashion,
        shopping_list_count=shopping_count,
        macro_today=macro_today,
    )
