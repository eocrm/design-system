import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

type Band = 'top' | 'right' | 'bottom' | 'left';
type Finding = { route: string; key: string; band: Band };

// A floor, not a presence check. If the regex degrades from 93 matches to a
// handful, most per-route tests below silently disappear and the suite still
// goes green — which is the failure this guard exists to catch, and `> 0` does
// not catch it.
test('found the demo routes', () => {
  expect(routes.length).toBeGreaterThan(80);
});

/**
 * Focuses every focusable on the page and measures whether an `overflow`
 * ancestor eats a band of its ring.
 *
 * Focus is set programmatically rather than walked with `Tab`, after one real
 * `Tab` has put the page in keyboard modality. Two reasons, both measured in
 * Chromium rather than assumed:
 *
 * 1. `Tab` cannot reach a roving-tabindex member, and that is where one of the
 *    three clips #510 fixed lives: only the selected `DayCell` is tabbable, and
 *    it is never the first-column cell whose left band the month grid eats.
 * 2. `:focus-visible` is modality-dependent in principle, but Chromium matches
 *    it on programmatic focus — the negative case is a *pointer* interaction,
 *    which this sweep never performs.
 *
 * `preventScroll` only stops the sweep perturbing scroll state as it walks; it
 * is not what makes the result deterministic. Running the shipped sweep with it
 * off produces byte-identical output. Determinism comes from not seeding the
 * clip with the viewport, and from the scroll-axis rule below.
 *
 * What this does NOT see, so nobody reads a green run as more than it is:
 * closed overlays (it presses Tab once and opens nothing, so every menu,
 * listbox, dialog and picker is absent from the DOM), losses at either end of a
 * scroll range, and clips produced by an ancestor's border or border-radius.
 */
