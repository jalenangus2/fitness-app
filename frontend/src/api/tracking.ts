import client from './client'
import type {
  BodyMetric, BodyMetricCreate,
  CrossModuleResponse,
  DailyNutritionSummary,
  FoodLogEntry, FoodLogEntryCreate,
  RecoveryLog, RecoveryLogCreate,
  SleepLog, SleepLogCreate,
  WeightForecastResponse,
  WorkoutSession, WorkoutSessionCreate, WorkoutSetLog, WorkoutSetLogCreate,
} from '../types'

// ─── Workout Sessions ─────────────────────────────────────────────────────────
export const getSessions = (limit = 50) =>
  client.get<WorkoutSession[]>('/tracking/sessions', { params: { limit } }).then(r => r.data)

export const getSession = (id: number) =>
  client.get<WorkoutSession>(`/tracking/sessions/${id}`).then(r => r.data)

export const createSession = (data: WorkoutSessionCreate) =>
  client.post<WorkoutSession>('/tracking/sessions', data).then(r => r.data)

export const updateSession = (id: number, data: Partial<WorkoutSessionCreate>) =>
  client.put<WorkoutSession>(`/tracking/sessions/${id}`, data).then(r => r.data)

export const deleteSession = (id: number) =>
  client.delete(`/tracking/sessions/${id}`)

export const addSet = (sessionId: number, data: WorkoutSetLogCreate) =>
  client.post<WorkoutSetLog>(`/tracking/sessions/${sessionId}/sets`, data).then(r => r.data)

export const deleteSet = (sessionId: number, setId: number) =>
  client.delete(`/tracking/sessions/${sessionId}/sets/${setId}`)

// ─── Nutrition ────────────────────────────────────────────────────────────────
export const getNutrition = (logDate: string) =>
  client.get<DailyNutritionSummary>('/tracking/nutrition', { params: { log_date: logDate } }).then(r => r.data)

export const addFoodEntry = (data: FoodLogEntryCreate) =>
  client.post<FoodLogEntry>('/tracking/nutrition', data).then(r => r.data)

export const deleteFoodEntry = (id: number) =>
  client.delete(`/tracking/nutrition/${id}`)

export const logWater = (logDate: string, amountOz: number) =>
  client.post('/tracking/water', { log_date: logDate, amount_oz: amountOz }).then(r => r.data)

export const deleteWater = (id: number) =>
  client.delete(`/tracking/water/${id}`)

// ─── Body Metrics ─────────────────────────────────────────────────────────────
export const getMetrics = (limit = 90) =>
  client.get<BodyMetric[]>('/tracking/metrics', { params: { limit } }).then(r => r.data)

export const addMetric = (data: BodyMetricCreate) =>
  client.post<BodyMetric>('/tracking/metrics', data).then(r => r.data)

export const deleteMetric = (id: number) =>
  client.delete(`/tracking/metrics/${id}`)

// ─── Sleep ────────────────────────────────────────────────────────────────────
export const getSleepLogs = (limit = 30) =>
  client.get<SleepLog[]>('/tracking/sleep', { params: { limit } }).then(r => r.data)

export const addSleepLog = (data: SleepLogCreate) =>
  client.post<SleepLog>('/tracking/sleep', data).then(r => r.data)

export const deleteSleepLog = (id: number) =>
  client.delete(`/tracking/sleep/${id}`)

// ─── Recovery ─────────────────────────────────────────────────────────────────
export const getRecoveryLogs = (limit = 30) =>
  client.get<RecoveryLog[]>('/tracking/recovery', { params: { limit } }).then(r => r.data)

export const addRecoveryLog = (data: RecoveryLogCreate) =>
  client.post<RecoveryLog>('/tracking/recovery', data).then(r => r.data)

export const deleteRecoveryLog = (id: number) =>
  client.delete(`/tracking/recovery/${id}`)

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getWeightForecast = (goalWeight?: number) =>
  client
    .post<WeightForecastResponse>('/tracking/analytics/weight-forecast', { goal_weight: goalWeight ?? null })
    .then(r => r.data)

export const getCrossModuleInsights = () =>
  client.get<CrossModuleResponse>('/tracking/analytics/cross-module').then(r => r.data)
