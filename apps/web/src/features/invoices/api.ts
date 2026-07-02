import { apiClient } from '@/lib/api-client'
import type {
  CreateInvoiceInput,
  Invoice,
  InvoiceListResult,
  ListInvoicesQuery,
  UpdateInvoiceInput,
} from './types'

function toQueryString(query: ListInvoicesQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  params.set('order', query.order)
  if (query.sort) params.set('sort', query.sort)
  if (query.status) params.set('status', query.status)
  if (query.customerId) params.set('customerId', query.customerId)
  if (query.subscriptionId) params.set('subscriptionId', query.subscriptionId)
  return params.toString()
}

export const invoicesApi = {
  list: (query: ListInvoicesQuery) => apiClient<InvoiceListResult>(`/api/v1/invoices?${toQueryString(query)}`),

  create: (body: CreateInvoiceInput) =>
    apiClient<Invoice>('/api/v1/invoices', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: UpdateInvoiceInput) =>
    apiClient<Invoice>(`/api/v1/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  remove: (id: string) => apiClient<void>(`/api/v1/invoices/${id}`, { method: 'DELETE' }),
}
