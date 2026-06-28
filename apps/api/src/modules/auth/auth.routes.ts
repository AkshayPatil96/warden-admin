import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authLimiter } from '../../middleware/rate-limit.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { forgotPasswordSchema, loginRequestSchema, resetPasswordSchema } from '@admin/shared'
import * as controller from './auth.controller.js'

// Declarative wiring only. Pattern: authenticate -> authorize -> validate -> controller.
export const authRouter: Router = Router()

authRouter.post('/login', authLimiter, validate(loginRequestSchema), asyncHandler(controller.login))
authRouter.post('/logout', authenticate, asyncHandler(controller.logout))
authRouter.get('/me', authenticate, asyncHandler(controller.me))
authRouter.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(controller.forgotPassword))
authRouter.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(controller.resetPassword))
