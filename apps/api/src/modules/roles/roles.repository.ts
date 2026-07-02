import { Prisma } from '../../generated/prisma/client.js'
import type { PrismaClient } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'

type DbClient = PrismaClient | Prisma.TransactionClient

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
