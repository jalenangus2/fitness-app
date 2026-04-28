import client from './client'
import type { GenerateWorkoutRequest, WorkoutPlan } from '../types'

export const getWorkouts = async (): Promise<WorkoutPlan[]> => {
  const res = await client.get('/workouts')
  return res.data
}

export const createWorkout = async (data: Partial<WorkoutPlan>): Promise<WorkoutPlan> => {
  const res = await client.post('/workouts', data)
  return res.data
}

export const deleteWorkout = async (id: number): Promise<void> => {
  await client.delete(`/workouts/${id}`)
}

export const activateWorkout = async (id: number): Promise<WorkoutPlan> => {
  const res = await client.patch(`/workouts/${id}/activate`)
  return res.data
}

export const generateWorkout = async (data: GenerateWorkoutRequest): Promise<WorkoutPlan> => {
  const res = await client.post('/workouts/generate', data)
  return res.data
}