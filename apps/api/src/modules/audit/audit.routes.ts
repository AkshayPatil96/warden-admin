import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { listAuditLogsQuerySchema } from '@admin/shared'
import * as controller from './audit.controller.js'

// Read-only audit trail. Gated on audit:read.
export const auditRouter: Router = Router()

auditRouter.use(authenticate)
auditRouter.get('/', authorize('audit:read'), validate(listAuditLogsQuerySchema, 'query'), asyncHandler(controller.list))
