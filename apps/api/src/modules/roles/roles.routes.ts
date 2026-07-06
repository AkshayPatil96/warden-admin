import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { writeLimiter } from '../../middleware/rate-limit.js'
import { createRoleSchema, updateRoleSchema } from '@admin/shared'
import * as controller from './roles.controller.js'

// List stays gated on users:read — the user-management picker needs it too.
// Mutations gate on roles:write / roles:delete: managing RBAC itself is sensitive.
export const roleRouter: Router = Router()

roleRouter.use(authenticate)
roleRouter.get('/', authorize('users:read'), asyncHandler(controller.list))
roleRouter.get('/permissions', authorize('roles:write'), asyncHandler(controller.listPermissions))
roleRouter.post('/', writeLimiter, authorize('roles:write'), validate(createRoleSchema), asyncHandler(controller.create))
roleRouter.patch(
  '/:id',
  writeLimiter,
  authorize('roles:write'),
  validate(updateRoleSchema),
  asyncHandler(controller.update)
)
roleRouter.delete('/:id', writeLimiter, authorize('roles:delete'), asyncHandler(controller.remove))
