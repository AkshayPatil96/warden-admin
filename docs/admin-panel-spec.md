# Admin Panel — Architecture & Feature Spec

**Purpose:** A portfolio-grade internal-tools admin panel that demonstrates *production engineering judgment*, not template aesthetics. It doubles as the reusable starter for paid client builds.

**Core thesis:** Dashboard templates (DashLite, etc.) sell *looks* with fake data and no real backend. This project sells *judgment* — real auth, real access control, real security, real data integrity — the things a reviewer can't fake-check and a template never has. That is the entire differentiation strategy. Every decision below serves it.

---

## 1. The Differentiation Strategy (read this first)

"An admin dashboard" is one of the most saturated portfolio projects on earth. You will not win on visuals. You win on these, in priority order:

1. **Real, loggable-into RBAC.** Seed three roles (Admin / Manager / Viewer) with public demo credentials. A reviewer logs in as each and *sees* the UI and API enforce different permissions. Most portfolio panels fake login or skip roles entirely — this alone separates you from 90% of them.
2. **A believable product domain — not generic "Products/Users" CRUD.** Pick one real-feeling domain so it reads as a *product*, not a tutorial. Options: a SaaS subscription/billing admin, a content-moderation queue, a clinic/inventory ops console, a logistics dispatch board. Generic CRUD screams "template"; a specific domain screams "I've built real software."
3. **Visible production concerns.** Rate limiting, audit logging, input validation with real error states, security headers. Surface them in the UI and the README so they're *seen*, not buried.
4. **A decision log / README that explains the "why."** Senior engineers are identified by their reasoning, not their output. A README that says "I chose session auth over JWT because X, here's the tradeoff" signals more than any animation.
5. **Intentional UI, not default-component-library look.** Clean, restrained, a deliberate design system — not stock Bootstrap/MUI defaults. Looking like a template is a *negative* signal here.

If you build a gorgeous panel with fake data and no real backend, you've built another template. Don't.

---

## 2. Feature Set

### Core (table stakes — must be real, not mocked)
- **Authentication:** email + password login, secure session, logout, "remember me," password reset flow.
- **Role-Based Access Control:** roles → permissions model (not scattered role-string checks). Enforced on **both** API and UI.
- **CRUD** on the chosen domain's primary entities, with create/edit/delete + confirmation + optimistic UI.
- **Data tables:** server-side pagination, sorting, filtering, search, column visibility, bulk actions.
- **Dashboard:** summary KPI cards + 2–3 charts (trends, breakdowns) fed by real aggregated data, not random numbers.
- **Dark / light theme:** system-preference detection, persisted choice, no flash-of-wrong-theme (FOUC) on load.
- **Responsive layout:** usable on tablet; graceful collapse of the sidebar/nav.

### Differentiators (the features templates skip)
- **Audit log:** every sensitive action (login, role change, delete) recorded with actor, timestamp, before/after. Viewable in-app. This is the single most "real product" feature you can add.
- **Activity feed / recent actions** on the dashboard.
- **User & role management UI:** invite users, assign roles, toggle status — admin-only, permission-gated.
- **Settings:** profile, password change, theme, notification prefs.
- **Empty / loading / error states** everywhere. Their absence is the #1 tell of a template.
- **Form validation** with shared schema (client + server), inline field errors.
- **API key management** (optional flex): generate/revoke keys — shows you understand programmatic access and secret handling.

---

## 3. Architecture Decisions

Each is a real decision with a recommendation and its tradeoff. Where it's a judgment call tied to your goals, I say so.

### Decision 1 — Backend: Next.js monolith vs. separate Node API
**Recommendation: separate Node + Express (TypeScript) API, with Next.js as the frontend.**

Reasoning tied to *your* goals: you sell "Node.js backend, SQL/NoSQL, API design." If you bury everything inside Next.js route handlers, you *hide the exact skill you're trying to demonstrate*. A decoupled API also mirrors how most real client/agency work is structured (separate frontend + backend, sometimes different teams), so it's more representative and more reusable across future jobs. It lets you showcase middleware, auth, API design, and error handling as first-class artifacts.

