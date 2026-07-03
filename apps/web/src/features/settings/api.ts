import { apiClient } from '@/lib/api-client'
import type { AuthUser } from '@/features/auth/types'
import type { ChangePasswordRequest, UpdateProfileRequest } from '@admin/shared'

export const settingsApi = {
  updateProfile: (body: UpdateProfileRequest) =>
    apiClient<AuthUser>('/api/v1/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),

  changePassword: (body: ChangePasswordRequest) =>
    apiClient<void>('/api/v1/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
}
