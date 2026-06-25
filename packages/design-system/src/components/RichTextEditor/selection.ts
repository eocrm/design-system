// selection.ts — map between the contentEditable DOM and model positions. All
// functions take the editable root element; block elements carry `data-block-id`.
import type { Point, Range } from '../RichText/engine/model';

/** The MODEL length an atomic `[data-rich-link]` widget represents. Falls back to
 *  its display-text length if `data-len` is missing/non-numeric (so a malformed
 *  widget degrades gracefully instead of poisoning the offset math with NaN). */
function widgetLen(w: HTMLElement): number {
  const n = Number(w.dataset.len);
  return Number.isFinite(n) ? n : (w.textContent?.length ?? 0);
}

function blockElementFor(root: HTMLElement, node: Node): HTMLElement | null {
  let el: Node | null = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.hasAttribute('data-block-id')) return el;
    el = el.parentNode;
  }
  return null;
}

/**
 * A void attachment block element (`<figure data-block-id>`), or null. The
 * `data-block-id` guard is load-bearing: callers rely on it to safely read the id.
 * In this engine `<figure>` is emitted ONLY for attachment blocks (renderDoc), and
 * pasted external figures are dropped (fromHtml), so the tag check is sufficient.
 */
function figureBlock(node: Node | null | undefined): HTMLElement | null {
  return node instanceof HTMLElement &&
    node.tagName === 'FIGURE' &&
    node.hasAttribute('data-block-id')
    ? node
    : null;
}

/**
 * Character offset within `blockEl` of the DOM position `(node, offset)`. Works
 * for both text-node boundaries (offset = char index) and element-node
 * boundaries (offset = child index, e.g. a caret at an inline-element edge,
 * after a `<br>`, or a word/line selection) — the browser Selection API
 * produces both. Measured as the length of the text between the block start and
 * the point via a DOM Range, which counts only character data (so `<br>`,
 * empty blocks, and nested mark spans are all handled correctly).
 *
 * Atomic `[data-rich-link]` widgets are corrected for: such a widget renders
 * DISPLAY text (e.g. "#1 Task") but represents `data-len` MODEL chars (e.g. the
 * URL it links). `range.toString()` counts the display text, so for every widget
 * that lies fully before the range end we add `data-len - displayLength`. When a
 * block contains no `[data-rich-link]` the correction loop runs zero times, so
 * this is an exact no-op for ordinary content.
 */
