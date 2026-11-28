// inlineCodeRule.ts — the `` `text` `` inline-code input rule for <RichTextEditor>.
// Pure: match a closing backtick the user is typing, then convert the span.
import type { RichDoc, Point, Range } from '../RichText/engine/model';
import { deleteRange, applyMark, removeMark } from '../RichText/engine/transforms';
import { CODE_EXCLUDED_MARKS } from './commands';

/**
 * Match `` `x…` `` ending at `caretOffset` in `blockText` (the text as it reads
 * WITH the just-typed closing backtick). The opening backtick must sit at the
 * block start or after whitespace; the content is non-empty, has no backtick and
 * doesn't start or end with a space. Returns the span incl. both backticks.
 *
 * @example
 * matchInlineCode('a `b`', 5); // { start: 2, end: 5 }
 */
export function matchInlineCode(
  blockText: string,
  caretOffset: number,
): { start: number; end: number } | null {
  const close = caretOffset - 1;
  if (blockText[close] !== '`') return null;
  const open = blockText.lastIndexOf('`', close - 1);
  if (open === -1 || (open > 0 && !/\s/.test(blockText[open - 1]))) return null;
  const content = blockText.slice(open + 1, close);
  if (!content || content.startsWith(' ') || content.endsWith(' ')) return null;
  return { start: open, end: caretOffset };
}

/**
 * Apply a match at `point` (the caret BEFORE the closing backtick is inserted, so
 * the doc holds only the opening one): drop the opening backtick and mark the
 * content `code`, stripping the marks code excludes. The closing backtick is
 * never inserted. Caret lands after the code.
 */
export function applyInlineCode(
  doc: RichDoc,
  point: Point,
  match: { start: number; end: number },
): { doc: RichDoc; selection: Range } {
  const { blockId } = point;
  let d = deleteRange(doc, {
    anchor: { blockId, offset: match.start },
    focus: { blockId, offset: match.start + 1 },
  }).doc;
  const end = { blockId, offset: point.offset - 1 };
  const span: Range = { anchor: { blockId, offset: match.start }, focus: end };
  for (const type of CODE_EXCLUDED_MARKS) d = removeMark(d, span, type).doc;
  d = applyMark(d, span, { type: 'code' }).doc;
  return { doc: d, selection: { anchor: end, focus: end } };
}
