// selection.ts — map between the contentEditable DOM and model positions. All
// functions take the editable root element; block elements carry `data-block-id`.
import type { Point, Range } from '../RichText/engine/model';

function blockElementFor(root: HTMLElement, node: Node): HTMLElement | null {
  let el: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.hasAttribute('data-block-id')) return el;
    el = el.parentNode;
  }
  return null;
}

/**
 * Character offset within `blockEl` of the DOM position `(node, offset)`. Works
 * for both text-node boundaries (offset = char index) and element-node
 * boundaries (offset = child index, e.g. a caret at an inline-element edge,
 * after a `<br>`, or a word/line selection) — the browser Selection API
 * produces both. Measured as the length of the text between the block start and
 * the point via a DOM Range, which counts only character data (so `<br>`,
 * empty blocks, and nested mark spans are all handled correctly).
 */
function offsetWithinBlock(blockEl: HTMLElement, node: Node, offset: number): number {
  const range = blockEl.ownerDocument.createRange();
  range.setStart(blockEl, 0);
  try {
    range.setEnd(node, offset);
  } catch {
    return 0; // node not inside blockEl (shouldn't happen) → block start
  }
  return range.toString().length;
}

/**
 * Map a DOM `(node, offset)` to a model `Point`, or `null` if outside any block.
 *
 * @param root - The contentEditable root element.
 * @param node - The DOM node from a `Selection` or `Range` boundary.
 * @param offset - Character offset within `node` (for text nodes) or child index
 *   (for element nodes, as the browser Selection API may return).
 * @returns The model `Point`, or `null` when `node` is not inside a block
 *   element with a `data-block-id` attribute.
 */
export function pointFromDom(root: HTMLElement, node: Node, offset: number): Point | null {
  const blockEl = blockElementFor(root, node);
  if (!blockEl) return null;
  return {
    blockId: blockEl.getAttribute('data-block-id')!,
    offset: offsetWithinBlock(blockEl, node, offset),
  };
}

/**
 * Map a model `Point` to a DOM `{ node, offset }` inside the editable root.
 *
 * @param root - The contentEditable root element.
 * @param point - The model position to locate in the DOM.
 * @returns `{ node, offset }` suitable for `Range.setStart`/`setEnd`, or `null`
 *   when the block is not found in the DOM (e.g. after an async re-render).
 */
export function pointToDom(root: HTMLElement, point: Point): { node: Node; offset: number } | null {
  const blockEl = root.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(point.blockId)}"]`);
  if (!blockEl) return null;
  const walker = blockEl.ownerDocument.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  let remaining = point.offset;
  let last: Text | null = null;
  let n = walker.nextNode() as Text | null;
  while (n) {
    const len = n.textContent?.length ?? 0;
    if (remaining <= len) return { node: n, offset: remaining };
    remaining -= len;
    last = n;
    n = walker.nextNode() as Text | null;
  }
  if (last) return { node: last, offset: last.textContent?.length ?? 0 };
  return { node: blockEl, offset: 0 }; // empty block (only a <br>)
}

/**
 * Read the current DOM selection as a model `Range`, or `null` if not inside `root`.
 *
 * @param root - The contentEditable root element.
 * @returns The model `Range`, or `null` when the selection is outside the root
 *   or the document has no selection.
 */
export function readSelection(root: HTMLElement): Range | null {
  const sel = root.ownerDocument.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !sel.focusNode) return null;
  if (!root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return null;
  const anchor = pointFromDom(root, sel.anchorNode, sel.anchorOffset);
  const focus = pointFromDom(root, sel.focusNode, sel.focusOffset);
  return anchor && focus ? { anchor, focus } : null;
}

/**
 * Set the DOM selection from a model `Range`.
 *
 * @param root - The contentEditable root element.
 * @param range - The model range to restore. When anchor === focus, sets a
 *   collapsed caret; otherwise extends the selection directionally.
 */
export function writeSelection(root: HTMLElement, range: Range): void {
  const sel = root.ownerDocument.getSelection();
  if (!sel) return;
  const a = pointToDom(root, range.anchor);
  const f = pointToDom(root, range.focus);
  if (!a || !f) return;
  const domRange = root.ownerDocument.createRange();
  domRange.setStart(a.node, a.offset);
  domRange.setEnd(a.node, a.offset);
  sel.removeAllRanges();
  sel.addRange(domRange);
  try {
    sel.extend(f.node, f.offset);
  } catch {
    // some environments (jsdom) have a partial Selection — collapsed caret is fine
  }
}
