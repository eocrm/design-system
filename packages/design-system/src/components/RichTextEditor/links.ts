// links.ts — pure link commands for <RichTextEditor>. No DOM, no React. Each
// command composes the engine's existing mark/text transforms; `setLink` covers
// the three link cases (selection / caret-in-link / caret-elsewhere). Safety of
// the stored href is enforced at render time by the engine's `safeHref`.
import type { RichDoc, Range, Point, Mark } from '../RichText/engine/model';
import { applyMark, removeMark, insertText } from '../RichText/engine/transforms';
import { findBlockIndex, blockLength, isCollapsed } from '../RichText/engine/position';

/** The link covering a point: its href and the full contiguous same-href range. */
export interface LinkAtResult {
  href: string;
  range: Range;
}

/**
 * The link at a (collapsed) point: its href and the full contiguous run of
 * characters sharing that exact href, or `null` when the point is not in a link.
 * The owning character is the one at `offset`, or the one before it when the
 * caret sits at the block's end (so a caret just after a link still resolves).
 */
export function linkAt(doc: RichDoc, point: Point): LinkAtResult | null {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return null;
  const block = doc.blocks[idx];
  const len = blockLength(block);
  // Per-character link href across the block (null where no link).
  const hrefs: (string | null)[] = [];
  for (const run of block.inlines) {
    const mark = run.marks.find((m) => m.type === 'link');
    const href = mark && mark.type === 'link' ? mark.href : null;
    for (let i = 0; i < run.text.length; i += 1) hrefs.push(href);
  }
  const probe = point.offset < len ? point.offset : point.offset - 1;
  if (probe < 0 || probe >= len) return null;
  const href = hrefs[probe];
  if (href === null) return null;
  let start = probe;
  while (start > 0 && hrefs[start - 1] === href) start -= 1;
  let end = probe + 1;
  while (end < len && hrefs[end] === href) end += 1;
  return {
    href,
    range: { anchor: { blockId: block.id, offset: start }, focus: { blockId: block.id, offset: end } },
  };
}

/** Remove the link mark over `range`. */
export function removeLink(doc: RichDoc, range: Range): { doc: RichDoc; selection: Range } {
  return removeMark(doc, range, 'link');
}

/**
 * Apply, update, or insert a link over `range`. Three cases, decided by
 * `isCollapsed` + `linkAt`:
 * 1. Non-collapsed selection → link it (replacing any existing href).
 * 2. Collapsed caret inside a link → re-link the link's full extent.
 * 3. Collapsed caret elsewhere → insert the href as linked text.
 * An empty/whitespace href removes an existing link (cases 1–2) or is a no-op
 * (case 3). `href` is trimmed but otherwise stored verbatim — `safeHref`
 * sanitizes at render time. Returns the `{ doc, selection }` commit payload.
 */
export function setLink(
  doc: RichDoc,
  range: Range,
  href: string,
): { doc: RichDoc; selection: Range } {
  const trimmed = href.trim();
  const collapsed = isCollapsed(range);

  if (trimmed === '') {
    if (!collapsed) return removeLink(doc, range);
    const existing = linkAt(doc, range.anchor);
    return existing ? removeLink(doc, existing.range) : { doc, selection: range };
  }

  const mark: Mark = { type: 'link', href: trimmed };

  // Case 1 — selection.
  if (!collapsed) return applyMark(doc, range, mark);

  // Case 2 — caret inside an existing link.
  const existing = linkAt(doc, range.anchor);
  if (existing) return applyMark(doc, existing.range, mark);

  // Case 3 — caret elsewhere: insert the href, then link the inserted span.
  const inserted = insertText(doc, range.anchor, trimmed);
  const linkedSpan: Range = {
    anchor: range.anchor,
    focus: { blockId: range.anchor.blockId, offset: range.anchor.offset + trimmed.length },
  };
  return applyMark(inserted.doc, linkedSpan, mark);
}
