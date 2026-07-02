'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from './api'

// One query feeds the whole overview (KPIs + charts). TanStack dedupes by key,
// so every consumer shares a single request.
export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.summary(),
    staleTime: 60_000,
  })
}
