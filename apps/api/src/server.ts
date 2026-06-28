import { buildApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'

const app = buildApp()

app.listen(env.API_PORT, () => {
  logger.info(`API listening on http://localhost:${env.API_PORT}`)
})
