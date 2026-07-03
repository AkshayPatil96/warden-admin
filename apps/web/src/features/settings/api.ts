import { apiClient } from '@/lib/api-client'
import type { AuthUser } from '@/features/auth/types'
import type {
  ChangePasswordRequest,
  RevokeSessionRequest,
  SessionSummary,
  UpdateProfileRequest,
} from '@admin/shared'

export const settingsApi = {
  updateProfile: (body: UpdateProfileRequest) =>
    apiClient<AuthUser>('/api/v1/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),

  changePassword: (body: ChangePasswordRequest) =>
    apiClient<void>('/api/v1/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),

  listSessions: () => apiClient<SessionSummary[]>('/api/v1/auth/sessions'),

  revokeSession: (body: RevokeSessionRequest) =>
    apiClient<void>('/api/v1/auth/sessions/revoke', { method: 'POST', body: JSON.stringify(body) }),

  revokeOtherSessions: () =>
    apiClient<{ revoked: number }>('/api/v1/auth/sessions/revoke-others', { method: 'POST' }),
}
