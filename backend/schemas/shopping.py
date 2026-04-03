from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ShoppingListItemBase(BaseModel):
    ingredient_name: str
    quantity: Optional[str] = None
    category: Optional[str] = None


class ShoppingListItemCreate(ShoppingListItemBase):
    pass


class ShoppingListItemUpdate(BaseModel):
    ingredient_name: Optional[str] = None
    quantity: Optional[str] = None
    category: Optional[str] = None
    is_checked: Optional[bool] = None


class ShoppingListItemResponse(ShoppingListItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_checked: bool
    walmart_product_id: Optional[str] = None
    walmart_price_cents: Optional[int] = None
    walmart_product_url: Optional[str] = None


class ShoppingListBase(BaseModel):
    name: str
    meal_plan_id: Optional[int] = None


class ShoppingListCreate(ShoppingListBase):
    pass


class ShoppingListResponse(ShoppingListBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    items: list[ShoppingListItemResponse] = []


class WalmartProduct(BaseModel):
    item_id: str
    name: str
    sale_price: float
    thumbnail_image: str
    product_url: str
    customer_rating: str


class WalmartSelectRequest(BaseModel):
    walmart_product_id: str
    walmart_price_cents: int
    walmart_product_url: str
