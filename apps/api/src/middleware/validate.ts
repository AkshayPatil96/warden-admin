import type { RequestHandler } from 'express'
import type { ZodSchema } from 'zod'
import { ValidationAppError } from '../core/errors/app-error.js'

type Target = 'body' | 'query' | 'params'

// Validate a request part against a shared Zod schema before it reaches the controller.
export function validate(schema: ZodSchema, target: Target = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target])
    if (!result.success) {
      next(
        new ValidationAppError('Invalid request payload.', {
          target,
          issues: result.error.flatten(),
        })
      )
      return
    }
    req[target] = result.data
    next()
  }
}
