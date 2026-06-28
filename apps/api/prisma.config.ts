import { config } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

// Env lives at the monorepo root. pnpm runs CLI commands with cwd = apps/api.
// This populates process.env so the schema's env("DATABASE_URL") resolves.
config({ path: '../../.env' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
