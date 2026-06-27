// position.ts — Layer C. Point/range helpers over a RichDoc.
import type { RichDoc, Block, Point, Range } from './model';
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

/**
 * Clamp `point.offset` to the valid range `[0, blockLength]` for the block.
 * Returns `point` unchanged if the block is not found in `doc`.
 */
export function clampPoint(doc: RichDoc, point: Point): Point {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return point;
  const len = blockLength(doc.blocks[idx]);
  return { blockId: point.blockId, offset: Math.max(0, Math.min(point.offset, len)) };
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