**Tradeoff (be honest):** two deployments, more infra, more CORS/auth plumbing, more total work. The monolithic Next.js approach (route handlers + server actions) is genuinely faster to ship and simpler to host.

**If time-constrained:** a Next.js monolith is acceptable *only if* you still expose a clean, documented REST (or tRPC) API layer with real middleware — so the backend skill is still visible. A monolith with logic smeared into components demonstrates nothing. Don't take the shortcut that erases the thing you're selling.

> Optional flex: NestJS instead of Express signals comfort with structured, enterprise backends. Higher learning cost; only if you have the time.

### Decision 1b — Repo structure
**Recommendation: a simple workspace monorepo (pnpm workspaces or Turborepo), structured as `apps/web`, `apps/api`, `packages/shared`.**

Reasoning: with a separate frontend and backend, a monorepo lets you share Zod schemas and TypeScript types across both via `packages/shared` instead of duplicating them — a real, visible benefit and a clean thing to point to in a portfolio. Setup is modest and the pattern is recognizable/modern.

**Scope guard:** it's a nicety, not a necessity. If workspace tooling fights your deploys or eats more than an evening, drop to two plain repos and lose nothing important. Don't let monorepo plumbing become a procrastination sink that delays auth + RBAC (the actual differentiators).

**Not microservices.** Monorepo (code organization) and microservices (runtime architecture) are orthogonal — don't conflate them. For one frontend + one backend + one DB there is nothing to decompose; splitting into services signals over-engineering, not seniority. A clean monolith in a monorepo is the senior choice here.

### Decision 2 — Database: SQL vs NoSQL
**Recommendation: PostgreSQL as primary.** RBAC, audit logs, and relational integrity (users↔roles↔permissions, foreign keys, transactions) are a textbook relational fit. Postgres also demonstrates better data-modeling discipline than a document store here.

- ORM: **Prisma** (recognizable, great DX) or **Drizzle** (lighter, SQL-first). Prisma for portfolio recognizability.
- **Do not build SQL *and* Mongo versions at once** — that's scope creep dressed as ambition. Ship Postgres well; a documented Mongo branch can come later *if* you want to prove NoSQL, as a clearly separate artifact.

### Decision 3 — Authentication approach
**Recommendation: implement session-based auth yourself, with secure httpOnly cookies and Argon2id password hashing.**

Reasoning: for an admin panel, server-side sessions are the safer default (instant revocation, no token-in-localStorage XSS exposure). Rolling it *correctly* demonstrates the security understanding that differentiates you — provided you follow the rules below, not reinvent crypto.

- Passwords: **Argon2id** (or bcrypt) — never plaintext, never fast/unsalted hashes.
- Session ID in an **httpOnly, Secure, SameSite=Lax/Strict cookie** — never in localStorage.
- Server-side session store with expiry + revocation.

**Tradeoff:** more code and more ways to get it subtly wrong. **Pragmatic alternative:** Auth.js (NextAuth) or Lucia — production-grade fast, but demonstrates less depth. Pick based on whether this project's job is "show I understand auth" (roll it) or "ship fast" (library). For a flagship portfolio piece, rolling it (correctly) is the stronger signal.

> Avoid Clerk/Auth0 for the *flagship* piece — managed auth hides exactly the skill you're showcasing. Fine for client work where speed matters.

### Decision 4 — Authorization (RBAC) model
**Roles map to permissions; code checks permissions, never role strings.**

