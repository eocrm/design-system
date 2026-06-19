// inputRules.ts — Markdown block input rules for <RichTextEditor>. Pure: match a
// marker typed at the start of a paragraph (the trigger is always a space) and
// apply the block conversion by composing existing engine transforms.
import type { RichDoc, BlockType, Range } from '../RichText/engine/model';
import { deleteRange, setBlockType } from '../RichText/engine/transforms';

/** The block change a matched rule applies. */
export interface BlockRuleChange {
  type: BlockType;
  level?: 1 | 2 | 3;
  depth?: number;
}
export interface BlockRuleMatch {
  change: BlockRuleChange;
  /** Number of leading marker chars to strip from the block. */
  markerLen: number;
}

/** Map an exact marker string to a block change, or null. */
function changeFor(before: string): BlockRuleChange | null {
  switch (before) {
    case '#':
      return { type: 'heading', level: 1 };
    case '##':
      return { type: 'heading', level: 2 };
    case '###':
      return { type: 'heading', level: 3 };
    case '-':
    case '*':
    case '+':
      return { type: 'bullet_item', depth: 0 };
    case '>':
      return { type: 'blockquote' };
    case '```':
      return { type: 'code_block' };
    default:
      return /^\d+[.)]$/.test(before) ? { type: 'ordered_item', depth: 0 } : null;
  }
}

/**
 * Match a block input rule. Fires only when `sourceType` is 'paragraph', the
 * `trigger` is a single space, and `before` (block start → caret) is exactly a
 * marker. Returns the block change + marker length, or null.
 */
export function matchBlockRule(
  sourceType: BlockType,
  before: string,
  trigger: string,
): BlockRuleMatch | null {
  if (sourceType !== 'paragraph' || trigger !== ' ') return null;
  const change = changeFor(before);
  return change ? { change, markerLen: before.length } : null;
}

/**
 * Apply a matched rule to the block: strip the marker prefix, then set the block
 * type (composing `deleteRange` + `setBlockType`). Returns the `{ doc, selection }`
 * commit payload with the caret at the block start.
 */
export function applyBlockRule(
  doc: RichDoc,
  blockId: string,
  match: BlockRuleMatch,
): { doc: RichDoc; selection: Range } {
  const stripped = deleteRange(doc, {
    anchor: { blockId, offset: 0 },
    focus: { blockId, offset: match.markerLen },
  });
  return setBlockType(stripped.doc, blockId, match.change);
}
