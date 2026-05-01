// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number
  email: string
  username: string
  created_at: string
}

// ─── Workout ──────────────────────────────────────────────────────────────────
export interface WorkoutExercise {
  id: number
  name: string
  sets: number | null
  reps: string | null
  weight_lbs: number | null
  rest_seconds: number | null
  notes: string | null
  order_index: number
}

export interface WorkoutPlan {
  id: number
  name: string
  muscle_groups: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration_mins: number | null
  notes: string | null
  is_active: boolean
  is_ai_generated: boolean
  exercises: WorkoutExercise[]
  created_at: string
}

export interface GenerateWorkoutRequest {
  muscle_groups: string[]
  difficulty: string
  duration_mins: number
  notes?: string
}

// ─── Meal ─────────────────────────────────────────────────────────────────────
export interface MealItem {
  id: number
  ingredient_name: string
  quantity: string | null
  category: string | null
}

export interface Meal {
  id: number
  day_number: number
  meal_type: string
  name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  recipe_notes: string | null
  items: MealItem[]
}

export interface MealPlan {
  id: number
  name: string
  goal: string
  target_calories: number | null
  target_protein_g: number | null
  target_carbs_g: number | null
  target_fat_g: number | null
  duration_days: number
  is_active: boolean
  meals: Meal[]
  created_at: string
}

export interface GenerateMealRequest {
  goal: string
  target_calories: number
  target_protein_g: number
  target_carbs_g: number
  target_fat_g: number
  duration_days: number
  dietary_restrictions?: string[]
}

// ─── Shopping ─────────────────────────────────────────────────────────────────
export interface ShoppingListItem {
  id: number
  ingredient_name: string
  quantity: string | null
  category: string | null
  is_checked: boolean
  walmart_product_id: string | null
  walmart_price_cents: number | null
  walmart_product_url: string | null
}

export interface ShoppingList {
  id: number
  name: string
  meal_plan_id: number | null
  items: ShoppingListItem[]
  created_at: string
}

