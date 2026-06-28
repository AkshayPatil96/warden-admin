import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

function resolveRequestId(rawRequestId: string | string[] | undefined): string {
  if (Array.isArray(rawRequestId)) {
    return rawRequestId[0] ?? randomUUID()
  }

  if (typeof rawRequestId === 'string' && rawRequestId.trim().length > 0) {
    return rawRequestId
  }

  return randomUUID()
}

export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = resolveRequestId(req.headers['x-request-id'])
  req.requestId = requestId
  res.setHeader('x-request-id', requestId)
  next()
}