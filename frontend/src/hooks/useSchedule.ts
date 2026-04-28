import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/schedule'
import type { CalendarEvent, Task } from '../types'

export function useEvents(start?: string, end?: string) {
  return useQuery({
    queryKey: ['events', start, end],
    queryFn: () => api.getEvents(start, end),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CalendarEvent>) => api.createEvent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CalendarEvent> }) => api.updateEvent(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useTasks(params?: { due_date?: string; is_completed?: boolean }) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => api.getTasks(params),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Task>) => api.createTask(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) => api.updateTask(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.completeTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useFashionSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.fashionSync,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
