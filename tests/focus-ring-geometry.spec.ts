import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkBaseline, type Finding, sweep } from './focus-ring-sweep';

// __dirname, not import.meta.url: the root package.json has no "type":
// "module", so Playwright transpiles this file to CJS and import.meta throws.
const BASELINE = resolve(__dirname, 'focus-ring-geometry.baseline.json');

/**
 * Routes are read from App.tsx rather than listed here, so a new demo page is
 * swept the moment it is routed. A hand-maintained list is how the last three
 * clips shipped: they were on pages nobody thought to check.
 */
const routes = [
  ...new Set(
    [
      ...readFileSync(resolve(__dirname, '../packages/playground/src/App.tsx'), 'utf8').matchAll(
        /path="(\/components\/[^"]+)"/g,
      ),
    ].map((m) => m[1]!),
  ),
].sort();

// The measuring script itself lives in `./focus-ring-sweep`, shared with
// `focus-ring-geometry-overlays.spec.ts`. Read its docblock for what a sweep
// does and does not see.

// A floor, not a presence check. If the regex degrades from 93 matches to a
// handful, most per-route tests below silently disappear and the suite still
// goes green — which is the failure this guard exists to catch, and `> 0` does
// not catch it.
test('found the demo routes', () => {
  expect(routes.length).toBeGreaterThan(80);
});

for (const route of routes) {
  test(`focus rings survive their clip ancestors on ${route}`, async ({ page, baseURL }) => {
    // Nothing off-origin. The demos hotlink Google Fonts, Unsplash, pravatar
    // and picsum, and networkidle waits on every one of them: this job has
    // retries: 0 and release.yml chains it, so one stalled request times out
    // goto and reddens a PR that changed nothing.
    //
    // It is not only a stall risk — these move geometry. With the image hosts
    // unreachable the Image/Masonry/MediaTile demos render their error state
    // instead, which changes what there is to measure. Blocking everything makes
    // that state the constant one, rather than letting the gate's input depend
    // on Unsplash's uptime and the runner's egress rules.
    await page.route('**/*', (r) =>
      r.request().url().startsWith(baseURL!) ? r.continue() : r.abort(),
    );

    // CalendarDemo and the four date-picker demos build their fixtures from
    // `new Date()`, so month length, leading blanks, and which cells land flush
    // against the month grid's edges all move with the wall clock. Unpinned,
    // this gate reddens a PR that changed nothing — and `release.yml` chains the
    // job it lives in, so it would block a release too.
    //
    // 2025-03-15 is deliberate: March 2025 needs six rows whether the week
    // starts on Sunday or Monday, so the sweep always exercises the denser grid
    // instead of a lucky five-row month. Pinned here rather than in the demos so
    // the gallery stays live-dated for humans.
    await page.clock.setFixedTime(new Date('2025-03-15T12:00:00Z'));
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    // One real keypress, so the page is in keyboard modality before anything
    // is focused programmatically.
    await page.keyboard.press('Tab');

    const swept = await sweep(page);
    // If the library ever stops declaring rings the way this sweep recognises
    // — a switch to box-shadow, say — every route would measure nothing and
    // the gate would pass forever without anyone noticing.
    //
    // DELIBERATELY COARSE, and the cost is stated rather than hidden: `> 0` is
    // per route, so one component whose state stopped rendering leaves its
    // route green with its element absent, hidden behind everything else on
    // the page that still measures. Closing it means a per-route floor, and
    // 93 hand-maintained numbers that move whenever a demo gains an example is
    // a maintenance surface that gets deleted rather than updated.
    // `focus-ring-geometry-overlays.spec.ts` DOES carry floors, because there
    // the count is per OVERLAY and an overlay that stops opening is exactly
    // the regression that spec exists to notice.
    expect(swept.measured, 'focusables whose ring this sweep could measure').toBeGreaterThan(0);
    const found: Finding[] = swept.findings.map((h) => ({ route, ...h }));

    checkBaseline(BASELINE, route, found);
  });
}
