import { Prisma } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'

export type AuditLogEntity = Prisma.AuditLogGetPayload<object>

export interface ListAuditLogsParams {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  entity?: string
  action?: string
  actorId?: string
  from?: Date
  to?: Date
}

const SORTABLE_FIELDS = new Set<keyof Prisma.AuditLogOrderByWithRelationInput>(['action', 'entity', 'createdAt'])

function buildWhere(params: ListAuditLogsParams): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {}
  if (params.entity) {
    where.entity = params.entity
  }
  if (params.action) {
    where.action = params.action
  }
  if (params.actorId) {
    where.actorId = params.actorId
  }
  if (params.from || params.to) {
    where.createdAt = { gte: params.from, lte: params.to }
  }
  if (params.search) {
    where.OR = [
      { action: { contains: params.search, mode: 'insensitive' } },
      { entityId: { contains: params.search, mode: 'insensitive' } },
    ]
  }
  return where
}

export async function listAuditLogs(
  params: ListAuditLogsParams
): Promise<{ data: AuditLogEntity[]; total: number }> {
  const where = buildWhere(params)
  const sortField =
    params.sort && SORTABLE_FIELDS.has(params.sort as keyof Prisma.AuditLogOrderByWithRelationInput)
      ? params.sort
      : 'createdAt'

  const [data, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { [sortField]: params.order },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { data, total }
}

// audit_logs has no FK to users — resolve actor identities in a second query.
export async function findActorsByIds(
  ids: string[]
): Promise<Map<string, { email: string; name: string | null }>> {
  if (ids.length === 0) return new Map()
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, name: true },
  })
  return new Map(users.map((u) => [u.id, { email: u.email, name: u.name }]))
}
