import { test, expect, type Locator } from '@playwright/test';

/**
 * DS-35 / Task 3: on a coarse pointer (Pixel 7 project) label rows, tabs, cell
 * links, agenda rows, picker rows and colour swatches reach 44px.
 */

const height = async (el: Locator) => (await el.boundingBox())!.height;

test('Checkbox label row is at least 44px tall', async ({ page }) => {
  await page.goto('/components/checkbox');
  const row = page
    .locator('label')
    .filter({ has: page.getByRole('checkbox') })
    .first();
  expect(await height(row)).toBeGreaterThanOrEqual(44);
});

test('Radio label row is at least 44px tall', async ({ page }) => {
  await page.goto('/components/radio');
  const row = page
    .locator('label')
    .filter({ has: page.getByRole('radio') })
    .first();
  expect(await height(row)).toBeGreaterThanOrEqual(44);
});

test('Switch label row is at least 44px tall', async ({ page }) => {
  await page.goto('/components/switch');
  const row = page
    .locator('label')
    .filter({ has: page.getByRole('switch') })
    .first();
  expect(await height(row)).toBeGreaterThanOrEqual(44);
});

test('Tab is at least 44px tall', async ({ page }) => {
  await page.goto('/components/tabs');
  expect(await height(page.getByRole('tab').first())).toBeGreaterThanOrEqual(44);
});

test('Table.CellLink is at least 44px tall', async ({ page }) => {
  await page.goto('/components/table');
  const link = page.locator('td a[href="#"]').first();
  expect(await height(link)).toBeGreaterThanOrEqual(44);
});

test('Calendar agenda row is at least 44px tall', async ({ page }) => {
  await page.goto('/components/calendar');
  const row = page.getByRole('list').getByRole('listitem').getByRole('button').first();
  await row.scrollIntoViewIfNeeded();
  expect(await height(row)).toBeGreaterThanOrEqual(44);
});

test('OptionsPicker row is at least 44px tall', async ({ page }) => {
  await page.goto('/components/options-picker');
  await page.getByRole('button', { name: /Stage/ }).first().click();
  // The row is the nearest id-bearing div around the first option's checkbox.
  const row = page
    .getByRole('listbox')
    .getByRole('checkbox')
    .first()
    .locator('xpath=ancestor::div[@id][1]');
  expect(await height(row)).toBeGreaterThanOrEqual(44);
});

test('ColorPicker swatches are at least 44x44 and 4 fit per row at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/components/color-picker');
  await page
    .getByRole('button', { name: /Brand color|#[0-9a-f]{6}/i })
    .first()
    .click();
  const swatches = page.getByRole('button', { name: /^#[0-9a-f]{6}$/i });
  const first = (await swatches.first().boundingBox())!;
  expect(first.width).toBeGreaterThanOrEqual(44);
  expect(first.height).toBeGreaterThanOrEqual(44);
  const boxes = await Promise.all(
    Array.from({ length: 4 }, (_, i) => swatches.nth(i).boundingBox()),
  );
  expect(new Set(boxes.map((b) => Math.round(b!.y))).size).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
