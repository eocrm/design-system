// blockUnit.ts — Layer D. Block-"unit" helpers + structural transforms. A unit is
// a single block, except a list item, which carries its deeper descendant run
// (the contiguous following items at greater effective depth). Pure + immutable.
import type { RichDoc, Block, Range } from './model';
import { createBlock, nextId, emptyDoc } from './model';
import { isListItem, effectiveDepths } from './listDepths';
import { findBlockIndex } from './position';

function collapsed(blockId: string, offset = 0): Range {
  return { anchor: { blockId, offset }, focus: { blockId, offset } };
}

/** Half-open index range `[start, end)` of the unit anchored at `index`. */
export function blockUnitRange(blocks: Block[], index: number): { start: number; end: number } {
  if (index < 0 || index >= blocks.length) return { start: index, end: index };
  if (!isListItem(blocks[index])) return { start: index, end: index + 1 };
  const eff = effectiveDepths(blocks);
  const d = eff[index];
  let end = index + 1;
  while (end < blocks.length && isListItem(blocks[end]) && eff[end] > d) end += 1;
  return { start: index, end };
}

/**
 * Index of the previous sibling's anchor (same effective depth, same list run),
 * or -1 when `index` is the first child / first block. Descendant blocks of an
 * earlier sibling (greater depth) are skipped.
 */
export function prevSiblingAnchor(blocks: Block[], index: number): number {
  const eff = effectiveDepths(blocks);
  const d = eff[index];
  for (let i = index - 1; i >= 0; i -= 1) {
    if (eff[i] < d) return -1; // hit an ancestor (or a depth-0 boundary for d>0)
    if (eff[i] === d && (d === 0 || isListItem(blocks[i]))) return i;
    // eff[i] > d → descendant of an earlier sibling: keep skipping
  }
  return -1;
}

/**
 * Swap the unit anchored at `blockId` with its adjacent SIBLING unit (`dir`: -1
 * up / +1 down). Same-depth swap, so depths are preserved. No-op (returns the
 * SAME doc reference) at an edge / when there is no sibling in that direction.
 */
export function moveBlockUnit(
  doc: RichDoc,
  blockId: string,
  dir: -1 | 1,
): { doc: RichDoc; selection: Range } {
  const blocks = doc.blocks;
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(blocks, idx);

  if (dir < 0) {
    const p = prevSiblingAnchor(blocks, idx);
    if (p === -1) return { doc, selection: collapsed(blockId) };
    const moving = blocks.slice(u.start, u.end);
    const before = blocks.slice(p, u.start);
    const next = [...blocks.slice(0, p), ...moving, ...before, ...blocks.slice(u.end)];
    return { doc: { blocks: next }, selection: collapsed(blockId) };
  }

  const eff = effectiveDepths(blocks);
  const d = eff[idx];
  if (u.end >= blocks.length || eff[u.end] !== d) return { doc, selection: collapsed(blockId) };
  const nextUnit = blockUnitRange(blocks, u.end);
  const moving = blocks.slice(u.start, u.end);
  const after = blocks.slice(u.end, nextUnit.end);
  const next = [...blocks.slice(0, u.start), ...after, ...moving, ...blocks.slice(nextUnit.end)];
  return { doc: { blocks: next }, selection: collapsed(blockId) };
}

/** Clone a block with a fresh id (inline runs copied so marks aren't shared). */
function cloneBlock(b: Block): Block {
  return { ...b, id: nextId(), inlines: b.inlines.map((r) => ({ ...r, marks: r.marks.slice() })) };
}

/**
 * Duplicate the unit anchored at `blockId`, inserting the clones immediately
 * after the unit. Fresh ids; depths preserved. Caret lands on the clone's anchor.
 */
export function duplicateBlockUnit(
  doc: RichDoc,
  blockId: string,
): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(doc.blocks, idx);
  const copies = doc.blocks.slice(u.start, u.end).map(cloneBlock);
  const blocks = [...doc.blocks.slice(0, u.end), ...copies, ...doc.blocks.slice(u.end)];
  return { doc: { blocks }, selection: collapsed(copies[0].id) };
}

/**
 * Remove the unit anchored at `blockId`. Empties to a single empty paragraph if
 * it was the whole document. Caret lands on the next surviving block, else the
 * previous, else the new empty paragraph.
 */
export function removeBlockUnit(doc: RichDoc, blockId: string): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(doc.blocks, idx);
  const blocks = [...doc.blocks.slice(0, u.start), ...doc.blocks.slice(u.end)];
  if (blocks.length === 0) {
    const fresh = emptyDoc();
    return { doc: fresh, selection: collapsed(fresh.blocks[0].id) };
  }
  const caretIdx = Math.min(u.start, blocks.length - 1);
  return { doc: { blocks }, selection: collapsed(blocks[caretIdx].id) };
}

/** Insert an empty paragraph directly after the block unit anchored at `blockId`. */
export function insertEmptyBlockBelow(
  doc: RichDoc,
  blockId: string,
): { doc: RichDoc; selection: Range } {
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(doc.blocks, idx);
  const fresh = createBlock('paragraph');
  const blocks = [...doc.blocks.slice(0, u.end), fresh, ...doc.blocks.slice(u.end)];
  return { doc: { blocks }, selection: collapsed(fresh.id) };
}

/**
 * Move the unit anchored at `blockId` so its first block lands at array index
 * `target` (coordinates of the CURRENT array). The moved unit's top depth is
 * clamped to a value valid for its new predecessor (`prevListDepth + 1`, else 0);
 * descendants shift by the same delta. No-op when `target` falls inside the unit.
 */
export function moveBlockUnitToIndex(
  doc: RichDoc,
  blockId: string,
  target: number,
): { doc: RichDoc; selection: Range } {
  const blocks = doc.blocks;
  const idx = findBlockIndex(doc, blockId);
  if (idx === -1) return { doc, selection: collapsed(blockId) };
  const u = blockUnitRange(blocks, idx);
  if (target > u.start && target < u.end) return { doc, selection: collapsed(blockId) };
  const moving = blocks.slice(u.start, u.end);
  const rest = [...blocks.slice(0, u.start), ...blocks.slice(u.end)];
  let insertAt = target > u.start ? target - moving.length : target;
  insertAt = Math.max(0, Math.min(insertAt, rest.length));
  // No movement (dropped back onto its own slot) → same doc ref, like moveBlockUnit's no-ops.
  if (insertAt === u.start) return { doc, selection: collapsed(blockId) };

  let adjusted = moving;
  if (isListItem(moving[0])) {
    const prev = insertAt - 1;
    // Clamp against the predecessor's EFFECTIVE depth (what the renderer shows),
    // consistent with the rest of the engine's depth reasoning.
    const effRest = effectiveDepths(rest);
    const prevDepth = prev >= 0 && isListItem(rest[prev]) ? effRest[prev] : -1;
    const maxDepth = prevDepth + 1;
    const topRaw = moving[0].depth ?? 0;
    const newTop = Math.max(0, Math.min(topRaw, maxDepth));
    const delta = newTop - topRaw;
    if (delta !== 0) {
      adjusted = moving.map((b) =>
        isListItem(b) ? { ...b, depth: Math.max(0, (b.depth ?? 0) + delta) } : b,
      );
    }
  }
  const next = [...rest.slice(0, insertAt), ...adjusted, ...rest.slice(insertAt)];
  return { doc: { blocks: next }, selection: collapsed(blockId) };
}
