import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { authorize } from '../../middleware/authorize.js'
import { validate } from '../../middleware/validate.js'
import { writeLimiter } from '../../middleware/rate-limit.js'
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from '@admin/shared'
import * as controller from './users.controller.js'

// Pattern: authenticate -> authorize('users:<action>') -> validate -> controller.
// The service adds the sensitive guards (no self-suspend, keep one Admin, no escalation).
export const userRouter: Router = Router()

userRouter.use(authenticate)

userRouter.get('/', authorize('users:read'), validate(listUsersQuerySchema, 'query'), asyncHandler(controller.list))
userRouter.get('/:id', authorize('users:read'), asyncHandler(controller.getOne))
userRouter.post('/', writeLimiter, authorize('users:write'), validate(createUserSchema), asyncHandler(controller.create))
userRouter.patch(
  '/:id',
  writeLimiter,
  authorize('users:write'),
  validate(updateUserSchema),
  asyncHandler(controller.update)
)
userRouter.delete('/:id', writeLimiter, authorize('users:delete'), asyncHandler(controller.remove))
