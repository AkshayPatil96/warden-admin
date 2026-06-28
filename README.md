# Admin Panel

A portfolio-grade internal-tools admin panel. The goal is to demonstrate production
engineering judgment — real auth, real RBAC, real security, real data integrity — not
template aesthetics. See [`admin-panel-spec.md`](./admin-panel-spec.md) for the full thesis
and [`CLAUDE.md`](./CLAUDE.md) for the binding architecture rules.

> **Status:** backend auth + RBAC are implemented and tested (login/logout/session, Argon2id,
> password reset, account lockout, audit logging, permission-gated routes). Domain CRUD and the
> web UI are the next phases — see [the plan](#roadmap).

## Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js (App Router) · TypeScript · Tailwind · shadcn/ui (restyled) · Recharts |
| Server state | TanStack Query |
| Validation | Zod schemas in `packages/shared`, imported by **both** apps |
| Backend | Node + Express + TypeScript |
| Database | PostgreSQL + Prisma |
| Auth | Self-rolled session auth (Argon2id, httpOnly cookies) |
| Security | Helmet · express-rate-limit · CSP · server-side validation |

## Layout

```
apps/
  api/        Express + TS backend (feature-modular: routes → controller → service → repository)
  web/        Next.js frontend (app/ = routing only; features/<entity>/ = vertical slices)
packages/
  shared/     Zod schemas + inferred types — single source of truth for shapes
docker-compose.yml   postgres + api + web for local parity
.github/workflows/   CI: lint → typecheck → test → build (migrations on a Postgres service)
```

## Getting started

```bash
# 1. Install deps
pnpm install

# 2. Configure env
cp .env.example .env

# 3. Start Postgres (Docker) — or point DATABASE_URL at your own
docker compose up -d postgres

# 4. Create the schema + seed demo roles/logins
pnpm --filter @admin/api db:migrate
pnpm db:seed

# 5. Run everything (api on :4000, web on :3000)
pnpm dev
```

Full stack in containers:

```bash
docker compose up --build
```

## Scripts (root)

| Command | Does |
|---|---|
| `pnpm dev` | Run all apps in watch mode (Turbo) |
| `pnpm build` | Build all packages |
| `pnpm lint` | ESLint across the workspace |
| `pnpm typecheck` | `tsc --noEmit` everywhere |
| `pnpm test` | Vitest |
| `pnpm db:migrate` | Prisma migrate (dev) |
| `pnpm db:seed` | Seed roles + demo users |

## Adding an entity

A new entity = three slices, kept in sync by their shared schema:

1. `packages/shared/src/schemas/<entity>.ts` — Zod schema + inferred types.
2. `apps/api/src/modules/<entity>/` — `routes → controller → service → repository`.
3. `apps/web/src/features/<entity>/` — `components`, `hooks` (TanStack Query), `api.ts`.

## Auth & security

Implemented on the API (`apps/api/src/modules/auth`, enforced server-side):

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/login` | Email + password → Argon2id verify → server-side session, httpOnly+SameSite cookie. `rememberMe` extends TTL. |
| `POST /api/v1/auth/logout` | Revokes the session (DB delete) + clears cookie. |
| `GET  /api/v1/auth/me` | Current user + freshly-resolved permissions. |
| `POST /api/v1/auth/forgot-password` | Always 204. Issues a single-use, expiring reset token (sha256 stored, raw token delivered out-of-band). |
| `POST /api/v1/auth/reset-password` | Validates the token, sets a new password, and revokes all of that user's sessions. |

Controls: RBAC by **granular permission** (`users:read`, …) checked in `authorize()` middleware — never role strings; **account lockout** after `MAX_FAILED_LOGINS` for `ACCOUNT_LOCK_MINUTES`; per-IP rate limit on auth routes; **audit log** on login/logout/lockout/reset; generic error messages; Helmet/CSP; Zod validation on every body.

Deliberate tradeoffs (the senior signal is knowing where to stop):

- **Lockout reveals account existence.** A distinct "locked" message is friendlier but a non-existent email never locks, so it leaks existence. Accepted for an internal admin tool; the swap to a fully generic message is a one-liner noted in `auth.service.ts`.
- **No CSRF token yet.** `SameSite=Lax` + a JSON-only API covers the common case; a token is deferrable and documented rather than built.
- **No mailer.** `forgot-password` logs the reset link via pino in dev; the real email send is a clearly-marked seam in `auth.service.ts`.

## Architecture decisions

The "why" behind each choice (separate API over Next monolith, Postgres over Mongo,
self-rolled sessions over a managed auth provider, RBAC by permission not role string) is
documented in [`admin-panel-spec.md`](./admin-panel-spec.md) §3. Defending these in your own
words is the point of the project.

## Roadmap

1. ~~Foundation: scaffold, schema, CI~~ ✅
2. ~~Auth + RBAC: sessions, hashing, lockout, password reset, audit, seed~~ ✅
3. **Next:** domain CRUD (SaaS subscription/billing) — server-side paginated/filtered/sorted, audit on mutations, permission-gated.
4. Dashboard + charts from real aggregates.
5. Differentiators: audit-log UI, user/role management, settings.
6. Web auth wiring, theme/no-FOUC, security pass, deploy.

## Known gaps

- `packages/shared` is consumed as raw TS (`transpilePackages` / `tsx`). A production API
  Docker build needs `shared` compiled or bundled first.
  <!-- ponytail: deferred — wire a shared build step when the API image is actually deployed -->
- Domain CRUD modules and the entire web UI (incl. frontend auth wiring) are not built yet.
