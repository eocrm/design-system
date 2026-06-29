// commands.ts — pure active-state derivation + command runners for the toolbar.
// Every runner composes the existing engine transforms; no new model logic.
import type {
  RichDoc,
  Block,
  Mark,
  MarkType,
  BlockType,
  Point,
  Range,
} from '../RichText/engine/model';
import { toggleMark, setBlockType, applyMark, removeMark } from '../RichText/engine/transforms';
import {
  orderedRange,
  findBlockIndex,
  blockLength,
  isCollapsed,
  marksBeforeCaret,
} from '../RichText/engine/position';
import { hasMark } from '../RichText/engine/marks';

/** The `{ doc, selection }` pair returned by every command runner. */
export type CommandResult = { doc: RichDoc; selection: Range };

const MARK_TYPES: MarkType[] = ['bold', 'italic', 'underline', 'strike', 'code', 'link'];

// Value-carrying color marks. Kept SEPARATE from MARK_TYPES (which drives the
// toolbar pressed-state path, where color must not appear) but flushed alongside
// them in applyExactMarks so a pending color survives the next keystroke.
const COLOR_FLUSH: MarkType[] = ['textColor', 'bgColor'];

function blocksInRange(doc: RichDoc, range: Range): { si: number; ei: number } {
  const { start, end } = orderedRange(doc, range);
  return { si: findBlockIndex(doc, start.blockId), ei: findBlockIndex(doc, end.blockId) };
}

/** Mark types of the character immediately before the caret (none at a block start). */
function marksAtCaret(doc: RichDoc, caret: Point): MarkType[] {
  return marksBeforeCaret(doc, caret).map((m) => m.type);
}

/**
 * Derives the set of mark types active across the selection (for toolbar pressed
 * state). Returns the intersection — only marks present on every character in
 * the range are considered "active."
 *
 * When the range is collapsed the function returns the marks of the character
 * immediately before the caret (what the next typed character would inherit).
 * When `pending` marks are supplied they override the caret-based look-up —
 * the user has toggled a mark at a collapsed caret before typing.
 *
 * @example
 * const marks = activeMarks(doc, range, null); // ['bold'] when all chars are bold
 * const marks = activeMarks(doc, range, [{ type: 'bold' }]); // pending override
 */
export function activeMarks(doc: RichDoc, range: Range, pending: Mark[] | null): MarkType[] {
  if (isCollapsed(range)) {
    return pending ? pending.map((m) => m.type) : marksAtCaret(doc, range.anchor);
  }
  const { start, end } = orderedRange(doc, range);
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return [];
  const out: MarkType[] = [];
  for (const type of MARK_TYPES) {
    let any = false;
    let all = true;
    for (let i = si; i <= ei && all; i += 1) {
      const block = doc.blocks[i];
      const from = i === si ? start.offset : 0;
      const to = i === ei ? end.offset : blockLength(block);
      // Skip a zero-length slice — incl. a void `attachment` (no `inlines`), which
      // would otherwise crash iterating undefined. Mirrors the transforms guard.
      if (to <= from) continue;
      let pos = 0;
      // `?? []` so the iteration is safe even if a caller hands a void block a
      // non-zero end offset (the `to <= from` skip already covers the editor path).
      for (const run of block.inlines ?? []) {
        const rs = pos;
        const re = pos + run.text.length;
        pos = re;
        const f = Math.max(from, rs);
        const t = Math.min(to, re);
        if (t > f) {
          any = true;
          if (!hasMark(run.marks, type)) {
            all = false;
            break;
          }
        }
      }
    }
    if (any && all) out.push(type);
  }
  return out;
}

/** The single color KEY active per color type across a selection. */
export interface ActiveColors {
  /** Palette key (e.g. `'red'`) shared by every char's `textColor`, else absent. */
  textColor?: string;
  /** Palette key shared by every char's `bgColor`, else absent. */
  bgColor?: string;
}

const COLOR_TYPES = ['textColor', 'bgColor'] as const;

/** The color KEY of `type` carried by `marks`, if any. */
function colorOf(marks: Mark[], type: 'textColor' | 'bgColor'): string | undefined {
  const m = marks.find((x) => x.type === type);
  return m && 'color' in m ? m.color : undefined;
}

/**
 * Derives the single color key active per color type across the selection (drives
 * the active badge ring in the color menu). For each of `textColor` / `bgColor`,
 * returns the key only when EVERY character in the range carries that type with
 * the SAME key — a mixed or partial color is omitted (so the menu shows "none
 * active").
 *
 * When the range is collapsed the function reads the marks of the character
 * immediately before the caret. When `pending` marks are supplied they override
 * the caret look-up — the user has staged a color at a collapsed caret before
 * typing. Mirrors {@link activeMarks}, but tracks the color value rather than
 * just mark presence.
 *
 * @example
 * activeColors(doc, range, null); // { textColor: 'red' } when all chars are red
 * activeColors(doc, range, [{ type: 'bgColor', color: 'blue' }]); // pending override
 */
