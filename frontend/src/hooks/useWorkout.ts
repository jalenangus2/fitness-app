import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/workout'
import * as trackingApi from '../api/tracking'
import type { GenerateWorkoutRequest, WorkoutPlan, WorkoutSessionCreate, WorkoutSetLogCreate } from '../types'

export function useWorkouts() {
  return useQuery({ queryKey: ['workouts'], queryFn: api.getWorkouts })
}

export function useCreateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<WorkoutPlan>) => api.createWorkout(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useGenerateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateWorkoutRequest) => api.generateWorkout(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useUpdateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string } }) => api.updateWorkout(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useActivateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.activateWorkout(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useDeleteWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteWorkout(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

// Tracking Hooks — sessions live under /tracking
export function useWorkoutSessions(limit = 50) {
  return useQuery({
    queryKey: ['workout-sessions', limit],
    queryFn: () => trackingApi.getSessions(limit),
  })
}

export function useStartSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: WorkoutSessionCreate) => trackingApi.createSession(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-sessions'] }),
  })
}

export function useLogSet() {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: WorkoutSetLogCreate }) =>
      trackingApi.addSet(sessionId, data),
  })
}

export function useFinishSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, durationMins }: { sessionId: number; durationMins: number }) =>
      trackingApi.updateSession(sessionId, { duration_mins: durationMins }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-sessions'] }),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => trackingApi.deleteSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-sessions'] }),
  })
}