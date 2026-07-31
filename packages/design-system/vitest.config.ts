import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Limit jsdom concurrency to prevent resource contention from causing
    // otherwise-fast interaction tests to hit Vitest's 5s timeout.
    maxWorkers: 4,
    // Exposes describe/it/expect/vi globally and lets @testing-library/react
    // auto-cleanup between tests (no manual afterEach needed).
    globals: true,
    // Process CSS modules so component imports of `*.module.scss` don't crash.
    // Class names come through hashed; tests assert against substrings (e.g. /primary/).
    css: {
      modules: {
        classNameStrategy: 'stable',
      },
    },
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
