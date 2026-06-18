// transforms.ts — Layer D. Document transforms. Pure + immutable; each returns
// { doc, selection } (the new doc + where the caret/selection should land).
import type { RichDoc, Block, Point, Range, Mark, MarkType } from './model';
import { createBlock } from './model';
import { normalizeInlines, sliceInlines, mapMarksOverRange } from './inlines';
import { withMark, withoutMark, hasMark } from './marks';
import { blockLength, findBlockIndex, orderedRange } from './position';

function collapsed(point: Point): Range {
  return { anchor: point, focus: point };
}

function replaceBlock(doc: RichDoc, index: number, block: Block): RichDoc {
  const blocks = doc.blocks.slice();
  blocks[index] = block;
  return { blocks };
}

/** Marks of the character immediately before `offset` (inherited on insert). */
function marksBefore(block: Block, offset: number): Mark[] {
  if (offset <= 0) return [];
  let pos = 0;
  for (const run of block.inlines) {
    const runEnd = pos + run.text.length;
    if (offset - 1 >= pos && offset - 1 < runEnd) return run.marks;
    pos = runEnd;
  }
  return [];
}

export function insertText(
  doc: RichDoc,
  point: Point,
  text: string,
): { doc: RichDoc; selection: Range } {
  if (text === '') return { doc, selection: collapsed(point) };
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return { doc, selection: collapsed(point) };
  const block = doc.blocks[idx];
  const inlines = normalizeInlines([
    ...sliceInlines(block.inlines, 0, point.offset),
    { text, marks: marksBefore(block, point.offset) },
    ...sliceInlines(block.inlines, point.offset, blockLength(block)),
  ]);
  return {
    doc: replaceBlock(doc, idx, { ...block, inlines }),
    selection: collapsed({ blockId: block.id, offset: point.offset + text.length }),
  };
}

export function deleteRange(doc: RichDoc, range: Range): { doc: RichDoc; selection: Range } {
  const { start, end } = orderedRange(doc, range);
  if (start.blockId === end.blockId && start.offset === end.offset) {
    return { doc, selection: collapsed(start) };
  }
  const si = findBlockIndex(doc, start.blockId);
  const ei = findBlockIndex(doc, end.blockId);
  if (si === -1 || ei === -1) return { doc, selection: collapsed(start) };
  const startBlock = doc.blocks[si];
  const endBlock = doc.blocks[ei];
  const inlines = normalizeInlines([
    ...sliceInlines(startBlock.inlines, 0, start.offset),
    ...sliceInlines(endBlock.inlines, end.offset, blockLength(endBlock)),
  ]);
  const blocks = doc.blocks.slice();
  blocks.splice(si, ei - si + 1, { ...startBlock, inlines });
  return {
    doc: { blocks },
    selection: collapsed({ blockId: startBlock.id, offset: start.offset }),
  };
}

export function splitBlock(doc: RichDoc, point: Point): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, point.blockId);
  if (idx === -1) return { doc, selection: collapsed(point) };
  const block = doc.blocks[idx];
  const left: Block = {
    ...block,
    inlines: normalizeInlines(sliceInlines(block.inlines, 0, point.offset)),
  };
  const rightInlines = normalizeInlines(
    sliceInlines(block.inlines, point.offset, blockLength(block)),
  );
  const right: Block = {
    ...createBlock(block.type, '', { level: block.level, depth: block.depth }),
    inlines: rightInlines,
  };
  const blocks = doc.blocks.slice();
  blocks.splice(idx, 1, left, right);
  return { doc: { blocks }, selection: collapsed({ blockId: right.id, offset: 0 }) };
}

export function mergeBlockBackward(
  doc: RichDoc,
  blockId: string,
): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx <= 0) return { doc, selection: collapsed({ blockId, offset: 0 }) };
  const prev = doc.blocks[idx - 1];
  const cur = doc.blocks[idx];
  const joinOffset = blockLength(prev);
  const inlines = normalizeInlines([...prev.inlines, ...cur.inlines]);
  const blocks = doc.blocks.slice();
  blocks.splice(idx - 1, 2, { ...prev, inlines });
  return { doc: { blocks }, selection: collapsed({ blockId: prev.id, offset: joinOffset }) };
}

function transformMarksOverRange(
  doc: RichDoc,
  range: Range,
  fn: (marks: Mark[]) => Mark[],
): { doc: RichDoc; selection: Range } {
  const { start, end } = orderedRange(doc, range);
  const si = findBlockIndex(doc, start.blockId);
  const ei = findBlockIndex(doc, end.blockId);
  if (si === -1 || ei === -1) return { doc, selection: range };
  const blocks = doc.blocks.slice();
  for (let i = si; i <= ei; i += 1) {
    const block = blocks[i];
    const from = i === si ? start.offset : 0;
    const to = i === ei ? end.offset : blockLength(block);
    if (to <= from) continue;
    blocks[i] = { ...block, inlines: mapMarksOverRange(block.inlines, from, to, fn) };
  }
  return { doc: { blocks }, selection: range };
}

export function applyMark(
  doc: RichDoc,
  range: Range,
  mark: Mark,
): { doc: RichDoc; selection: Range } {
  return transformMarksOverRange(doc, range, (m) => withMark(m, mark));
}

export function removeMark(
  doc: RichDoc,
  range: Range,
  type: MarkType,
): { doc: RichDoc; selection: Range } {
  return transformMarksOverRange(doc, range, (m) => withoutMark(m, type));
}

/** True iff every character in the (non-empty) range carries `type`. */
function rangeHasMarkEverywhere(doc: RichDoc, range: Range, type: MarkType): boolean {
  const { start, end } = orderedRange(doc, range);
  if (start.blockId === end.blockId && start.offset === end.offset) return false;
  const si = findBlockIndex(doc, start.blockId);
  const ei = findBlockIndex(doc, end.blockId);
  if (si === -1 || ei === -1) return false;
  for (let i = si; i <= ei; i += 1) {
    const block = doc.blocks[i];
    const from = i === si ? start.offset : 0;
    const to = i === ei ? end.offset : blockLength(block);
    if (to <= from) continue;
    let pos = 0;
    for (const run of block.inlines) {
      const rs = pos;
      const re = pos + run.text.length;
      pos = re;
      const f = Math.max(from, rs);
      const t = Math.min(to, re);
      if (t > f && !hasMark(run.marks, type)) return false;
    }
  }
  return true;
}

export function toggleMark(
  doc: RichDoc,
  range: Range,
  mark: Mark,
): { doc: RichDoc; selection: Range } {
  return rangeHasMarkEverywhere(doc, range, mark.type)
    ? removeMark(doc, range, mark.type)
    : applyMark(doc, range, mark);
}

export function setBlockType(
  doc: RichDoc,
  blockId: string,
  patch: Partial<Pick<Block, 'type' | 'level' | 'depth'>>,
): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed({ blockId, offset: 0 }) };
  const next: Block = { ...doc.blocks[idx], ...patch };
  if (next.type !== 'heading') delete next.level;
  if (next.type !== 'bullet_item' && next.type !== 'ordered_item') delete next.depth;
  return { doc: replaceBlock(doc, idx, next), selection: collapsed({ blockId, offset: 0 }) };
}
