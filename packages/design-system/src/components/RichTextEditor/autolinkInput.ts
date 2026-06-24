// autolinkInput.ts — pure helpers the editor's beforeinput handler uses for
// autolink-on-type and atomic deletion of a resolved-link run. No DOM, no React.
import type { RichDoc, Range, Point } from '../RichText/engine/model';
import { findBlockIndex } from '../RichText/engine/position';
import { runsText } from '../RichText/engine/inlines';
import { insertText } from '../RichText/engine/transforms';
import { linkAt, setLink } from './links';
import { findUrl } from '../RichText/engine/autolink';

/**
 * When typing `boundary` (e.g. `' '`) at a collapsed caret, link the URL that
 * ends at the caret AND insert the boundary char — returning the combined
 * `{ doc, selection }` (caret after the boundary), or `null` when there's no URL
 * to link or the caret already sits in a link. The boundary char is inserted
 * BEFORE the link is applied, so it is never swept into the `<a>` (the URL run is
 * linked over `[start, end]`, excluding the boundary at `end`).
 */
export function applyTypeAutolink(
  doc: RichDoc,
  caret: Point,
  boundary: string,
): { doc: RichDoc; selection: Range } | null {
  const idx = findBlockIndex(doc, caret.blockId);
  if (idx === -1) return null;
  const text = runsText(doc.blocks[idx].inlines).slice(0, caret.offset);
  const found = findUrl(text);
  if (!found) return null;
  // Already linked? (caret inside/after an existing link) → skip.
  if (linkAt(doc, caret)) return null;
  // Insert the boundary first (so it carries no link mark), then link only the URL.
  const inserted = insertText(doc, caret, boundary);
  const range: Range = {
    anchor: { blockId: caret.blockId, offset: found.start },
    focus: { blockId: caret.blockId, offset: found.end },
  };
  const linked = setLink(inserted.doc, range, found.href);
  const after: Point = { blockId: caret.blockId, offset: caret.offset + boundary.length };
  return { doc: linked.doc, selection: { anchor: after, focus: after } };
}

/**
 * If the collapsed caret sits immediately AFTER (`backward`) or BEFORE
 * (`forward`) a link run that `isResolved(href)` accepts, return the whole-run
 * range to delete atomically, else `null`. Only fires at the run's exact edge so
 * a delete inside an editable plain link still removes one character.
 */
export function atomicLinkDeleteRange(
  doc: RichDoc,
  caret: Point,
  dir: 'backward' | 'forward',
  isResolved: (href: string) => boolean,
): Range | null {
  if (dir === 'backward') {
    if (caret.offset <= 0) return null;
    // Probe the char BEFORE the caret so we pick the link ENDING at the caret
    // (not a different link starting there, when two are adjacent).
    const at = linkAt(doc, { blockId: caret.blockId, offset: caret.offset - 1 });
    if (at && isResolved(at.href) && at.range.focus.offset === caret.offset) return at.range;
    return null;
  }
  // forward: the char AT the caret belongs to the link starting there.
  const at = linkAt(doc, { blockId: caret.blockId, offset: caret.offset });
  if (at && isResolved(at.href) && at.range.anchor.offset === caret.offset) return at.range;
  return null;
}
