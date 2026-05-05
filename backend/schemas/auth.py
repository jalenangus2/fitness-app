from pydantic import BaseModel, ConfigDict
from typing import Optional


class UserCreate(BaseModel):
    email: str
    username: str
    password: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = None


class NutritionGoalsUpdate(BaseModel):
    nutrition_target_calories: Optional[int] = None
    nutrition_target_protein_g: Optional[int] = None
    nutrition_target_carbs_g: Optional[int] = None
    nutrition_target_fat_g: Optional[int] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    display_name: Optional[str] = None
    nutrition_target_calories: Optional[int] = None
    nutrition_target_protein_g: Optional[int] = None
    nutrition_target_carbs_g: Optional[int] = None
    nutrition_target_fat_g: Optional[int] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
