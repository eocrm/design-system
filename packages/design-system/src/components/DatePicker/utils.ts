import { startOfDay, toDateKey } from '../../calendar/dateMath';

/** Format a `Date` for display in the input, locale-aware. */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Parse a user-typed date string into a local-midnight `Date`.
 *
 * Accepts:
 * - ISO `YYYY-MM-DD` (any locale — used as a fast path)
 * - Locale-formatted strings whose field order is determined by
 *   `getLocaleDateOrder(locale)` (e.g. `M/D/YYYY` for en-US,
 *   `D.M.YYYY` for ru-RU)
 * - Any single non-digit character as a field separator
 * - 2-digit years, pivoted to `2000 + yy`
 *
 * Returns `null` for empty / whitespace input, strings with the wrong
 * number of fields, and calendar-invalid dates (e.g. Feb 30).
 *
 * @see {@link ../../../docs/superpowers/specs/2026-05-21-datepicker-design.md} §Date parsing
 */
export function parseDate(raw: string, locale: string): Date | null {
  const str = raw.trim();
  if (str === '') return null;

  // ISO fast path — YYYY-MM-DD with optional leading zeros stripped.
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return makeDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  // Reject strings with alphabetic characters — they can't be valid
  // locale-formatted dates and would otherwise have alpha tokens absorbed
  // as separators by the split below (e.g. "5/21/2026/extra" → 3 chunks).
  if (/[a-zA-Z]/.test(str)) return null;

  const order = getLocaleDateOrder(locale);
  const chunks = str.split(/\D+/).filter(Boolean);
  if (chunks.length !== 3) return null;
  const map: Record<'year' | 'month' | 'day', number> = { year: 0, month: 0, day: 0 };
  for (let i = 0; i < 3; i++) {
    map[order[i]] = Number(chunks[i]);
  }
  // 2-digit year pivot at 2000 + n.
  if (map.year < 100) map.year += 2000;
  return makeDate(map.year, map.month, map.day);
}

/**
 * Order in which Intl renders year/month/day for `locale`.
 * en-US → `['month', 'day', 'year']`, ru-RU → `['day', 'month', 'year']`.
 * Falls back to `['year', 'month', 'day']` if Intl returns unexpected parts.
 */
export function getLocaleDateOrder(locale: string): readonly ('year' | 'month' | 'day')[] {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(2000, 0, 2));
  const order: ('year' | 'month' | 'day')[] = [];
  for (const p of parts) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day') {
      order.push(p.type);
    }
  }
  return order.length === 3 ? order : (['year', 'month', 'day'] as const);
}

/** ISO `YYYY-MM-DD` representation in local time. */
export function toIsoDate(date: Date): string {
  return toDateKey(date);
}

/**
 * True when `date` falls outside `[min, max]` (inclusive, day-granular)
 * or fails the `isDateDisabled` predicate.
 */
export function isDateOutOfRange(
  date: Date,
  min?: Date,
  max?: Date,
  isDateDisabled?: (date: Date) => boolean,
): boolean {
  const day = startOfDay(date).getTime();
  if (min && day < startOfDay(min).getTime()) return true;
  if (max && day > startOfDay(max).getTime()) return true;
  if (isDateDisabled && isDateDisabled(date)) return true;
  return false;
}

function makeDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  // Validate — `new Date(2024, 1, 30)` silently rolls over to March 2.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}
