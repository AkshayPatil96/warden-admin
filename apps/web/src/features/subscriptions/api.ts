import { apiClient } from '@/lib/api-client'
import type {
  CreateSubscriptionInput,
  ListSubscriptionsQuery,
  Subscription,
  SubscriptionListResult,
  UpdateSubscriptionInput,
} from './types'

function toQueryString(query: ListSubscriptionsQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  params.set('order', query.order)
  if (query.sort) params.set('sort', query.sort)
  if (query.status) params.set('status', query.status)
  if (query.plan) params.set('plan', query.plan)
  if (query.customerId) params.set('customerId', query.customerId)
  return params.toString()
}

export const subscriptionsApi = {
  list: (query: ListSubscriptionsQuery) =>
    apiClient<SubscriptionListResult>(`/api/v1/subscriptions?${toQueryString(query)}`),

  create: (body: CreateSubscriptionInput) =>
    apiClient<Subscription>('/api/v1/subscriptions', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: UpdateSubscriptionInput) =>
    apiClient<Subscription>(`/api/v1/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  remove: (id: string) => apiClient<void>(`/api/v1/subscriptions/${id}`, { method: 'DELETE' }),
}
