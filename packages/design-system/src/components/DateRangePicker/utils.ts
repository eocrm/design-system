import { startOfDay } from '../../calendar/dateMath';
import { formatDate, parseDate } from '../DatePicker/utils';

/** A complete date range. Both ends inclusive, day-granular. */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Order a pair of dates so the earlier one is `start` and the later one
 * is `end`. Day-granular comparison via `startOfDay`. Same-day input
 * returns both halves equal (single-day range).
 *
 * Returns identity references to the input `Date` objects, not copies.
 * Don't mutate the returned `start` / `end` — they're the same instances
 * the caller passed in.
 */
export function autoSwapRange(a: Date, b: Date): DateRange {
  if (startOfDay(a).getTime() <= startOfDay(b).getTime()) {
    return { start: a, end: b };
  }
  return { start: b, end: a };
}

/**
 * Format a `DateRange` for display: `${formatDate(start)} — ${formatDate(end)}`.
 * Single-day ranges still render both halves with the em dash for visual
 * consistency.
 */
export function formatDateRange(range: DateRange, locale: string): string {
  return `${formatDate(range.start, locale)} — ${formatDate(range.end, locale)}`;
}

/**
 * Parse a user-typed range string into a `DateRange`. See spec
 * `../../../../../docs/superpowers/specs/2026-05-21-daterange-picker-design.md`
 * §Date-range parsing.
 *
 * - Empty / whitespace → null.
 * - Splits on the first occurrence of any of: `—` (em dash, spaces
 *   optional), `–` (en dash, spaces optional), ` - ` (hyphen, spaces
 *   required to disambiguate from ISO `2026-05-21`), ` to ` (word,
 *   space-padded, case-insensitive).
 * - Each half parses via `parseDate(half, locale)`. If either fails, null.
 * - Out-of-order pairs are auto-swapped.
 */
export function parseDateRange(raw: string, locale: string): DateRange | null {
  const str = raw.trim();
  if (str === '') return null;

  // Try separators in order. Em / en dash characters cannot appear inside
  // a single locale-formatted date, so surrounding whitespace is optional
  // for those two. Hyphen requires spaces on both sides — bare `-` is a
  // valid date separator (ISO `2026-05-21`). The `to` word also requires
  // spaces to avoid matching inside locale month names.
  const separators: RegExp[] = [
    /\s*—\s*/, // em dash — spaces optional
    /\s*–\s*/, // en dash — spaces optional
    /\s+-\s+/, // hyphen — spaces required to disambiguate from ISO date hyphens
    /\s+to\s+/i, // word with spaces
  ];
  let parts: string[] | null = null;
  for (const sep of separators) {
    const split = str.split(sep);
    if (split.length === 2) {
      parts = split;
      break;
    }
  }
  if (!parts) return null;
  const [leftRaw, rightRaw] = parts;
  if (leftRaw.trim() === '' || rightRaw.trim() === '') return null;

  const left = parseDate(leftRaw, locale);
  const right = parseDate(rightRaw, locale);
  if (left == null || right == null) return null;
  return autoSwapRange(left, right);
}
