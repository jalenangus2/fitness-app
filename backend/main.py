"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import auth, workout, meal, shopping, schedule, fashion, dashboard, finance

import os
print(f"DEBUG: Plaid ID is {os.getenv('PLAID_CLIENT_ID')}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="LifeOS API",
    description="Personal lifestyle app: fitness, nutrition, shopping, schedule, and fashion.",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
    ],
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
app.include_router(finance.router,  prefix="/api/v1/finance",   tags=["finance"])


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}
