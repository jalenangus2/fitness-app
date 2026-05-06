from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date

# --- Items & Meals ---
class MealItemBase(BaseModel):
    ingredient_name: str
    quantity: Optional[str] = None
    category: Optional[str] = None

class MealItemCreate(MealItemBase):
    pass

class MealItemResponse(MealItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

class MealBase(BaseModel):
    day_number: int
    meal_type: str
    name: str
    calories: Optional[int] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    recipe_notes: Optional[str] = None

class MealCreate(MealBase):
    items: List[MealItemCreate] = []

class MealResponse(MealBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    items: List[MealItemResponse] = []

# --- Plans ---
class MealPlanBase(BaseModel):
    name: str
    goal: Optional[str] = None
    target_calories: Optional[int] = None
    target_protein_g: Optional[int] = None
    target_carbs_g: Optional[int] = None
    target_fat_g: Optional[int] = None
    duration_days: int = 7
    is_ai_generated: bool = False

class MealPlanCreate(MealPlanBase):
    meals: Optional[List[MealCreate]] = []

class MealPlanUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    target_calories: Optional[int] = None
    target_protein_g: Optional[int] = None
    target_carbs_g: Optional[int] = None
    target_fat_g: Optional[int] = None
    duration_days: Optional[int] = None

class MealPlanResponse(MealPlanBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    meals: List[MealResponse] = []
    created_at: datetime

class GenerateMealRequest(BaseModel):
    goal: str
    target_calories: int
    target_protein_g: int
    target_carbs_g: int
    target_fat_g: int
    duration_days: int = 7
    dietary_restrictions: List[str] = []

# --- Food Items & Logging ---
class FoodItemBase(BaseModel):
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    serving_size: Optional[str] = None

class FoodItemCreate(FoodItemBase):
    pass

class FoodItemResponse(FoodItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: int

class NutritionLogBase(BaseModel):
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float

class NutritionLogCreate(NutritionLogBase):
    log_date: Optional[date] = None

class NutritionLogResponse(NutritionLogBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    consumed_at: datetime