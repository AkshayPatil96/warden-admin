import { Prisma } from '../generated/prisma/client.js'
import type { PrismaClient } from '../generated/prisma/client.js'
import { prisma } from './prisma.js'

export interface AuditEntry {
  actorId: string | null
  action: string
  entity: string
  entityId?: string
  before?: unknown
  after?: unknown
}

type DbClient = PrismaClient | Prisma.TransactionClient

export async function writeAudit(entry: AuditEntry, client: DbClient = prisma): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: entry.before as Prisma.InputJsonValue | undefined,
      after: entry.after as Prisma.InputJsonValue | undefined,
    },
  })
}
