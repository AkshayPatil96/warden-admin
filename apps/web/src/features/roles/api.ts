import { apiClient } from '@/lib/api-client'
import type { CreateRoleInput, PermissionListResult, Role, RoleListResult, UpdateRoleInput } from './types'

export const rolesApi = {
  list: () => apiClient<RoleListResult>('/api/v1/roles'),

  permissions: () => apiClient<PermissionListResult>('/api/v1/roles/permissions'),

  create: (body: CreateRoleInput) =>
    apiClient<Role>('/api/v1/roles', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: string, body: UpdateRoleInput) =>
    apiClient<Role>(`/api/v1/roles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  remove: (id: string) => apiClient<void>(`/api/v1/roles/${id}`, { method: 'DELETE' }),
}
