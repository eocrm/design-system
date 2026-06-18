// marks.ts — Layer A. Pure helpers over a Mark[]. Never mutate inputs.
import type { Mark, MarkType } from './model';

/** Canonical key for set comparison (link distinguished by href). */
function markKey(m: Mark): string {
  return m.type === 'link' ? `link:${m.href}` : m.type;
}

/** Order-insensitive set equality (link href included). */
export function marksEqual(a: Mark[], b: Mark[]): boolean {
  if (a.length !== b.length) return false;
  const ka = a.map(markKey).sort();
  const kb = b.map(markKey).sort();
  return ka.every((k, i) => k === kb[i]);
}

export function hasMark(marks: Mark[], type: MarkType): boolean {
  return marks.some((m) => m.type === type);
}

/** Immutable add; replaces an existing mark of the same type (e.g. new link href). */
export function withMark(marks: Mark[], mark: Mark): Mark[] {
  return [...marks.filter((m) => m.type !== mark.type), mark];
}

export function withoutMark(marks: Mark[], type: MarkType): Mark[] {
  return marks.filter((m) => m.type !== type);
}

export function toggleMark(marks: Mark[], mark: Mark): Mark[] {
  return hasMark(marks, mark.type) ? withoutMark(marks, mark.type) : withMark(marks, mark);
}
