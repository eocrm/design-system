import { test, expect } from '@playwright/test';

/**
 * #671: in chart view the accent segment of the sibling bar is measured in JS
 * (jsdom has no layout). Asserts the highlighted group's `::after` runs from the
 * parent box centre to the highlighted child's centre (plus the accent width,
 * which covers the vertical line at the far end), within 1px.
 */
test('TreeView chart highlight segment spans parent centre to highlighted child (#671)', async ({
  page,
}) => {
  await page.goto('/components/tree-view');
  const tree = page.getByRole('tree', { name: 'Organization structure (highlighted path)' });
  await expect(tree.locator('[data-highlighted-path]').first()).toBeVisible();

  const groups = await tree.evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>('[data-highlighted-path]')].map((group) => {
      const g = group.getBoundingClientRect();
      const centre = (el: Element) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2 - g.left;
      };
      const xs = [
        centre(group.parentElement!.firstElementChild!),
        ...[...group.children]
          .filter((c) => c.hasAttribute('data-highlighted'))
          .map((c) => centre(c.firstElementChild!)),
      ];
      const after = getComputedStyle(group, '::after');
      return {
        min: Math.min(...xs),
        max: Math.max(...xs),
        left: parseFloat(after.left),
        width: parseFloat(after.width),
        accent: parseFloat(after.borderTopWidth),
      };
    }),
  );

  // company -> sales and sales -> sales/outbound
  expect(groups).toHaveLength(2);
  for (const g of groups) {
    expect(g.max - g.min).toBeGreaterThan(0);
    expect(Math.abs(g.left - g.min)).toBeLessThanOrEqual(1);
    expect(Math.abs(g.left + g.width - g.accent - g.max)).toBeLessThanOrEqual(1);
  }
});
