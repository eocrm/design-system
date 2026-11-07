import { test, expect } from '@playwright/test';

/** DS-35 guard: the coarse-pointer sizing must not leak onto desktop. */
test('Button md and Input md keep their 32px desktop height', async ({ page }) => {
  await page.goto('/components/button');
  const btn = await page
    .getByRole('button', { name: 'Primary', exact: true })
    .first()
    .boundingBox();
  expect(btn!.height).toBe(32);

  await page.goto('/components/input');
  const input = await page.getByLabel('Medium input').first().boundingBox();
  expect(input!.height).toBe(32);
});

test('xs Button has no hit-area pseudo-element on desktop', async ({ page }) => {
  await page.goto('/components/button');
  const content = await page
    .getByRole('button', { name: 'Remove' })
    .first()
    .evaluate((n) => getComputedStyle(n, '::before').content);
  expect(content).toBe('none');
});

test('Table.CellLink is display:block and content-sized on desktop', async ({ page }) => {
  await page.goto('/components/table');
  const link = page.locator('td a[href="#"]').first();
  const m = await link.evaluate((n) => {
    const cs = getComputedStyle(n);
    const lh = document.createElement('span');
    lh.style.cssText = 'position:absolute;visibility:hidden;block-size:1lh';
    n.appendChild(lh);
    const line = lh.getBoundingClientRect().height;
    lh.remove();
    return {
      display: cs.display,
      height: n.getBoundingClientRect().height,
      line,
      pad: parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom),
    };
  });
  expect(m.display).toBe('block');
  expect(m.height).toBeCloseTo(m.line + m.pad, 0);
  expect(m.height).toBeLessThan(44);
});

test('truncated Table.CellLink still renders an ellipsis', async ({ page }) => {
  await page.goto('/components/table');
  const link = page.locator('td a[href="#"]').first();
  await link.evaluate((n) => {
    const td = n.parentElement as HTMLElement;
    td.style.maxWidth = '40px';
    td.style.whiteSpace = 'nowrap';
    td.style.overflow = 'hidden';
    n.style.cssText += ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    n.textContent = 'A very long link label that must truncate';
  });
  const m = await link.evaluate((n) => ({
    display: getComputedStyle(n).display,
    overflow: getComputedStyle(n).textOverflow,
    over: n.scrollWidth > n.clientWidth,
  }));
  expect(m).toEqual({ display: 'block', overflow: 'ellipsis', over: true });
});
