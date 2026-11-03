import { test, expect } from '@playwright/test';

/**
 * #739: the `onImageActivate` <button> wrapper is layout-neutral. In a narrow
 * container a wide image still caps at the container width, `data-align`
 * centre/right still position it, and the figure height (baseline gap under the
 * image) matches the plain-<img> rendering. Layout geometry — jsdom can't see it.
 */
const measure = (page: import('@playwright/test').Page, id: string) =>
  page.getByTestId(id).evaluate(async (root: HTMLElement) => {
    root.style.width = '200px'; // the narrow container, test-side (no demo inline styles)
    const imgs = [...root.querySelectorAll('img')];
    await Promise.all(imgs.map((i) => i.decode().catch(() => {})));
    const rootBox = root.getBoundingClientRect();
    return imgs.map((img) => {
      const fig = img.closest('figure')!;
      const cs = getComputedStyle(fig);
      const f = fig.getBoundingClientRect();
      const i = img.getBoundingClientRect();
      const contentLeft = f.left + parseFloat(cs.paddingLeft);
      const contentRight = f.right - parseFloat(cs.paddingRight);
      return {
        align: fig.dataset.align ?? 'left',
        width: i.width,
        rootWidth: rootBox.width,
        leftGap: i.left - contentLeft,
        rightGap: contentRight - i.right,
        figureHeight: f.height,
        inButton: !!img.closest('button'),
      };
    });
  });

test('onImageActivate trigger keeps image width cap, alignment and baseline (#739)', async ({
  page,
}) => {
  await page.goto('/components/rich-text');
  const plain = await measure(page, 'rt-images-plain');
  const trig = await measure(page, 'rt-images-trigger');
  expect(trig.map((t) => t.align)).toEqual(['left', 'center', 'right']);
  expect(trig.every((t) => t.inButton)).toBe(true);
  expect(plain.some((p) => p.inButton)).toBe(false);

  for (const [k, t] of trig.entries()) {
    const label = `${t.align} image`;
    expect(t.width, `${label} fits the container`).toBeLessThanOrEqual(t.rootWidth + 0.5);
    expect(t.width, `${label} rendered`).toBeGreaterThan(0);
    if (t.align === 'center')
      expect(Math.abs(t.leftGap - t.rightGap), `${label} centred`).toBeLessThanOrEqual(1);
    if (t.align === 'right')
      expect(Math.abs(t.rightGap), `${label} flush right`).toBeLessThanOrEqual(1);
    if (t.align === 'left')
      expect(Math.abs(t.leftGap), `${label} flush left`).toBeLessThanOrEqual(1);
    // parity with the plain <img>
    expect(Math.abs(t.width - plain[k].width), `${label} width vs plain`).toBeLessThanOrEqual(1);
    expect(Math.abs(t.leftGap - plain[k].leftGap), `${label} x vs plain`).toBeLessThanOrEqual(1);
    expect(
      Math.abs(t.figureHeight - plain[k].figureHeight),
      `${label} baseline gap vs plain`,
    ).toBeLessThanOrEqual(1);
  }
  // the wide one actually exercised the cap
  expect(trig[0].width).toBeGreaterThan(150);
});
