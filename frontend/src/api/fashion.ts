import client from './client'
import type { FashionRelease } from '../types'

export const getFashionReleases = async (params?: { category?: string; upcoming?: boolean }): Promise<FashionRelease[]> => {
  const res = await client.get('/fashion', { params })
  return res.data
}

export const createFashionRelease = async (data: Partial<FashionRelease>): Promise<FashionRelease> => {
  const res = await client.post('/fashion', data)
  return res.data
}

export const updateFashionRelease = async (id: number, data: Partial<FashionRelease>): Promise<FashionRelease> => {
  const res = await client.put(`/fashion/${id}`, data)
  return res.data
}

export const deleteFashionRelease = async (id: number): Promise<void> => {
  await client.delete(`/fashion/${id}`)
}

export const createFashionAlert = async (releaseId: number, alertDaysBefore: number) => {
  const res = await client.post(`/fashion/${releaseId}/alerts`, { alert_days_before: alertDaysBefore })
  return res.data
}

export const deleteFashionAlert = async (releaseId: number, alertId: number): Promise<void> => {
  await client.delete(`/fashion/${releaseId}/alerts/${alertId}`)
}
