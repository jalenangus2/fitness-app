import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/finance'
import type { Budget, FinancialGoalCreate } from '../types'

export function useLinkToken() {
  return useQuery({
    queryKey: ['plaid-link-token'],
    queryFn: api.getLinkToken,
    staleTime: 1000 * 60 * 25, // link tokens expire in 30 min
  })
}

export function useExchangeToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.exchangeToken,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-accounts'] })
      qc.invalidateQueries({ queryKey: ['finance-transactions'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}

export function useAccounts() {
  return useQuery({ queryKey: ['finance-accounts'], queryFn: api.getAccounts })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-accounts'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}

export function useSyncTransactions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.syncTransactions,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-transactions'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}

export function useTransactions(params?: {
  month?: string
  category?: string
  account_id?: number
  search?: string
}) {
  return useQuery({
    queryKey: ['finance-transactions', params],
    queryFn: () => api.getTransactions(params),
  })
}

export function useUpdateTransactionCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, category }: { id: number; category: string }) =>
      api.updateTransactionCategory(id, category),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-transactions'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}

export function useBudgets() {
  return useQuery({ queryKey: ['finance-budgets'], queryFn: api.getBudgets })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Budget>) => api.createBudget(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-budgets'] }),
  })
}

export function useUpdateBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Budget> }) => api.updateBudget(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-budgets'] }),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteBudget(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-budgets'] }),
  })
}

export function useFinanceSummary() {
  return useQuery({
    queryKey: ['finance-summary'],
    queryFn: api.getFinanceSummary,
    refetchInterval: 60_000,
  })
}

export function useGoals() {
  return useQuery({ queryKey: ['finance-goals'], queryFn: api.getGoals })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FinancialGoalCreate) => api.createGoal(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FinancialGoalCreate> }) => api.updateGoal(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-goals'] }),
  })
}
