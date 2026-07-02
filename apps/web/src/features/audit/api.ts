import { apiClient } from '@/lib/api-client'
import type { AuditLogListResult } from '@admin/shared'

// Client-side query holds dates as strings from the date inputs; the API coerces them.
export interface AuditQuery {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  entity?: string
  from?: string
  to?: string
}

function toQueryString(query: AuditQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  params.set('order', query.order)
  if (query.sort) params.set('sort', query.sort)
  if (query.search) params.set('search', query.search)
  if (query.entity) params.set('entity', query.entity)
  if (query.from) params.set('from', `${query.from}T00:00:00`)
  if (query.to) params.set('to', `${query.to}T23:59:59`)
  return params.toString()
}

export const auditApi = {
  list: (query: AuditQuery) => apiClient<AuditLogListResult>(`/api/v1/audit?${toQueryString(query)}`),
}
