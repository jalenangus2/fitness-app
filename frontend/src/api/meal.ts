import client from './client'
import type { MealPlan, GenerateMealRequest } from '../types'

export interface NutritionLog {
  id?: number
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  consumed_at?: string
}

export interface FoodItem {
  id?: number
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  serving_size?: string | null
}

export const getMealPlans = () =>
  client.get<MealPlan[]>('/meals/plans').then(r => r.data)

export const getMealPlan = (id: number) =>
  client.get<MealPlan>(`/meals/plans/${id}`).then(r => r.data)

export const createMealPlan = (data: any) =>
  client.post<MealPlan>('/meals/plans', data).then(r => r.data)

export const deleteMealPlan = (id: number) =>
  client.delete(`/meals/plans/${id}`)

export const updateMealPlan = (id: number, data: Partial<{ name: string; goal: string; target_calories: number; target_protein_g: number; target_carbs_g: number; target_fat_g: number }>) =>
  client.patch<MealPlan>(`/meals/plans/${id}`, data).then(r => r.data)

export const activateMealPlan = (id: number) =>
  client.patch<MealPlan>(`/meals/plans/${id}/activate`).then(r => r.data)

export const generateMealPlan = (data: GenerateMealRequest) =>
  client.post<MealPlan>('/meals/plans/generate', data).then(r => r.data)

export const getDailyNutrition = () =>
  client.get<NutritionLog[]>('/meals/logs/today').then(r => r.data)

export const logNutrition = (data: Omit<NutritionLog, 'id' | 'consumed_at'>) =>
  client.post<NutritionLog>('/meals/logs', data).then(r => r.data)

export const searchFoods = (q: string) =>
  client.get<FoodItem[]>('/meals/foods', { params: { q } }).then(r => r.data)

export const getNutritionHistory = (days = 30) =>
  client.get<NutritionLog[]>('/meals/logs/history', { params: { days } }).then(r => r.data)