export function activeColors(doc: RichDoc, range: Range, pending: Mark[] | null): ActiveColors {
  if (isCollapsed(range)) {
    const marks = pending ?? marksBeforeCaret(doc, range.anchor);
    const out: ActiveColors = {};
    for (const type of COLOR_TYPES) {
      const c = colorOf(marks, type);
      if (c !== undefined) out[type] = c;
    }
    return out;
  }
  const { start, end } = orderedRange(doc, range);
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return {};
  const out: ActiveColors = {};
  for (const type of COLOR_TYPES) {
    let any = false;
    let all = true;
    let color: string | undefined;
    for (let i = si; i <= ei && all; i += 1) {
      const block = doc.blocks[i];
      const from = i === si ? start.offset : 0;
      const to = i === ei ? end.offset : blockLength(block);
      // Skip a zero-length slice — incl. a void `attachment` (no `inlines`), which
      // would otherwise crash iterating undefined. Mirrors the transforms guard.
      if (to <= from) continue;
      let pos = 0;
      // `?? []` so the iteration is safe even if a caller hands a void block a
      // non-zero end offset (the `to <= from` skip already covers the editor path).
      for (const run of block.inlines ?? []) {
        const rs = pos;
        const re = pos + run.text.length;
        pos = re;
        const f = Math.max(from, rs);
        const t = Math.min(to, re);
        if (t > f) {
          any = true;
          const c = colorOf(run.marks, type);
          if (c === undefined || (color !== undefined && c !== color)) {
            all = false;
            break;
          }
          color = c;
        }
      }
    }
    if (any && all && color !== undefined) out[type] = color;
  }
  return out;
}

/**
 * Returns the block type (and heading level) shared by all blocks in the
 * selection, or `null` when the selection spans blocks of different types.
 *
 * @example
 * currentBlock(doc, range); // { type: 'heading', level: 2 }
 * currentBlock(doc, mixedRange); // null
 */
export function currentBlock(
  doc: RichDoc,
  range: Range,
): { type: BlockType; level?: 1 | 2 | 3 } | null {
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return null;
  const first = doc.blocks[si];
  for (let i = si; i <= ei; i += 1) {
    if (doc.blocks[i].type !== first.type || doc.blocks[i].level !== first.level) return null;
  }
  return first.level !== undefined
    ? { type: first.type, level: first.level }
    : { type: first.type };
}

/**
 * Toggle `mark` on/off over `range` using the engine's `toggleMark` transform.
 *
 * @example
 * const { doc, selection } = runToggleMark(doc, range, { type: 'bold' });
 */
export function runToggleMark(doc: RichDoc, range: Range, mark: Mark): CommandResult {
  return toggleMark(doc, range, mark);
}

/**
 * Apply `patch` (type / level / depth) to every block spanned by `range`,
 * preserving the original selection. Used by the block-type dropdown and
 * `runToggleList` / `runIndent`.
 *
 * @example
 * const { doc } = runSetBlock(doc, range, { type: 'heading', level: 2 });
 */
export function runSetBlock(
  doc: RichDoc,
  range: Range,
  patch: Partial<Pick<Block, 'type' | 'level' | 'depth'>>,
): CommandResult {
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return { doc, selection: range };
  let d = doc;
  for (let i = si; i <= ei; i += 1) {
    d = setBlockType(d, d.blocks[i].id, patch).doc;
  }
  return { doc: d, selection: range };
}

/**
 * Toggle a list type on/off for the selection. If every block in the range is
 * already `listType`, converts them all to `paragraph`; otherwise converts them
 * all to `listType` at depth 0.
 *
 * @example
 * const { doc } = runToggleList(doc, range, 'bullet_item');
 */
export function runToggleList(
  doc: RichDoc,
  range: Range,
  listType: 'bullet_item' | 'ordered_item',
): CommandResult {
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return { doc, selection: range };
  let allList = true;
  for (let i = si; i <= ei; i += 1) {
    if (doc.blocks[i].type !== listType) {
      allList = false;
      break;
    }
  }
  return runSetBlock(doc, range, allList ? { type: 'paragraph' } : { type: listType, depth: 0 });
}

/**
 * Indent (`dir: 'in'`) or outdent (`dir: 'out'`) every list item in the
 * selection by one level. Depth is clamped to a minimum of 0. Non-list blocks
 * are skipped silently.
 *
 * @example
 * const { doc } = runIndent(doc, range, 'in');  // increases nesting
 * const { doc } = runIndent(doc, range, 'out'); // decreases nesting (floor 0)
 */
export function runIndent(doc: RichDoc, range: Range, dir: 'in' | 'out'): CommandResult {
  const { si, ei } = blocksInRange(doc, range);
  if (si === -1 || ei === -1) return { doc, selection: range };
  let d = doc;
  for (let i = si; i <= ei; i += 1) {
    const b = d.blocks[i];
    if (b.type !== 'bullet_item' && b.type !== 'ordered_item') continue;
    const depth = Math.max(0, (b.depth ?? 0) + (dir === 'in' ? 1 : -1));
    d = setBlockType(d, b.id, { depth }).doc;
  }
  return { doc: d, selection: range };
}

/**
 * Force the marks of every character in `range` to exactly `marks`, used when
 * flushing pending marks on the next typed character. Each known mark type —
 * including the value-carrying `textColor`/`bgColor` — is applied if present in
 * `marks`, or removed if absent.
 *
 * @example
 * const newDoc = applyExactMarks(doc, span, [{ type: 'bold' }]);
 * // Pending color survives the next keystroke:
 * const colored = applyExactMarks(doc, span, [{ type: 'textColor', color: 'red' }]);
 */
export function applyExactMarks(doc: RichDoc, range: Range, marks: Mark[]): RichDoc {
  let d = doc;
  for (const type of [...MARK_TYPES, ...COLOR_FLUSH]) {
    const mark = marks.find((m) => m.type === type);
    d = mark ? applyMark(d, range, mark).doc : removeMark(d, range, type).doc;
  }
  return d;
}
