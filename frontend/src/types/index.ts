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
