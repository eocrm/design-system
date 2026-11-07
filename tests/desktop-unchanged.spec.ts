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

test('Table.CellLink grid layout keeps the block-layout desktop height and width', async ({
  page,
}) => {
  await page.goto('/components/table');
  const link = page.locator('td a[href="#"]').first();
  const grid = (await link.boundingBox())!;
  // Same element laid out as the pre-DS-35 `display: block`.
  await link.evaluate((n) => ((n as HTMLElement).style.display = 'block'));
  const block = (await link.boundingBox())!;
  expect(grid.height).toBe(block.height);
  expect(grid.width).toBe(block.width);
  expect(grid.height).toBeLessThan(44);
});
