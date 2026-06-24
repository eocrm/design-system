// autolinkInput.ts — pure helpers the editor's beforeinput handler uses for
// autolink-on-type and atomic deletion of a resolved-link run. No DOM, no React.
import type { RichDoc, Range, Point } from '../RichText/engine/model';
import { findBlockIndex } from '../RichText/engine/position';
import { runsText } from '../RichText/engine/inlines';
import { linkAt, setLink } from './links';
import { findUrl } from '../RichText/engine/autolink';

/**
 * When typing `boundary` (e.g. `' '`) at a collapsed caret, link the URL that
 * ends at the caret. Returns the linked `{ doc, selection }` with the caret kept
 * at the original position (the caller inserts the boundary char AFTER on the
 * linked doc), or `null` when there's no URL to link or the caret already sits in
 * a link. `_boundary` signals the triggering char (e.g. `' '`); the caller
 * sequences its insertion, so this helper only links.
 */
export function applyTypeAutolink(
  doc: RichDoc,
  caret: Point,
  _boundary: string,
): { doc: RichDoc; selection: Range } | null {
  const idx = findBlockIndex(doc, caret.blockId);
  if (idx === -1) return null;
  const text = runsText(doc.blocks[idx].inlines).slice(0, caret.offset);
  const found = findUrl(text);
  if (!found) return null;
  // Already linked? (caret inside/after an existing link) → skip.
  if (linkAt(doc, caret)) return null;
  const range: Range = {
    anchor: { blockId: caret.blockId, offset: found.start },
    focus: { blockId: caret.blockId, offset: found.end },
  };
  const linked = setLink(doc, range, found.href);
  // Caret returns to the original position; the boundary char is inserted by the
  // caller's normal insertText path AFTER this (the editor sequences them).
  return { doc: linked.doc, selection: { anchor: caret, focus: caret } };
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
  const probe: Point =
    dir === 'backward' ? caret : { blockId: caret.blockId, offset: caret.offset + 1 };
  const at = linkAt(doc, probe);
  if (!at || !isResolved(at.href)) return null;
  // Only when the caret is exactly at the run's edge (after it for backward,
  // before it for forward).
  if (dir === 'backward' && caret.offset !== at.range.focus.offset) return null;
  if (dir === 'forward' && caret.offset !== at.range.anchor.offset) return null;
  return at.range;
}
