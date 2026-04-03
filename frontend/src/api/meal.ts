import client from './client'
import type { GenerateMealRequest, MealPlan } from '../types'

export const getMealPlans = async (): Promise<MealPlan[]> => {
  const res = await client.get('/meals/plans')
  return res.data
}

export const getMealPlan = async (id: number): Promise<MealPlan> => {
  const res = await client.get(`/meals/plans/${id}`)
  return res.data
}

export const deleteMealPlan = async (id: number): Promise<void> => {
  await client.delete(`/meals/plans/${id}`)
}

export const activateMealPlan = async (id: number): Promise<MealPlan> => {
  const res = await client.patch(`/meals/plans/${id}/activate`)
  return res.data
}

export const generateMealPlan = async (data: GenerateMealRequest): Promise<MealPlan> => {
  const res = await client.post('/meals/plans/generate', data)
  return res.data
}
