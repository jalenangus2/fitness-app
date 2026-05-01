"""Predictive analytics: linear regression for weight forecasting and cross-module insights."""
from datetime import date, timedelta
from typing import Optional
import math


def _linreg(x: list[float], y: list[float]) -> tuple[float, float, float]:
    """Returns (slope, intercept, r_squared) via ordinary least squares."""
    n = len(x)
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    ss_xy = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    ss_xx = sum((xi - mean_x) ** 2 for xi in x)
    slope = ss_xy / ss_xx if ss_xx != 0 else 0.0
    intercept = mean_y - slope * mean_x
    y_pred = [slope * xi + intercept for xi in x]
    ss_res = sum((y[i] - y_pred[i]) ** 2 for i in range(n))
    ss_tot = sum((yi - mean_y) ** 2 for yi in y)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
    return slope, intercept, r_squared


def forecast_weight(
    dates: list[date],
    weights: list[float],
    goal_weight: Optional[float] = None,
    projection_days: int = 90,
) -> dict:
    """
    Fits a linear regression to weight-over-time data and projects forward.
    Returns historical fit, 90-day projection, and estimated goal date.
    """
    if len(weights) < 2:
        return {
            "slope_lbs_per_day": None,
            "r_squared": None,
            "data_points": len(weights),
            "historical": [],
            "projection": [],
            "goal_date": None,
            "goal_weight": goal_weight,
            "insufficient_data": True,
        }

    origin = dates[0]
    x = [float((d - origin).days) for d in dates]
    y = [float(w) for w in weights]

    slope, intercept, r_squared = _linreg(x, y)

    historical = [
        {
            "date": dates[i].isoformat(),
            "actual_weight": round(y[i], 1),
            "fitted_weight": round(slope * x[i] + intercept, 1),
        }
        for i in range(len(dates))
    ]

    last_day = int(max(x))
    projection = [
        {
            "date": (origin + timedelta(days=last_day + d)).isoformat(),
            "predicted_weight": round(slope * (last_day + d) + intercept, 1),
        }
        for d in range(1, projection_days + 1)
    ]

    goal_date = None
    if goal_weight is not None and slope != 0:
        days_to_goal = (goal_weight - intercept) / slope
        if 0 < days_to_goal < 3650:
            goal_date = (origin + timedelta(days=int(days_to_goal))).isoformat()

    return {
        "slope_lbs_per_day": round(slope, 4),
        "r_squared": round(r_squared, 4),
        "data_points": len(weights),
        "historical": historical,
        "projection": projection,
        "goal_date": goal_date,
        "goal_weight": goal_weight,
        "insufficient_data": False,
    }


def cross_module_insights(
    grocery_by_month: dict[str, float],
    calories_by_date: dict[str, float],
    goal_calories: Optional[float] = None,
) -> dict:
    """
    Bridges Plaid grocery spend with food log caloric data by calendar month.

    grocery_by_month: {"2024-01": 312.50, "2024-02": 287.00, ...}
    calories_by_date: {"2024-01-05": 2100, "2024-01-06": 1950, ...}
    goal_calories:    target daily calories (from active meal plan)
    """
    # Aggregate calories by month
    calories_by_month: dict[str, list[float]] = {}
    for date_str, cals in calories_by_date.items():
        month = date_str[:7]
        calories_by_month.setdefault(month, []).append(cals)

    all_months = sorted(set(list(grocery_by_month.keys()) + list(calories_by_month.keys())))

    insights = []
    for month in all_months:
        grocery = grocery_by_month.get(month, 0.0)
        cal_list = calories_by_month.get(month, [])
        avg_cals = sum(cal_list) / len(cal_list) if cal_list else 0.0

        adherence = None
        if goal_calories and goal_calories > 0 and avg_cals > 0:
            # Percentage of goal met; cap display at 150% to avoid outlier inflation
            raw = (avg_cals / goal_calories) * 100
            adherence = round(min(raw, 150.0), 1)

        insights.append({
            "month": month,
            "grocery_spend_dollars": round(grocery, 2),
            "avg_daily_calories": round(avg_cals, 1),
            "caloric_adherence_pct": adherence,
        })

    # Pearson correlation between grocery spend and avg calories (if enough data)
    correlation_note = _correlation_note(
        [i["grocery_spend_dollars"] for i in insights],
        [i["avg_daily_calories"] for i in insights],
    )

    return {
        "insights": insights,
        "correlation_note": correlation_note,
        "has_finance_data": bool(grocery_by_month),
        "has_nutrition_data": bool(calories_by_date),
    }


def _correlation_note(spend: list[float], cals: list[float]) -> str:
    pairs = [(s, c) for s, c in zip(spend, cals) if s > 0 and c > 0]
    if len(pairs) < 3:
        return "Not enough overlapping data to compute correlation yet."

    sx = [p[0] for p in pairs]
    sy = [p[1] for p in pairs]
    n = len(pairs)
    mean_x = sum(sx) / n
    mean_y = sum(sy) / n
    num = sum((sx[i] - mean_x) * (sy[i] - mean_y) for i in range(n))
    den_x = math.sqrt(sum((v - mean_x) ** 2 for v in sx))
    den_y = math.sqrt(sum((v - mean_y) ** 2 for v in sy))
    if den_x == 0 or den_y == 0:
        return "Insufficient variance to compute correlation."
    r = num / (den_x * den_y)
    r = round(r, 2)

    if r > 0.6:
        direction = "strong positive"
        note = "Higher grocery spending closely tracks higher caloric intake."
    elif r > 0.3:
        direction = "moderate positive"
        note = "Months with more grocery spending tend to have slightly higher caloric intake."
    elif r < -0.6:
        direction = "strong negative"
        note = "Higher grocery spending correlates with lower caloric intake — possible quality-over-quantity pattern."
    elif r < -0.3:
        direction = "moderate negative"
        note = "Some evidence that higher grocery spend accompanies lower caloric intake."
    else:
        direction = "weak"
        note = "No clear relationship between grocery spending and caloric intake detected yet."

    return f"Pearson r = {r} ({direction} correlation). {note}"
