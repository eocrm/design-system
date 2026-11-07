import { test, expect, type Locator } from '@playwright/test';

/**
 * DS-35 / Task 2: on a coarse pointer (Pixel 7 project) controls reach 44px,
 * xs/sm Buttons get an invisible 44px hit area, and text entry is 16px so iOS
 * does not zoom on focus.
 */

/** The ::before hit-area box, in the host's padding-box coordinates. */
const hitArea = (el: Locator) =>
  el.evaluate((node) => {
    const cs = getComputedStyle(node, '::before');
    return {
      width: parseFloat(cs.width),
      height: parseFloat(cs.height),
      left: parseFloat(cs.left),
      top: parseFloat(cs.top),
      hostW: node.clientWidth,
      hostH: node.clientHeight,
    };
  });

test('md Button is at least 44px tall', async ({ page }) => {
  await page.goto('/components/button');
  const box = await page
    .getByRole('button', { name: 'Primary', exact: true })
    .first()
    .boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('Button inside ButtonGroup is at least 44px tall', async ({ page }) => {
  await page.goto('/components/button-group');
  const box = await page
    .getByRole('group', { name: 'Edit actions' })
    .getByRole('button', { name: 'Cut' })
    .boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('Input md is 44px tall with 16px text', async ({ page }) => {
  await page.goto('/components/input');
  const input = page.getByLabel('Medium input').first();
  await expect(input).toHaveCSS('font-size', '16px');
  expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('xs icon-only Button has a 44x44 hit area, visual size unchanged', async ({ page }) => {
  await page.goto('/components/button');
  const btn = page.getByRole('button', { name: 'Remove' }).first();
  const h = await hitArea(btn);
  expect(h.width).toBeGreaterThanOrEqual(44);
  expect(h.height).toBeGreaterThanOrEqual(44);
  expect((await btn.boundingBox())!.height).toBeLessThan(44);
});

for (const where of ['button', 'html'] as const) {
  test(`hit area stays centred in RTL (dir on ${where})`, async ({ page }) => {
    await page.goto('/components/button');
    const btn = page.getByRole('button', { name: 'Remove' }).first();
    await btn.evaluate((node, w) => {
      (w === 'html' ? document.documentElement : node).setAttribute('dir', 'rtl');
    }, where);
    const h = await hitArea(btn);
    expect(Math.abs(h.left + h.width / 2 - h.hostW / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(h.top + h.height / 2 - h.hostH / 2)).toBeLessThanOrEqual(1);
  });
}
