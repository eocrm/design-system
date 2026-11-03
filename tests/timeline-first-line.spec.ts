import { test, expect } from '@playwright/test';

/**
 * #738: the Timeline node centres on the item's FIRST LINE, not the top of a
 * node-tall box. Layout geometry, so jsdom can't see it. Every item on the demo
 * route, default + compact + a wrapping two-line header (line 1, not the block).
 */
const measure = (page: import('@playwright/test').Page, id: string) =>
  page.getByTestId(id).evaluate((ol) =>
    [...ol.children].map((li, i) => {
      const [gutter, content] = [...li.children] as HTMLElement[];
      const [nodeBox, connector] = [...gutter.children] as HTMLElement[];
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
      });
      const range = document.createRange();
      range.selectNodeContents(walker.nextNode()!);
      const rects = range.getClientRects();
      const line = rects[0];
      const node = nodeBox.getBoundingClientRect();
      const conn = connector.getBoundingClientRect();
      return {
        i,
        offset: node.top + node.height / 2 - (line.top + line.height / 2),
        lines: new Set([...rects].map((r) => Math.round(r.top))).size,
        // last item hides its connector (display:none → zero rect)
        connectorGap: getComputedStyle(connector).display === 'none' ? 0 : conn.top - node.bottom,
        nodeTop: node.top,
        connectorBottom: conn.bottom,
      };
    }),
  );

for (const id of ['timeline-default', 'timeline-compact', 'timeline-first-line']) {
  test(`${id}: node centres on each item's first line (#738)`, async ({ page }) => {
    await page.goto('/components/timeline');
    const items = await measure(page, id);
    expect(items.length).toBeGreaterThan(1);
    for (const [k, it] of items.entries()) {
      expect(Math.abs(it.offset), `item ${it.i} node-vs-line-1 centre`).toBeLessThanOrEqual(1);
      // the connector meets the node: starts at its bottom, no gap and no overlap
      expect(Math.abs(it.connectorGap), `item ${it.i} connector gap`).toBeLessThanOrEqual(1);
      // ...and the previous item's connector runs down to this node: no gap above a shifted node
      if (k > 0)
        expect(
          Math.abs(it.nodeTop - items[k - 1].connectorBottom),
          `item ${it.i} gap above node`,
        ).toBeLessThanOrEqual(1);
    }
    if (id === 'timeline-first-line') expect(items[1].lines).toBeGreaterThan(1); // the wrapping header
  });
}
