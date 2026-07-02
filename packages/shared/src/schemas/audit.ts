import { z } from 'zod'
import { paginationQuerySchema } from './common.js'

// Response shape. actorEmail/actorName are resolved from actorId at read time
// (audit_logs has no FK to users, so a deleted actor resolves to null).
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  actorEmail: z.string().nullable(),
  actorName: z.string().nullable(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  createdAt: z.string(),
})
export type AuditLog = z.infer<typeof auditLogSchema>

export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  entity: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>

export interface AuditLogListResult {
  data: AuditLog[]
  total: number
  page: number
  pageSize: number
}
