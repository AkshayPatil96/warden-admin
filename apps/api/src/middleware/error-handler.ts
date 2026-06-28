import type { ErrorRequestHandler } from 'express'
import { logger } from '../lib/logger.js'
import { AppError } from '../core/errors/app-error.js'

// Central error handler — mount LAST. Logs detail server-side, returns a generic envelope.
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err)
    return
  }

  if (err instanceof AppError) {
    logger.warn(
      {
        err,
        requestId: req.requestId,
        path: req.originalUrl,
        method: req.method,
      },
      'handled application error'
    )

    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId: req.requestId,
    })
    return
  }

  logger.error(
    {
      err,
      requestId: req.requestId,
      path: req.originalUrl,
      method: req.method,
    },
    'unhandled error'
  )

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
    requestId: req.requestId,
  })
}
