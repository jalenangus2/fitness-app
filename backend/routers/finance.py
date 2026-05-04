"""Finance router: Plaid bank connection, transactions, and budgets."""
from datetime import datetime, date
from calendar import monthrange
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import extract, func

from ..database import get_db
from ..models.finance import PlaidItem, PlaidAccount, Transaction, Budget, FinancialGoal
from ..models.user import User
from ..routers.auth import get_current_user
from ..schemas.finance import (
    AccountResponse, BudgetCreate, BudgetResponse, BudgetUpdate,
    CategoryAmount, FinanceSummary, PlaidExchangeRequest,
    PlaidLinkTokenResponse, SyncResponse, TransactionCategoryUpdate, TransactionResponse,
    FinancialGoalCreate, FinancialGoalUpdate, FinancialGoalResponse,
)
from ..services import plaid_service
from ..config import get_settings

router = APIRouter()


def _require_plaid(settings=None):
    if settings is None:
        settings = get_settings()
    if not settings.PLAID_CLIENT_ID or not settings.PLAID_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to backend/.env",
        )


# ─── Plaid Link ───────────────────────────────────────────────────────────────

@router.post("/link/token", response_model=PlaidLinkTokenResponse)
def create_link_token(
    current_user: User = Depends(get_current_user),
):
    _require_plaid()
    try:
        link_token = plaid_service.create_link_token(current_user.id)
        return PlaidLinkTokenResponse(link_token=link_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plaid error: {str(e)}")


@router.post("/link/exchange", response_model=SyncResponse)
def exchange_token(
    data: PlaidExchangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_plaid()
    try:
        access_token = plaid_service.exchange_public_token(data.public_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token exchange failed: {str(e)}")

    # Get item_id from Plaid (embed in access_token call result isn't returned directly)
    # We'll use a placeholder item_id derived from the access_token hash
    import hashlib
    item_id = hashlib.sha256(access_token.encode()).hexdigest()[:32]

    plaid_item = PlaidItem(
        user_id=current_user.id,
        item_id=item_id,
        access_token=access_token,
        institution_name=data.institution_name,
        institution_id=data.institution_id,
    )
    db.add(plaid_item)
    db.flush()

    # Fetch and save accounts
    try:
        accounts_data = plaid_service.get_accounts(access_token)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")

    for acct in accounts_data:
        existing = db.query(PlaidAccount).filter(PlaidAccount.account_id == acct["account_id"]).first()
        if not existing:
            db.add(PlaidAccount(
                item_id=plaid_item.id,
                user_id=current_user.id,
                **acct,
            ))
    db.flush()

    # Sync initial transactions
    added_count = 0
    try:
        sync_result = plaid_service.sync_transactions(access_token)
        added_count = _apply_sync(db, current_user.id, plaid_item, sync_result)
    except Exception:
        pass  # transactions sync failure shouldn't block account connection

    db.commit()
    return SyncResponse(added=added_count, modified=0, removed=0)


# ─── Accounts ─────────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=list[AccountResponse])
def list_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accounts = db.query(PlaidAccount).filter(PlaidAccount.user_id == current_user.id).all()
    result = []
    for acct in accounts:
        result.append(AccountResponse(
            id=acct.id,
            account_id=acct.account_id,
            name=acct.name,
            official_name=acct.official_name,
            type=acct.type,
            subtype=acct.subtype,
            current_balance=acct.current_balance,
            available_balance=acct.available_balance,
            currency=acct.currency,
            mask=acct.mask,
            institution_name=acct.item.institution_name if acct.item else None,
        ))
    return result


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acct = db.query(PlaidAccount).filter(
        PlaidAccount.id == account_id, PlaidAccount.user_id == current_user.id
    ).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")

    # If this is the only account for the item, delete the item too
    item = acct.item
    db.delete(acct)
    if item and len(item.accounts) <= 1:
        db.delete(item)
    db.commit()


# ─── Sync ─────────────────────────────────────────────────────────────────────

@router.post("/sync", response_model=SyncResponse)
def sync_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_plaid()
    items = db.query(PlaidItem).filter(PlaidItem.user_id == current_user.id).all()
    total_added = total_modified = total_removed = 0

    for item in items:
        try:
            result = plaid_service.sync_transactions(item.access_token, item.cursor)
            added, modified, removed = _apply_sync(db, current_user.id, item, result)
            total_added += added
            total_modified += modified
            total_removed += removed
        except Exception:
            continue

    db.commit()
    return SyncResponse(added=total_added, modified=total_modified, removed=total_removed)


# ─── Transactions ─────────────────────────────────────────────────────────────

@router.get("/transactions", response_model=list[TransactionResponse])
def list_transactions(
    month: Optional[str] = Query(None, description="YYYY-MM"),
    category: Optional[str] = Query(None),
    account_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if month:
        try:
            year, mon = int(month.split("-")[0]), int(month.split("-")[1])
            q = q.filter(
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) == mon,
            )
        except Exception:
            pass

    if category:
        q = q.filter(
            (Transaction.custom_category == category) |
            ((Transaction.custom_category == None) & (Transaction.category == category))
        )

    if account_id:
        q = q.filter(Transaction.account_id == account_id)

    if search:
        q = q.filter(Transaction.name.ilike(f"%{search}%"))

    txns = q.order_by(Transaction.date.desc()).offset(offset).limit(limit).all()

    result = []
    for t in txns:
        result.append(TransactionResponse(
            id=t.id,
            transaction_id=t.transaction_id,
            name=t.name,
            amount=t.amount,
            date=t.date,
            category=t.category,
            category_detailed=t.category_detailed,
            custom_category=t.custom_category,
            merchant_name=t.merchant_name,
            pending=t.pending,
            logo_url=t.logo_url,
            account_name=t.account.name if t.account else "Unknown",
            account_id=t.account.account_id if t.account else "",
        ))
    return result


@router.patch("/transactions/{txn_id}/category", response_model=TransactionResponse)
def update_category(
    txn_id: int,
    data: TransactionCategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = db.query(Transaction).filter(
        Transaction.id == txn_id, Transaction.user_id == current_user.id
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    txn.custom_category = data.custom_category
    db.commit()
    db.refresh(txn)
    return TransactionResponse(
        id=txn.id, transaction_id=txn.transaction_id, name=txn.name,
        amount=txn.amount, date=txn.date, category=txn.category,
        category_detailed=txn.category_detailed, custom_category=txn.custom_category,
        merchant_name=txn.merchant_name, pending=txn.pending, logo_url=txn.logo_url,
        account_name=txn.account.name if txn.account else "Unknown",
        account_id=txn.account.account_id if txn.account else "",
    )


# ─── Budgets ──────────────────────────────────────────────────────────────────

@router.get("/budgets", response_model=list[BudgetResponse])
def list_budgets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    today = date.today()
    return [_budget_with_spend(db, b, today.year, today.month) for b in budgets]


@router.post("/budgets", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = Budget(user_id=current_user.id, **data.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    today = date.today()
    return _budget_with_spend(db, budget, today.year, today.month)


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id, Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(budget, k, v)
    budget.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(budget)
    today = date.today()
    return _budget_with_spend(db, budget, today.year, today.month)


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id, Budget.user_id == current_user.id
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(budget)
    db.commit()


# ─── Summary ──────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=FinanceSummary)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    accounts = db.query(PlaidAccount).filter(PlaidAccount.user_id == current_user.id).all()

    # Net balance: depository positive, credit negative
    total_balance = sum(
        (a.current_balance or 0) * (-1 if a.type == "credit" else 1)
        for a in accounts
    )

    # Monthly spend (positive transactions = money out)
    month_txns = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        extract("year", Transaction.date) == today.year,
        extract("month", Transaction.date) == today.month,
        Transaction.amount > 0,
        Transaction.pending == False,
    ).all()

    monthly_spend = sum(t.amount for t in month_txns)

    # Top categories
    cat_totals: dict[str, float] = {}
    for t in month_txns:
        cat = t.custom_category or t.category or "Other"
        cat_totals[cat] = cat_totals.get(cat, 0) + t.amount
    top_categories = [
        CategoryAmount(category=k, amount=round(v, 2))
        for k, v in sorted(cat_totals.items(), key=lambda x: -x[1])[:6]
    ]

    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    budgets_with_spend = [_budget_with_spend(db, b, today.year, today.month) for b in budgets]

    account_responses = [
        AccountResponse(
            id=a.id, account_id=a.account_id, name=a.name,
            official_name=a.official_name, type=a.type, subtype=a.subtype,
            current_balance=a.current_balance, available_balance=a.available_balance,
            currency=a.currency, mask=a.mask,
            institution_name=a.item.institution_name if a.item else None,
        )
        for a in accounts
    ]

    return FinanceSummary(
        total_balance=round(total_balance, 2),
        monthly_spend=round(monthly_spend, 2),
        top_categories=top_categories,
        budgets_with_spend=budgets_with_spend,
        accounts=account_responses,
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _apply_sync(db: Session, user_id: int, item: PlaidItem, result: dict) -> tuple[int, int, int]:
    """Apply a Plaid sync result to the database. Returns (added, modified, removed)."""
    # Map Plaid account_id → local PlaidAccount.id
    acct_map = {a.account_id: a.id for a in item.accounts}

    added = 0
    for txn_data in result.get("added", []):
        plaid_acct_id = txn_data.pop("account_id", None)
        local_acct_id = acct_map.get(plaid_acct_id)
        if not local_acct_id:
            continue
        existing = db.query(Transaction).filter(
            Transaction.transaction_id == txn_data["transaction_id"]
        ).first()
        if not existing:
            db.add(Transaction(user_id=user_id, account_id=local_acct_id, **txn_data))
            added += 1

    modified = 0
    for txn_data in result.get("modified", []):
        plaid_acct_id = txn_data.pop("account_id", None)
        txn = db.query(Transaction).filter(
            Transaction.transaction_id == txn_data["transaction_id"]
        ).first()
        if txn:
            for k, v in txn_data.items():
                if k != "transaction_id":
                    setattr(txn, k, v)
            modified += 1

    removed = 0
    for txn_data in result.get("removed", []):
        txn = db.query(Transaction).filter(
            Transaction.transaction_id == txn_data["transaction_id"]
        ).first()
        if txn:
            db.delete(txn)
            removed += 1

    if result.get("next_cursor"):
        item.cursor = result["next_cursor"]

    return added, modified, removed


# ─── Financial Goals ──────────────────────────────────────────────────────────

def _serialize_goal(goal: FinancialGoal) -> FinancialGoalResponse:
    today = date.today()
    days_remaining = (goal.target_date - today).days if goal.target_date else None
    remaining = max(0.0, goal.target_amount - goal.current_amount)
    daily = round(remaining / days_remaining, 2) if days_remaining and days_remaining > 0 else None
    weekly = round(daily * 7, 2) if daily is not None else None
    pct = round(min(100.0, (goal.current_amount / goal.target_amount) * 100), 1) if goal.target_amount > 0 else 0.0
    return FinancialGoalResponse(
        id=goal.id, user_id=goal.user_id, goal_name=goal.goal_name,
        target_amount=goal.target_amount, current_amount=goal.current_amount,
        target_date=goal.target_date, days_remaining=days_remaining,
        daily_savings_needed=daily, weekly_savings_needed=weekly,
        percent_complete=pct, created_at=goal.created_at,
    )


@router.get("/goals", response_model=list[FinancialGoalResponse])
def list_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).all()
    return [_serialize_goal(g) for g in goals]


@router.post("/goals", response_model=FinancialGoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(data: FinancialGoalCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = FinancialGoal(user_id=current_user.id, **data.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _serialize_goal(goal)


@router.put("/goals/{goal_id}", response_model=FinancialGoalResponse)
def update_goal(goal_id: int, data: FinancialGoalUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(FinancialGoal).filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    return _serialize_goal(goal)


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goal = db.query(FinancialGoal).filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _budget_with_spend(db: Session, budget: Budget, year: int, month: int) -> BudgetResponse:
    """Compute spent amount for a budget category in given month."""
    spent = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == budget.user_id,
        extract("year", Transaction.date) == year,
        extract("month", Transaction.date) == month,
        Transaction.amount > 0,
        Transaction.pending == False,
        (Transaction.custom_category == budget.category) |
        ((Transaction.custom_category == None) & (Transaction.category == budget.category)),
    ).scalar() or 0.0

    spent_cents = int(spent * 100)
    pct = round((spent_cents / budget.amount_cents) * 100, 1) if budget.amount_cents else 0.0
    return BudgetResponse(
        id=budget.id,
        category=budget.category,
        name=budget.name,
        amount_cents=budget.amount_cents,
        color=budget.color,
        spent_cents=spent_cents,
        percent_used=pct,
    )