- Tables: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`.
- Permissions are granular (`users:read`, `users:write`, `orders:delete`).
- Enforce at the **API layer** (middleware) as the source of truth; mirror in the **UI** (hide/disable controls) for UX only — never trust the client.
- This design lets you add roles without touching code, which is what a real product needs and what impresses reviewers.

### Decision 5 — Data fetching & state
- Server-side pagination/filtering/sorting (never ship all rows to the client and filter in-browser — that's a template tell and a perf failure).
- **TanStack Query** (React Query) for server state, caching, optimistic updates.
- Keep client state minimal; avoid Redux unless there's a real need.

### Decision 6 — Theming (dark/light)
- CSS variables for all colors; a `data-theme` (or class) toggle on `<html>`.
- Detect system preference on first visit; persist explicit choice (cookie so SSR can read it).
- **Prevent FOUC:** set the theme before first paint (SSR cookie read, or a tiny inline pre-hydration script). A theme that flashes white-then-dark on every load is a visible amateur tell.

---

## 4. Security Checklist (the CTO section)

A reviewer who knows what they're looking at scans for these. Their presence is your strongest differentiator; their absence is disqualifying.

| Area | What to do |
|---|---|
| **Password storage** | Argon2id/bcrypt, salted. Never plaintext or fast hashes. |
| **Session/cookies** | httpOnly, Secure, SameSite. No tokens in localStorage. |
| **AuthZ** | Permission checks on every protected API route — server is the source of truth. |
| **Input validation** | Validate + sanitize all input server-side with a schema (Zod). Never trust client validation. |
| **SQL injection** | Parameterized queries / ORM only. Never string-concatenate SQL. |
| **XSS** | Escape output; React handles most, but audit any `dangerouslySetInnerHTML`, markdown, or user-rendered HTML. Set a **Content-Security-Policy**. |
| **CSRF** | SameSite cookies + CSRF tokens for state-changing requests (esp. if cookie-based auth). |
| **Rate limiting** | On login (brute-force) and write endpoints. Per-IP and/or per-user. (e.g. express-rate-limit / a Redis token bucket.) |
| **Security headers** | CSP, HSTS, X-Content-Type-Options, X-Frame-Options (or use Helmet). |
| **Secrets** | Env vars, never committed. `.env.example` in the repo, real `.env` gitignored. |
| **Audit logging** | Log sensitive actions with actor + timestamp. Doubles as a feature *and* a security control. |
| **Dependency hygiene** | `npm audit` clean; pin versions; no abandoned packages. |
| **Error handling** | No stack traces or internal details leaked to the client. Generic messages out, detailed logs in. |
| **Account safety** | Lockout/backoff after repeated failed logins; secure password-reset tokens (single-use, expiring). |

Surface a few of these in the README and UI (e.g. show the rate-limit message, show the audit log) so they're *visible*, not just present.

---

## 5. Recommended Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js + TypeScript, Tailwind, shadcn/ui (restyled, not stock), Recharts |
| Server state | TanStack Query |
| Validation | Zod (schemas shared client + server) |
| Backend | Node + Express + TypeScript (separate API) |
| Repo | pnpm workspace monorepo — `apps/web`, `apps/api`, `packages/shared` |
| Database | PostgreSQL + Prisma |
| Auth | Self-rolled session auth (Argon2id, httpOnly cookies) |
| Security | Helmet, express-rate-limit, CSP |
| Hosting | Frontend: Vercel · API + DB: Railway/Render + Neon/Supabase |
| Tooling | ESLint, Prettier, a few meaningful tests (Vitest/Jest) |

---

## 6. Quality Bar ("done" means)
- End-to-end TypeScript; no `any` cop-outs.
- Every list/detail view has loading, empty, and error states.
- All forms validated client + server with inline errors.
- Seeded demo data + 3 public role logins (Admin/Manager/Viewer).
- A README that documents the architecture decisions and their tradeoffs (this is a portfolio asset in itself).
- A short test suite covering auth + a permission check + one critical flow.
- Accessible: keyboard nav, focus states, semantic markup, sufficient contrast in both themes.
- Live deployed demo + clean public repo.

---

## 7. Build Phases (suggested order)
1. **Foundation:** repo, TS config, DB schema (users/roles/permissions/audit), Express skeleton, Next skeleton.
2. **Auth + RBAC:** login/logout/sessions, hashing, permission middleware, seed roles. *Get this rock-solid before anything else — it's the differentiator.*
3. **Core CRUD + tables** for the chosen domain, server-side pagination/filter/sort.
4. **Dashboard + charts** from real aggregates.
5. **Differentiators:** audit log, user/role management UI, settings.
6. **Theme + UI polish:** dark/light no-FOUC, design pass to escape the template look.
7. **Security pass:** rate limiting, headers, CSP, validation audit, error handling.
8. **Quality pass:** empty/error states, tests, accessibility, seed data, README.
9. **Deploy + demo logins + case study writeup.**

---

## 8. Anti-Patterns That Make It Look Like a Template (avoid)
- Fake/static data with no real backend.
- Login that doesn't actually authenticate, or roles that don't actually gate anything.
- Generic "Products/Users" CRUD with no domain identity.
- Stock component-library look with zero design intent.
- Missing loading/empty/error states.
- Client-side-only filtering of a full dataset.
- No validation, no security, no docs.
- A flashy chart on the homepage and nothing real underneath.

The test for every feature: *"Would this convince someone I've shipped real software, or that I followed a tutorial?"* Build only the former.

---

## 9. DevOps & Infrastructure

The principle here is the same as everywhere else in this doc: **right-sized, not maximal.** A solo portfolio app does not need Kubernetes, Terraform, multi-region, or a blue-green pipeline — reaching for those is the same over-engineering tell as microservices. The senior signal is a clean, reproducible, automated setup you can explain. Build exactly this much:

### Docker
- **Dockerfile per app** (`apps/api`, `apps/web`), multi-stage (build stage → slim runtime stage) to keep images small.
- **`docker-compose.yml` for local dev:** spins up Postgres + API + web with one command, so the environment is reproducible and matches what a reviewer (or a new client) gets on `git clone`. This is the highest-value Docker piece — it demonstrates you care about environment parity, which templates never do.
- `.dockerignore` to keep `node_modules`/build artifacts out of images.
- Don't containerize for the sake of it on the deploy side — Vercel/Railway/Render handle that. Docker's job here is **local parity + reproducibility**.

### CI/CD (GitHub Actions)
A single pipeline that runs on every PR and on `main`:
1. **Lint** (ESLint) → **typecheck** (`tsc --noEmit`) → **test** (Vitest) → **build**. Fail fast.
2. Run DB migrations against a throwaway Postgres service container so tests hit a real schema.
3. On merge to `main`: trigger deploy (Vercel auto-deploys the web app; a deploy step or platform hook ships the API).
- **Branch protection** on `main`: require the pipeline to pass before merge. Demonstrates you understand quality gates.
- **Secrets** in GitHub Actions secrets / the host platform — never in the repo.
- Vercel **preview deployments** per PR are free and a strong portfolio signal (every PR gets a live URL).

### Supporting hygiene
- **Pre-commit hooks** (Husky + lint-staged): format + lint staged files before they're committed. Cheap, high signal.
- **Migrations** (Prisma Migrate) versioned in the repo and run in CI/deploy — never hand-edit prod schema.
- **Lightweight observability:** structured logging (`pino`) in the API, and optionally Sentry (free tier) for error tracking. A reviewer seeing real error tracking reads "production-minded."
- **`.env.example`** committed; real `.env` gitignored.

### What to deliberately NOT do (scope guards)
- No Kubernetes, no service mesh, no Terraform/IaC for one app + one DB.
- No multi-environment sprawl beyond maybe `preview` + `production`.
- No custom CD platform when Vercel/Railway hooks already do it.

If asked "why no Kubernetes?" the senior answer is: *"One service and one database don't justify the operational overhead — Docker Compose for parity and GitHub Actions for CI is the right amount of infrastructure for this scale."* Knowing where to **stop** is the signal.

---

## 10. Working with AI (Claude Code) — like a senior dev, not a vibe-coder

**The uncomfortable truth first:** this is a *portfolio piece meant to prove your skill*. If AI writes it and you can't defend every architectural decision in an interview, the piece backfires — it demonstrates the model's competence, not yours. The differentiator this whole doc is built on (engineering judgment) is exactly the thing AI can't fake for you in a live technical conversation. So the rule is: **AI is a force multiplier on your judgment, never a substitute for it.** You own the architecture, the security model, and the "why." AI accelerates the typing, scaffolding, and review.

Concretely, the senior way to use Claude Code on this project:

### The five layers (use the right one for each job)
- **`CLAUDE.md`** (always loaded) — your project's constitution. Put the architecture decisions from *this spec* in it: the stack, the repo layout (`apps/web`, `apps/api`, `packages/shared`), the auth/RBAC rules, the security checklist, "never put tokens in localStorage," "permissions checked at the API layer, never role strings." This keeps the AI consistent with your decisions instead of inventing its own. Keep it lean — it's loaded every turn.
- **Skills** (loaded on demand) — reusable "how to do X here" instructions in `.claude/skills/<name>/SKILL.md`. They're cheap (only pulled in when relevant), so you can have several. High-value skills for this project:
  - **`scaffold-crud`** — generates a new entity end to end following *your* established pattern: Prisma model + migration, Zod schema in `packages/shared`, Express routes with permission middleware, the table UI, the form. This is where productization compounds — the skill makes every new module consistent and fast, which is the same accelerator that makes your paid client builds high-margin.
  - **`security-review`** — checks new code against the Section 4 security checklist (validation, parameterized queries, permission checks, no leaked errors).
  - **`test-conventions`** — encodes your testing patterns (Vitest, integration over unit, real DB not mocks) so generated tests match house style.
- **MCP servers** (access to external systems) — these give Claude *tools*, not instructions, and they cost real upfront context, so **pin few, only what you'll use.** For this project the sensible set:
  - **Postgres MCP** — let Claude inspect the live schema and query data while building, so it works against reality instead of guessing column names.
  - **GitHub MCP** — manage PRs, issues, and check CI status from inside the workflow.
  - **(Optional) Playwright/browser MCP** — for driving real E2E tests against the running UI.
  - Skip the rest. Five MCP servers can cost 50k+ tokens before you type anything; a bloated MCP setup is its own over-engineering.
- **Subagents** — delegate scoped work (e.g. a code-review or research pass) to an isolated context so it doesn't pollute your main session. Use for "review this PR against the security checklist" without dragging the whole conversation along.
- **Hooks** — deterministic enforcement (e.g. block a commit if lint/typecheck fails). Use when a skill's "please remember to" isn't a strong enough guarantee.

The mental model worth memorizing: **CLAUDE.md = always-on rules · Skills = how to do something · MCP = access to external systems · Subagents = delegated isolated work · Hooks = hard enforcement.**

### Senior-dev working discipline with AI
1. **Decide architecture yourself, first.** Use this spec as the source of truth. Don't ask the AI "how should I build an admin panel" and accept the answer — you've already made the decisions; make the AI execute *yours*.
2. **Review every line you commit.** If you don't understand it, don't ship it. The interview will expose it.
3. **Use AI for the boring 70%** (scaffolding, CRUD repetition, test stubs, boilerplate, docs) and reserve *your* hours for the 30% that's judgment (auth model, permission design, security, data modeling).
4. **Keep the setup explainable.** Borrow the rule from senior practitioners: small enough that you can justify why every skill, MCP server, and hook exists. If you can't, remove it.
5. **Let the AI write the first draft of the README's decision log, then correct it** — because explaining your decisions in your own words is the rep that prepares you to defend them live.

One honest caution tied to your own context: the value of this project is that *you* can stand behind it. If you've previously leaned on AI to the point of not fully owning the output, this is the project to break that pattern — use AI to go faster on the parts you already understand, and to *learn* the parts you don't by reading and questioning what it produces, not by pasting it unread.
