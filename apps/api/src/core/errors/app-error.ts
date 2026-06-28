export interface AppErrorOptions {
  statusCode: number
  code: string
  message: string
  details?: unknown
  isOperational?: boolean
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown
  public readonly isOperational: boolean

  constructor(options: AppErrorOptions) {
    super(options.message)
    this.name = 'AppError'
    this.statusCode = options.statusCode
    this.code = options.code
    this.details = options.details
    this.isOperational = options.isOperational ?? true
  }
}

export class ValidationAppError extends AppError {
  constructor(message = 'Request validation failed.', details?: unknown) {
    super({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message,
      details,
    })
    this.name = 'ValidationAppError'
  }
}

export class UnauthorizedAppError extends AppError {
  constructor(message = 'Authentication required.') {
    super({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message,
    })
    this.name = 'UnauthorizedAppError'
  }
}

export class ForbiddenAppError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super({
      statusCode: 403,
      code: 'FORBIDDEN',
      message,
    })
    this.name = 'ForbiddenAppError'
  }
}

export class NotFoundAppError extends AppError {
  constructor(message = 'Resource not found.') {
    super({
      statusCode: 404,
      code: 'NOT_FOUND',
      message,
    })
    this.name = 'NotFoundAppError'
  }
}

export class ConflictAppError extends AppError {
  constructor(message = 'Resource already exists.') {
    super({
      statusCode: 409,
      code: 'CONFLICT',
      message,
    })
    this.name = 'ConflictAppError'
  }
}

export class RateLimitedAppError extends AppError {
  constructor(message = 'Too many requests. Please try again later.') {
    super({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message,
    })
    this.name = 'RateLimitedAppError'
  }
}