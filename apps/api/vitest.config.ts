import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration tests share one Postgres database — run files serially so fixtures
    // in different modules don't race on shared rows (e.g. the billing:* permissions).
    fileParallelism: false,
    // These hit a real (now hosted) Postgres; multi-roundtrip flows need more than
    // the 5s default over the network.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
