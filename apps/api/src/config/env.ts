import { config } from 'dotenv'
import { z } from 'zod'

// Load the monorepo-root .env for local dev (cwd = apps/api under turbo/pnpm).
// In containers the vars are injected directly and this is a harmless no-op.
config({ path: '../../.env' })

// Validate env at boot — fail fast with a readable error instead of undefined surprises later.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  SESSION_SECRET: z.string().min(16),
  SESSION_TTL_HOURS: z.coerce.number().int().default(24),
  REMEMBER_ME_SESSION_TTL_HOURS: z.coerce.number().int().default(168),
  MAX_FAILED_LOGINS: z.coerce.number().int().default(5),
  ACCOUNT_LOCK_MINUTES: z.coerce.number().int().default(15),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().default(30),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // Unset (default) = host-only cookie, correct for local dev (frontend/API share "localhost").
  // Set to ".example.com" when the frontend and API live on different subdomains of the same
  // site, so the session cookie is visible to both.
  COOKIE_DOMAIN: z.string().optional(),
})

export const env = envSchema.parse(process.env)
