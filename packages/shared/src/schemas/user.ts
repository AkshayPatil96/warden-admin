import { z } from 'zod'
import { paginationQuerySchema } from './common.js'
import { roleSummarySchema } from './role.js'

export const userStatusSchema = z.enum(['ACTIVE', 'SUSPENDED'])
export type UserStatus = z.infer<typeof userStatusSchema>

// Same strength rules as the password-reset flow (auth.ts). Applied when an admin
// sets a new user's initial password.
const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.')

// Never includes passwordHash — the API maps to this shape before responding.
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  status: userStatusSchema,
  roles: z.array(roleSummarySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type User = z.infer<typeof userSchema>

export const createUserSchema = z.object({
  email: z.string().trim().email('A valid email is required.').toLowerCase(),
  name: z.string().trim().min(1).optional(),
  password: strongPasswordSchema,
  roleIds: z.array(z.string().uuid()).min(1, 'Assign at least one role.'),
})
export type CreateUserInput = z.infer<typeof createUserSchema>

// Email is immutable; password changes go through the reset/settings flow, not here.
export const updateUserSchema = z.object({
  name: z.string().trim().min(1).nullable().optional(),
  status: userStatusSchema.optional(),
  roleIds: z.array(z.string().uuid()).min(1, 'Assign at least one role.').optional(),
})
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const listUsersQuerySchema = paginationQuerySchema.extend({
  status: userStatusSchema.optional(),
})
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

export interface UserListResult {
  data: User[]
  total: number
  page: number
  pageSize: number
}
