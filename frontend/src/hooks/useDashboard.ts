import { useQuery } from '@tanstack/react-query'
import { getDashboardSummary, getWeather } from '../api/dashboard'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardSummary,
    refetchInterval: 60_000,
  })
}

export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: getWeather,
    staleTime: 1000 * 60 * 15,
    retry: 1,
  })
}
