import { test, expect } from '@playwright/test';

/**
 * DS-19: closed Accordion content stays mounted (grid-rows 0fr) but must leave
 * the tab order; opening it makes its controls reachable again.
 */
test('closed accordion content is skipped by Tab; open content is reachable (DS-19)', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const item = page.getByRole('button', { name: 'How do I export my data?' }).first();
  const inner = page.getByTestId('export-content').locator('button');

  await item.focus();
  await page.keyboard.press('Tab');
  await expect(inner).not.toBeFocused();

  await item.press('Enter');
  await expect(inner).toBeVisible();
  await item.focus();
  await page.keyboard.press('Tab');
  await expect(inner).toBeFocused();
});

test('an open inner accordion inside a closed outer item has no tabbable descendants', async ({
  page,
}) => {
  await page.goto('/components/accordion');
  const outer = page.getByTestId('nested-outer-content');
  // Mounted, so the inner controls exist — but a closed outer item must hide them
  // all, including the inner open content and the inner closed item's actions.
  await expect(
    outer.getByRole('button', { name: 'Inner action', includeHidden: true }),
  ).toHaveCount(1);
  const reachable = await outer.evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex]')]
      .filter((el) => el.tabIndex >= 0 && getComputedStyle(el).visibility === 'visible')
      .map((el) => el.getAttribute('aria-label') || el.textContent?.trim()),
  );
  expect(reachable).toEqual([]);

  // Opening the outer item brings back the inner open content and the inner
  // closed item's (default, visible) actions.
  await page.getByRole('button', { name: 'Advanced settings', expanded: false }).last().click();
  await expect(outer.getByRole('button', { name: 'Inner action' })).toBeVisible();
  await expect(outer.getByRole('button', { name: 'Edit inner' })).toBeVisible();
});
