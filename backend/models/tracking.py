from datetime import datetime, date
from sqlalchemy import Integer, String, Text, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("workout_plans.id"), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    duration_mins: Mapped[int] = mapped_column(Integer, nullable=True)
    overall_rpe: Mapped[float] = mapped_column(Float, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="workout_sessions")
    set_logs = relationship("WorkoutSetLog", back_populates="session", cascade="all, delete-orphan",
                            order_by="WorkoutSetLog.id")


class WorkoutSetLog(Base):
    __tablename__ = "workout_set_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("workout_sessions.id", ondelete="CASCADE"),
                                            nullable=False)
    exercise_name: Mapped[str] = mapped_column(String, nullable=False)
    set_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    reps: Mapped[int] = mapped_column(Integer, nullable=True)
    weight_lbs: Mapped[float] = mapped_column(Float, nullable=True)
    duration_secs: Mapped[int] = mapped_column(Integer, nullable=True)
    rest_secs: Mapped[int] = mapped_column(Integer, nullable=True)
    rpe: Mapped[float] = mapped_column(Float, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session = relationship("WorkoutSession", back_populates="set_logs")


class FoodLogEntry(Base):
    __tablename__ = "food_log_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    meal_type: Mapped[str] = mapped_column(String, nullable=False)  # breakfast|lunch|dinner|snack
    food_name: Mapped[str] = mapped_column(String, nullable=False)
    brand: Mapped[str] = mapped_column(String, nullable=True)
    serving_size: Mapped[float] = mapped_column(Float, nullable=True)
    serving_unit: Mapped[str] = mapped_column(String, nullable=True)
    calories: Mapped[float] = mapped_column(Float, nullable=True)
    protein_g: Mapped[float] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=True)
    fat_g: Mapped[float] = mapped_column(Float, nullable=True)
    fiber_g: Mapped[float] = mapped_column(Float, nullable=True)
    sugar_g: Mapped[float] = mapped_column(Float, nullable=True)
    sodium_mg: Mapped[float] = mapped_column(Float, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="food_log_entries")


class WaterLog(Base):
    __tablename__ = "water_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_oz: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="water_logs")


class BodyMetric(Base):
    __tablename__ = "body_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    metric_date: Mapped[date] = mapped_column(Date, nullable=False)
    weight_lbs: Mapped[float] = mapped_column(Float, nullable=True)
    body_fat_pct: Mapped[float] = mapped_column(Float, nullable=True)
    chest_in: Mapped[float] = mapped_column(Float, nullable=True)
    waist_in: Mapped[float] = mapped_column(Float, nullable=True)
    hips_in: Mapped[float] = mapped_column(Float, nullable=True)
    bicep_in: Mapped[float] = mapped_column(Float, nullable=True)
    thigh_in: Mapped[float] = mapped_column(Float, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="body_metrics")


class SleepLog(Base):
    __tablename__ = "sleep_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    sleep_date: Mapped[date] = mapped_column(Date, nullable=False)
    bedtime: Mapped[str] = mapped_column(String, nullable=True)
    wake_time: Mapped[str] = mapped_column(String, nullable=True)
    duration_hours: Mapped[float] = mapped_column(Float, nullable=True)
    quality_rating: Mapped[int] = mapped_column(Integer, nullable=True)  # 1–5
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sleep_logs")


class RecoveryLog(Base):
    __tablename__ = "recovery_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    overall_soreness: Mapped[int] = mapped_column(Integer, nullable=True)  # 1–10
    fatigue_level: Mapped[int] = mapped_column(Integer, nullable=True)     # 1–10
    mood: Mapped[int] = mapped_column(Integer, nullable=True)              # 1–5
    stress_level: Mapped[int] = mapped_column(Integer, nullable=True)      # 1–10
    muscle_soreness: Mapped[str] = mapped_column(Text, nullable=True)      # JSON: {chest: 3, legs: 7}
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recovery_logs")
