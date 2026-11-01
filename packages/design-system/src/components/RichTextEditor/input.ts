// input.ts — map a contentEditable `beforeinput` (inputType + data) at a model
// Range to an engine transform. Pure: returns the new { doc, selection } or null
// (null = unsupported; the caller still preventDefaults format* etc.).
import type { RichDoc, Range, Point, Block } from '../RichText/engine/model';
import { emptyDoc } from '../RichText/engine/model';
import {
  insertText,
  deleteRange,
  splitBlock,
  mergeBlockBackward,
} from '../RichText/engine/transforms';
import { isCollapsed, blockLength, findBlockIndex } from '../RichText/engine/position';
import { runsText } from '../RichText/engine/inlines';
import { isVoidBlock } from '../RichText/engine/attachment';

/** The new document + caret/selection after an input, or `null` when unsupported. */
export type InputResult = { doc: RichDoc; selection: Range } | null;

function point(blockId: string, offset: number): Point {
  return { blockId, offset };
}

function collapsedAt(blockId: string, offset: number): Range {
  return { anchor: point(blockId, offset), focus: point(blockId, offset) };
}

function deleteBackward(doc: RichDoc, caret: Point): InputResult {
  if (caret.offset > 0) {
    return deleteRange(doc, { anchor: point(caret.blockId, caret.offset - 1), focus: caret });
  }
  return mergeBlockBackward(doc, caret.blockId);
}

function deleteForward(doc: RichDoc, caret: Point): InputResult {
  const idx = findBlockIndex(doc, caret.blockId);
  if (idx === -1) return null;
  if (caret.offset < blockLength(doc.blocks[idx])) {
    return deleteRange(doc, { anchor: caret, focus: point(caret.blockId, caret.offset + 1) });
  }
  const next = doc.blocks[idx + 1];
  return next ? mergeBlockBackward(doc, next.id) : null;
}

function wordBoundaryBackward(text: string, offset: number): number {
  let i = offset;
  while (i > 0 && /\s/.test(text[i - 1])) i -= 1;
  while (i > 0 && !/\s/.test(text[i - 1])) i -= 1;
  return i;
}

function wordBoundaryForward(text: string, offset: number): number {
  let i = offset;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  while (i < text.length && !/\s/.test(text[i])) i += 1;
  return i;
}

function deleteWord(doc: RichDoc, caret: Point, dir: 'backward' | 'forward'): InputResult {
  const idx = findBlockIndex(doc, caret.blockId);
  if (idx === -1) return null;
  const text = runsText(doc.blocks[idx].inlines);
  if (dir === 'backward') {
    if (caret.offset === 0) return mergeBlockBackward(doc, caret.blockId);
    const start = wordBoundaryBackward(text, caret.offset);
    return deleteRange(doc, { anchor: point(caret.blockId, start), focus: caret });
  }
  if (caret.offset >= text.length) {
    const next = doc.blocks[idx + 1];
    return next ? mergeBlockBackward(doc, next.id) : null;
  }
  const end = wordBoundaryForward(text, caret.offset);
  return deleteRange(doc, { anchor: caret, focus: point(caret.blockId, end) });
}

/**
 * Map a `beforeinput` event (inputType + data) at a model Range to an engine
 * transform. Pure: no DOM access, no side effects.
 *
 * @returns `{ doc, selection }` — the updated document + where the caret should
 *   land, or `null` when the inputType is unsupported (e.g. `formatBold`,
 *   `historyUndo`). The caller must `preventDefault()` and replay the result, or
 *   allow the event through when `null` is returned.
 *
 * @example
 * const result = applyInput(doc, range, e.inputType, e.data);
 * if (result) { e.preventDefault(); commit(result); }
 */
