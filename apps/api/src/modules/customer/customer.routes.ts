import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { writeLimiter } from '../../middleware/rate-limit.js'
import { createCustomerSchema, listCustomersQuerySchema, updateCustomerSchema } from '@admin/shared'
import * as controller from './customer.controller.js'

// Pattern: authenticate -> authorize('billing:<action>') -> validate -> controller.
// authorize() is the source of truth; the web UI mirrors it for UX only.
export const customerRouter: Router = Router()

customerRouter.use(authenticate)

customerRouter.get('/', authorize('billing:read'), validate(listCustomersQuerySchema, 'query'), asyncHandler(controller.list))
customerRouter.get('/:id', authorize('billing:read'), asyncHandler(controller.getOne))
customerRouter.post('/', writeLimiter, authorize('billing:write'), validate(createCustomerSchema), asyncHandler(controller.create))
customerRouter.patch(
  '/:id',
  writeLimiter,
  authorize('billing:write'),
  validate(updateCustomerSchema),
  asyncHandler(controller.update)
)
customerRouter.delete('/:id', writeLimiter, authorize('billing:delete'), asyncHandler(controller.remove))
