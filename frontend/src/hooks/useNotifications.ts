import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/notifications'

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: api.getNotifications, refetchInterval: 60000 })
}

export function useUnreadCount() {
  return useQuery({ queryKey: ['notifications-count'], queryFn: api.getUnreadCount, refetchInterval: 60000 })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-count'] })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
