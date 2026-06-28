import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { writeLimiter } from '../../middleware/rate-limit.js'
import { createSubscriptionSchema, listSubscriptionsQuerySchema, updateSubscriptionSchema } from '@admin/shared'
import * as controller from './subscription.controller.js'

// Subscriptions are part of the billing domain — reuse the billing:* permissions.
// Pattern: authenticate -> authorize('billing:<action>') -> validate -> controller.
export const subscriptionRouter: Router = Router()

subscriptionRouter.use(authenticate)

subscriptionRouter.get(
  '/',
  authorize('billing:read'),
  validate(listSubscriptionsQuerySchema, 'query'),
  asyncHandler(controller.list)
)
subscriptionRouter.get('/:id', authorize('billing:read'), asyncHandler(controller.getOne))
subscriptionRouter.post(
  '/',
  writeLimiter,
  authorize('billing:write'),
  validate(createSubscriptionSchema),
  asyncHandler(controller.create)
)
subscriptionRouter.patch(
  '/:id',
  writeLimiter,
  authorize('billing:write'),
  validate(updateSubscriptionSchema),
  asyncHandler(controller.update)
)
subscriptionRouter.delete('/:id', writeLimiter, authorize('billing:delete'), asyncHandler(controller.remove))
