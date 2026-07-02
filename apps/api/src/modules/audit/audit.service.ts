import type { AuditLog, AuditLogListResult, ListAuditLogsQuery } from '@admin/shared'
import { findActorsByIds, listAuditLogs as listAuditLogRows, type AuditLogEntity } from './audit.repository.js'

type ActorMap = Map<string, { email: string; name: string | null }>

function toAuditLog(entity: AuditLogEntity, actors: ActorMap): AuditLog {
  const actor = entity.actorId ? actors.get(entity.actorId) : undefined
  return {
    id: entity.id,
    actorId: entity.actorId,
    actorEmail: actor?.email ?? null,
    actorName: actor?.name ?? null,
    action: entity.action,
    entity: entity.entity,
    entityId: entity.entityId,
    before: entity.before ?? null,
    after: entity.after ?? null,
    createdAt: entity.createdAt.toISOString(),
  }
}

export async function listAuditLogs(query: ListAuditLogsQuery): Promise<AuditLogListResult> {
  const { data, total } = await listAuditLogRows({
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
    order: query.order,
    search: query.search,
    entity: query.entity,
    action: query.action,
    actorId: query.actorId,
    from: query.from,
    to: query.to,
  })

  const actorIds = [...new Set(data.map((row) => row.actorId).filter((id): id is string => Boolean(id)))]
  const actors = await findActorsByIds(actorIds)

  return {
    data: data.map((row) => toAuditLog(row, actors)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}
