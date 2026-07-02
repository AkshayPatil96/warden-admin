import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import * as controller from './roles.controller.js'

// Read-only. Gated on users:read since roles are only needed by the user-management UI.
export const roleRouter: Router = Router()

roleRouter.use(authenticate)
roleRouter.get('/', authorize('users:read'), asyncHandler(controller.list))
