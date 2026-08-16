// position.ts — Layer C. Point/range helpers over a RichDoc.
import type { RichDoc, Block, Point, Range, Mark } from './model';
import { runsLength } from './inlines';

/** Total character length of a block (sum of all inline run lengths). */
export function blockLength(block: Block): number {
  return runsLength(block.inlines);
}

/**
 * The `Range` spanning an entire block — `offset 0` to its full length. Returns
 * `null` when `blockId` is not found. Used by block-level actions (e.g. coloring
 * a whole block from the block menu) that target a block rather than an explicit
 * text selection.
 */
export function wholeBlockRange(doc: RichDoc, blockId: string): Range | null {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return null;
  const block = doc.blocks[idx];
  return {
    anchor: { blockId, offset: 0 },
    focus: { blockId, offset: blockLength(block) },
  };
}

/**
 * Returns the index of the block with `blockId` in `doc.blocks`, or `-1` if
 * not found. Used by transforms to locate blocks before mutation.
 */
export function findBlockIndex(doc: RichDoc, blockId: string): number {
  return doc.blocks.findIndex((b) => b.id === blockId);
}

/** Document order: -1 if a before b, 1 if after, 0 if equal. */
export function comparePoints(doc: RichDoc, a: Point, b: Point): -1 | 0 | 1 {
  if (a.blockId === b.blockId) {
    return a.offset < b.offset ? -1 : a.offset > b.offset ? 1 : 0;
  }
  const ia = findBlockIndex(doc, a.blockId);
  const ib = findBlockIndex(doc, b.blockId);
  return ia < ib ? -1 : ia > ib ? 1 : 0;
}

/**
 * The marks carried by the character immediately before `point` (raw — includes
 * `mention`). Empty (`[]`) at a block start (`offset <= 0`) or when the block is
 * not found. This primitive stays mark-agnostic; typing-inheritance paths use
 * {@link marksForTypedText}, which applies the exclusions.
 */
export function marksBeforeCaret(doc: RichDoc, point: Point): Mark[] {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1 || point.offset <= 0) return [];
  let pos = 0;
  for (const run of doc.blocks[idx].inlines ?? []) {
    const end = pos + run.text.length;
    if (point.offset - 1 >= pos && point.offset - 1 < end) return run.marks;
    pos = end;
  }
  return [];
}

/**
 * The marks carried by the character immediately AFTER `point` (raw, like
 * {@link marksBeforeCaret}). Empty (`[]`) at a block end, where no character
 * follows. Typing-inheritance paths pair it with `marksBeforeCaret` to tell a
 * caret INSIDE a run from one resting against its trailing edge.
 */
export function marksAfterCaret(doc: RichDoc, point: Point): Mark[] {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1 || point.offset < 0) return [];
  let pos = 0;
  for (const run of doc.blocks[idx].inlines ?? []) {
    const end = pos + run.text.length;
    if (point.offset >= pos && point.offset < end) return run.marks;
    pos = end;
  }
  return [];
}

/**
 * The marks text typed at `point` inherits — those of the preceding character,
 * minus the two that must not grow when the caret merely abuts them:
 * - `mention`, never (typed text never extends a mention chip);
 * - `link`, unless the FOLLOWING character carries the same href, i.e. the caret
 *   sits strictly inside the link rather than against its trailing edge.
 *
 * Without the `link` rule, typing after a link appends into the link's TEXT while
 * its href stays put. Under `renderLink` that is invisible — the widget renders
 * from the href — so the characters vanish and the caret appears frozen.
 *
 * The single source of this rule: both `insertText` and the editor's pending-mark
 * staging read it, so a mark toggled at a link's edge can't reinstate the link.
 */
export function marksForTypedText(doc: RichDoc, point: Point): Mark[] {
  const after = marksAfterCaret(doc, point);
  return marksBeforeCaret(doc, point).filter((m) => {
    if (m.type === 'mention') return false;
    if (m.type === 'link') return after.some((a) => a.type === 'link' && a.href === m.href);
    return true;
  });
}

/** A collapsed range at a single point. */
export function collapsedRange(blockId: string, offset = 0): Range {
  return { anchor: { blockId, offset }, focus: { blockId, offset } };
}

/** Returns `true` iff `range` is collapsed — anchor and focus point to the same position. */
export function isCollapsed(range: Range): boolean {
  return range.anchor.blockId === range.focus.blockId && range.anchor.offset === range.focus.offset;
}

/** Normalize a range so `start` ≤ `end` in document order. */
export function orderedRange(doc: RichDoc, range: Range): { start: Point; end: Point } {
  return comparePoints(doc, range.anchor, range.focus) <= 0
    ? { start: range.anchor, end: range.focus }
    : { start: range.focus, end: range.anchor };
}
