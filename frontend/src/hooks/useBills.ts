import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/bills'

export function useBills() {
  return useQuery({ queryKey: ['bills'], queryFn: api.getBills })
}

export function useCreateBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createBill,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  })
}

export function useDeleteBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteBill,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bills'] }),
  })
}

export function usePaycheckConfig() {
  return useQuery({ queryKey: ['paycheck-config'], queryFn: api.getPaycheckConfig })
}

export function useSavePaycheckConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.savePaycheckConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paycheck-config'] }),
  })
}
