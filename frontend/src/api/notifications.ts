import client from './client'

export interface NotificationItem {
  id: number
  title: string
  body: string | null
  type: string
  read: boolean
  source_type: string | null
  source_id: number | null
  created_at: string
}

export const getNotifications = () =>
  client.get<NotificationItem[]>('/notifications').then(r => r.data)

export const getUnreadCount = () =>
  client.get<{ count: number }>('/notifications/unread-count').then(r => r.data)

export const markRead = (id: number) =>
  client.patch(`/notifications/${id}/read`)

export const markAllRead = () =>
  client.patch('/notifications/read-all')

export const deleteNotification = (id: number) =>
  client.delete(`/notifications/${id}`)
