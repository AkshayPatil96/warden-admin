# Admin Panel — Project Rules

Internal-tools admin panel. Portfolio-grade: the goal is to demonstrate production engineering judgment, not template aesthetics. Optimize every decision for "would this convince a senior reviewer I've shipped real software."

This file is the source of truth. Execute the decisions here — do not re-litigate the architecture or invent your own. If something here genuinely blocks a task, flag it and ask; don't silently deviate.

## Stack (fixed — do not swap without asking)
- **Monorepo:** pnpm workspaces. `apps/web` (Next.js + TS), `apps/api` (Express + TS), `packages/shared` (Zod schemas + shared types).
- **DB:** PostgreSQL + Prisma.
- **Frontend:** Next.js, TypeScript, Tailwind, shadcn/ui (restyled — never stock defaults), Recharts.
- **Server state:** TanStack Query. No Redux.
- **Validation:** Zod. Schemas live in `packages/shared` and are imported by BOTH web and api — never duplicate them.
- **Auth:** self-rolled session auth (Argon2id hashing, httpOnly Secure SameSite cookies, server-side session store).

## Folder structure

**Organize by feature/domain, not by technical layer.** Top-level folders grow with *features* (what changes), not *roles* (controllers/services/...). Layering happens INSIDE each module. This is internal organization of a single deployable app — modular monolith, NOT microservices.

### Monorepo root
```
admin-panel/
  apps/
    api/                 # Express + TS backend
    web/                 # Next.js frontend
  packages/
    shared/              # Zod schemas + inferred types (imported by both apps)
  docker-compose.yml     # postgres + api + web for local parity
  pnpm-workspace.yaml
  package.json
  .env.example
  .github/workflows/ci.yml
```

### `packages/shared`
```
packages/shared/src/
  schemas/               # one file per entity: user.ts, order.ts, ...
                         #   exports <Entity>Schema, Create<Entity>Schema, Update<Entity>Schema
  types/                 # types inferred from schemas (or co-locate in schemas/)
  index.ts               # barrel export
```
Source of truth for shapes. API validation AND web forms import from here. Never redefine a shape in either app.

### `apps/api` — feature-modular, layered inside each module
```
apps/api/src/
  modules/
    <entity>/            # e.g. auth/, users/, orders/
      <entity>.routes.ts      # endpoints + middleware chain. No logic.
      <entity>.controller.ts  # HTTP only: parse req, call service, shape res, status codes.
      <entity>.service.ts     # business logic, invariants, audit logging, orchestration. No HTTP, no req/res.
      <entity>.repository.ts   # ONLY place that touches Prisma for this entity.
      <entity>.test.ts
  middleware/            # cross-cutting, shared across modules
    authenticate.ts      # resolve session cookie -> user
    authorize.ts         # permission gate: authorize('orders:write')
    validate.ts          # Zod validation middleware
    rate-limit.ts
    error-handler.ts     # central, mounted LAST
  lib/
    prisma.ts            # Prisma client singleton
    logger.ts            # pino
    audit.ts             # audit-log writer
    password.ts          # Argon2id hash/verify
    session.ts           # session store + cookie helpers
  config/
    env.ts               # env vars validated with Zod at boot
  app.ts                 # build express app, mount module routers + middleware
  server.ts              # bootstrap / listen
  prisma/
    schema.prisma
    migrations/
    seed.ts              # demo data + Admin/Manager/Viewer roles + logins
```
Layer responsibilities — keep them clean:
- **routes:** `authenticate → authorize('<entity>:<action>') → validate(schema) → controller`. Declarative only.
- **controller:** HTTP boundary only. Never contains business rules or Prisma.
- **service:** all business logic; writes audit log; framework-agnostic so it's unit-testable.
- **repository:** the only Prisma surface for the entity.
> Tradeoff: for trivial CRUD a repository can be a hollow pass-through. Either keep all four layers for consistency (recommended for the portfolio piece — the scaffold skill makes the boilerplate free, just ensure the service does real work) OR skip the repository on trivial entities and let the service call Prisma. Pick one policy and apply it consistently; be able to say which and why.

