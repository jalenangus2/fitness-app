import client from './client'
import type { DashboardSummary } from '../types'

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await client.get('/dashboard/summary')
  return res.data
}

export interface WeatherData {
  current_temp_f: number
  temp_high_f: number
  temp_low_f: number
  weather_code: number
  condition: string
  location: string
}

export const getWeather = async (): Promise<WeatherData> => {
  const res = await client.get('/dashboard/weather')
  return res.data
}
