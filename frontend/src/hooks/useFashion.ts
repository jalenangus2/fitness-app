import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/fashion'
import type { FashionRelease } from '../types'

export function useFashionReleases(params?: { category?: string; upcoming?: boolean }) {
  return useQuery({
    queryKey: ['fashion', params],
    queryFn: () => api.getFashionReleases(params),
  })
}

export function useCreateFashionRelease() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<FashionRelease>) => api.createFashionRelease(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fashion'] }),
  })
}

export function useUpdateFashionRelease() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FashionRelease> }) =>
      api.updateFashionRelease(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fashion'] }),
  })
}

export function useDeleteFashionRelease() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteFashionRelease(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fashion'] }),
  })
}

export function useToggleFashionAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ release, alertDaysBefore = 1 }: { release: FashionRelease; alertDaysBefore?: number }) => {
      if (release.alerts.length > 0) {
        await api.deleteFashionAlert(release.id, release.alerts[0].id)
      } else {
        await api.createFashionAlert(release.id, alertDaysBefore)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fashion'] }),
  })
}
