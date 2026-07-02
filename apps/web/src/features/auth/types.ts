// Mirror of the API's authenticated-user shape (apps/api/src/types/express.d.ts).
// Request/response *schemas* are owned by @admin/shared and re-exported here.
export interface AuthUser {
  id: string
  email: string
  name: string | null
  permissions: string[]
}

export type {
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '@admin/shared'
