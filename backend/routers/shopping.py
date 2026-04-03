"""Shopping lists router: CRUD, item management, and Walmart integration."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.meal import MealItem, MealPlan
from ..models.shopping import ShoppingList, ShoppingListItem
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.shopping import (
    ShoppingListCreate,
    ShoppingListItemCreate,
    ShoppingListItemResponse,
    ShoppingListItemUpdate,
    ShoppingListResponse,
    WalmartProduct,
    WalmartSelectRequest,
)
from ..services import walmart_service

router = APIRouter()


def _serialize_list(shopping_list: ShoppingList) -> ShoppingListResponse:
    items_out = [
        ShoppingListItemResponse(
            id=item.id,
            ingredient_name=item.ingredient_name,
            quantity=item.quantity,
            category=item.category,
            is_checked=item.is_checked,
            walmart_product_id=item.walmart_product_id,
            walmart_price_cents=item.walmart_price_cents,
            walmart_product_url=item.walmart_product_url,
        )
        for item in shopping_list.items
    ]
    return ShoppingListResponse(
        id=shopping_list.id,
        name=shopping_list.name,
        meal_plan_id=shopping_list.meal_plan_id,
        created_at=shopping_list.created_at,
        items=items_out,
    )


@router.get("/", response_model=list[ShoppingListResponse])
def list_shopping_lists(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lists = db.query(ShoppingList).filter(ShoppingList.user_id == current_user.id).all()
    return [_serialize_list(sl) for sl in lists]


@router.post("/", response_model=ShoppingListResponse, status_code=status.HTTP_201_CREATED)
def create_shopping_list(
    data: ShoppingListCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # If meal_plan_id provided, verify user owns the meal plan
    if data.meal_plan_id is not None:
        meal_plan = db.query(MealPlan).filter(
            MealPlan.id == data.meal_plan_id, MealPlan.user_id == current_user.id
        ).first()
        if not meal_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meal plan not found",
            )

    shopping_list = ShoppingList(
        user_id=current_user.id,
        name=data.name,
        meal_plan_id=data.meal_plan_id,
    )
    db.add(shopping_list)
    db.flush()  # get shopping_list.id

    # Auto-populate items from meal plan if provided
    if data.meal_plan_id is not None:
        # Collect all MealItems from the meal plan, de-duplicating by ingredient name
        seen: set[str] = set()
        meal_items = (
            db.query(MealItem)
            .join(MealItem.meal)
            .filter(MealItem.meal.has(plan_id=data.meal_plan_id))
            .all()
        )
        for mi in meal_items:
            key = mi.ingredient_name.lower().strip()
            if key not in seen:
                seen.add(key)
                sli = ShoppingListItem(
                    list_id=shopping_list.id,
                    ingredient_name=mi.ingredient_name,
                    quantity=mi.quantity,
                    category=mi.category,
                )
                db.add(sli)

    db.commit()
    db.refresh(shopping_list)
    return _serialize_list(shopping_list)


@router.get("/{list_id}", response_model=ShoppingListResponse)
def get_shopping_list(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shopping_list = db.query(ShoppingList).filter(
        ShoppingList.id == list_id, ShoppingList.user_id == current_user.id
    ).first()
    if not shopping_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping list not found")
    return _serialize_list(shopping_list)


@router.put("/{list_id}", response_model=ShoppingListResponse)
def rename_shopping_list(
    list_id: int,
    data: ShoppingListCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shopping_list = db.query(ShoppingList).filter(
        ShoppingList.id == list_id, ShoppingList.user_id == current_user.id
    ).first()
    if not shopping_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping list not found")

    shopping_list.name = data.name
    shopping_list.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(shopping_list)
    return _serialize_list(shopping_list)


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shopping_list(
    list_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shopping_list = db.query(ShoppingList).filter(
        ShoppingList.id == list_id, ShoppingList.user_id == current_user.id
    ).first()
    if not shopping_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping list not found")
    db.delete(shopping_list)
    db.commit()


@router.post("/{list_id}/items", response_model=ShoppingListItemResponse, status_code=status.HTTP_201_CREATED)
def add_item_to_list(
    list_id: int,
    data: ShoppingListItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shopping_list = db.query(ShoppingList).filter(
        ShoppingList.id == list_id, ShoppingList.user_id == current_user.id
    ).first()
    if not shopping_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping list not found")

    item = ShoppingListItem(
        list_id=list_id,
        ingredient_name=data.ingredient_name,
        quantity=data.quantity,
        category=data.category,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ShoppingListItemResponse(
        id=item.id,
        ingredient_name=item.ingredient_name,
        quantity=item.quantity,
        category=item.category,
        is_checked=item.is_checked,
        walmart_product_id=item.walmart_product_id,
        walmart_price_cents=item.walmart_price_cents,
        walmart_product_url=item.walmart_product_url,
    )


@router.put("/{list_id}/items/{item_id}", response_model=ShoppingListItemResponse)
def update_list_item(
    list_id: int,
    item_id: int,
    data: ShoppingListItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify list ownership
    shopping_list = db.query(ShoppingList).filter(
        ShoppingList.id == list_id, ShoppingList.user_id == current_user.id
    ).first()
    if not shopping_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping list not found")

    item = db.query(ShoppingListItem).filter(
        ShoppingListItem.id == item_id, ShoppingListItem.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if data.ingredient_name is not None:
        item.ingredient_name = data.ingredient_name
    if data.quantity is not None:
        item.quantity = data.quantity
    if data.category is not None:
        item.category = data.category
    if data.is_checked is not None:
        item.is_checked = data.is_checked

    db.commit()
    db.refresh(item)
    return ShoppingListItemResponse(
        id=item.id,
        ingredient_name=item.ingredient_name,
        quantity=item.quantity,
        category=item.category,
        is_checked=item.is_checked,
        walmart_product_id=item.walmart_product_id,
        walmart_price_cents=item.walmart_price_cents,
        walmart_product_url=item.walmart_product_url,
    )


@router.delete("/{list_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list_item(
    list_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shopping_list = db.query(ShoppingList).filter(
        ShoppingList.id == list_id, ShoppingList.user_id == current_user.id
    ).first()
    if not shopping_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping list not found")

    item = db.query(ShoppingListItem).filter(
        ShoppingListItem.id == item_id, ShoppingListItem.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    db.delete(item)
    db.commit()


@router.post("/{list_id}/items/{item_id}/walmart-search", response_model=list[WalmartProduct])
async def walmart_search_for_item(
    list_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shopping_list = db.query(ShoppingList).filter(
        ShoppingList.id == list_id, ShoppingList.user_id == current_user.id
    ).first()
    if not shopping_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping list not found")

    item = db.query(ShoppingListItem).filter(
        ShoppingListItem.id == item_id, ShoppingListItem.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    products = await walmart_service.search_products(item.ingredient_name)
    return [WalmartProduct(**p) for p in products]


@router.patch("/{list_id}/items/{item_id}/walmart-select", response_model=ShoppingListItemResponse)
def walmart_select_product(
    list_id: int,
    item_id: int,
    data: WalmartSelectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    shopping_list = db.query(ShoppingList).filter(
        ShoppingList.id == list_id, ShoppingList.user_id == current_user.id
    ).first()
    if not shopping_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shopping list not found")

    item = db.query(ShoppingListItem).filter(
        ShoppingListItem.id == item_id, ShoppingListItem.list_id == list_id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    item.walmart_product_id = data.walmart_product_id
    item.walmart_price_cents = data.walmart_price_cents
    item.walmart_product_url = data.walmart_product_url
    db.commit()
    db.refresh(item)
    return ShoppingListItemResponse(
        id=item.id,
        ingredient_name=item.ingredient_name,
        quantity=item.quantity,
        category=item.category,
        is_checked=item.is_checked,
        walmart_product_id=item.walmart_product_id,
        walmart_price_cents=item.walmart_price_cents,
        walmart_product_url=item.walmart_product_url,
    )
