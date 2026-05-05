import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/shopping'

export function useShoppingLists() {
  return useQuery({ queryKey: ['shopping'], queryFn: api.getShoppingLists })
}

export function useShoppingList(id: number) {
  return useQuery({ queryKey: ['shopping', id], queryFn: () => api.getShoppingList(id), enabled: !!id })
}

export function useCreateShoppingList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; meal_plan_id?: number }) => api.createShoppingList(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })
}

export function useDeleteShoppingList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteShoppingList(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping'] }),
  })
}

export function useAddShoppingItem(listId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { ingredient_name: string; quantity?: string; category?: string }) =>
      api.addShoppingItem(listId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', listId] }),
  })
}

export function useUpdateShoppingItem(listId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: Record<string, unknown> }) =>
      api.updateShoppingItem(listId, itemId, data as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', listId] }),
  })
}

export function useDeleteShoppingItem(listId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: number) => api.deleteShoppingItem(listId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', listId] }),
  })
}

export function useWalmartSearch(listId: number) {
  return useMutation({
    mutationFn: (itemId: number) => api.walmartSearch(listId, itemId),
  })
}

export function useWalmartSelect(listId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      data,
    }: {
      itemId: number
      data: { walmart_product_id: string; walmart_price_cents: number; walmart_product_url: string }
    }) => api.walmartSelect(listId, itemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shopping', listId] }),
  })
}
