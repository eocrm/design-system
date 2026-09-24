import { test, expect } from '@playwright/test';

/**
 * #542: a failed fluid `Image` in a box too small for its full error tile
 * rendered Retry outside the wrapper's `overflow: hidden` clip — painted
 * nowhere, still in the tab order. The focus-ring sweep cannot see this shape:
 * it treats an `overflow: hidden` ancestor whose content overflows downward as
 * one that can reveal it, so a Retry spilling wholly below the wrapper is never
 * reported. This asserts the invariant directly on the Image demo page: every
 * focusable inside a failed tile is either removed or lies inside its wrapper,
 * and an unreserved wrapper does not collapse to 0.
 *
 * The demo's "Error in a tight box" images are `loading="eager"`, so they fail
 * without being scrolled into view.
 */
test('failed Image tiles keep every focusable inside the wrapper (#542)', async ({
  page,
  baseURL,
}) => {
  // Same as the sweep: nothing off-origin, so every remote image is broken.
  await page.route('**/*', (r) =>
    r.request().url().startsWith(baseURL!) ? r.continue() : r.abort(),
  );
  await page.goto('/components/image');
  await page.waitForLoadState('networkidle');
  // networkidle can settle before React has mounted the route and the
  // aborted images have fired `error`. Wait for the three tight-box tiles by
  // name (a failed tile's icon carries `alt`), so the spec cannot pass on the
  // page's other error tiles alone if those three stop rendering or failing.
  const TIGHT = ['Unreserved broken image', 'Narrow broken image', 'Tiny broken image'];
  await page.waitForFunction(
    (names) =>
      names.every((n) => document.querySelector(`[data-state="error"] [aria-label="${n}"]`)),
    TIGHT,
    { timeout: 15_000 },
  );

  const tiles = await page.$$eval('[data-state="error"]', (wrappers) =>
    wrappers.map((w) => {
      const r = w.getBoundingClientRect();
      const outside = [...w.querySelectorAll<HTMLElement>('button, a[href], [tabindex]')]
        .filter((el) => !(el as HTMLButtonElement).disabled && el.tabIndex >= 0)
        // Not rendered at all (itself or an ancestor `display: none`) is not
        // focusable, and its 0x0 rect at (0,0) would read as "outside".
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => el.getBoundingClientRect())
        .filter((q) => q.top < r.top || q.bottom > r.bottom || q.left < r.left || q.right > r.right)
        .map((q) => `${Math.round(q.top - r.top)}..${Math.round(q.bottom - r.top)}`);
      return {
        box: `${Math.round(r.width)}x${Math.round(r.height)}`,
        unreserved: /unreserved/.test(w.className),
        height: r.height,
        outside,
      };
    }),
  );

  // The three tight-box demo shapes plus the existing error examples. A floor,
  // so a demo that stops failing (or stops rendering) is noticed.
  expect(tiles.length).toBeGreaterThanOrEqual(6);
  expect(tiles.filter((t) => t.unreserved).every((t) => t.height > 0)).toBe(true);
  expect(tiles.some((t) => t.unreserved)).toBe(true);
  expect(tiles.filter((t) => t.outside.length > 0)).toEqual([]);
});
