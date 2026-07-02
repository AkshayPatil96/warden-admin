import type { RequestHandler } from 'express'
import * as analyticsService from './analytics.service.js'

export const summary: RequestHandler = async (_req, res) => {
  res.status(200).json(await analyticsService.getDashboardSummary())
}
