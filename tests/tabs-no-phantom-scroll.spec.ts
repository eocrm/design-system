import { test, expect } from '@playwright/test';

/**
 * #710: a Tabs strip sized to its own content (a shrink-to-fit flex item, as
 * in CodeBlock's header and Calendar's view switcher) has a fractional width,
 * and Windows display scaling rounded scrollWidth 1px above clientWidth, so a
 * scrollbar showed although every tab fit. That rounding does not reproduce
 * in headless Linux Chrome, so this pins the fix instead: a strip that fits
 * turns its scrollbar off, and one that genuinely overflows still scrolls.
 */
// The tablist is located by a tab it contains: each demo page also has Tabs in
// its collapsed source panel, where a closed <details> stops ResizeObserver.
for (const [route, tab] of [
  ['/components/code-block', 'cURL'],
  ['/components/calendar', 'Month'],
]) {
  test(`fitting tab strips have no scrollbar; overflowing ones scroll (${route}, #710)`, async ({
    page,
  }) => {
    await page.goto(route);
    const wrap = page
      .getByRole('tablist')
      .filter({ has: page.getByRole('tab', { name: tab, exact: true }) })
      .first()
      .locator('..');

    await expect(wrap).toHaveAttribute('data-fits');
    await expect(wrap).toHaveCSS('overflow-x', 'hidden');

    await wrap.evaluate((el) => {
      (el as HTMLElement).style.maxWidth = '60px';
    });
    await expect(wrap).not.toHaveAttribute('data-fits');
    await expect(wrap).toHaveCSS('overflow-x', 'auto');
    expect(await wrap.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });
}
