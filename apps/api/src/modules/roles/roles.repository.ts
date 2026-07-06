import { Prisma } from '../../generated/prisma/client.js'
import type { Permission as PermissionRow, PrismaClient } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'

type DbClient = PrismaClient | Prisma.TransactionClient

// The one role the app can never lock itself out of managing — see roles.service.ts guards.
export const ADMIN_ROLE_NAME = 'Admin'

export type RoleEntity = Prisma.RoleGetPayload<{
  include: { permissions: { include: { permission: true } } }
}>

const withPermissions = {
  permissions: { include: { permission: true } },
} satisfies Prisma.RoleInclude

export async function listRoles(client: DbClient = prisma): Promise<RoleEntity[]> {
  return client.role.findMany({ include: withPermissions, orderBy: { name: 'asc' } })
}

export async function findRolesByIds(ids: string[], client: DbClient = prisma): Promise<RoleEntity[]> {
  return client.role.findMany({ where: { id: { in: ids } }, include: withPermissions })
}

export async function findRoleById(id: string, client: DbClient = prisma): Promise<RoleEntity | null> {
  return client.role.findUnique({ where: { id }, include: withPermissions })
}

export async function listPermissions(client: DbClient = prisma): Promise<PermissionRow[]> {
  return client.permission.findMany({ orderBy: { key: 'asc' } })
}

export async function findPermissionsByIds(ids: string[], client: DbClient = prisma): Promise<PermissionRow[]> {
  return client.permission.findMany({ where: { id: { in: ids } } })
}

export async function createRole(
  data: { name: string; description: string | null; permissionIds: string[] },
  client: DbClient = prisma
): Promise<RoleEntity> {
  return client.role.create({
    data: {
      name: data.name,
      description: data.description,
      permissions: { create: data.permissionIds.map((permissionId) => ({ permissionId })) },
    },
    include: withPermissions,
  })
}

export async function updateRoleScalars(
  id: string,
  data: { name?: string; description?: string | null },
  client: DbClient = prisma
): Promise<void> {
  await client.role.update({ where: { id }, data })
}

// Replace the full permission set: clear then re-create. Small N (a handful of permissions).
export async function setRolePermissions(
  id: string,
  permissionIds: string[],
  client: DbClient = prisma
): Promise<void> {
  await client.rolePermission.deleteMany({ where: { roleId: id } })
  await client.rolePermission.createMany({ data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })) })
}

export async function deleteRole(id: string, client: DbClient = prisma): Promise<void> {
  await client.role.delete({ where: { id } })
}

// Used to block deleting a role that's still assigned to users.
export async function countRoleAssignments(id: string, client: DbClient = prisma): Promise<number> {
  return client.userRole.count({ where: { roleId: id } })
}
