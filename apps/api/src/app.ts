import express, { type Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { pinoHttp } from 'pino-http'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { errorHandler } from './middleware/error-handler.js'
import { notFoundHandler } from './middleware/not-found.js'
import { requestContext } from './middleware/request-context.js'
import { apiV1Router } from './modules/index.js'

export function buildApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }))
  app.use(requestContext)
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ limit: '1mb', extended: true }))
  app.use(cookieParser())
  app.use(pinoHttp({ logger }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Mount API v1 routes
  app.use('/api/v1', apiV1Router)

  app.use(notFoundHandler)

  // Central error handler — must be last.
  app.use(errorHandler)

  return app
}
