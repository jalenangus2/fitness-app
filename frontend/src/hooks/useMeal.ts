import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/meal'
import * as authApi from '../api/auth'
import type { GenerateMealRequest } from '../types'

export function useMealPlans() {
  return useQuery({ queryKey: ['meal-plans'], queryFn: api.getMealPlans })
}

export function useMealPlan(id: number) {
  return useQuery({ queryKey: ['meal-plans', id], queryFn: () => api.getMealPlan(id), enabled: !!id })
}

export function useCreateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.createMealPlan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plans'] }),
  })
}

export function useUpdateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateMealPlan>[1] }) => api.updateMealPlan(id, data),
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

export function useDailyNutrition() {
  return useQuery({ queryKey: ['nutrition-logs'], queryFn: api.getDailyNutrition })
}

export function useLogNutrition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof api.logNutrition>[0]) => api.logNutrition(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition-logs'] })
      qc.invalidateQueries({ queryKey: ['nutrition-history'] })
    },
  })
}

export function useSearchFoods(query: string) {
  return useQuery({
    queryKey: ['foods', query],
    queryFn: () => api.searchFoods(query),
    enabled: query.length > 2,
  })
}

export function useNutritionHistory(days = 30) {
  return useQuery({
    queryKey: ['nutrition-history', days],
    queryFn: () => api.getNutritionHistory(days),
  })
}

export function useCurrentUser() {
  return useQuery({ queryKey: ['me'], queryFn: authApi.getMe })
}

export function useUpdateNutritionGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof authApi.updateNutritionGoals>[0]) => authApi.updateNutritionGoals(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}
