import { test, expect, type Page } from '@playwright/test';

/**
 * DS-23: on touch, a Chart range selection starts with a long-press (LONG_PRESS_MS, 300ms) so a
 * vertical swipe over a selectable plot stays a page scroll. Driven through CDP
 * `Input.dispatchTouchEvent` (as in touch-dashboard-canvas.spec.ts) so Chromium runs its real touch
 * pipeline: pointer events, touch-action and the pan that pointercancels a press.
 */

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

async function openRangeExample(page: Page) {
  await page.goto('/components/chart');
  const plot = page.getByRole('group', { name: 'Bowl weight per minute' });
  await plot.scrollIntoViewIfNeeded();
  const b = (await plot.boundingBox())!;
  return {
    readout: page.getByTestId('chart-range-readout'),
    // Inside the plot area, clear of the y-axis labels on the left.
    at: (fx: number, fy = 0.5): Point => ({ x: b.x + b.width * fx, y: b.y + b.height * fy }),
  };
}

test('a vertical swipe over a selectable plot scrolls the page and selects nothing', async ({
  page,
}) => {
  const { readout, at } = await openRangeExample(page);
  const before = await page.evaluate(() => window.scrollY);
  const touch = await touchDriver(page);
  const from = at(0.5, 0.8);
  await touch.start(from);
  await touch.move(from, at(0.5, 0.1));
  await touch.end();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  await expect(readout).toHaveText('');
});

test('long-press then a slide selects a range without scrolling the page', async ({ page }) => {
  const { readout, at } = await openRangeExample(page);
  const touch = await touchDriver(page);
  const from = at(0.3);
  await touch.start(from);
  await page.waitForTimeout(400);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  // Up first (what would pan the page under pan-y), then across: once lifted, the finger owns
  // the gesture and the page must not scroll.
  await touch.move(from, at(0.3, 0.05));
  await touch.move(at(0.3, 0.05), at(0.8, 0.05));
  await page.waitForTimeout(500);
  console.log('SCROLL', scrollBefore, await page.evaluate(() => window.scrollY));
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await touch.end();
  await expect(readout).toHaveText(/^Selected 08:\d\d – 08:\d\d$/);
});
