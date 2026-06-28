# ADR-001: API Foundation and Unified Error Model

## Status
Accepted

## Date
2026-06-28

## Context
The API app currently has feature scaffolding but lacks a stable architecture baseline for:
- Consistent route composition as modules grow.
- Uniform error handling across middleware/controllers/services.
- Correlatable logs and error responses for production debugging.

Without a shared error contract and request correlation, operators must infer failures from fragmented logs and ad-hoc response shapes.

## Decision Drivers
- Reliability: every failure path should terminate in one deterministic handler.
- Security: avoid leaking internal exceptions and stack details to clients.
- Operability: include request correlation IDs in responses and logs.
- Scalability: module registration should support feature growth without rewiring `app.ts` repeatedly.

## Decision
We introduced a unified API foundation in `apps/api`:

1. **Versioned module router composition**
- Added `src/modules/index.ts` as the aggregation point.
- Mounted modules under `/api/v1` in `src/app.ts`.
- Kept `/api/auth` compatibility alias during migration.

2. **Unified application error model**
- Added `AppError` and typed subclasses in `src/core/errors/app-error.ts`.
- Central error middleware maps operational errors to structured responses and masks unknown failures.

3. **Async-safe controller execution**
- Added `asyncHandler` in `src/core/http/async-handler.ts`.
- All auth routes now wrap handlers to forward promise rejections to central middleware.

4. **Request context correlation**
- Added `requestContext` middleware to resolve/issue `x-request-id`.
- Responses and logs include request ID to speed root-cause investigation.

5. **404 normalization**
- Added `notFoundHandler` to route unmatched requests through the same error pipeline.

## Alternatives Considered

1. **Inline `try/catch` in each controller**
- Rejected: repetitive and error-prone, creates uneven response contracts.

2. **Third-party error framework**
- Rejected for now: unnecessary abstraction for current scale; native Express + typed errors is sufficient.

3. **No API versioning yet**
- Rejected: adding versioning later is a breaking migration for clients.

## Consequences

### Positive
- Predictable `{ error, requestId }` response envelope for all failures.
- Cleaner module growth path and better separation between app wiring and feature modules.
- Better incident triage via request-level correlation.

### Negative
- Slightly more boilerplate when introducing new error types.
- Transitional dual route support (`/api/v1` and `/api/auth`) requires eventual cleanup.

## Follow-up
- Implement concrete auth service/repository and replace 501 placeholders.
- Add integration tests for:
  - unknown route returns `NOT_FOUND` envelope,
  - validation errors return `VALIDATION_ERROR` with details,
  - unhandled exceptions return masked `INTERNAL_ERROR`.
- Remove `/api/auth` alias once frontend uses `/api/v1/auth`.