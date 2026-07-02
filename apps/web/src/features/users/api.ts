import { apiClient } from '@/lib/api-client'
import type {
  CreateUserInput,
  ListUsersQuery,
  RoleListResult,
  UpdateUserInput,
  User,
  UserListResult,
} from './types'

function toQueryString(query: ListUsersQuery): string {
  const params = new URLSearchParams()
  params.set('page', String(query.page))
  params.set('pageSize', String(query.pageSize))
  params.set('order', query.order)
  if (query.sort) params.set('sort', query.sort)
  if (query.search) params.set('search', query.search)
  if (query.status) params.set('status', query.status)
  return params.toString()
}

export const usersApi = {
  list: (query: ListUsersQuery) => apiClient<UserListResult>(`/api/v1/users?${toQueryString(query)}`),

  create: (body: CreateUserInput) =>
    apiClient<User>('/api/v1/users', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: UpdateUserInput) =>
    apiClient<User>(`/api/v1/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  remove: (id: string) => apiClient<void>(`/api/v1/users/${id}`, { method: 'DELETE' }),

  roles: () => apiClient<RoleListResult>('/api/v1/roles'),
}
