import { defineConfig } from 'vitest/config';

// Two projects (#614): pure logic and static source analysis (`*.test.ts`)
// run in Node; component/DOM tests (`*.test.tsx`) run in jsdom. A `.test.ts`
// that genuinely needs DOM globals opts in with a first-line
// `// @vitest-environment jsdom` docblock. Cheapest environment wins.
export default defineConfig({
  test: {
    // Exposes describe/it/expect/vi globally and lets @testing-library/react
    // auto-cleanup between tests (no manual afterEach needed).
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Limit concurrency to prevent jsdom resource contention from causing
    // otherwise-fast interaction tests to hit Vitest's 5s timeout.
    maxWorkers: 4,
    // Process CSS modules so component imports of `*.module.scss` don't crash.
    // Class names come through hashed; tests assert against substrings (e.g. /primary/).
    css: {
      modules: {
        classNameStrategy: 'stable',
      },
    },
    projects: [
      {
        extends: true,
        test: { name: 'unit', environment: 'node', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        test: { name: 'dom', environment: 'jsdom', include: ['src/**/*.test.tsx'] },
      },
    ],
  },
});
