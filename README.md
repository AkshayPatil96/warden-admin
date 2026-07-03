# Warden Admin

A portfolio-grade internal-tools admin panel for a **SaaS subscription/billing** domain. The
goal is to demonstrate production engineering judgment — real auth, real RBAC, real security,
real data integrity — not template aesthetics. See [`admin-panel-spec.md`](./docs/admin-panel-spec.md)
for the full thesis and [`CLAUDE.md`](./CLAUDE.md) for the binding architecture rules.

> **Status:** feature-complete for the core thesis. Auth + RBAC, billing CRUD (customers /
> subscriptions / invoices), a real-aggregate dashboard, the audit-log viewer, user & role
> management, and account settings are all built end-to-end and tested. Remaining: deploy +
> live demo, and optional flexes (E2E, API keys). See the [roadmap](#roadmap).

## Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind v4 · restyled shadcn-style primitives · Recharts |
| Server state | TanStack Query |
| Validation | Zod schemas in `packages/shared`, imported by **both** apps |
| Backend | Node + Express + TypeScript |
| Database | PostgreSQL + Prisma |
| Auth | Self-rolled session auth (Argon2id, httpOnly cookies) |
| Security | Helmet · express-rate-limit · CSP + security headers · server-side Zod validation |
| Tests | Vitest — integration against a real Postgres (API), pure-logic units (web) |

## Layout

```
apps/
  api/        Express + TS backend (feature-modular: routes → controller → service → repository)
  web/        Next.js frontend (app/ = routing only; features/<entity>/ = vertical slices)
packages/
  shared/     Zod schemas + inferred types — single source of truth for shapes (compiled to dist)
docker-compose.yml   api + web (point DATABASE_URL at a Postgres)
.github/workflows/   CI: lint → typecheck → test → build
```

## Getting started

```bash
pnpm install
cp .env.example .env          # then set DATABASE_URL (Prisma Postgres or any reachable Postgres)
pnpm --filter @admin/api db:migrate
pnpm db:seed                  # roles, permissions, 3 demo logins, demo billing data
pnpm dev                      # api on :4000, web on :3000
```

### Demo logins

Three seeded roles with visibly different permissions (log in as each and watch the UI **and**
API enforce them). Password for all: `Password123!`

| Role | Email | Can |
|---|---|---|
| **Admin** | `admin@example.com` | everything |
| **Manager** | `manager@example.com` | all except delete users, delete invoices, write settings |
| **Viewer** | `viewer@example.com` | read-only (billing, audit, users) |

## API surface

All under `/api/v1`. Every protected route runs `authenticate → authorize('<perm>') → validate(zod) → controller`.

| Area | Routes | Permission |
|---|---|---|
| Auth | `login`, `logout`, `me`, `forgot-password`, `reset-password` | public / session |
| Account | `PATCH auth/profile`, `POST auth/change-password` | session (self only) |
| Customers | `GET/POST /customers`, `GET/PATCH/DELETE /customers/:id` | `billing:read` / `:write` / `:delete` |
| Subscriptions | same shape under `/subscriptions` | `billing:*` |
| Invoices | same shape under `/invoices` | `billing:*` |
| Users & Roles | `/users` CRUD, `GET /roles` | `users:read` / `:write` / `:delete` |
| Analytics | `GET /analytics/summary` | `billing:read` |
| Audit | `GET /audit` | `audit:read` |

List endpoints are **server-side** paginated/sorted/filtered (never ship all rows). Mutations
to sensitive data write an **audit-log** entry (actor, action, entity, before/after, timestamp).

## Adding an entity

A new entity = three slices, kept in sync by their shared schema:

1. `packages/shared/src/schemas/<entity>.ts` — Zod schema + inferred types.
2. `apps/api/src/modules/<entity>/` — `routes → controller → service → repository`.
3. `apps/web/src/features/<entity>/` — `components`, `hooks` (TanStack Query), `api.ts`.

## Architecture decisions (the "why")

Each is a real decision with its tradeoff — defending these in your own words is the point.

- **Separate Express API over a Next.js monolith.** The skill on display is backend/API design;
  burying it in route handlers would hide it. Cost: two deploys, CORS/cookie plumbing. Worth it here.
- **Monorepo with `packages/shared`.** Zod schemas are defined once and imported by API validation
  **and** web forms — no drift between client and server shapes. The alternative (duplicated types)
  is the usual source of contract bugs.
- **`shared` is compiled to `dist`, not consumed as raw TS.** The original "no build step" setup
  broke once the web app actually bundled `shared`: Turbopack won't resolve the package's
  `.js`-extension re-exports to `.ts` across the package boundary, and dropping the extensions
  breaks the API's NodeNext typecheck. Compiling to real JS + `.d.ts` satisfies every consumer;
  Turbo's `^build` ordering makes it free.
- **PostgreSQL + Prisma.** RBAC, audit logs, and relational integrity are a textbook relational fit.
  Prisma for recognizability and migration discipline (schema changes are versioned, never hand-edited).
- **Self-rolled session auth (Argon2id + httpOnly cookies), not a managed provider.** For an admin
  panel, server-side sessions give instant revocation and no token-in-localStorage XSS exposure —
  and rolling it correctly is exactly the security depth the piece is meant to show. Cost: more code,
  more ways to get subtly wrong (mitigated by the security controls below + tests).
- **RBAC by granular permission, never role strings.** `authorize('billing:write')`, not
  `if (role === 'admin')`. New roles are data, not code. The UI mirrors permissions for UX
  (hide/disable), but the **API is the only source of truth**.
- **TanStack Query for server state, no Redux.** Caching, `keepPreviousData` for flash-free
  pagination, and cache-sync on mutations cover the needs; global client state stays minimal.
- **Analytics via `$queryRaw` + a 60s in-memory cache.** Real `GROUP BY` / `generate_series`
  aggregates (not random numbers), and a short server cache so full-table scans don't run on every
  page load. Process-local — Redis if the API ever runs multiple instances.
- **Hand-rolled UI primitives (cva), not stock shadcn.** A deliberate indigo-on-slate token system
  in CSS variables (light/dark, no FOUC) so it reads as a product, not a template.

## Security controls

Argon2id password hashing · httpOnly+Secure+SameSite session cookies (never localStorage) ·
permission checks on every protected route · Zod validation server-side before the DB · Prisma
(parameterized, no string-built SQL) · per-IP rate limits on auth + write routes · **account
lockout** after repeated failures · single-use, expiring, hashed password-reset tokens · audit
log on sensitive mutations · Helmet on the API + a **CSP and security headers** on the web
(`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS) ·
generic error messages out, structured pino logs in · `pnpm audit` clean · secrets in env only.

## Testing

- **API (`apps/api`):** integration tests against a **real** Postgres (no DB mocks) covering the
  auth flow, permission-denied (403), and CRUD/invariants for every module — 46 tests.
- **Web (`apps/web`):** pure-logic units — permission gating (RBAC), the open-redirect guard, and
  money conversion — 11 tests. (Component/E2E with jsdom/Playwright is a documented follow-up.)

```bash
pnpm test          # both, via Turbo
```

## Deliberate tradeoffs & known gaps

The senior signal is knowing where to stop and saying so:

- **Lockout reveals account existence.** A non-existent email never locks, so a "locked" message
  leaks existence. Accepted for an internal tool; the swap to a fully generic message is a one-liner
  noted in `auth.service.ts`.
- **No CSRF token yet.** `SameSite=Lax` + a JSON-only API covers the common case; a token is
  deferrable and documented rather than built.
- **CSP `script-src` uses `'unsafe-inline'`.** Next injects inline bootstrap (and next-themes an
  inline pre-hydration script); removing it needs per-request nonces via middleware — a follow-up.
  The rest of the CSP is strict (`object-src 'none'`, `frame-ancestors 'none'`, scoped `connect-src`).
- **No mailer.** `forgot-password` logs the reset link via pino in dev; the real send is a marked seam.
- **In-memory analytics cache.** Fine single-instance; Redis if horizontally scaled.
- **Dialog does focus-in + restore, not a full focus trap.** Enough for these short forms.
- **Email change not supported** in settings (name + password only).
- **Not deployed yet** — no live demo URL.

## Roadmap

1. ~~Foundation: scaffold, schema, CI~~ ✅
2. ~~Auth + RBAC: sessions, hashing, lockout, password reset, audit, seed~~ ✅
3. ~~Domain CRUD (customers / subscriptions / invoices) — paginated, audited, permission-gated~~ ✅
4. ~~Dashboard + charts from real aggregates~~ ✅
5. ~~Differentiators: audit-log viewer, user/role management, settings~~ ✅
6. ~~Web auth wiring, theme/no-FOUC, security headers, quality pass~~ ✅
7. **Next:** deploy + live demo logins; optional flexes (Playwright E2E, API-key management).
