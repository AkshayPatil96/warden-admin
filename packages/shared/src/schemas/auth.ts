import { z } from 'zod'

export const loginRequestSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional(),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>

// Reused for any flow that sets a new password (reset now, create-user later).
const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a number.')

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
})

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required.'),
  password: strongPasswordSchema,
})

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>

// Self-service account settings (any authenticated user, on their own account).
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120, 'Name is too long.'),
})

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: strongPasswordSchema,
})

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>