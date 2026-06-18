// position.ts — Layer C. Point/range helpers over a RichDoc.
import type { RichDoc, Block, Point, Range } from './model';
import { runsLength } from './inlines';

export function blockLength(block: Block): number {
  return runsLength(block.inlines);
}

export function findBlockIndex(doc: RichDoc, blockId: string): number {
  return doc.blocks.findIndex((b) => b.id === blockId);
}

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

export function isCollapsed(range: Range): boolean {
  return range.anchor.blockId === range.focus.blockId && range.anchor.offset === range.focus.offset;
}

/** Normalize a range so `start` ≤ `end` in document order. */
export function orderedRange(doc: RichDoc, range: Range): { start: Point; end: Point } {
  return comparePoints(doc, range.anchor, range.focus) <= 0
    ? { start: range.anchor, end: range.focus }
    : { start: range.focus, end: range.anchor };
}
