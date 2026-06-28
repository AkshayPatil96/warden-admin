import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Integration tests share one Postgres database — run files serially so fixtures
    // in different modules don't race on shared rows (e.g. the billing:* permissions).
    fileParallelism: false,
  },
})
