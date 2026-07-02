import { apiClient } from '@/lib/api-client'
import type {
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
} from './types'

const BASE = '/api/v1/auth'

export const authApi = {
  me: () => apiClient<AuthUser>(`${BASE}/me`),

  login: (body: LoginRequest) =>
    apiClient<AuthUser>(`${BASE}/login`, { method: 'POST', body: JSON.stringify(body) }),

  logout: () => apiClient<void>(`${BASE}/logout`, { method: 'POST' }),

  forgotPassword: (body: ForgotPasswordRequest) =>
    apiClient<void>(`${BASE}/forgot-password`, { method: 'POST', body: JSON.stringify(body) }),

  resetPassword: (body: ResetPasswordRequest) =>
    apiClient<void>(`${BASE}/reset-password`, { method: 'POST', body: JSON.stringify(body) }),
}
