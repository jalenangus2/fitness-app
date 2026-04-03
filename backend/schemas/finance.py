from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict, computed_field


# ─── Plaid Link ───────────────────────────────────────────────────────────────

class PlaidLinkTokenResponse(BaseModel):
    link_token: str


class PlaidExchangeRequest(BaseModel):
    public_token: str
    institution_name: str
    institution_id: str


# ─── Accounts ─────────────────────────────────────────────────────────────────

class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: str
    name: str
    official_name: Optional[str]
    type: str
    subtype: Optional[str]
    current_balance: Optional[float]
    available_balance: Optional[float]
    currency: str
    mask: Optional[str]
    institution_name: Optional[str]


# ─── Transactions ─────────────────────────────────────────────────────────────

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    transaction_id: str
    name: str
    amount: float
    date: date
    category: Optional[str]
    category_detailed: Optional[str]
    custom_category: Optional[str]
    merchant_name: Optional[str]
    pending: bool
    logo_url: Optional[str]
    account_name: str
    account_id: str


class TransactionCategoryUpdate(BaseModel):
    custom_category: str


# ─── Budgets ──────────────────────────────────────────────────────────────────

class BudgetCreate(BaseModel):
    category: str
    name: str
    amount_cents: int
    color: str = "#6366f1"


class BudgetUpdate(BaseModel):
    category: Optional[str] = None
    name: Optional[str] = None
    amount_cents: Optional[int] = None
    color: Optional[str] = None


class BudgetResponse(BaseModel):
    id: int
    category: str
    name: str
    amount_cents: int
    color: str
    spent_cents: int
    percent_used: float


# ─── Sync ─────────────────────────────────────────────────────────────────────

class SyncResponse(BaseModel):
    added: int
    modified: int
    removed: int


# ─── Summary ──────────────────────────────────────────────────────────────────

class CategoryAmount(BaseModel):
    category: str
    amount: float


class FinanceSummary(BaseModel):
    total_balance: float
    monthly_spend: float
    top_categories: list[CategoryAmount]
    budgets_with_spend: list[BudgetResponse]
    accounts: list[AccountResponse]