export interface WalmartProduct {
  item_id: string
  name: string
  sale_price: number | null
  thumbnail_image: string | null
  product_url: string | null
  customer_rating: string | null
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
export interface CalendarEvent {
  id: number
  title: string
  description: string | null
  start_datetime: string
  end_datetime: string | null
  all_day: boolean
  color: string
  recurrence_rule: string | null
  created_at: string
  is_recurring_instance?: boolean
}

export interface Task {
  id: number
  title: string
  due_date: string | null
  is_completed: boolean
  priority: 'low' | 'medium' | 'high'
  category: string | null
  recurrence_rule: string | null
  created_at: string
}

// ─── Fashion ──────────────────────────────────────────────────────────────────
export interface FashionAlert {
  id: number
  release_id: number
  alert_days_before: number
  alert_date: string
  notified: boolean
}

export interface FashionRelease {
  id: number
  brand: string
  name: string
  category: string
  release_date: string
  price_cents: number | null
  colorway: string | null
  sku: string | null
  image_url: string | null
  retailer_url: string | null
  notes: string | null
  created_at: string
  alerts: FashionAlert[]
}

// ─── Finance ──────────────────────────────────────────────────────────────────
export interface PlaidAccount {
  id: number
  account_id: string
  name: string
  official_name: string | null
  type: string
  subtype: string | null
  current_balance: number | null
  available_balance: number | null
  currency: string
  mask: string | null
  institution_name: string | null
}

export interface Transaction {
  id: number
  transaction_id: string
  name: string
  amount: number
  date: string
  category: string | null
  category_detailed: string | null
  custom_category: string | null
  merchant_name: string | null
  pending: boolean
  logo_url: string | null
  account_name: string
  account_id: string
}

export interface Budget {
  id: number
  category: string
  name: string
  amount_cents: number
  color: string
}

export interface BudgetWithSpend extends Budget {
  spent_cents: number
  percent_used: number
}

export interface FinanceSummary {
  total_balance: number
  monthly_spend: number
  top_categories: { category: string; amount: number }[]
  budgets_with_spend: BudgetWithSpend[]
  accounts: PlaidAccount[]
}

// ─── Workout Session Logging ──────────────────────────────────────────────────
export interface WorkoutSetLog {
  id: number
  session_id: number
  exercise_name: string
  set_number: number
  reps: number | null
  weight_lbs: number | null
  duration_secs: number | null
  rest_secs: number | null
  rpe: number | null
  notes: string | null
  created_at: string
}

export interface WorkoutSession {
  id: number
  user_id: number
  plan_id: number | null
  name: string
  session_date: string
  duration_mins: number | null
  overall_rpe: number | null
  notes: string | null
  set_logs: WorkoutSetLog[]
  created_at: string
}

export interface WorkoutSessionCreate {
  name: string
  session_date: string
  plan_id?: number
  duration_mins?: number
  overall_rpe?: number
  notes?: string
  set_logs?: WorkoutSetLogCreate[]
}

export interface WorkoutSetLogCreate {
  exercise_name: string
  set_number: number
  reps?: number
  weight_lbs?: number
  duration_secs?: number
  rest_secs?: number
  rpe?: number
  notes?: string
}

// ─── Nutrition Log ────────────────────────────────────────────────────────────
export interface FoodLogEntry {
  id: number
  user_id: number
  log_date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food_name: string
  brand: string | null
  serving_size: number | null
  serving_unit: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  notes: string | null
  created_at: string
}

export interface FoodLogEntryCreate {
  log_date: string
  meal_type: string
  food_name: string
  brand?: string
  serving_size?: number
  serving_unit?: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
  notes?: string
}

export interface DailyNutritionSummary {
  log_date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  water_oz: number
  entries: FoodLogEntry[]
}

// ─── Body Metrics ─────────────────────────────────────────────────────────────
export interface BodyMetric {
  id: number
  user_id: number
  metric_date: string
  weight_lbs: number | null
  body_fat_pct: number | null
  chest_in: number | null
  waist_in: number | null
  hips_in: number | null
  bicep_in: number | null
  thigh_in: number | null
  notes: string | null
  created_at: string
}

export interface BodyMetricCreate {
  metric_date: string
  weight_lbs?: number
  body_fat_pct?: number
  chest_in?: number
  waist_in?: number
  hips_in?: number
  bicep_in?: number
  thigh_in?: number
  notes?: string
}

// ─── Sleep & Recovery ─────────────────────────────────────────────────────────
export interface SleepLog {
  id: number
  user_id: number
  sleep_date: string
  bedtime: string | null
  wake_time: string | null
  duration_hours: number | null
  quality_rating: number | null
  notes: string | null
  created_at: string
}

export interface SleepLogCreate {
  sleep_date: string
  bedtime?: string
  wake_time?: string
  duration_hours?: number
  quality_rating?: number
  notes?: string
}

export interface RecoveryLog {
  id: number
  user_id: number
  log_date: string
  overall_soreness: number | null
  fatigue_level: number | null
  mood: number | null
  stress_level: number | null
  muscle_soreness: Record<string, number> | null
  notes: string | null
  created_at: string
}

export interface RecoveryLogCreate {
  log_date: string
  overall_soreness?: number
  fatigue_level?: number
  mood?: number
  stress_level?: number
  muscle_soreness?: Record<string, number>
  notes?: string
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export interface WeightDataPoint {
  date: string
  actual_weight: number
  fitted_weight: number
}

export interface WeightProjectionPoint {
  date: string
  predicted_weight: number
}

export interface WeightForecastResponse {
  slope_lbs_per_day: number | null
  r_squared: number | null
  data_points: number
  historical: WeightDataPoint[]
  projection: WeightProjectionPoint[]
  goal_date: string | null
  goal_weight: number | null
  insufficient_data: boolean
}

export interface CrossModuleInsight {
  month: string
  grocery_spend_dollars: number
  avg_daily_calories: number
  caloric_adherence_pct: number | null
}

export interface CrossModuleResponse {
  insights: CrossModuleInsight[]
  correlation_note: string
  has_finance_data: boolean
  has_nutrition_data: boolean
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  active_workout_plan: {
    id: number
    name: string
    muscle_groups: string[]
    difficulty: string
    exercise_count: number
  } | null
  active_meal_plan: {
    id: number
    name: string
    goal: string
    today_meals: {
      meal_type: string
      name: string
      calories: number | null
      protein_g: number | null
      carbs_g: number | null
      fat_g: number | null
    }[]
    target_calories: number | null
    target_protein_g: number | null
    target_carbs_g: number | null
    target_fat_g: number | null
  } | null
  today_tasks: Task[]
  upcoming_events: CalendarEvent[]
  upcoming_fashion_releases: {
    id: number
    brand: string
    name: string
    category: string
    release_date: string
    price_cents: number | null
    image_url: string | null
    has_alert: boolean
  }[]
  shopping_list_count: number
  macro_today: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  } | null
}
