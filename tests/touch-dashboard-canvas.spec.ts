import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * DS-35 / DS-15: on touch, a DashboardCanvas item is picked up by holding it
 * still ~300ms (LONG_PRESS_MS); a quick swipe stays a page scroll; a tap on a
 * button inside an item still clicks it. Driven through CDP
 * `Input.dispatchTouchEvent` — `page.touchscreen` only taps — so Chromium runs
 * its real touch pipeline: pointer events, touch-action, and the scroll that
 * fires `pointercancel` at a canvas that does not suppress it.
 */

// Wide enough that the canvas stays above its `stackBelow` ('md', 640px)
// editing gate; DS-15 was reported on an 844x390 landscape phone.
test.use({ viewport: { width: 1024, height: 700 } });

type Point = { x: number; y: number };

async function touchDriver(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: Point) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [],
    });
  return {
    start: (p: Point) => send('touchStart', p),
    end: () => send('touchEnd'),
    /** A finger slide in small steps, so Chromium sees a real gesture. */
    async move(from: Point, to: Point, steps = 12) {
      for (let i = 1; i <= steps; i++) {
        await send('touchMove', {
          x: from.x + ((to.x - from.x) * i) / steps,
          y: from.y + ((to.y - from.y) * i) / steps,
        });
        await page.waitForTimeout(16);
      }
    },
  };
}

const centre = async (el: Locator): Promise<Point> => {
  const b = (await el.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

/** The rendered placement of one item, as the canvas stamps it. */
const placement = (el: Locator) =>
  el.evaluate((node) => (node as HTMLElement).style.getPropertyValue('--dc-col'));

/** Scroll offset of the canvas's nearest scrolling ancestor (or the page). */
const scrollOffset = (el: Locator) =>
  el.evaluate((node) => {
    for (let p = node.parentElement; p; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) {
        return p.scrollTop;
      }
    }
    return document.scrollingElement!.scrollTop;
  });

const editCanvas = (page: Page) => page.getByRole('group', { name: 'Dashboard canvas' }).first();

test('long-press picks an item up and a touch drag moves it', async ({ page }) => {
  await page.goto('/components/dashboard-canvas');
  const canvas = editCanvas(page);
  const revenue = canvas.locator('[data-dc-item="revenue"]');
  const activity = canvas.locator('[data-dc-item="activity"]');
  await revenue.scrollIntoViewIfNeeded();
  const before = await placement(revenue);
  const from = await centre(revenue);
  const to = await centre(activity);

  const touch = await touchDriver(page);
  await touch.start(from);
  await page.waitForTimeout(400);
  await expect(revenue).toHaveAttribute('data-lifted', '');
  const scrollBefore = await scrollOffset(canvas);
  await touch.move(from, to);
  // Armed: the drag owns the finger, the page does not pan under it.
  expect(await scrollOffset(canvas)).toBe(scrollBefore);
  await touch.end();

  expect(await placement(revenue)).not.toBe(before);
  // The committed value (onChange), via the demo's JSON readout.
  await page.getByRole('button', { name: 'Current value (JSON)' }).first().click();
  const readout = page.locator('pre').filter({ hasText: '"items"' }).first();
  const json = JSON.parse(await readout.innerText());
  expect(json.items.find((i: { id: string }) => i.id === 'revenue').x).not.toBe(0);
});

// Upward finger travel is exactly what would scroll the page down, and the
// cross-container drop remounts the item mid-gesture (its touch target
// leaves the DOM), so this is the hard case for scroll suppression.
test('a lifted item dragged up into another container does not scroll the page', async ({
  page,
}) => {
  await page.goto('/components/dashboard-canvas');
  const canvas = editCanvas(page);
  const leaderboard = canvas.locator('[data-dc-item="leaderboard"]');
  const deals = canvas.locator('[data-dc-item="deals"]');
  await leaderboard.scrollIntoViewIfNeeded();
  const from = await centre(leaderboard);
  const to = await centre(deals);
  expect(from.y - to.y).toBeGreaterThan(100);

  const touch = await touchDriver(page);
  await touch.start(from);
  await page.waitForTimeout(400);
  await expect(leaderboard).toHaveAttribute('data-lifted', '');
  const scrollBefore = await scrollOffset(canvas);
  await touch.move(from, to, 20);
  expect(await scrollOffset(canvas)).toBe(scrollBefore);
  await touch.end();

  await page.getByRole('button', { name: 'Current value (JSON)' }).first().click();
  const readout = page.locator('pre').filter({ hasText: '"items"' }).first();
  const json = JSON.parse(await readout.innerText());
  // It started in the 'team' section; the drop moved it to the top level.
  type Placed = { id: string };
  expect(json.items.map((i: Placed) => i.id)).toContain('leaderboard');
  const team = json.sections.find((s: { id: string }) => s.id === 'team');
  expect(team.items.map((i: Placed) => i.id)).not.toContain('leaderboard');
});

test('a quick swipe on an item scrolls the page and does not move it', async ({ page }) => {
  await page.goto('/components/dashboard-canvas');
  const canvas = editCanvas(page);
  const revenue = canvas.locator('[data-dc-item="revenue"]');
  await revenue.scrollIntoViewIfNeeded();
  const before = await placement(revenue);
  const scrollBefore = await scrollOffset(canvas);
  const from = await centre(revenue);

  const touch = await touchDriver(page);
  await touch.start(from);
  await touch.move(from, { x: from.x, y: from.y - 200 }, 8);
  await touch.end();

  await expect.poll(() => scrollOffset(canvas)).toBeGreaterThan(scrollBefore);
  await expect(revenue).not.toHaveAttribute('data-lifted');
  expect(await placement(revenue)).toBe(before);
});

test('a tap on a button inside an item fires it and does not lift the item', async ({ page }) => {
  await page.goto('/components/dashboard-canvas');
  const configureName = { name: 'Configure', exact: true };
  const item = page
    .locator('[data-dc-item]')
    .filter({ has: page.getByRole('button', configureName) })
    .first();
  const configure = item.getByRole('button', configureName);
  await configure.scrollIntoViewIfNeeded();

  const touch = await touchDriver(page);
  const p = await centre(configure);
  await touch.start(p);
  // Past LONG_PRESS_MS: the timer must not lift an item from an interactive child.
  await page.waitForTimeout(350);
  await expect(item).not.toHaveAttribute('data-lifted');
  await touch.end();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(item).not.toHaveAttribute('data-lifted');
});