### `apps/web` — feature-modular, App Router for routing only
```
apps/web/src/
  app/                   # Next.js App Router = ROUTING ONLY. Pages compose features; no business logic.
    (auth)/login/page.tsx
    (dashboard)/
      layout.tsx         # authed shell: sidebar, topbar, theme
      page.tsx           # dashboard home
      users/page.tsx
      orders/page.tsx
      settings/page.tsx
    layout.tsx           # root layout + providers
  features/              # vertical slice per domain
    <entity>/
      components/        # <Entity>Table, <Entity>Form, ...
      hooks/             # use<Entities>, use<Entity>, useCreate<Entity> (TanStack Query)
      api.ts             # fetch fns hitting apps/api for this entity
      types.ts           # re-export from packages/shared (never redefine)
  components/
    ui/                  # shadcn/ui primitives, RESTYLED (not stock defaults)
    layout/              # Sidebar, Topbar, ThemeToggle
    data-table/          # reusable server-paginated table (sort/filter/search/paginate)
  lib/
    api-client.ts        # fetch wrapper: credentials:'include' (httpOnly cookies), error normalization
    query-client.ts      # TanStack Query config
    auth.ts              # current-user/session helpers, permission checks for UI gating
    utils.ts
  providers/
    query-provider.tsx
    theme-provider.tsx   # CSS-variable theme, no FOUC
  styles/
    globals.css          # CSS variables for light/dark
```
Frontend rules:
- `app/` is routing only — a page imports and arranges feature components; it holds no data logic.
- Each `features/<entity>/` owns its components, hooks, and API calls. Don't scatter a feature across global folders.
- All server data flows through TanStack Query hooks in `features/<entity>/hooks`. No Redux.
- `api-client.ts` is the single fetch surface: always `credentials:'include'` so the session cookie rides along, and it normalizes errors into the structured shape the API returns.
- UI permission gating (hide/disable controls) reads from `lib/auth.ts` — UX only; the API still enforces.
- Types come from `packages/shared`. Never redefine an entity shape in the web app.

A new entity = one `apps/api/src/modules/<entity>/` slice + one `apps/web/src/features/<entity>/` slice + its schema in `packages/shared`. The `scaffold-crud` skill emits exactly these.

## Golden rules (non-negotiable)
1. **Permissions are checked at the API layer — always.** Server is the source of truth. UI hiding/disabling is UX only; never trust the client.
2. **Authorization checks permissions, never role strings.** Use granular permissions like `users:read`, `orders:write`, `invoices:delete`.
3. **Never put tokens or session IDs in localStorage.** httpOnly cookies only.
4. **Validate and sanitize all input server-side** with the shared Zod schema before it touches the DB. Client validation is UX, not security.
5. **Parameterized queries / ORM only.** Never string-concatenate SQL.
6. **No secrets in the repo.** Env vars only; keep `.env.example` updated, `.env` gitignored.
7. **No leaked internals to the client.** Generic error messages out; detailed logs (pino) server-side.
8. **Mutations to sensitive data write an audit log entry** (actor, action, entity, before/after, timestamp).

## Auth & RBAC model
- Tables: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`.
- Login: email + password → Argon2id verify → create server-side session → set httpOnly cookie.
- API requests resolve the session, load the user's permissions, and an `authorize(permission)` middleware gates protected routes.
- Seed three demo roles: **Admin / Manager / Viewer** with distinct permission sets, plus public demo credentials. The role differences must be visibly enforced in both API and UI.
- Login endpoint and write endpoints are rate-limited. Failed-login backoff/lockout.

## Conventions
- **TypeScript strict.** No `any` as an escape hatch — type it or justify it.
- **Shared schema flow:** define the Zod schema in `packages/shared`, infer types from it, use the same schema for API validation and form validation.
- **API shape:** REST, consistent envelopes, correct status codes. Errors return a structured `{ error: { code, message } }` — never raw stack traces.
- **Server-side pagination/filtering/sorting** for all list endpoints. Never return an unbounded list and filter in the browser.
- **Every list/detail view has loading, empty, and error states.** Their absence is treated as incomplete work.
- Naming: `kebab-case` files, `PascalCase` components, `camelCase` vars. Co-locate feature code.

## Frontend
- Data fetching via TanStack Query hooks; optimistic updates on mutations.
- Forms validate with the shared Zod schema; show inline field-level errors.
- **Dark/light theme:** CSS variables, system-preference detection, persisted choice via cookie, NO flash-of-wrong-theme on load (resolve theme before first paint).
- shadcn/ui components must be restyled to a deliberate design system — looking like a default template is a defect, not a shortcut.

## Data layer
- All schema changes go through Prisma migrations, versioned in the repo. Never hand-edit the DB.
- Seed script provides demo data + the three role logins.

## Testing
- Vitest. Prefer integration tests over unit tests. Do not mock the database — test against a real (throwaway) Postgres.
- Minimum coverage that must exist: auth flow, a permission-denied case, and one critical CRUD flow end to end.

## DevOps
- `docker-compose.yml` runs postgres + api + web locally with one command (environment parity is the point).
- CI (GitHub Actions) on every PR: lint → typecheck → test → build, with migrations run against a Postgres service container. Must pass before merge.
- Right-sized only: no Kubernetes, no Terraform, no service mesh for one app + one DB.

## What NOT to do
- Don't add a dependency without flagging why it's needed.
- Don't introduce Redux, microservices, or extra infra "to look advanced."
- Don't fake auth or fake role-gating with static data.
- Don't generate code I haven't been asked for, or skip the audit-log/validation/error-state requirements to move faster.
- Don't write more than ~20 lines of non-obvious logic without a one-line explanation of the approach.

## How to work with me
- For any non-trivial change, propose a short plan before writing code. I review architecture; you accelerate execution.
- I will read and must understand everything that gets committed. Favor clear, conventional, defensible code over clever code.
- When a decision has a real tradeoff, name it and recommend one — don't bury it.
