import { test, expect } from '@playwright/test';

/**
 * #710: a CodeBlock header shrink-wrapped its Tabs scroll wrapper to the
 * tablist's fractional content width. With the scroll container exactly as
 * wide as its content, Windows display scaling rounded scrollWidth 1px above
 * clientWidth and showed a scrollbar although every tab fit. That rounding
 * does not reproduce in headless Linux Chrome, so this pins the cause instead:
 * when the tabs fit, the wrapper takes the header's free space and keeps slack
 * beyond the content. Layout, invisible to jsdom.
 */
test('CodeBlock tab strip takes the free header space, not its content width (#710)', async ({
  page,
}) => {
  await page.goto('/components/code-block');
  const strips = await page.locator('[role="tablist"]').evaluateAll((lists) =>
    lists.map((list) => {
      const wrap = list.parentElement as HTMLElement;
      // The tablist is min-width: 100% of the wrapper; lift that to read its
      // own content width.
      list.style.minWidth = '0';
      list.style.width = 'max-content';
      const content = list.getBoundingClientRect().width;
      list.style.minWidth = '';
      list.style.width = '';
      return { wrap: wrap.getBoundingClientRect().width, content };
    }),
  );
  expect(strips.length).toBeGreaterThan(0);
  for (const s of strips) expect(s.wrap).toBeGreaterThan(s.content + 1);
});
