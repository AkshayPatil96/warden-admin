import { Prisma } from '../../generated/prisma/client.js'
import type { PrismaClient, UserStatus } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'

type DbClient = PrismaClient | Prisma.TransactionClient

export const ADMIN_ROLE_NAME = 'Admin'

export type UserEntity = Prisma.UserGetPayload<{
  include: { roles: { include: { role: true } } }
}>

const withRoles = {
  roles: { include: { role: true } },
} satisfies Prisma.UserInclude

export interface ListUsersParams {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  status?: UserStatus
}

// Whitelist sortable columns — never pass a user-supplied string straight into orderBy.
const SORTABLE_FIELDS = new Set<keyof Prisma.UserOrderByWithRelationInput>([
  'email',
  'name',
  'status',
  'createdAt',
])

function buildWhere(params: ListUsersParams): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {}
  if (params.status) {
    where.status = params.status
  }
  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: 'insensitive' } },
      { name: { contains: params.search, mode: 'insensitive' } },
    ]
  }
  return where
}

export async function listUsers(params: ListUsersParams): Promise<{ data: UserEntity[]; total: number }> {
  const where = buildWhere(params)
  const sortField =
    params.sort && SORTABLE_FIELDS.has(params.sort as keyof Prisma.UserOrderByWithRelationInput)
      ? params.sort
      : 'createdAt'

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      include: withRoles,
      orderBy: { [sortField]: params.order },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return { data, total }
}

export async function findUserById(id: string, client: DbClient = prisma): Promise<UserEntity | null> {
  return client.user.findUnique({ where: { id }, include: withRoles })
}

export async function createUser(
  data: { email: string; name?: string; passwordHash: string; roleIds: string[] },
  client: DbClient = prisma
): Promise<UserEntity> {
  return client.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      roles: { create: data.roleIds.map((roleId) => ({ roleId })) },
    },
    include: withRoles,
  })
}

export async function updateUserScalars(
  id: string,
  data: { name?: string | null; status?: UserStatus },
  client: DbClient = prisma
): Promise<void> {
  await client.user.update({ where: { id }, data })
}

// Replace the full role set: clear then re-create. Small N (a handful of roles).
export async function setUserRoles(id: string, roleIds: string[], client: DbClient = prisma): Promise<void> {
  await client.userRole.deleteMany({ where: { userId: id } })
  await client.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) })
}

export async function deleteUser(id: string, client: DbClient = prisma): Promise<void> {
  await client.user.delete({ where: { id } })
}

// Count active users holding the Admin role — used to protect against removing the last admin.
export async function countActiveAdmins(client: DbClient = prisma): Promise<number> {
  return client.user.count({
    where: { status: 'ACTIVE', roles: { some: { role: { name: ADMIN_ROLE_NAME } } } },
  })
}
