import { z } from 'zod'

// Read-only role summary — embedded in User.roles. Full role shape (below) is
// used by the role-management screen.
export const roleSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
})
export type RoleSummary = z.infer<typeof roleSummarySchema>

export const roleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.array(z.string()),
})
export type Role = z.infer<typeof roleSchema>

export interface RoleListResult {
  data: Role[]
}

// Permission keys are a fixed, seeded catalog (see prisma/seed.ts) — only which
// keys a role bundles is editable, not the keys themselves.
export const permissionSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
})
export type Permission = z.infer<typeof permissionSchema>

export interface PermissionListResult {
  data: Permission[]
}

export const createRoleSchema = z.object({
  name: z.string().trim().min(1, 'A role name is required.'),
  description: z.string().trim().min(1).nullable().optional(),
  permissionIds: z.array(z.string().uuid()).min(1, 'Select at least one permission.'),
})
export type CreateRoleInput = z.infer<typeof createRoleSchema>

export const updateRoleSchema = z.object({
  name: z.string().trim().min(1, 'A role name is required.').optional(),
  description: z.string().trim().min(1).nullable().optional(),
  permissionIds: z.array(z.string().uuid()).min(1, 'Select at least one permission.').optional(),
})
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
