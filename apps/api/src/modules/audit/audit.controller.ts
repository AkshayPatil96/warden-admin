import type { RequestHandler } from 'express'
import * as auditService from './audit.service.js'
import type { ListAuditLogsQuery } from '@admin/shared'

export const list: RequestHandler = async (req, res) => {
  res.status(200).json(await auditService.listAuditLogs(req.query as unknown as ListAuditLogsQuery))
}