function offsetWithinBlock(blockEl: HTMLElement, node: Node, offset: number): number {
  const doc = blockEl.ownerDocument;
  const range = doc.createRange();
  range.setStart(blockEl, 0);
  try {
    range.setEnd(node, offset);
  } catch {
    return 0; // node not inside blockEl (shouldn't happen) → block start
  }
  let len = range.toString().length;
  for (const w of blockEl.querySelectorAll<HTMLElement>('[data-rich-link]')) {
    // The widget's display text is included in `len` iff our range end is at or
    // past the point immediately AFTER the widget. Compare our range's END
    // boundary against a collapsed range positioned just after the widget:
    // compareBoundaryPoints(END_TO_END, afterW) returns where our END sits
    // relative to afterW's (collapsed) boundary — >= 0 means our end is at/after
    // the point just past the widget, so the whole widget falls within
    // [blockStart, (node,offset)] and we replace its display length with data-len.
    // (END_TO_END, not END_TO_START: the latter compares against afterW's START
    // and mis-classifies the exact-boundary case in jsdom.)
    const afterW = doc.createRange();
    afterW.setStartAfter(w);
    afterW.collapse(true);
    if (range.compareBoundaryPoints(Range.END_TO_END, afterW) >= 0) {
      const declared = widgetLen(w);
      const shown = w.textContent?.length ?? 0;
      len += declared - shown;
    }
  }
  return len;
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
  // Root-level caret (between blocks): if it sits at the boundary of a void
  // figure, resolve to that void's {id, 0}. (A void can't host an interior caret,
  // so the browser anchors the selection on the root around it.)
  if (node === root) {
    const kids = root.childNodes; // root Selection offsets count ALL child nodes
    // Prefer the figure just AFTER the caret (caret-before-next-node), else the
    // one just before it. `kids[-1]` (offset 0) is undefined → figureBlock null.
    const fig = figureBlock(kids[offset]) ?? figureBlock(kids[offset - 1]);
    if (fig) return { blockId: fig.getAttribute('data-block-id')!, offset: 0 };
  }
  const blockEl = blockElementFor(root, node);
  if (!blockEl) return null;
  // A void figure block has no text — its only position is offset 0. (A caret on a
  // figure descendant ascends to the figure via blockElementFor.)
  if (blockEl.tagName === 'FIGURE') {
    return { blockId: blockEl.getAttribute('data-block-id')!, offset: 0 };
  }
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
  // Void figure: the caret can't go inside — return a position just before it in
  // its parent (the editable root), so the browser shows an edge caret.
  if (blockEl.tagName === 'FIGURE') {
    const parent = blockEl.parentNode!;
    const index = Array.prototype.indexOf.call(parent.childNodes, blockEl);
    return { node: parent, offset: index };
  }
  // Walk TEXT nodes and atomic `[data-rich-link]` widgets, accumulating model
  // length: text → its char length, widget → `data-len` (NOT its display text;
  // we never descend into a widget). A widget is contenteditable=false, so the
  // caret can only sit adjacent to it — when `remaining` lands at a widget we
  // return a point in the widget's PARENT at the widget's child index (before)
  // or +1 (after), never inside it. With no widgets present this behaves exactly
  // like the previous text-only TreeWalker (FILTER_SKIP descends into mark spans).
  const walker = blockEl.ownerDocument.createTreeWalker(
    blockEl,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(n) {
        if (n instanceof HTMLElement && n.hasAttribute('data-rich-link'))
          return NodeFilter.FILTER_ACCEPT; // the widget itself, atomic
        // Reject the widget's contents so the walk treats it as one opaque unit
        // (a TreeWalker descends into an ACCEPTED element, so we must REJECT its
        // descendants — REJECT skips the node AND its subtree, unlike SKIP).
        let p: Node | null = n.parentNode;
        while (p && p !== blockEl) {
          if (p instanceof HTMLElement && p.hasAttribute('data-rich-link'))
            return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        if (n.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP; // descend into ordinary inline elements
      },
    },
  );
  let remaining = point.offset;
  let last: Text | null = null;
  let n = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n as Text;
      const len = t.textContent?.length ?? 0;
      if (remaining <= len) return { node: t, offset: remaining };
      remaining -= len;
      last = t;
    } else {
      const w = n as HTMLElement;
      const parent = w.parentNode!;
      const index = Array.prototype.indexOf.call(parent.childNodes, w);
      const declared = widgetLen(w);
      // At the widget's leading edge → caret just before it.
      if (remaining <= 0) return { node: parent, offset: index };
      // Inside the widget's model span (incl. its trailing edge) → caret after it.
      if (remaining <= declared) return { node: parent, offset: index + 1 };
      remaining -= declared;
      last = null; // can't anchor a leftover offset to a non-text widget
    }
    n = walker.nextNode();
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

/** A viewport rect (subset of DOMRect) used to anchor floating UI to a selection. */
export type Rect = { top: number; left: number; height: number; width: number };

/** The viewport rect of the current DOM selection, falling back to `root`. */
export function selectionRect(root: HTMLElement): Rect {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (sel && sel.rangeCount > 0) {
    let r: DOMRect | null = null;
    try {
      r = sel.getRangeAt(0).getBoundingClientRect();
    } catch {
      // jsdom does not implement Range.getBoundingClientRect — fall through.
    }
    if (r && (r.width || r.height || r.top || r.left)) {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
  }
  const rr = root.getBoundingClientRect();
  return { top: rr.top, left: rr.left, width: 0, height: rr.height };
}
