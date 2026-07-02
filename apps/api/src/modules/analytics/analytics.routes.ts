import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import * as controller from './analytics.controller.js'

// Read-only billing aggregates for the dashboard. Gated on billing:read (all roles have it).
export const analyticsRouter: Router = Router()

analyticsRouter.use(authenticate)
analyticsRouter.get('/summary', authorize('billing:read'), asyncHandler(controller.summary))
