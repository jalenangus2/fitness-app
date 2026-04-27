import client from './client'
import type { GenerateWorkoutRequest, WorkoutPlan } from '../types'

export const getWorkout = async (id: number): Promise<WorkoutPlan> => {
  const res = await client.get(`/workouts/${id}`)
  return res.data
}


export const updateWorkout = async (id: number, data: Partial<WorkoutPlan>): Promise<WorkoutPlan> => {
  const res = await client.put(`/workouts/${id}`, data)
  return res.data
}

export interface ExerciseLog {
  id?: int;
  exercise_name: string;
  set_number: number;
  reps_completed?: number;
  weight_lbs?: number;
}
export interface WorkoutSession {
  id: number;
  plan_id?: number;
  start_time: string;
  end_time?: string;
  logs: ExerciseLog[];
}

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

// Live Tracking APIs
export const startSession = async (plan_id: number): Promise<WorkoutSession> => {
  const res = await client.post('/workouts/sessions', { plan_id })
  return res.data
}

export const logSet = async (sessionId: number, logData: ExerciseLog): Promise<ExerciseLog> => {
  const res = await client.post(`/workouts/sessions/${sessionId}/logs`, logData)
  return res.data
}

export const finishSession = async (sessionId: number): Promise<WorkoutSession> => {
  const res = await client.patch(`/workouts/sessions/${sessionId}/finish`)
  return res.data
}