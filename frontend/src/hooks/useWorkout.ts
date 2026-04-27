import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/workout'
import type { GenerateWorkoutRequest, WorkoutPlan } from '../types'

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

// Tracking Hooks
export function useStartSession() {
  return useMutation({ mutationFn: (planId: number) => api.startSession(planId) })
}

export function useLogSet() {
  return useMutation({ 
    mutationFn: ({ sessionId, data }: { sessionId: number; data: api.ExerciseLog }) => api.logSet(sessionId, data) 
  })
}

export function useFinishSession() {
  return useMutation({ mutationFn: (sessionId: number) => api.finishSession(sessionId) })
}