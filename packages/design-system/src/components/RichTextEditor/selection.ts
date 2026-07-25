// selection.ts — map between the contentEditable DOM and model positions. All
// functions take the editable root element; block elements carry `data-block-id`.
import type { Point, Range } from '../RichText/engine/model';

/** Selector + predicate for atomic inline widgets (renderLink / renderMention
 *  substitutions): contentEditable=false nodes whose display text may differ from
 *  the `data-len` MODEL length they represent. */
const ATOMIC_WIDGET_SELECTOR = '[data-rich-link],[data-rich-mention]';
function isAtomicWidget(el: HTMLElement): boolean {
  return el.hasAttribute('data-rich-link') || el.hasAttribute('data-rich-mention');
}

/** The MODEL length an atomic widget (`[data-rich-link]` / `[data-rich-mention]`)
 *  represents. Falls back to its display-text length if `data-len` is
 *  missing/non-numeric (so a malformed widget degrades gracefully instead of
 *  poisoning the offset math with NaN). */
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
 * In editable mode renderDoc emits `<figure>` ONLY for attachment blocks and always
 * stamps `data-block-id`, so every `data-block-id` figure in the editor is an
 * attachment — the tag + attribute check is sufficient.
 */
function figureBlock(node: Node | null | undefined): HTMLElement | null {
  return node instanceof HTMLElement &&
    node.tagName === 'FIGURE' &&
    node.hasAttribute('data-block-id')
    ? node
    : null;
}

/** The first/last block element at or inside a root-level child node — the node
 *  itself when it IS a block, else its first/last `[data-block-id]` descendant
 *  (a `<ul>`/`<ol>` wrapper contains its `<li data-block-id>` items). Null for
 *  text/absent nodes. */
