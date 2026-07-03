import { Router } from 'express'
import { asyncHandler } from '../../core/http/async-handler.js'
import { authLimiter } from '../../middleware/rate-limit.js'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
	changePasswordSchema,
	forgotPasswordSchema,
	loginRequestSchema,
	resetPasswordSchema,
	revokeSessionSchema,
	updateProfileSchema,
} from '@admin/shared'
import { writeLimiter } from '../../middleware/rate-limit.js'
import * as controller from './auth.controller.js'

// Declarative wiring only. Pattern: authenticate -> authorize -> validate -> controller.
export const authRouter: Router = Router()

authRouter.post('/login', authLimiter, validate(loginRequestSchema), asyncHandler(controller.login))
authRouter.post('/logout', authenticate, asyncHandler(controller.logout))
authRouter.get('/me', authenticate, asyncHandler(controller.me))

// Self-service account settings (no permission gate — every user manages their own).
authRouter.patch('/profile', authenticate, validate(updateProfileSchema), asyncHandler(controller.updateProfile))
authRouter.post(
	'/change-password',
	authenticate,
	writeLimiter,
	validate(changePasswordSchema),
	asyncHandler(controller.changePassword)
)

authRouter.get('/sessions', authenticate, asyncHandler(controller.listSessions))
authRouter.post('/sessions/revoke', authenticate, validate(revokeSessionSchema), asyncHandler(controller.revokeSession))
authRouter.post('/sessions/revoke-others', authenticate, asyncHandler(controller.revokeOtherSessions))
authRouter.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(controller.forgotPassword))
authRouter.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(controller.resetPassword))
