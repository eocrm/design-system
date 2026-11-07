import { test, expect, type Locator } from '@playwright/test';

/**
 * DS-35 / Task 4: chip x buttons and Link get an invisible hit area on a coarse
 * pointer (Pixel 7 project). The chip x area is 44px tall but only as wide as the
 * x itself (--touch-hit-inline-size: 100%), so it never covers the label.
 */

const hitArea = (el: Locator) =>
  el.evaluate((node) => {
    const cs = getComputedStyle(node, '::before');
    return { width: parseFloat(cs.width), height: parseFloat(cs.height), hostW: node.clientWidth };
  });

test('FilterChip x has a 44px-tall hit area no wider than the x', async ({ page }) => {
  await page.goto('/components/filter-chip');
  const dismiss = page.getByRole('button', { name: 'Remove filter' }).first();
  const h = await hitArea(dismiss);
  expect(h.height).toBeGreaterThanOrEqual(44);
  expect(h.width).toBeLessThanOrEqual(h.hostW + 1);
  expect((await dismiss.boundingBox())!.height).toBeLessThan(44);
});

test('tapping the FilterChip label does not dismiss it, tapping the x does', async ({ page }) => {
  await page.goto('/components/filter-chip');
  // The first example's chip is stateful (others are static): its removal drops the count.
  const chips = page.getByRole('group').filter({ hasText: 'auth.* (3)' });
  const before = await chips.count();
  const chip = chips.first();
  const box = (await chip.getByText('Event').boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(chips).toHaveCount(before);
  await chip.getByRole('button', { name: 'Remove filter' }).tap();
  await expect(chips).toHaveCount(before - 1);
});

test('Select chip remove has a 44px-tall hit area', async ({ page }) => {
  await page.goto('/components/select');
  const remove = page.getByRole('button', { name: /shipping/i }).first();
  const h = await hitArea(remove);
  expect(h.height).toBeGreaterThanOrEqual(44);
  expect((await remove.boundingBox())!.height).toBeLessThan(44);
});

test('Link hitArea="touch" has a hit area at least 44px tall', async ({ page }) => {
  await page.goto('/components/link');
  const link = page.getByRole('link', { name: 'Ada Lovelace' });
  expect((await hitArea(link)).height).toBeGreaterThanOrEqual(44);
});
