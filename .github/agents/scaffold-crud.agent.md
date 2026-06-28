---
name: scaffold-crud
description: Use when adding a new data entity or resource to the admin panel — e.g. "add a Products module", "scaffold CRUD for invoices", "create a customers resource". Generates the full vertical slice (Prisma model + migration, shared Zod schema, Express routes with permission middleware + audit logging, TanStack Query hooks, a server-paginated data table, and a validated form) following the conventions in CLAUDE.md. Do NOT use for one-off queries, schema tweaks to an existing entity, or non-CRUD features.
---

# Scaffold a CRUD module

Generate a complete, consistent vertical slice for a new entity. Follow CLAUDE.md for all conventions — this skill assumes that stack and those rules. Confirm the entity name, its fields (name + type + required/optional), and which roles get which permissions before generating.

Permission naming is always `<entity>:read`, `<entity>:write`, `<entity>:delete` (plural entity, lowercase). Wire these into the seed so Admin/Manager/Viewer differ visibly.

Generate the slice in this order. Target layout (per CLAUDE.md): one `apps/api/src/modules/<entity>/` backend slice + one `apps/web/src/features/<entity>/` frontend slice + the schema in `packages/shared/src/schemas/<entity>.ts`.

## 1. Shared schema (`packages/shared/src/schemas/<entity>.ts`)
- Define a Zod schema for the entity (`<Entity>Schema`) plus `Create<Entity>Schema` and `Update<Entity>Schema` (omit server-managed fields like id/createdAt).
- Infer and export the TS types from the schemas. These are the single source of truth — API validation and the web form both import them. Never duplicate field definitions.

## 2. Database (`apps/api`, Prisma)
- Add the model to `schema.prisma` with appropriate types, indexes (index foreign keys and common filter columns), and `createdAt`/`updatedAt`.
- Generate a migration (never hand-edit the DB).
- Add the three permissions to the permission seed and assign them to roles per the confirmed matrix. Add a few seed rows for the entity.

## 3. API module (`apps/api/src/modules/<entity>/`)
Emit the layered files: `<entity>.routes.ts`, `<entity>.controller.ts`, `<entity>.service.ts`, `<entity>.repository.ts`, `<entity>.test.ts`. Mount the router in `app.ts`.
- RESTful router: `GET /` (list), `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`.
- Route chain: `authenticate → authorize('<entity>:<action>') → validate(schema) → controller`. Permission check is the source of truth.
- **controller** = HTTP only (parse, call service, shape response, status codes). No business logic, no Prisma.
- **service** = validates intent, enforces invariants, writes the audit log, calls the repository. On validation failure return structured `{ error: { code, message, fields } }` — never a stack trace.
- **repository** = the only Prisma surface for this entity (parameterized only). Skip it only if the project policy is "no repository for trivial entities" — then the service calls Prisma directly. Follow whichever policy CLAUDE.md/the codebase already uses; don't mix.
- **List endpoint is server-paginated/filtered/sorted:** accept `page`, `pageSize`, `sort`, `order`, filters; return `{ data, total, page, pageSize }`. Never return an unbounded list.
- **Audit-log entry** on create/update/delete via `lib/audit.ts`: actor, action, entity, id, before/after, timestamp.
- Use the pino logger (`lib/logger.ts`), not console.

## 4. Frontend feature slice (`apps/web/src/features/<entity>/`)
Emit `hooks/` (TanStack Query), `api.ts` (fetch fns via `lib/api-client.ts`), `components/` (table + form), `types.ts` (re-export from `packages/shared`).
- `use<Entities>(params)` for the paginated list, `use<Entity>(id)` for detail, and create/update/delete mutation hooks with cache invalidation + optimistic updates.
- All fetches go through `lib/api-client.ts` (`credentials:'include'`). No Redux, no global store.

## 5. Data table (`features/<entity>/components/<Entity>Table.tsx`)
- Built on the shared `components/data-table/`. Server-side pagination, sorting, filtering, search, column visibility. Bulk delete if `:delete` is permitted.
- Action controls (edit/delete) hidden/disabled per the user's permissions (via `lib/auth.ts`) — UX only; the API still enforces.
- Implement **loading, empty, and error states** explicitly. Missing states = incomplete.

## 6. Form (`features/<entity>/components/<Entity>Form.tsx`)
- Create/edit form validates against the shared Zod schema with inline field-level errors.
- Confirmation dialog on delete.
- Wire to the mutation hooks; show success/error feedback.

## 7. Tests (Vitest, integration — no DB mocks)
At minimum:
- A permission-denied case (Viewer cannot `:write`/`:delete`).
- One full create→read→update→delete flow against a real throwaway Postgres.
- Validation rejection on a bad payload.

## Definition of done
- Schema shared (not duplicated), migration committed, permissions seeded and role-gated.
- All routes permission-checked, validated, audit-logged.
- List is server-paginated; table has loading/empty/error states; form validated.
- Tests above pass. TypeScript strict, no `any`.
- Briefly note any decision with a real tradeoff rather than silently choosing.
