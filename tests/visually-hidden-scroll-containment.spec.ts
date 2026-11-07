import { test, expect } from '@playwright/test';

/**
 * DS-14: the visually-hidden mixin was `position: absolute` with no inset, so
 * with no positioned ancestor inside a DashboardCanvas cell it escaped the
 * Card's clip and extended the cell's scroll area (second scrollbar).
 */
test('DashboardCanvas cell with a Chart has no second scrollbar (DS-14)', async ({ page }) => {
  await page.goto('/components/visually-hidden');
  const cells = page.locator('[data-scroll]').first();
  await expect(cells).toBeVisible();
  const { checked, bad } = await page.evaluate(() => {
    const items = [...document.querySelectorAll<HTMLElement>('[data-scroll]')]
      .map((b) => b.closest<HTMLElement>('[data-dc-item]'))
      .filter((c): c is HTMLElement => !!c);
    return {
      checked: items.length,
      bad: items
        .filter((c) => c.scrollHeight > c.clientHeight + 1)
        .map((c) => `${c.scrollHeight}>${c.clientHeight}`),
    };
  });
  expect(checked).toBeGreaterThan(0);
  expect(bad).toEqual([]);
});

// The mixin now pins to the containing block's start, so a focusable hidden
// input needs a positioned tile or focusing it would scroll to the page origin.
for (const route of ['date-strip', 'slot-grid']) {
  test(`${route} radio inputs are contained by their tile`, async ({ page }) => {
    await page.goto(`/components/${route}`);
    const bad = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLInputElement>('input[type=radio]')].filter(
          (el) => el.offsetParent !== el.closest('label'),
        ).length,
    );
    expect(bad).toBe(0);
  });
}
