from datetime import datetime, date
from sqlalchemy import Integer, String, Boolean, DateTime, Date, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class PlaidItem(Base):
    __tablename__ = "plaid_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    item_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    access_token: Mapped[str] = mapped_column(String, nullable=False)
    institution_name: Mapped[str] = mapped_column(String, nullable=True)
    institution_id: Mapped[str] = mapped_column(String, nullable=True)
    cursor: Mapped[str] = mapped_column(String, nullable=True)  # for transaction sync
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="plaid_items")
    accounts = relationship("PlaidAccount", back_populates="item", cascade="all, delete-orphan")


class PlaidAccount(Base):
    __tablename__ = "plaid_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(Integer, ForeignKey("plaid_items.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    account_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # Plaid account_id
    name: Mapped[str] = mapped_column(String, nullable=False)
    official_name: Mapped[str] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False)        # depository, credit, investment
    subtype: Mapped[str] = mapped_column(String, nullable=True)      # checking, savings, credit card
    current_balance: Mapped[float] = mapped_column(Float, nullable=True)
    available_balance: Mapped[float] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String, default="USD")
    mask: Mapped[str] = mapped_column(String, nullable=True)         # last 4 digits
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    item = relationship("PlaidItem", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("plaid_accounts.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    transaction_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)  # Plaid transaction_id
    name: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)     # positive = debit, negative = credit
    date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=True)     # Plaid category (primary)
    category_detailed: Mapped[str] = mapped_column(String, nullable=True)  # Plaid detailed category
    custom_category: Mapped[str] = mapped_column(String, nullable=True)    # user override
    merchant_name: Mapped[str] = mapped_column(String, nullable=True)
    pending: Mapped[bool] = mapped_column(Boolean, default=False)
    logo_url: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    account = relationship("PlaidAccount", back_populates="transactions")


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)    # matches transaction category
    name: Mapped[str] = mapped_column(String, nullable=False)        # display name
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)  # monthly budget in cents
    color: Mapped[str] = mapped_column(String, default="#6366f1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="budgets")


class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    goal_name: Mapped[str] = mapped_column(String, nullable=False)
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    current_amount: Mapped[float] = mapped_column(Float, default=0.0)
    target_date: Mapped[date] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="financial_goals")