const sweepScript = `
(() => {
  const FOCUSABLE = 'a[href],area[href],button,input,select,textarea,summary,' +
    'iframe,object,embed,audio[controls],video[controls],[tabindex],' +
    '[contenteditable]:not([contenteditable="false"])';

  // Strip the content hash off a CSS-module class so a stylesheet edit does
  // not invalidate every baseline entry. generateScopedName in
  // packages/playground/vite.config.ts is '[name]__[local]__[hash:base64:5]'.
  const mod = (n) =>
    [...n.classList]
      .map((c) => c.replace(/__[\\w+/-]{5}$/, ''))
      .filter((c) => c.includes('__'))
      .sort()
      .join('.');

  // Bare <button>s in a demo have no module class of their own; the nearest
  // ancestor that does keeps their keys apart.
  const stable = (n) => {
    const own = mod(n);
    if (own) return n.tagName.toLowerCase() + '.' + own;
    for (let p = n.parentElement, d = 0; p && d < 3; p = p.parentElement, d++) {
      const m = mod(p);
      if (m) return m + ' >> ' + n.tagName.toLowerCase();
    }
    return n.tagName.toLowerCase();
  };

  const inflate = (r, by) => ({
    top: r.top - by, right: r.right + by, bottom: r.bottom + by, left: r.left - by,
  });
  const intersect = (a, b) => ({
    top: Math.max(a.top, b.top), right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom), left: Math.max(a.left, b.left),
  });
  const area = (r) => Math.max(0, r.right - r.left) * Math.max(0, r.bottom - r.top);

  const findings = new Map();
  let measured = 0;
  const previous = document.activeElement;

  for (const el of document.querySelectorAll(FOCUSABLE)) {
    if (el.disabled || el.closest('[inert]') || !el.checkVisibility()) continue;

    el.focus({ preventScroll: true });
    if (document.activeElement !== el) continue;

    // The ring is not always on the focused element. Image draws it on the
    // wrapper because a wrapper's overflow does not clip its own outline, and
    // every :focus-within / :has() input shell does the same:
    //   grep -rn -B4 'include focus-ring' --include='*.scss' packages/design-system/src \
    //     | grep -E ':has\(|:focus-within'
    // Measure wherever it actually renders, or the sweep certifies the wrong box.
    // outline-style 'auto' is Chromium's own default ring, not one this
    // library declared.
    let ring = null;
    for (let n = el, d = 0; n && d < 5; n = n.parentElement, d++) {
      const s = getComputedStyle(n);
      const w = parseFloat(s.outlineWidth) || 0;
      if (w && s.outlineStyle !== 'none' && s.outlineStyle !== 'auto') { ring = n; break; }
    }
    if (!ring) continue;
    measured++;

    const cs = getComputedStyle(ring);
    const width = parseFloat(cs.outlineWidth) || 0;

    const box = ring.getBoundingClientRect();
    if (!box.width || !box.height) continue;

    // Only real overflow ancestors clip. NOT the viewport: what is below the
    // fold is a scroll position, not a lost ring.
    let clip = { top: -Infinity, left: -Infinity, right: Infinity, bottom: Infinity };
    let scrollsX = false;
    let scrollsY = false;
    // A fixed element is clipped by none of its overflow ancestors, and an
    // absolute one only from its containing block outward. Climbing regardless
    // reports rings that are plainly on screen, and a false positive is how a
    // gate gets switched off. Dormant today only because every floating surface
    // here portals to <body>.
    let inContainingBlock = cs.position !== 'absolute';
    // Starts at the ring's parent: an element's own overflow never clips its
    // own outline.
    for (let p = cs.position === 'fixed' ? null : ring.parentElement; p; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (!inContainingBlock) {
        if (pcs.position === 'static') continue;
        inContainingBlock = true;
      }
      if (pcs.overflowX === 'visible' && pcs.overflowY === 'visible') continue;
      // Border box, where overflow actually clips at the padding box, tighter
      // still with a border-radius. The clip is therefore too generous by the
      // ancestor's border width: a systematic bias toward passing.
      const r = p.getBoundingClientRect();
      // An axis that scrolls constrains nothing, here or further out: once
      // something between the ring and this ancestor can scroll that axis, a
      // band outside it is usually one scroll away rather than lost. What stays
      // is the axis nothing can scroll — the shape of all three clips #510
      // fixed.
      //
      // Usually, not always, and this is the gate's largest blind spot: at
      // either end of the range the band really is lost, since scrollTop cannot
      // go below 0. The top band of a scroller's first child is permanently
      // clipped and this sweep stays silent on it. The leniency is load-bearing
      // rather than sloppy — without it the Rail fires on all 93 routes — so
      // tightening it is its own change with its own baseline.
      //
      // an 'overflow: clip' ancestor never scrolls, whatever scrollHeight reports for it.
      scrollsY = scrollsY || (pcs.overflowY !== 'clip' && p.scrollHeight > p.clientHeight);
      scrollsX = scrollsX || (pcs.overflowX !== 'clip' && p.scrollWidth > p.clientWidth);
      if (!scrollsY) { clip.top = Math.max(clip.top, r.top); clip.bottom = Math.min(clip.bottom, r.bottom); }
      if (!scrollsX) { clip.left = Math.max(clip.left, r.left); clip.right = Math.min(clip.right, r.right); }
    }

    // A focusable that is itself wholly outside its clip — inside a collapsed
    // nav group, say — has no ring on screen to lose. That is a different bug
    // from a clipped ring, and reporting all four of its bands buries the ones
    // that matter.
    if (area(intersect(box, clip)) === 0) continue;

    const offset = parseFloat(cs.outlineOffset) || 0;
    const inner = inflate(box, offset);
    const outer = inflate(box, offset + width);
    const bands = {
      top:    { ...outer, bottom: inner.top },
      bottom: { ...outer, top: inner.bottom },
      left:   { ...outer, right: inner.left },
      right:  { ...outer, left: inner.right },
    };

    for (const [band, rect] of Object.entries(bands)) {
      // A band with no area of its own is not a clip — skip it rather than
      // reporting every zero-height ring as lost.
      if (area(rect) === 0) continue;
      if (area(intersect(rect, clip)) === 0) findings.set(stable(ring) + '|' + band, { key: stable(ring), band });
    }
  }

  if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
  else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

  return { measured, findings: [...findings.values()] };
})()
`;

for (const route of routes) {
  test(`focus rings survive their clip ancestors on ${route}`, async ({ page }) => {
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

    const swept = (await page.evaluate(sweepScript)) as {
      measured: number;
      findings: { key: string; band: Band }[];
    };
    // If the library ever stops declaring rings the way this sweep recognises
    // — a switch to box-shadow, say — every route would measure nothing and
    // the gate would pass forever without anyone noticing.
    expect(swept.measured, 'focusables whose ring this sweep could measure').toBeGreaterThan(0);
    const found: Finding[] = swept.findings.map((h) => ({ route, ...h }));

    const baseline: Finding[] = existsSync(BASELINE)
      ? JSON.parse(readFileSync(BASELINE, 'utf8'))
      : [];
    if (process.env.UPDATE_FOCUS_BASELINE) {
      const merged = [...baseline.filter((b) => b.route !== route), ...found];
      writeFileSync(BASELINE, JSON.stringify(merged, null, 2) + '\n');
      return;
    }

    const id = (f: Finding) => `${f.route}|${f.key}|${f.band}`;
    const known = new Set(baseline.map(id));
    // Compared as strings, not objects: one line per finding reads far better
    // in the failure diff than a screenful of pretty-printed objects.
    const fresh = found.filter((f) => !known.has(id(f))).map(id);
    expect(fresh, 'focus-ring bands newly lost to an overflow ancestor').toEqual([]);
  });
}
