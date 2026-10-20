import { test, expect } from '@playwright/test';

/**
 * #668: stretchWrapped is a layout fact (flex-grow per line), invisible to jsdom.
 * Wide: pill and button grid share a row and the grid is content-sized.
 * Narrow: the grid wraps under the pill, fills the line, buttons equal width.
 */
const measure = (page: import('@playwright/test').Page, id: string) =>
  page.getByTestId(id).evaluate((box) => {
    const cluster = box.firstElementChild as HTMLElement;
    const [first, second] = [...cluster.children] as HTMLElement[];
    const f = first.getBoundingClientRect();
    const s = second.getBoundingClientRect();
    const c = cluster.getBoundingClientRect();
    const btns = [...second.querySelectorAll('button')].map((b) => b.getBoundingClientRect().width);
    return { fTop: f.top, fW: f.width, sTop: s.top, sW: s.width, cW: c.width, btns };
  });

test('stretchWrapped keeps one row content-sized when wide (#668)', async ({ page }) => {
  await page.goto('/components/cluster');
  const m = await measure(page, 'stretch-wrapped-400');
  expect(Math.abs(m.sTop - m.fTop)).toBeLessThan(m.sW); // same row (not below)
  expect(m.sTop).toBeLessThan(m.fTop + 40);
  expect(m.sW).toBeLessThan(m.cW - m.fW - 16); // not stretched: slack is left over
});

test('stretchWrapped stacks and fills the line when narrow (#668)', async ({ page }) => {
  await page.goto('/components/cluster');
  const m = await measure(page, 'stretch-wrapped-240');
  expect(m.sTop).toBeGreaterThan(m.fTop + 8); // lower row
  expect(Math.abs(m.sW - m.cW)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.btns[0] - m.btns[1])).toBeLessThanOrEqual(1);
});

test('stretchWrapped stretches under a container-wide first child (#668)', async ({ page }) => {
  await page.goto('/components/cluster');
  const m = await measure(page, 'stretch-wrapped-long-300');
  expect(m.sTop).toBeGreaterThan(m.fTop + 8); // lower row
  expect(Math.abs(m.sW - m.cW)).toBeLessThanOrEqual(1);
  expect(Math.abs(m.btns[0] - m.btns[1])).toBeLessThanOrEqual(1);
});

test('stretchWrapped switches exactly when the content stops fitting (#668)', async ({ page }) => {
  await page.goto('/components/cluster');
  const rows = await page.getByTestId('stretch-wrapped-400').evaluate((box) => {
    const cluster = box.firstElementChild as HTMLElement;
    const [first, second] = [...cluster.children] as HTMLElement[];
    const gap = parseFloat(getComputedStyle(cluster).columnGap);
    box.style.width = 'max-content';
    const need = first.getBoundingClientRect().width + gap + second.getBoundingClientRect().width;
    const sameRow = (w: number) => {
      box.style.width = `${w}px`;
      return second.getBoundingClientRect().top < first.getBoundingClientRect().bottom;
    };
    return { fits: sameRow(Math.ceil(need)), tooNarrow: sameRow(Math.ceil(need) - 2) };
  });
  expect(rows).toEqual({ fits: true, tooNarrow: false });
});
