import { vi } from 'vitest';

/**
 * jsdom has no layout: `getClientRects()` is always empty, so every element
 * looks unrendered. Treat elements as rendered unless they (or an ancestor)
 * carry `hidden`. Restore with `vi.restoreAllMocks()`.
 */
export function stubClientRects() {
  return vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (this: Element) {
    return (this.closest('[hidden]') ? [] : [{}]) as unknown as DOMRectList;
  });
}
