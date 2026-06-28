import type { RequestHandler } from 'express'
import { NotFoundAppError } from '../core/errors/app-error.js'

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundAppError(`Route ${req.method} ${req.originalUrl} was not found.`))
}