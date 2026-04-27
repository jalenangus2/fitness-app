import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/meal'
import type { GenerateMealRequest, MealPlan } from '../types'

export function useMealPlans() {
  return useQuery({ queryKey: ['meal-plans'], queryFn: api.getMealPlans })
}

export function useCreateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<MealPlan>) => api.createMealPlan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plans'] }),
  })
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

// Logging Hooks
export function useDailyNutrition() {
  return useQuery({ queryKey: ['nutrition-logs'], queryFn: api.getDailyNutrition })
}

export function useLogNutrition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: api.NutritionLog) => api.logNutrition(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition-logs'] }),
  })
}

export function useSearchFoods(query: string) {
  return useQuery({ 
    queryKey: ['foods', query], 
    queryFn: () => api.searchFoods(query),
    enabled: query.length > 2
  })
}