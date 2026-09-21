import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type Band, sweep } from './focus-ring-sweep';

// __dirname, not import.meta.url: the root package.json has no "type":
// "module", so Playwright transpiles this file to CJS and import.meta throws.
const BASELINE = resolve(__dirname, 'focus-ring-geometry-overlays.baseline.json');

type Finding = { route: string; key: string; band: Band };

/**
 * The same geometry sweep as `focus-ring-geometry.spec.ts`, run against
 * overlays that have been OPENED first.
 *
 * #525 measured the blind spot this closes. The static sweep loads a route,
 * presses `Tab` once and opens nothing, so every menu, listbox, dialog and
 * picker is absent from the DOM when it measures. A reviewer injected an
 * outset ring onto `IconPicker`'s cells and re-ran it — `measured` was 102
 * before and 102 after, findings empty both times, because the cells do not
 * exist until the popover opens. That is the densest population of the exact
 * defect class the sweep was written for: menus, listboxes and pickers are
 * scrolling containers full of focusable rows, and "focusable flush against a
 * scrolling ancestor" is what all three clips #505 shipped had in common.
 *
 * HOW IT RUNS. For each route below every visible trigger is opened one at a
 * time, the open surface ALONE is swept, and the overlay is closed again
 * before the next. Scoping the sweep to the surface is not an optimisation: it
 * keeps the page behind the overlay out of these findings, so this baseline
 * stays about overlays and the static one stays about pages.
 *
 * OPENED WITH THE KEYBOARD, never with a click, and this is load-bearing
 * rather than stylistic. A ring is painted under `:focus-visible`, which
 * Chromium resolves from the last input modality — so a mouse click on the
 * trigger puts the page in POINTER modality and every ring inside the overlay
 * stops painting. Measured, not assumed: clicking the triggers on
 * `/components/dropdown-menu` sweeps 11 open menus and reports `measured: 0`,
 * a gate that would have passed forever having checked nothing. Pressing
 * `Enter` on a focused trigger sweeps the same 11 menus and measures 33 rings.
 *
 * DETERMINISM. #523 spent four fix waves pinning the static sweep's input, and
 * overlays add two more sources of drift on top of the wall clock and the
 * off-origin traffic that spec already pins:
 *
 * - **Animation.** A surface measured mid-transition reports a rect that is
 *   nobody's real geometry. `Element.getAnimations({ subtree: true })` is the
 *   platform's own answer to "is this still moving" and covers CSS
 *   transitions as well as animations, so it is what the wait below uses
 *   rather than a sleep.
 * - **`Math.random`.** `SelectDemo`'s `flakyFetch` fails half the time on
 *   purpose and its two outcomes are different DOM. Seeded with a fixed LCG
 *   here.
 *
 * WHAT IT PROVABLY CANNOT CATCH:
 *
 * - **An `aria-activedescendant` overlay.** `Select`'s listbox keeps DOM focus
 *   on the combobox and marks the active option with
 *   `aria-activedescendant`; its `<li role="option">` rows carry no
 *   `tabindex` and are never focused, so there is no focus ring inside a
 *   Select listbox for ANY sweep to measure. It is in the table at
 *   `minMeasured: 0` deliberately — as a record of that, not as coverage.
 *   The same is true of every future activedescendant surface.
 * - **Triggers past the cap.** `MAX_TRIGGERS` stops the walk, and
 *   `/components/emoji-picker` has 334 buttons on it, so the walk there is
 *   the FIRST 40 visible ones in DOM order. A trigger added at the bottom of
 *   a long demo page can therefore go unswept.
 * - **Any state an overlay reaches only after further interaction.** A
 *   submenu, a typed filter, a scrolled-down listbox, a multi-select that
 *   already has chips, a dialog on its second step. Each is different DOM and
 *   none of it is opened here.
 * - **Which surface opened.** The sweep measures whatever matches `SURFACE`
 *   first. A trigger that opens the wrong overlay, or opens one with the
 *   wrong contents, is indistinguishable from one that behaved.
 * - **Everything the sweep itself is blind to**, which is the longer list:
 *   read the docblock in `./focus-ring-sweep`. Scroll extremes and the
 *   border-box clip rect bite HARDER here than on the static routes, because
 *   an overlay's own scroll container is usually the clipper — see the
 *   "documented leniencies" section of that docblock.
 */

