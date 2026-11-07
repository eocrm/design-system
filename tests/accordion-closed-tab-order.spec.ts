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
