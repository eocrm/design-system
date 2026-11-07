import { test, expect, type Locator } from '@playwright/test';

/**
 * DS-35 / Task 4: chip x buttons and Link get an invisible hit area on a coarse
 * pointer (Pixel 7 project). The chip x grows to 44px wide on touch, so its
 * hit area is 44x44 and the label (beside it) is not covered.
 */

const hitArea = (el: Locator) =>
  el.evaluate((node) => {
    const cs = getComputedStyle(node, '::before');
    return { width: parseFloat(cs.width), height: parseFloat(cs.height) };
  });

test('FilterChip x has a 44x44 hit area', async ({ page }) => {
  await page.goto('/components/filter-chip');
  const dismiss = page.getByTestId('filter-chip-stateful').getByRole('button').first();
  const h = await hitArea(dismiss);
  expect(h.height).toBeGreaterThanOrEqual(44);
  expect(h.width).toBeGreaterThanOrEqual(44);
  expect((await dismiss.boundingBox())!.height).toBeLessThan(44);
});

test('tapping the FilterChip label does not dismiss it; tapping the edge of the x hit area does', async ({
  page,
}) => {
  await page.goto('/components/filter-chip');
  const chips = page.getByTestId('filter-chip-stateful').getByRole('group');
  await expect(chips).toHaveCount(2);
  const label = (await chips.first().getByText('Event').boundingBox())!;
  await page.touchscreen.tap(label.x + label.width / 2, label.y + label.height / 2);
  await expect(chips).toHaveCount(2);
  const x = (await chips.first().getByRole('button').boundingBox())!;
  await page.touchscreen.tap(x.x + x.width / 2, x.y + x.height / 2 - 18);
  await expect(chips).toHaveCount(1);
});

test('Select chip remove has a 44x44 hit area', async ({ page }) => {
  await page.goto('/components/select');
  const remove = page.getByTestId('select-tags-chips').getByRole('button', { name: /shipping/i });
  const h = await hitArea(remove);
  expect(h.height).toBeGreaterThanOrEqual(44);
  expect(h.width).toBeGreaterThanOrEqual(44);
  expect((await remove.boundingBox())!.height).toBeLessThan(44);
});

test('Link hitArea="touch" has a hit area at least 44px tall', async ({ page }) => {
  await page.goto('/components/link');
  const link = page.getByRole('link', { name: 'Ada Lovelace' });
  expect((await hitArea(link)).height).toBeGreaterThanOrEqual(44);
});
