import { apiClient } from '@/lib/api-client'
import type {
  CreateCustomerInput,
  Customer,
  CustomerListResult,
  ListCustomersQuery,
  UpdateCustomerInput,
} from './types'

function toQueryString(query: ListCustomersQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  params.set('order', query.order)
  if (query.sort) params.set('sort', query.sort)
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  return params.toString()
}

export const customersApi = {
  list: (query: ListCustomersQuery) =>
    apiClient<CustomerListResult>(`/api/v1/customers?${toQueryString(query)}`),

  create: (body: CreateCustomerInput) =>
    apiClient<Customer>('/api/v1/customers', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: UpdateCustomerInput) =>
    apiClient<Customer>(`/api/v1/customers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  remove: (id: string) => apiClient<void>(`/api/v1/customers/${id}`, { method: 'DELETE' }),
}
