"""Meal plans router: CRUD + AI generation + activation."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.meal import Meal, MealItem, MealPlan
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.meal import (
    GenerateMealRequest,
    MealItemResponse,
    MealPlanCreate,
    MealPlanResponse,
    MealPlanUpdate,
    MealResponse,
)
from ..services import claude_service

router = APIRouter()


def _serialize_meal_plan(plan: MealPlan) -> MealPlanResponse:
    """Convert a MealPlan ORM object to MealPlanResponse."""
    meals_out = []
    for meal in sorted(plan.meals, key=lambda m: (m.day_number, m.meal_type)):
        items_out = [
            MealItemResponse(
                id=item.id,
                ingredient_name=item.ingredient_name,
                quantity=item.quantity,
                category=item.category,
            )
            for item in meal.items
        ]
        meals_out.append(
            MealResponse(
                id=meal.id,
                day_number=meal.day_number,
                meal_type=meal.meal_type,
                name=meal.name,
                calories=meal.calories,
                protein_g=meal.protein_g,
                carbs_g=meal.carbs_g,
                fat_g=meal.fat_g,
                recipe_notes=meal.recipe_notes,
                items=items_out,
            )
        )
    return MealPlanResponse(
        id=plan.id,
        name=plan.name,
        goal=plan.goal,
        target_calories=plan.target_calories,
        target_protein_g=plan.target_protein_g,
        target_carbs_g=plan.target_carbs_g,
        target_fat_g=plan.target_fat_g,
        duration_days=plan.duration_days,
        is_active=plan.is_active,
        meals=meals_out,
        created_at=plan.created_at,
    )


@router.get("/plans", response_model=list[MealPlanResponse])
def list_meal_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plans = db.query(MealPlan).filter(MealPlan.user_id == current_user.id).all()
    return [_serialize_meal_plan(p) for p in plans]


@router.post("/plans", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
def create_meal_plan(
    data: MealPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = MealPlan(
        user_id=current_user.id,
        name=data.name,
        goal=data.goal,
        target_calories=data.target_calories,
        target_protein_g=data.target_protein_g,
        target_carbs_g=data.target_carbs_g,
        target_fat_g=data.target_fat_g,
        duration_days=data.duration_days,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return _serialize_meal_plan(plan)


@router.get("/plans/{plan_id}", response_model=MealPlanResponse)
def get_meal_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(MealPlan).filter(
        MealPlan.id == plan_id, MealPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")
    return _serialize_meal_plan(plan)


@router.put("/plans/{plan_id}", response_model=MealPlanResponse)
def update_meal_plan(
    plan_id: int,
    data: MealPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(MealPlan).filter(
        MealPlan.id == plan_id, MealPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")

    if data.name is not None:
        plan.name = data.name
    if data.goal is not None:
        plan.goal = data.goal
    if data.target_calories is not None:
        plan.target_calories = data.target_calories
    if data.target_protein_g is not None:
        plan.target_protein_g = data.target_protein_g
    if data.target_carbs_g is not None:
        plan.target_carbs_g = data.target_carbs_g
    if data.target_fat_g is not None:
        plan.target_fat_g = data.target_fat_g
    if data.duration_days is not None:
        plan.duration_days = data.duration_days

    plan.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(plan)
    return _serialize_meal_plan(plan)


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(MealPlan).filter(
        MealPlan.id == plan_id, MealPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")
    db.delete(plan)
    db.commit()


@router.patch("/plans/{plan_id}/activate", response_model=MealPlanResponse)
def activate_meal_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(MealPlan).filter(
        MealPlan.id == plan_id, MealPlan.user_id == current_user.id
    ).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")

    # Deactivate all other meal plans for this user
    db.query(MealPlan).filter(
        MealPlan.user_id == current_user.id, MealPlan.id != plan_id
    ).update({"is_active": False})

    plan.is_active = True
    plan.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(plan)
    return _serialize_meal_plan(plan)


@router.post("/plans/generate", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
def generate_meal_plan(
    data: GenerateMealRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    generated = claude_service.generate_meal_plan(
        goal=data.goal,
        target_calories=data.target_calories,
        target_protein_g=data.target_protein_g,
        target_carbs_g=data.target_carbs_g,
        target_fat_g=data.target_fat_g,
        duration_days=data.duration_days,
        dietary_restrictions=data.dietary_restrictions,
    )

    plan = MealPlan(
        user_id=current_user.id,
        name=generated["name"],
        goal=data.goal,
        target_calories=data.target_calories,
        target_protein_g=data.target_protein_g,
        target_carbs_g=data.target_carbs_g,
        target_fat_g=data.target_fat_g,
        duration_days=data.duration_days,
    )
    db.add(plan)
    db.flush()  # get plan.id

    for meal_data in generated.get("meals", []):
        meal = Meal(
            plan_id=plan.id,
            day_number=meal_data.get("day_number", 1),
            meal_type=meal_data.get("meal_type", "breakfast"),
            name=meal_data.get("name", ""),
            calories=meal_data.get("calories"),
            protein_g=meal_data.get("protein_g"),
            carbs_g=meal_data.get("carbs_g"),
            fat_g=meal_data.get("fat_g"),
            recipe_notes=meal_data.get("recipe_notes"),
        )
        db.add(meal)
        db.flush()  # get meal.id

        for ingredient in meal_data.get("ingredients", []):
            item = MealItem(
                meal_id=meal.id,
                ingredient_name=ingredient.get("ingredient_name", ""),
                quantity=ingredient.get("quantity"),
                category=ingredient.get("category"),
            )
            db.add(item)

    db.commit()
    db.refresh(plan)
    return _serialize_meal_plan(plan)