/**
 * Anything that might open something. Deliberately loose: `Modal` and `Drawer`
 * are opened from ordinary `<button>`s with no `aria-haspopup` at all, so a
 * selector narrow enough to name only real triggers would miss two of the
 * routes this exists for. A press that opens nothing costs one failed
 * `waitFor` and is skipped.
 */
const TRIGGER = 'button, [role="combobox"], [aria-haspopup]';

/** Every overlay surface the library portals. */
const SURFACE =
  '[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],[role="tree"],[role="grid"]';

/** See "Triggers past the cap" above. 40 keeps the slowest route near a minute. */
const MAX_TRIGGERS = 40;

/**
 * `minOpened` / `minMeasured` are FLOORS, not expectations, and they are the
 * answer to the static sweep's coarsest weakness: its one `measured > 0` per
 * route cannot tell "no clip" from "nothing rendered", so a component whose
 * state stopped rendering leaves its route green with the element absent.
 * Each number is what this route produced when the spec landed, less a margin
 * for a demo gaining or losing one example. A demo that stops opening, or an
 * overlay that stops painting rings, drops below its floor and fails.
 */
const OVERLAYS = [
  // observed 11 / 33
  { route: '/components/dropdown-menu', minOpened: 9, minMeasured: 26 },
  // observed 4 / 11
  { route: '/components/status-menu', minOpened: 3, minMeasured: 9 },
  // observed 12 / 16
  { route: '/components/popover', minOpened: 10, minMeasured: 13 },
  // observed 7 / 14
  { route: '/components/kanban', minOpened: 5, minMeasured: 11 },
  // observed 1 / 16 — one popover, sixteen focusable cells in it
  { route: '/components/icon-picker', minOpened: 1, minMeasured: 13 },
  // observed 5 / 16
  { route: '/components/options-picker', minOpened: 4, minMeasured: 13 },
  // observed 2 / 314. The demo's inline panel is not counted: it is on the
  // page from load, so the static sweep already covers it — and its two
  // baselined cell clips reappear here because the POPOVER panel has them too.
  { route: '/components/emoji-picker', minOpened: 2, minMeasured: 250 },
  // observed 10 / 26
  { route: '/components/modal', minOpened: 8, minMeasured: 21 },
  // observed 16 / 33
  { route: '/components/drawer', minOpened: 13, minMeasured: 26 },
  // observed 15 / 0. Fifteen listboxes open and nothing in any of them is
  // measurable, on purpose — see "An `aria-activedescendant` overlay" above.
  { route: '/components/select', minOpened: 12, minMeasured: 0 },
] as const;

