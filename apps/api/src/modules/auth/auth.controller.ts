import type { RequestHandler } from 'express'
import { UnauthorizedAppError } from '../../core/errors/app-error.js'
import { clearSessionCookie, setSessionCookie } from '../../lib/session.js'
import * as authService from './auth.service.js'
import type {
	ChangePasswordRequest,
	ForgotPasswordRequest,
	LoginRequest,
	ResetPasswordRequest,
	UpdateProfileRequest,
} from '@admin/shared'

export const login: RequestHandler = async (req, res) => {
  const body = req.body as LoginRequest
  const result = await authService.login(body.email, body.password, body.rememberMe ?? false)
  setSessionCookie(res, result.session)
  res.status(200).json(result.user)
}

export const logout: RequestHandler = async (req, res) => {
  if (!req.sessionId || !req.user) {
    throw new UnauthorizedAppError()
  }

  await authService.logout(req.sessionId, req.user)
  clearSessionCookie(res)
  res.status(204).send()
}

export const me: RequestHandler = async (req, res) => {
  if (!req.user) {
    throw new UnauthorizedAppError()
  }

  res.status(200).json(req.user)
}

export const updateProfile: RequestHandler = async (req, res) => {
	if (!req.user) {
		throw new UnauthorizedAppError()
	}
	const body = req.body as UpdateProfileRequest
	const updated = await authService.updateProfile(req.user, body.name)
	res.status(200).json(updated)
}

export const changePassword: RequestHandler = async (req, res) => {
	if (!req.user || !req.sessionId) {
		throw new UnauthorizedAppError()
	}
	const body = req.body as ChangePasswordRequest
	await authService.changePassword(req.user, req.sessionId, body.currentPassword, body.newPassword)
	res.status(204).send()
}

// Always 204 — never reveal whether the email maps to an account.
export const forgotPassword: RequestHandler = async (req, res) => {
  const body = req.body as ForgotPasswordRequest
  await authService.requestPasswordReset(body.email)
  res.status(204).send()
}

export const resetPassword: RequestHandler = async (req, res) => {
  const body = req.body as ResetPasswordRequest
  await authService.resetPassword(body.token, body.password)
  res.status(204).send()
}
