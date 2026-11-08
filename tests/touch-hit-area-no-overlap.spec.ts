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
  '/components/password-input',
];

for (const route of ROUTES) {
  test(`no control's face is covered by a sibling's hit area: ${route}`, async ({ page }) => {
    await page.goto(route);
    const stolen = await page.evaluate(() => {
      const sel = 'button, a[href], [role="button"], [role="radio"], [role="tab"]';
      const label = (e: Element) =>
        (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30);
      const out: string[] = [];
      const controls = document.querySelectorAll(sel);
      if (controls.length === 0) out.push('no controls sampled');
      for (const el of controls) {
        if (el.getBoundingClientRect().width < 6) continue;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        const r = el.getBoundingClientRect();
        const input = el.parentElement?.querySelector('input');
        if (input && !input.contains(el)) {
          // The input's face must not be covered by the adornment button's hit area.
          const ir = input.getBoundingClientRect();
          const hit = document.elementFromPoint(ir.right - 2, ir.top + ir.height / 2);
          if (hit && hit !== input && el.contains(hit)) out.push(`${label(el)} covers input`);
        }
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
          if (!other || other.contains(el)) continue;
          // Calendar timed events in one slot cascade over each other on purpose
          // (demo data is relative to today, so this shows some weeks only). Only
          // a point inside the other event's own box is exempt; a ::before
          // overhang steal lands outside it and still counts.
          const cascaded = '[style*="--cal-block-left"]';
          const or = other.getBoundingClientRect();
          const insideOther = x >= or.left && x <= or.right && y >= or.top && y <= or.bottom;
          if (insideOther && el.matches(cascaded) && other.matches(cascaded)) continue;
          out.push(`${label(el)} -> ${label(other)}`);
          break;
        }
      }
      return out;
    });
    expect(stolen).toEqual([]);
  });
}
