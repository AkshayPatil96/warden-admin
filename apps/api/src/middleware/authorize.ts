import type { RequestHandler } from 'express'
import { ForbiddenAppError, UnauthorizedAppError } from '../core/errors/app-error.js'

// Permission gate. Checks granular permissions (e.g. 'orders:write'), never role strings.
// Server is the source of truth — UI gating is UX only.
export function authorize(_permission: string): RequestHandler {
  return (req, _res, next) => {
    const user = req.user

    if (!user) {
      next(new UnauthorizedAppError())
      return
    }

    if (!user.permissions.includes(_permission)) {
      next(new ForbiddenAppError(`Missing permission: ${_permission}`))
      return
    }

    next()
  }
}
