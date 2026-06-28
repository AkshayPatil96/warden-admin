import type { RequestHandler } from 'express'
import { UnauthorizedAppError } from '../core/errors/app-error.js'
import { clearSessionCookie, resolveSession, SESSION_COOKIE } from '../lib/session.js'

// Resolve the session cookie -> attach the current user to req.
export const authenticate: RequestHandler = async (req, res, next) => {
  const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined

  if (!sessionId) {
    next(new UnauthorizedAppError())
    return
  }

  const resolved = await resolveSession(sessionId)
  if (!resolved) {
    clearSessionCookie(res)
    next(new UnauthorizedAppError())
    return
  }

  req.sessionId = resolved.session.id
  req.user = resolved.user
  next()
}
