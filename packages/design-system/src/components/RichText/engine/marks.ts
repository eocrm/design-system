// marks.ts — Layer A. Pure helpers over a Mark[]. Never mutate inputs.
import type { Mark, MarkType } from './model';

/**
 * Inline-mark nesting order, outermost first. Shared by renderDoc + toHtml so
 * render and serialize nest identically. Color spans sit just inside link/mention
 * (so a colored link reads `<a><span style>…`) but outside the text-formatting tags.
 */
export const MARK_ORDER: MarkType[] = [
  'mention',
  'link',
  'textColor',
  'bgColor',
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
];

/** Canonical key for set comparison (link by href, mention by id+label, color by key). */
function markKey(m: Mark): string {
  if (m.type === 'link') return `link:${m.href}`;
  if (m.type === 'mention') return `mention:${m.id}:${m.label}`;
  if (m.type === 'textColor' || m.type === 'bgColor') return `${m.type}:${m.color}`;
  return m.type;
}

/** Order-insensitive set equality (link href included). */
export function marksEqual(a: Mark[], b: Mark[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  if (a.length === 1) return markKey(a[0]) === markKey(b[0]);
  const ka = a.map(markKey).sort();
  const kb = b.map(markKey).sort();
  return ka.every((k, i) => k === kb[i]);
}

/** Returns `true` iff `marks` contains a mark of the given `type`. */
export function hasMark(marks: Mark[], type: MarkType): boolean {
  return marks.some((m) => m.type === type);
}

/** Immutable add; replaces an existing mark of the same type (e.g. new link href). */
export function withMark(marks: Mark[], mark: Mark): Mark[] {
  return [...marks.filter((m) => m.type !== mark.type), mark];
}

/** Immutable remove; returns a new array with all marks of `type` filtered out. */
export function withoutMark(marks: Mark[], type: MarkType): Mark[] {
  return marks.filter((m) => m.type !== type);
}

/**
 * Immutable toggle: if `marks` already contains `mark.type`, removes it;
 * otherwise adds `mark` (replacing any existing mark of the same type).
 * Returns a new array — never mutates the input.
 */
export function toggleMark(marks: Mark[], mark: Mark): Mark[] {
  return hasMark(marks, mark.type) ? withoutMark(marks, mark.type) : withMark(marks, mark);
}
