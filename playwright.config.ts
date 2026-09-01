import { defineConfig, devices } from '@playwright/test';

/**
 * Focus-ring GEOMETRY only. `packages/design-system/src/styles/contrast.test.ts`
 * certifies a ring's COLOUR against the page surfaces; nothing certified that
 * the ring is actually on screen. Since #505 the ring is an `outline` at a
 * positive `outline-offset`, so it sits outside the border box and any
 * focusable flush against an `overflow` ancestor loses whole bands. jsdom
 * computes no layout, so the vitest suite is blind to it, and a static check
 * cannot see it either — the clipping ancestor is routinely in a different
 * file from the focusable.
 *
 * Port 8090, never 8080: the playground's own dev server binds 8080
 * (`packages/playground/vite.config.ts`) and a developer usually has it running.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Baseline generation is a read-modify-write of one JSON file, so it has to
  // be serial; parallel workers would lose each other's routes.
  workers: process.env.UPDATE_FOCUS_BASELINE ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:8090' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Rebuilds even in CI, where `npm run build` has already run. That is a
    // wasted minute, and it is what makes this config behave identically on a
    // developer's machine — worth more than the minute.
    command: 'npm run build && npm run preview -w playground -- --port 8090 --strictPort',
    url: 'http://localhost:8090',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
