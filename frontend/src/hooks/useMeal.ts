import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/meal'
import type { GenerateMealRequest } from '../types'

export function useMealPlans() {
  return useQuery({ queryKey: ['meal-plans'], queryFn: api.getMealPlans })
}

export function useMealPlan(id: number) {
  return useQuery({ queryKey: ['meal-plans', id], queryFn: () => api.getMealPlan(id), enabled: !!id })
}

export function useGenerateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateMealRequest) => api.generateMealPlan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plans'] }),
  })
}

export function useActivateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.activateMealPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plans'] }),
  })
}

export function useDeleteMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteMealPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plans'] }),
  })
}
