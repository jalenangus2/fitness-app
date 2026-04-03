import client from './client'
import type { DashboardSummary } from '../types'

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await client.get('/dashboard/summary')
  return res.data
}
