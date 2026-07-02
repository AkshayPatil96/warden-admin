import { apiClient } from '@/lib/api-client'
import type { DashboardSummary } from '@admin/shared'

export const dashboardApi = {
  summary: () => apiClient<DashboardSummary>('/api/v1/analytics/summary'),
}
