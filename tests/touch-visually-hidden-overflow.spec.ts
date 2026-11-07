import { test, expect } from '@playwright/test';

/** DS-31: a VisuallyHidden in a table header widened the page on phones. */
test('VisuallyHidden in a table header does not widen the page (DS-31)', async ({ page }) => {
  await page.goto('/components/visually-hidden');
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeAttached();
  // window.innerWidth is no use here: on a mobile viewport the layout viewport
  // grows with the overflowing content, so compare against the device width.
  const doc = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(doc).toBeLessThanOrEqual(page.viewportSize()!.width);
});
