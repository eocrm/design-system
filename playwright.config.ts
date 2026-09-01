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
 * SCOPE — what a green run does and does not mean. It checks outset rings
 * against non-scrolling clip axes on statically rendered demo content, which is
 * the exact shape of all three defects #505 shipped and #510 fixed. It is
 * silent on:
 *
 * - Closed overlays. The sweep loads a route, presses Tab once, and opens
 *   nothing, so every menu, listbox, dialog and picker is absent from the DOM —
 *   the densest population of this defect class is unswept. In particular this
 *   gate does NOT certify the `IconPicker` `box-shadow` migration that #512
 *   describes as waiting on it.
 * - Losses at either end of a scroll range (see the scroll-axis rule in
 *   `tests/focus-ring-geometry.spec.ts`, which explains why that leniency is
 *   load-bearing).
 * - Clips produced by a clipping ancestor's border or border-radius, since the
 *   sweep compares against its border box.
 * - Rings drawn with anything but `outline` — `box-shadow` is invisible to it.
 *
 * Port 8090, never 8080: the playground's own dev server binds 8080
 * (`packages/playground/vite.config.ts`) and a developer usually has it running.
 * Two concurrent local runs share that one port and clobber each other's preview
 * server; the symptom is ERR_CONNECTION_REFUSED on a spread of routes, not a
 * flake worth chasing.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Baseline generation is a read-modify-write of one JSON file, so it has to
  // be serial; parallel workers would lose each other's routes.
  workers: process.env.UPDATE_FOCUS_BASELINE ? 1 : undefined,
  // In CI, both: 'github' annotates the failing lines in the PR, 'html' writes
  // the playwright-report/ directory that quality.yml uploads on failure.
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
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
