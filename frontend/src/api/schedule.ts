import client from './client'
import type { CalendarEvent, Task } from '../types'

export const getEvents = async (start?: string, end?: string): Promise<CalendarEvent[]> => {
  const res = await client.get('/schedule/events', { params: { start, end } })
  return res.data
}

export const createEvent = async (data: Partial<CalendarEvent>): Promise<CalendarEvent> => {
  const res = await client.post('/schedule/events', data)
  return res.data
}

export const updateEvent = async (id: number, data: Partial<CalendarEvent>): Promise<CalendarEvent> => {
  const res = await client.put(`/schedule/events/${id}`, data)
  return res.data
}

export const deleteEvent = async (id: number): Promise<void> => {
  await client.delete(`/schedule/events/${id}`)
}

export const getTasks = async (params?: { due_date?: string; is_completed?: boolean }): Promise<Task[]> => {
  const res = await client.get('/schedule/tasks', { params })
  return res.data
}

export const createTask = async (data: Partial<Task>): Promise<Task> => {
  const res = await client.post('/schedule/tasks', data)
  return res.data
}

export const updateTask = async (id: number, data: Partial<Task>): Promise<Task> => {
  const res = await client.put(`/schedule/tasks/${id}`, data)
  return res.data
}

export const deleteTask = async (id: number): Promise<void> => {
  await client.delete(`/schedule/tasks/${id}`)
}

export const completeTask = async (id: number): Promise<Task> => {
  const res = await client.patch(`/schedule/tasks/${id}/complete`)
  return res.data
}
