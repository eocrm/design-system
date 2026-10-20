import { test, expect } from '@playwright/test';

/**
 * #670: opening an OptionsPicker with a scrolling list grew the page's
 * scrollbar. The Checkbox root was not positioned, so its visually-hidden
 * `position: absolute` input took the popover panel as its containing block;
 * the list (`overflow-y: auto`, not positioned) cannot clip such a descendant,
 * so off-scroll inputs extended the document. Asserts each option input's
 * containing block is its own label (so the scroller clips it).
 */
test('OptionsPicker options keep their hidden inputs inside the scrolling list (#670)', async ({
  page,
}) => {
  await page.goto('/components/options-picker');
  const triggers = page.locator('[aria-haspopup="listbox"]');
  await expect(triggers.first()).toBeVisible();

  let result: { count: number; failures: string[] } | null = null;
  for (let i = 0; i < (await triggers.count()) && !result; i++) {
    await triggers.nth(i).click();
    result = await page.evaluate(() => {
      const list = [...document.querySelectorAll<HTMLElement>('[role=listbox]')].find(
        (l) => l.scrollHeight > l.clientHeight,
      );
      if (!list) return null;
      const panel = list.parentElement!.closest<HTMLElement>('[role=dialog], [popover]') ?? list;
      const inputs = [...panel.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
      return {
        count: inputs.length,
        failures: inputs
          .filter((el) => el.offsetParent !== el.closest('label'))
          .map((el) => el.closest('label')?.textContent ?? '?'),
      };
    });
    if (!result) await page.keyboard.press('Escape');
  }

  expect(result, 'a trigger whose list scrolls').not.toBeNull();
  expect(result!.count).toBeGreaterThan(0);
  expect(result!.failures).toEqual([]);
});
