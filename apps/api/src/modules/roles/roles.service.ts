import { Prisma } from '../../generated/prisma/client.js'
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error.js'
import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import type {
  CreateRoleInput,
  Permission,
  PermissionListResult,
  Role,
  RoleListResult,
  UpdateRoleInput,
} from '@admin/shared'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import {
  ADMIN_ROLE_NAME,
  countRoleAssignments,
  createRole as createRoleRow,
  deleteRole as deleteRoleRow,
  findPermissionsByIds,
  findRoleById,
  listPermissions as listPermissionRows,
  listRoles as listRoleRows,
  setRolePermissions,
  updateRoleScalars,
  type RoleEntity,
} from './roles.repository.js'

type PermissionRow = Awaited<ReturnType<typeof findPermissionsByIds>>[number]

export function toRole(entity: RoleEntity): Role {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    permissions: entity.permissions.map((rp) => rp.permission.key).sort(),
  }
}

function toPermission(row: PermissionRow): Permission {
  return { id: row.id, key: row.key }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

// Validates the requested permission ids exist and returns the resolved rows.
async function resolvePermissions(permissionIds: string[], client: Prisma.TransactionClient): Promise<PermissionRow[]> {
  const unique = [...new Set(permissionIds)]
  const permissions = await findPermissionsByIds(unique, client)
  if (permissions.length !== unique.length) {
    throw new ValidationAppError('One or more permissions do not exist.')
  }
  return permissions
}

// No privilege escalation: an actor may only bundle permissions into a role that
// they themselves already hold. Mirrors the assign-time guard in users.service.ts.
function assertNoEscalation(permissions: PermissionRow[], actor: AuthenticatedUser): void {
  const held = new Set(actor.permissions)
  const missing = permissions.filter((p) => !held.has(p.key)).map((p) => p.key)
  if (missing.length > 0) {
    throw new ForbiddenAppError(
      `You cannot include permissions you do not hold: ${missing.sort().join(', ')}.`
    )
  }
}

export async function listRoles(): Promise<RoleListResult> {
  const rows = await listRoleRows()
  return { data: rows.map(toRole) }
}

export async function listPermissions(): Promise<PermissionListResult> {
  const rows = await listPermissionRows()
  return { data: rows.map(toPermission) }
}

export async function createRole(input: CreateRoleInput, actor: AuthenticatedUser): Promise<Role> {
  try {
    return await prisma.$transaction(async (client) => {
      const permissions = await resolvePermissions(input.permissionIds, client)
      assertNoEscalation(permissions, actor)

      const created = await createRoleRow(
        { name: input.name, description: input.description ?? null, permissionIds: input.permissionIds },
        client
      )
      const role = toRole(created)

      await writeAudit(
        { actorId: actor.id, action: 'role.create', entity: 'role', entityId: role.id, after: role },
        client
      )
      return role
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictAppError('A role with this name already exists.')
    }
    throw error
  }
}

export async function updateRole(id: string, input: UpdateRoleInput, actor: AuthenticatedUser): Promise<Role> {
  try {
    return await prisma.$transaction(async (client) => {
      const existing = await findRoleById(id, client)
      if (!existing) {
        throw new NotFoundAppError('Role not found.')
      }

      // The Admin role name is load-bearing (users.service keys "who is an Admin"
      // off this string) — renaming it away would silently break last-admin protection.
      if (existing.name === ADMIN_ROLE_NAME && input.name && input.name !== ADMIN_ROLE_NAME) {
        throw new ForbiddenAppError('The Admin role cannot be renamed.')
      }

      let permissions: PermissionRow[] | undefined
      if (input.permissionIds) {
        permissions = await resolvePermissions(input.permissionIds, client)
        assertNoEscalation(permissions, actor)

        // Never let the app lock itself out of managing roles.
        if (existing.name === ADMIN_ROLE_NAME && !permissions.some((p) => p.key === 'roles:write')) {
          throw new ForbiddenAppError('The Admin role must retain roles:write.')
        }
      }

      const before = toRole(existing)
      if (input.permissionIds) {
        await setRolePermissions(id, input.permissionIds, client)
      }
      await updateRoleScalars(id, { name: input.name, description: input.description }, client)

      const updated = await findRoleById(id, client)
      if (!updated) {
        throw new NotFoundAppError('Role not found.')
      }
      const after = toRole(updated)

      await writeAudit(
        { actorId: actor.id, action: 'role.update', entity: 'role', entityId: id, before, after },
        client
      )
      return after
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictAppError('A role with this name already exists.')
    }
    throw error
  }
}

export async function deleteRole(id: string, actor: AuthenticatedUser): Promise<void> {
  await prisma.$transaction(async (client) => {
    const existing = await findRoleById(id, client)
    if (!existing) {
      throw new NotFoundAppError('Role not found.')
    }

    if (existing.name === ADMIN_ROLE_NAME) {
      throw new ForbiddenAppError('The Admin role cannot be deleted.')
    }

    if ((await countRoleAssignments(id, client)) > 0) {
      throw new ForbiddenAppError('Cannot delete a role that is still assigned to users.')
    }

    await deleteRoleRow(id, client)
    await writeAudit(
      { actorId: actor.id, action: 'role.delete', entity: 'role', entityId: id, before: toRole(existing) },
      client
    )
  })
}
