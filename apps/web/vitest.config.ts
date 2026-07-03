import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Pure-logic unit tests only (.test.ts). Component tests needing jsdom/RTL would
// use .test.tsx with a browser environment — deliberately not set up yet.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
