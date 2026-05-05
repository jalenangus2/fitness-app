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

export const updateWorkout = async (id: number, data: { name?: string; difficulty?: string; duration_mins?: number }): Promise<WorkoutPlan> => {
  const res = await client.patch(`/workouts/${id}`, data)
  return res.data
}

export const activateWorkout = async (id: number): Promise<WorkoutPlan> => {
  const res = await client.patch(`/workouts/${id}/activate`)
  return res.data
}

export const deactivateWorkout = async (id: number): Promise<WorkoutPlan> => {
  const res = await client.patch(`/workouts/${id}/deactivate`)
  return res.data
}

export const replaceExercises = async (id: number, exercises: any[]): Promise<WorkoutPlan> => {
  const res = await client.put(`/workouts/${id}/exercises`, exercises)
  return res.data
}

export const generateWorkout = async (data: GenerateWorkoutRequest): Promise<WorkoutPlan> => {
  const res = await client.post('/workouts/generate', data)
  return res.data
}