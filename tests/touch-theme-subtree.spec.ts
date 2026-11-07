import { test, expect } from '@playwright/test';

/**
 * DS-21 x DS-35: component token blocks re-declare on a `data-theme` subtree, so
 * the coarse-pointer overrides must too, or a Button inside the subtree would
 * fall back to its fine-pointer height and drop below the 44px touch floor.
 */
test('md Button inside a data-theme subtree stays at least 44px tall', async ({ page }) => {
  await page.goto('/components/button');
  const button = page.getByRole('button', { name: 'Primary', exact: true }).first();
  await button.evaluate((node) => {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-theme', 'dark');
    node.replaceWith(wrapper);
    wrapper.appendChild(node);
  });
  await expect(button.locator('xpath=..')).toHaveAttribute('data-theme', 'dark');
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});