function blockWithin(node: Node | undefined, which: 'first' | 'last'): HTMLElement | null {
  if (!(node instanceof HTMLElement)) return null;
  if (node.hasAttribute('data-block-id')) return node;
  const all = node.querySelectorAll<HTMLElement>('[data-block-id]');
  return all.length > 0 ? all[which === 'first' ? 0 : all.length - 1] : null;
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
 * Atomic widgets (`[data-rich-link]` / `[data-rich-mention]`) are corrected for:
 * such a widget renders DISPLAY text (e.g. "#1 Task") but represents `data-len`
 * MODEL chars (e.g. the URL it links). `range.toString()` counts the display
 * text, so for every widget that lies fully before the range end we add
 * `data-len - displayLength`. When a block contains no atomic widget the
 * correction loop runs zero times, so this is an exact no-op for ordinary content.
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
  for (const w of blockEl.querySelectorAll<HTMLElement>(ATOMIC_WIDGET_SELECTOR)) {
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
    // Root-level caret beside ORDINARY blocks. This happens when the block the
    // selection lived in is removed from the DOM — e.g. a controlled external
    // value replacement (parent setDoc(emptyDoc())) swaps the block elements,
    // and the DOM collapses the live selection boundary to (root, childIndex).
    // Resolve to the start of the next block, else the end of the previous one.
    // Returning null here would make readSelection null, and the beforeinput
    // handler would cede the keystroke to the browser — which then mutates the
    // contentEditable DOM outside the model (raw text over the re-rendered
    // content, onChange stalled). See #321.
    const next = blockWithin(kids[offset], 'first');
    if (next) return { blockId: next.getAttribute('data-block-id')!, offset: 0 };
    const prev = blockWithin(kids[offset - 1], 'last');
    if (prev) {
      return {
        blockId: prev.getAttribute('data-block-id')!,
        // A void figure's only position is 0; a text block's end is its full
        // model length (widget-corrected by offsetWithinBlock).
        offset:
          prev.tagName === 'FIGURE' ? 0 : offsetWithinBlock(prev, prev, prev.childNodes.length),
      };
    }
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
  // Walk TEXT nodes and atomic widgets (`[data-rich-link]` / `[data-rich-mention]`),
  // accumulating model length: text → its char length, widget → `data-len` (NOT its
  // display text; we never descend into a widget). A widget is contenteditable=false,
  // so the caret can only sit adjacent to it — when `remaining` lands at a widget we
  // return a point in the widget's PARENT at the widget's child index (before)
  // or +1 (after), never inside it. With no widgets present this behaves exactly
  // like the previous text-only TreeWalker (FILTER_SKIP descends into mark spans).
  const walker = blockEl.ownerDocument.createTreeWalker(
    blockEl,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(n) {
        if (n instanceof HTMLElement && isAtomicWidget(n)) return NodeFilter.FILTER_ACCEPT; // the widget itself, atomic
        // Reject the widget's contents so the walk treats it as one opaque unit
        // (a TreeWalker descends into an ACCEPTED element, so we must REJECT its
        // descendants — REJECT skips the node AND its subtree, unlike SKIP).
        let p: Node | null = n.parentNode;
        while (p && p !== blockEl) {
          if (p instanceof HTMLElement && isAtomicWidget(p)) return NodeFilter.FILTER_REJECT;
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

/**
 * The viewport rect to anchor floating UI (the link editor) to the current DOM
 * selection. Prefers the selection's own rect; when that's degenerate — a collapsed
 * caret in an EMPTY block returns an all-zero rect — it falls back to the caret's
 * BLOCK element (the active line), so an anchored popover opens beside that line.
 * Only if there's no block (caret directly in root) does it fall back to `root`.
 * (The old root fallback used the editor's full height, which dropped the link
 * popover below the whole document — visible via `toolbar="auto"` + Link on an
 * empty composer.)
 */
export function selectionRect(root: HTMLElement): Rect {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    let r: DOMRect | null = null;
    try {
      r = range.getBoundingClientRect();
    } catch {
      // jsdom does not implement Range.getBoundingClientRect — fall through.
    }
    if (r && (r.width || r.height || r.top || r.left)) {
      return { top: r.top, left: r.left, width: r.width, height: r.height };
    }
    // Degenerate selection rect (e.g. collapsed caret in an empty block). Anchor to
    // the caret's block element (the active line), not the whole editor.
    const blockEl = blockElementFor(root, range.startContainer);
    if (blockEl) {
      const b = blockEl.getBoundingClientRect();
      return { top: b.top, left: b.left, width: b.width, height: b.height };
    }
  }
  const rr = root.getBoundingClientRect();
  return { top: rr.top, left: rr.left, width: 0, height: rr.height };
}

/**
 * The viewport rect of a MODEL range, re-derived from the DOM live. Unlike
 * `selectionRect` (which reads the window selection), this is independent of the
 * current selection — so a popover that has stolen focus (the link editor) can
 * still track its original anchor line on scroll by re-measuring on each
 * reposition. Returns null when the range can't be mapped to the DOM. Falls back
 * to the anchor's block element (the active line) when the range rect is
 * degenerate (a collapsed caret in an empty block).
 */
export function rangeRect(root: HTMLElement, range: Range): Rect | null {
  const a = pointToDom(root, range.anchor);
  const f = pointToDom(root, range.focus);
  if (!a || !f) return null;
  // Order the two boundary points by document position before building the DOM
  // range. A backward (right-to-left) model selection has its anchor AFTER its
  // focus; feeding setStart(anchor)/setEnd(focus) straight through would not throw —
  // the DOM clamps end-before-start to a COLLAPSED range, which measures as a zero
  // rect and would wrongly degrade to the block fallback below. Pick start = the
  // earlier point so the span rect is correct regardless of selection direction.
  const startFirst =
    a.node === f.node
      ? a.offset <= f.offset
      : !!(a.node.compareDocumentPosition(f.node) & Node.DOCUMENT_POSITION_FOLLOWING);
  const [s, e] = startFirst ? [a, f] : [f, a];
  const domRange = root.ownerDocument.createRange();
  try {
    domRange.setStart(s.node, s.offset);
    domRange.setEnd(e.node, e.offset);
  } catch {
    return null;
  }
  let r: DOMRect | null = null;
  try {
    r = domRange.getBoundingClientRect();
  } catch {
    // jsdom does not implement Range.getBoundingClientRect — fall through.
  }
  if (r && (r.width || r.height || r.top || r.left)) {
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }
  const blockEl = blockElementFor(root, a.node);
  if (blockEl) {
    const b = blockEl.getBoundingClientRect();
    return { top: b.top, left: b.left, width: b.width, height: b.height };
  }
  return null;
}