export function applyInput(
  doc: RichDoc,
  range: Range,
  inputType: string,
  data: string | null,
): InputResult {
  const collapsed = isCollapsed(range);
  switch (inputType) {
    case 'insertText':
    case 'insertReplacementText':
    case 'insertFromPaste': {
      const text = data ?? '';
      if (text === '') return null;
      if (!collapsed) {
        const del = deleteRange(doc, range);
        return insertText(del.doc, del.selection.anchor, text);
      }
      return insertText(doc, range.anchor, text);
    }
    case 'insertParagraph':
    case 'insertLineBreak': {
      if (!collapsed) {
        const del = deleteRange(doc, range);
        return splitBlock(del.doc, del.selection.anchor);
      }
      return splitBlock(doc, range.anchor);
    }
    case 'deleteContentBackward':
      return collapsed ? deleteBackward(doc, range.anchor) : deleteRange(doc, range);
    case 'deleteContentForward':
      return collapsed ? deleteForward(doc, range.anchor) : deleteRange(doc, range);
    case 'deleteWordBackward':
      return collapsed ? deleteWord(doc, range.anchor, 'backward') : deleteRange(doc, range);
    case 'deleteWordForward':
      return collapsed ? deleteWord(doc, range.anchor, 'forward') : deleteRange(doc, range);
    default:
      return null;
  }
}

/** Which side of a void block (attachment figure) the DOM caret sits on. */
export type VoidSide = 'before' | 'after';

/** voidDelete's result; `caretAfterVoid` = put the DOM caret AFTER the selection's
 *  void (a spot the model's single `{voidId, 0}` point can't name). */
export type VoidDeleteResult = (NonNullable<InputResult> & { caretAfterVoid?: boolean }) | null;

/**
 * Remove the block at `idx`, placing the caret where a `dir` delete continues:
 * forward → start of what follows, backward → end of what precedes (falling back
 * to the other side at a doc edge). A void target gets the caret before it when
 * approached forward, after it (`caretAfterVoid`) when approached backward.
 */
function removeAt(doc: RichDoc, idx: number, dir: 'backward' | 'forward'): VoidDeleteResult {
  const blocks = doc.blocks.filter((_, i) => i !== idx);
  if (blocks.length === 0) {
    const fresh = emptyDoc();
    return { doc: fresh, selection: collapsedAt(fresh.blocks[0].id, 0) };
  }
  // Candidates in order: the continuing side first, then the other.
  const ahead = blocks[idx];
  const behind = blocks[idx - 1];
  const order: [Block | undefined, 'start' | 'end'][] =
    dir === 'forward'
      ? [
          [ahead, 'start'],
          [behind, 'end'],
        ]
      : [
          [behind, 'end'],
          [ahead, 'start'],
        ];
  const [target, edge] = order.find(([b]) => b) as [Block, 'start' | 'end'];
  if (isVoidBlock(target)) {
    return {
      doc: { blocks },
      selection: collapsedAt(target.id, 0),
      caretAfterVoid: edge === 'end',
    };
  }
  return {
    doc: { blocks },
    selection: collapsedAt(target.id, edge === 'start' ? 0 : blockLength(target)),
  };
}

/**
 * Backspace / Delete with the caret beside a void block. The model has ONE
 * position per void (`{voidId, 0}`), so the DOM side decides:
 * - Backspace from AFTER, or Delete from BEFORE → remove the void.
 * - Backspace from BEFORE / Delete from AFTER → toward the neighboring block:
 *   another void is removed (caret between two images), an EMPTY text block is
 *   removed, otherwise the caret just moves into it (returns the SAME doc — the
 *   caller applies only the selection; no character is deleted).
 * Returns null when there is no neighbor in that direction (no-op).
 */
export function voidDelete(
  doc: RichDoc,
  voidId: string,
  side: VoidSide,
  dir: 'backward' | 'forward',
): VoidDeleteResult {
  const idx = findBlockIndex(doc, voidId);
  if (idx === -1) return null;
  if ((dir === 'backward') === (side === 'after')) return removeAt(doc, idx, dir);
  const nIdx = dir === 'backward' ? idx - 1 : idx + 1;
  const neighbor = doc.blocks[nIdx];
  if (!neighbor) return null;
  if (isVoidBlock(neighbor) || blockLength(neighbor) === 0) return removeAt(doc, nIdx, dir);
  return {
    doc,
    selection: collapsedAt(neighbor.id, dir === 'backward' ? blockLength(neighbor) : 0),
  };
}
