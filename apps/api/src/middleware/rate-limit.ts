import rateLimit from 'express-rate-limit'
import { RateLimitedAppError } from '../core/errors/app-error.js'
import { env } from '../config/env.js'

// Integration tests fire many auth requests from one IP; the limiter would trip mid-suite.
// Account-level lockout (which the tests DO exercise) is the real brute-force control here.
const skipInTest = (): boolean => env.NODE_ENV === 'test'

// Tighter limit for auth endpoints (brute-force protection).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, _res, next) => {
    next(new RateLimitedAppError('Too many login attempts. Please try again later.'))
  },
})

// General write-endpoint limiter.
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTest,
  handler: (_req, _res, next) => {
    next(new RateLimitedAppError())
  },
})
