// input.ts — map a contentEditable `beforeinput` (inputType + data) at a model
// Range to an engine transform. Pure: returns the new { doc, selection } or null
// (null = unsupported; the caller still preventDefaults format* etc.).
import type { RichDoc, Range, Point } from '../RichText/engine/model';
import {
  insertText,
  deleteRange,
  splitBlock,
  mergeBlockBackward,
} from '../RichText/engine/transforms';
import { isCollapsed, blockLength, findBlockIndex } from '../RichText/engine/position';
import { runsText } from '../RichText/engine/inlines';

/** The new document + caret/selection after an input, or `null` when unsupported. */
export type InputResult = { doc: RichDoc; selection: Range } | null;

function point(blockId: string, offset: number): Point {
  return { blockId, offset };
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