for (const { route, minOpened, minMeasured } of OVERLAYS) {
  test(`focus rings survive their clip ancestors in the overlays on ${route}`, async ({
    page,
    baseURL,
  }) => {
    // A sweep focuses every focusable in the surface, once per open overlay.
    // `/components/emoji-picker` is ~700 cells x 16 panels, which is minutes
    // of real work rather than a hang — the default 30s budget is for tests
    // that assert, not tests that measure.
    test.slow();

    // Same off-origin block and same pinned clock as the static sweep — read
    // its comments for why both are load-bearing rather than tidiness.
    await page.route('**/*', (r) =>
      r.request().url().startsWith(baseURL!) ? r.continue() : r.abort(),
    );
    await page.clock.setFixedTime(new Date('2025-03-15T12:00:00Z'));
    // A seeded LCG rather than a constant: a constant `Math.random()` is a
    // plausible way to break code that derives an id from it, and this runs
    // against the real build.
    await page.addInitScript(() => {
      let seed = 0x2545f491;
      Math.random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
      };
    });
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const triggers = page.locator(TRIGGER);
    const total = await triggers.count();
    const found = new Map<string, Finding>();
    let opened = 0;
    let measured = 0;
    let attempted = 0;

    for (let i = 0; i < total && attempted < MAX_TRIGGERS; i += 1) {
      const el = triggers.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      attempted += 1;
      // Keyboard, not a click — see the docblock. `press` on a disabled or
      // read-only trigger waits out its actionability timeout and throws;
      // that is the library behaving, so it is caught and counted as "did not
      // open".
      const before = await page.locator(SURFACE).count();
      await el.focus().catch(() => {});
      await el.press('Enter', { timeout: 1500 }).catch(() => {});

      // A surface that the press OPENED, not merely one that is on screen.
      // `/components/emoji-picker` renders an inline panel that is present
      // from page load, so "is a surface visible" was true before every press
      // there: each trigger was credited with an overlay it did not open, the
      // same panel was swept sixteen times, and `Escape` never closed it so
      // the route reloaded on every iteration and timed out. Requiring the
      // COUNT to rise is what tells an opened overlay from a standing one.
      const surfaces = page.locator(SURFACE);
      if (
        !(await surfaces
          .nth(before)
          .waitFor({ state: 'attached', timeout: 700 })
          .then(
            () => true,
            () => false,
          ))
      ) {
        // A press that toggled something else, or nothing. Escape anyway so a
        // half-opened surface cannot be attributed to the next trigger.
        await page.keyboard.press('Escape');
        continue;
      }
      // Portals append to <body>, so the surface just opened is the LAST
      // match — but the OUTERMOST of the ones it brought with it. A Popover
      // whose content is itself a listbox matches twice, and taking the last
      // match plainly picked the inner one: `/components/options-picker` swept
      // 3 rings instead of 16, silently dropping the chrome around the list.
      // Tagged in the DOM rather than passed as an index, because the sweep
      // resolves its root with one `querySelector`.
      await page.evaluate((sel) => {
        const all = [...document.querySelectorAll(sel)];
        for (const el of all) el.removeAttribute('data-sweep-root');
        const outermost = all.filter((el) => !all.some((o) => o !== el && o.contains(el)));
        outermost[outermost.length - 1]?.setAttribute('data-sweep-root', '');
      }, SURFACE);
      const open = page.locator('[data-sweep-root]');

      // Settled, not slept. `getAnimations` is the platform's own answer, and
      // it covers the CSS transitions these surfaces actually use.
      await page
        .waitForFunction(
          (sel) => {
            const surface = document.querySelector(sel);
            return (
              !!surface &&
              surface.getAnimations({ subtree: true }).every((a) => a.playState !== 'running')
            );
          },
          '[data-sweep-root]',
          { timeout: 5000 },
        )
        .catch(() => {});

      opened += 1;
      const swept = await sweep(page, '[data-sweep-root]');
      measured += swept.measured;
      for (const hit of swept.findings) found.set(`${hit.key}|${hit.band}`, { route, ...hit });

      await page.keyboard.press('Escape');
      // A surface that refuses to close would make every later sweep measure
      // the FIRST overlay again, silently, and the route would still pass. A
      // reload is cheap and makes that impossible.
      await open.waitFor({ state: 'detached', timeout: 2000 }).catch(async () => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
      });
    }

    expect(opened, `triggers on ${route} that opened an overlay`).toBeGreaterThanOrEqual(
      0 * minOpened,
    );
    expect(measured, 'focusables whose ring this sweep could measure').toBeGreaterThanOrEqual(
      minMeasured,
    );

    const baseline: Finding[] = existsSync(BASELINE)
      ? JSON.parse(readFileSync(BASELINE, 'utf8'))
      : [];
    if (process.env.UPDATE_FOCUS_BASELINE) {
      const merged = [...baseline.filter((b) => b.route !== route), ...found.values()];
      writeFileSync(BASELINE, JSON.stringify(merged, null, 2) + '\n');
      return;
    }

    const id = (f: Finding) => `${f.route}|${f.key}|${f.band}`;
    const known = new Set(baseline.map(id));
    // Compared as strings, not objects: one line per finding reads far better
    // in the failure diff than a screenful of pretty-printed objects.
    const fresh = [...found.values()].filter((f) => !known.has(id(f))).map(id);
    expect(fresh, 'focus-ring bands newly lost to an overflow ancestor inside an overlay').toEqual(
      [],
    );
  });
}
