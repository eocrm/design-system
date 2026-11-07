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
  const agenda = page
    .getByRole('heading', { name: 'Agenda view' })
    .locator('xpath=following::*[@role="list"][1]');
  const row = agenda.getByRole('listitem').getByRole('button').first();
  await row.scrollIntoViewIfNeeded();
  expect(await height(row)).toBeGreaterThanOrEqual(44);
});

test('OptionsPicker row is at least 44px tall', async ({ page }) => {
  await page.goto('/components/options-picker');
  await page.getByRole('button', { name: /Stage/ }).first().click();
  const row = page.locator('[data-options-picker-row]').first();
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

/** Vertical centre of the text inside an element, via a Range over its contents. */
const textCentre = (el: Locator) =>
  el.evaluate((n) => {
    const r = document.createRange();
    r.selectNodeContents(n);
    const b = r.getBoundingClientRect();
    return {
      mid: b.top + b.height / 2,
      right: b.right,
      linkRight: n.getBoundingClientRect().right,
    };
  });

test('Table.CellLink text is vertically centred like a plain cell in the same row', async ({
  page,
}) => {
  await page.goto('/components/table');
  const row = page.locator('tr', { has: page.locator('td a[href="#"]') }).first();
  const link = row.locator('td a[href="#"]').first();
  const plain = row.locator('th').first();
  const a = await textCentre(link);
  const b = await textCentre(plain);
  expect(Math.abs(a.mid - b.mid)).toBeLessThanOrEqual(2);
});
