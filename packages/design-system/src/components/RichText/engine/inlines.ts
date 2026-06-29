// inlines.ts — Layer B. Pure helpers over an Inline[]. Never mutate inputs.
import type { Inline, Mark } from './model';
import { marksEqual } from './marks';

/**
 * Concatenate the text of all inline runs, discarding mark information. Tolerates a
 * missing `inlines` (a void block like `attachment` carries none) — a block with no
 * runs contributes no text.
 */
export function runsText(inlines: Inline[] | undefined): string {
  return (inlines ?? []).map((r) => r.text).join('');
}

/**
 * Total character count across all inline runs (sum of run text lengths). Tolerates a
 * missing `inlines` (void blocks like `attachment` carry none) → length 0, so the
 * caret/length math never crashes on an attachment-containing doc.
 */
export function runsLength(inlines: Inline[] | undefined): number {
  return (inlines ?? []).reduce((n, r) => n + r.text.length, 0);
}

/** Canonical form: adjacent equal-mark runs merged, empty runs dropped, ≥1 run. */
export function normalizeInlines(inlines: Inline[]): Inline[] {
  const out: Inline[] = [];
  for (const run of inlines) {
    if (run.text === '') continue;
    const last = out[out.length - 1];
    if (last && marksEqual(last.marks, run.marks)) {
      out[out.length - 1] = { text: last.text + run.text, marks: last.marks };
    } else {
      out.push({ text: run.text, marks: run.marks });
    }
  }
  return out.length === 0 ? [{ text: '', marks: [] }] : out;
}

/** Extract the character sub-range [start, end). Returns a normalized Inline[]. */
export function sliceInlines(inlines: Inline[], start: number, end: number): Inline[] {
  const out: Inline[] = [];
  let pos = 0;
  for (const run of inlines) {
    const runStart = pos;
    const runEnd = pos + run.text.length;
    pos = runEnd;
    const from = Math.max(start, runStart);
    const to = Math.min(end, runEnd);
    if (to > from) {
      out.push({ text: run.text.slice(from - runStart, to - runStart), marks: run.marks });
    }
  }
  return normalizeInlines(out);
}

/**
 * Apply `fn` to the mark set of every character in [start, end), splitting runs
 * at the boundaries. Characters outside the range keep their marks. Re-normalizes.
 */
export function mapMarksOverRange(
  inlines: Inline[],
  start: number,
  end: number,
  fn: (marks: Mark[]) => Mark[],
): Inline[] {
  const out: Inline[] = [];
  let pos = 0;
  for (const run of inlines) {
    const runStart = pos;
    const runEnd = pos + run.text.length;
    pos = runEnd;
    const from = Math.max(start, runStart);
    const to = Math.min(end, runEnd);
    if (to <= from) {
      out.push(run); // entirely outside the range
      continue;
    }
    if (from > runStart) out.push({ text: run.text.slice(0, from - runStart), marks: run.marks });
    out.push({ text: run.text.slice(from - runStart, to - runStart), marks: fn(run.marks) });
    if (to < runEnd) out.push({ text: run.text.slice(to - runStart), marks: run.marks });
  }
  return normalizeInlines(out);
}
