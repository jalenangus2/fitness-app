import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/workout'
import type { GenerateWorkoutRequest } from '../types'

export function useWorkouts() {
  return useQuery({ queryKey: ['workouts'], queryFn: api.getWorkouts })
}

export function useWorkout(id: number) {
  return useQuery({ queryKey: ['workouts', id], queryFn: () => api.getWorkout(id), enabled: !!id })
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
