// transforms.ts — Layer D. Document transforms. Pure + immutable; each returns
// { doc, selection } (the new doc + where the caret/selection should land).
import type { RichDoc, Block, Point, Range, Mark, MarkType } from './model';
import { createBlock, nextId } from './model';
import { normalizeInlines, sliceInlines, mapMarksOverRange, runsLength } from './inlines';
import { withMark, withoutMark, hasMark } from './marks';
import { blockLength, findBlockIndex, orderedRange, isCollapsed } from './position';

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
    if (offset - 1 >= pos && offset - 1 < runEnd) return [...run.marks];
    pos = runEnd;
  }
  return [];
}

/**
 * Pure/immutable. Insert `text` at `point`, inheriting the marks of the character
 * immediately before the cursor. Returns `{ doc, selection }` with the caret
 * placed after the inserted text. No-op (returns input unchanged) when `text` is
 * empty or `point.blockId` does not exist in `doc`.
 */
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

/**
 * Pure/immutable. Delete the content covered by `range`. If `range` is collapsed
 * (anchor === focus) returns `{ doc, selection }` unchanged — no-op. Cross-block
 * ranges merge the surviving text of the start and end blocks. Returns `{ doc,
 * selection }` with the caret at the deletion point.
 */
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

/**
 * Pure/immutable. Split the block at `point` into two blocks of the same type,
 * placing the caret at offset 0 of the new (right) block. Returns `{ doc,
 * selection }`. No-op (returns input) when `point.blockId` is not found.
 */
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

/**
 * Pure/immutable. Merge the block identified by `blockId` into the preceding
 * block, appending its inlines. Returns `{ doc, selection }` with the caret at the
 * join point. No-op (returns input) when `blockId` is the first block in the doc.
 */
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

/**
 * Pure/immutable. Apply `mark` to every character in `range`, splitting inline
 * runs at the boundaries as needed. Returns `{ doc, selection }` with the
 * original range preserved.
 */
export function applyMark(
  doc: RichDoc,
  range: Range,
  mark: Mark,
): { doc: RichDoc; selection: Range } {
  return transformMarksOverRange(doc, range, (m) => withMark(m, mark));
}

/**
 * Pure/immutable. Remove the mark of `type` from every character in `range`.
 * Returns `{ doc, selection }` with the original range preserved.
 */
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

/**
 * Pure/immutable. If every character in `range` already carries `mark.type`,
 * removes it (via `removeMark`); otherwise applies it (via `applyMark`). Returns
 * `{ doc, selection }` with the original range preserved.
 */
export function toggleMark(
  doc: RichDoc,
  range: Range,
  mark: Mark,
): { doc: RichDoc; selection: Range } {
  return rangeHasMarkEverywhere(doc, range, mark.type)
    ? removeMark(doc, range, mark.type)
    : applyMark(doc, range, mark);
}

/**
 * Pure/immutable. Patch the `type`, `level`, and/or `depth` of the block
 * identified by `blockId`. Cleans up irrelevant fields (`level` for non-headings,
 * `depth` for non-list blocks). Returns `{ doc, selection }` with the caret at
 * offset 0 of the block. No-op (returns input) when `blockId` is not found.
 */
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

/**
 * Pure/immutable. Insert a multi-block `fragment` at `range`, replacing any
 * selection, with the conventional paste merge: the fragment's first block
 * continues the current line and its last block rejoins the trailing text.
 * Returns `{ doc, selection }` with the caret at the join. An empty fragment is
 * a no-op (returns the input doc + a collapsed caret).
 */
export function insertFragment(
  doc: RichDoc,
  range: Range,
  fragment: RichDoc,
): { doc: RichDoc; selection: Range } {
  const frag = fragment.blocks;
  const fragEmpty = frag.length === 0 || (frag.length === 1 && blockLength(frag[0]) === 0);

  const base = isCollapsed(range) ? { doc, selection: range } : deleteRange(doc, range);
  const caret = base.selection.anchor;
  if (fragEmpty) return { doc: base.doc, selection: collapsed(caret) };

  const idx = findBlockIndex(base.doc, caret.blockId);
  if (idx === -1) return { doc: base.doc, selection: collapsed(caret) };
  const B = base.doc.blocks[idx];
  const left = sliceInlines(B.inlines, 0, caret.offset);
  const right = sliceInlines(B.inlines, caret.offset, blockLength(B));

  if (frag.length === 1) {
    const merged = normalizeInlines([...left, ...frag[0].inlines, ...right]);
    const offset = caret.offset + runsLength(frag[0].inlines);
    return {
      doc: replaceBlock(base.doc, idx, { ...B, inlines: merged }),
      selection: collapsed({ blockId: B.id, offset }),
    };
  }

  const first = frag[0];
  const last = frag[frag.length - 1];
  const middle = frag.slice(1, -1).map((b) => ({ ...b, id: nextId() }));
  const bleft: Block = { ...B, inlines: normalizeInlines([...left, ...first.inlines]) };
  const bright: Block = {
    ...last,
    id: nextId(),
    inlines: normalizeInlines([...last.inlines, ...right]),
  };
  const blocks = base.doc.blocks.slice();
  blocks.splice(idx, 1, bleft, ...middle, bright);
  return {
    doc: { blocks },
    selection: collapsed({ blockId: bright.id, offset: runsLength(last.inlines) }),
  };
}
