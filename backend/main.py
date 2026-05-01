"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import auth, workout, meal, shopping, schedule, fashion, dashboard, finance, tracking

import os

def _run_migrations() -> None:
    """Add columns that were added after initial table creation."""
    from sqlalchemy import text
    is_pg = not str(engine.url).startswith("sqlite")
    if is_pg:
        stmts = [
            "ALTER TABLE workout_plans ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false",
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_rule TEXT",
            "ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false",
            "ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS weight_lbs REAL",
        ]
        with engine.connect() as conn:
            for sql in stmts:
                conn.execute(text(sql))
            conn.commit()
    else:
        stmts = [
            "ALTER TABLE workout_plans ADD COLUMN is_ai_generated BOOLEAN DEFAULT 0",
            "ALTER TABLE tasks ADD COLUMN recurrence_rule TEXT",
            "ALTER TABLE meal_plans ADD COLUMN is_ai_generated BOOLEAN DEFAULT 0",
            "ALTER TABLE workout_exercises ADD COLUMN weight_lbs REAL",
        ]
        with engine.connect() as conn:
            for sql in stmts:
                try:
                    conn.execute(text(sql))
                    conn.commit()
                except Exception:
                    pass  # column already exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    yield


app = FastAPI(
    title="LifeOS API",
    description="Personal lifestyle app: fitness, nutrition, shopping, schedule, and fashion.",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

_local_origins = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
    "http://localhost:5175", "http://127.0.0.1:5175",
]
_extra = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins = _local_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,     prefix="/api/v1/auth",      tags=["auth"])
app.include_router(workout.router,  prefix="/api/v1/workouts",  tags=["workout"])
app.include_router(meal.router,     prefix="/api/v1/meals",     tags=["meal"])
app.include_router(shopping.router, prefix="/api/v1/shopping",  tags=["shopping"])
app.include_router(schedule.router, prefix="/api/v1/schedule",  tags=["schedule"])
app.include_router(fashion.router,  prefix="/api/v1/fashion",   tags=["fashion"])
app.include_router(dashboard.router,prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(finance.router,   prefix="/api/v1/finance",   tags=["finance"])
app.include_router(tracking.router,  prefix="/api/v1/tracking",  tags=["tracking"])


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
