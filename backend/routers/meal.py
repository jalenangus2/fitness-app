"""Meal plans router: CRUD + AI generation + Daily Logging."""
from datetime import datetime, date, timedelta, time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.meal import Meal, MealItem, MealPlan, FoodItem, NutritionLog
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.meal import (
    GenerateMealRequest, MealItemResponse, MealPlanCreate, MealPlanResponse,
    MealPlanUpdate, MealResponse, FoodItemCreate, FoodItemResponse,
    NutritionLogCreate, NutritionLogResponse
)
from ..services import claude_service

router = APIRouter()

def _serialize_meal_plan(plan: MealPlan) -> MealPlanResponse:
    meals_out = []
    for meal in sorted(plan.meals, key=lambda m: (m.day_number, m.meal_type)):
        items_out = [
            MealItemResponse(id=item.id, ingredient_name=item.ingredient_name, quantity=item.quantity, category=item.category)
            for item in meal.items
        ]
        meals_out.append(
            MealResponse(
                id=meal.id, day_number=meal.day_number, meal_type=meal.meal_type,
                name=meal.name, calories=meal.calories, protein_g=meal.protein_g,
                carbs_g=meal.carbs_g, fat_g=meal.fat_g, recipe_notes=meal.recipe_notes,
                items=items_out,
            )
        )
    return MealPlanResponse(
        id=plan.id, name=plan.name, goal=plan.goal, target_calories=plan.target_calories,
        target_protein_g=plan.target_protein_g, target_carbs_g=plan.target_carbs_g,
        target_fat_g=plan.target_fat_g, duration_days=plan.duration_days,
        is_active=plan.is_active, is_ai_generated=plan.is_ai_generated,
        meals=meals_out, created_at=plan.created_at,
    )

# --- PLANS ---
@router.get("/plans", response_model=list[MealPlanResponse])
def list_meal_plans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = db.query(MealPlan).filter(MealPlan.user_id == current_user.id).all()
    return [_serialize_meal_plan(p) for p in plans]

@router.post("/plans", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
def create_meal_plan(data: MealPlanCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = MealPlan(
        user_id=current_user.id, name=data.name, goal=data.goal,
        target_calories=data.target_calories, target_protein_g=data.target_protein_g,
        target_carbs_g=data.target_carbs_g, target_fat_g=data.target_fat_g,
        duration_days=data.duration_days, is_ai_generated=data.is_ai_generated
    )
    db.add(plan)
    db.flush()

    for meal_data in data.meals or []:
        meal = Meal(
            plan_id=plan.id, day_number=meal_data.day_number, meal_type=meal_data.meal_type,
            name=meal_data.name, calories=meal_data.calories, protein_g=meal_data.protein_g,
            carbs_g=meal_data.carbs_g, fat_g=meal_data.fat_g, recipe_notes=meal_data.recipe_notes
        )
        db.add(meal)
        db.flush()
        for item_data in meal_data.items:
            item = MealItem(meal_id=meal.id, ingredient_name=item_data.ingredient_name, quantity=item_data.quantity, category=item_data.category)
            db.add(item)

    db.commit()
    db.refresh(plan)
    return _serialize_meal_plan(plan)

@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id, MealPlan.user_id == current_user.id).first()
    if not plan: raise HTTPException(status_code=404, detail="Meal plan not found")
    db.delete(plan)
    db.commit()

@router.patch("/plans/{plan_id}", response_model=MealPlanResponse)
def update_meal_plan(plan_id: int, data: MealPlanUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id, MealPlan.user_id == current_user.id).first()
    if not plan: raise HTTPException(status_code=404, detail="Meal plan not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return _serialize_meal_plan(plan)

@router.patch("/plans/{plan_id}/activate", response_model=MealPlanResponse)
def activate_meal_plan(plan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.query(MealPlan).filter(MealPlan.id == plan_id, MealPlan.user_id == current_user.id).first()
    if not plan: raise HTTPException(status_code=404, detail="Meal plan not found")
    db.query(MealPlan).filter(MealPlan.user_id == current_user.id, MealPlan.id != plan_id).update({"is_active": False})
    plan.is_active = True
    db.commit()
    db.refresh(plan)
    return _serialize_meal_plan(plan)

@router.post("/plans/generate", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
def generate_meal_plan(data: GenerateMealRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    generated = claude_service.generate_meal_plan(
        goal=data.goal, target_calories=data.target_calories, target_protein_g=data.target_protein_g,
        target_carbs_g=data.target_carbs_g, target_fat_g=data.target_fat_g,
        duration_days=data.duration_days, dietary_restrictions=data.dietary_restrictions,
    )
    plan = MealPlan(
        user_id=current_user.id, name=generated["name"], goal=data.goal,
        target_calories=data.target_calories, target_protein_g=data.target_protein_g,
        target_carbs_g=data.target_carbs_g, target_fat_g=data.target_fat_g,
        duration_days=data.duration_days, is_ai_generated=True
    )
    db.add(plan)
    db.flush()

    for meal_data in generated.get("meals", []):
        meal = Meal(
            plan_id=plan.id, day_number=meal_data.get("day_number", 1), meal_type=meal_data.get("meal_type", "breakfast"),
            name=meal_data.get("name", ""), calories=meal_data.get("calories"),
            protein_g=meal_data.get("protein_g"), carbs_g=meal_data.get("carbs_g"),
            fat_g=meal_data.get("fat_g"), recipe_notes=meal_data.get("recipe_notes")
        )
        db.add(meal)
        db.flush()
        for ingredient in meal_data.get("ingredients", []):
            item = MealItem(meal_id=meal.id, ingredient_name=ingredient.get("ingredient_name", ""), quantity=ingredient.get("quantity"), category=ingredient.get("category"))
            db.add(item)

    db.commit()
    db.refresh(plan)
    return _serialize_meal_plan(plan)

# --- LOGGING & FOOD DATABASE ---
@router.get("/foods", response_model=list[FoodItemResponse])
def search_foods(q: str = "", db: Session = Depends(get_db)):
    return db.query(FoodItem).filter(FoodItem.name.ilike(f"%{q}%")).limit(20).all()

@router.post("/foods", response_model=FoodItemResponse)
def create_food(data: FoodItemCreate, db: Session = Depends(get_db)):
    food = FoodItem(**data.dict())
    db.add(food)
    db.commit()
    db.refresh(food)
    return food

@router.get("/logs/today", response_model=list[NutritionLogResponse])
def get_daily_nutrition(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()
    logs = db.query(NutritionLog).filter(
        NutritionLog.user_id == current_user.id,
        NutritionLog.consumed_at >= datetime.combine(today, datetime.min.time())
    ).all()
    return logs

@router.post("/logs", response_model=NutritionLogResponse)
def log_nutrition(data: NutritionLogCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    log_data = data.model_dump(exclude={'log_date'})
    consumed_at = datetime.combine(data.log_date, time(12, 0)) if data.log_date else datetime.utcnow()
    log = NutritionLog(user_id=current_user.id, consumed_at=consumed_at, **log_data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.get("/logs/history", response_model=list[NutritionLogResponse])
def get_nutrition_history(days: int = 30, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from_dt = datetime.combine(date.today() - timedelta(days=days), datetime.min.time())
    logs = db.query(NutritionLog).filter(
        NutritionLog.user_id == current_user.id,
        NutritionLog.consumed_at >= from_dt
    ).order_by(NutritionLog.consumed_at.desc()).all()
    return logs