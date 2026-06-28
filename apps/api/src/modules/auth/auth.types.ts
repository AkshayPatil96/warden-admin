export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
  permissions: string[]
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginUserRecord {
  id: string
  email: string
  name: string | null
  passwordHash: string
  status: 'ACTIVE' | 'SUSPENDED'
  failedLoginCount: number
  lockedUntil: Date | null
  permissions: string[]
}

export interface PasswordResetRecord {
  id: string
  userId: string
  expiresAt: Date
  usedAt: Date | null
}

export interface SessionRecord {
  id: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

export interface LoginResult {
  user: AuthenticatedUser
  session: SessionRecord
}

export interface ResolvedSession {
  session: SessionRecord
  user: AuthenticatedUser
}