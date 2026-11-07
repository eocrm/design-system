import { test, expect } from '@playwright/test';

/**
 * DS-35: `touch-hit-area` grows an xs/sm control's tap target to 44px with a
 * centred ::before. Next to a sibling closer than that overhang, the later
 * sibling's ::before paints over the earlier one's face and steals its taps
 * (Bold's right edge fired Italic). Library-owned dense groups instead grow
 * their controls to real 44px on coarse pointers. This sweep taps every
 * control's own face — centre and 2px inside each edge — and requires that
 * the control itself (or something inside it) is what receives the tap.
 */
const ROUTES = [
  '/components/rich-text-editor',
  '/components/calendar',
  '/components/button-group',
  '/components/code-block',
  '/components/relative-date-input',
  '/components/tabs',
];

for (const route of ROUTES) {
  test(`no control's face is covered by a sibling's hit area: ${route}`, async ({ page }) => {
    await page.goto(route);
    const stolen = await page.evaluate(() => {
      const sel = 'button, a[href], [role="button"], [role="radio"], [role="tab"]';
      const label = (e: Element) =>
        (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30);
      const out: string[] = [];
      for (const el of document.querySelectorAll(sel)) {
        if (el.getBoundingClientRect().width < 6) continue;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const points = [
          [cx, cy],
          [r.left + 2, cy],
          [r.right - 2, cy],
          [cx, r.top + 2],
          [cx, r.bottom - 2],
        ];
        for (const [x, y] of points) {
          const hit = document.elementFromPoint(x, y);
          if (!hit || el.contains(hit)) continue;
          const other = hit.closest(sel);
          if (other && !other.contains(el)) {
            out.push(`${label(el)} -> ${label(other)}`);
            break;
          }
        }
      }
      return out;
    });
    expect(stolen).toEqual([]);
  });
}
