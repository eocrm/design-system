import { startOfDay } from '../../calendar/dateMath';

/** Format a `Date` for display in the input, locale-aware. */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Parse a user-typed date string into a local-midnight `Date`. See
 * Task 3 for the full contract; this stub returns `null` so Task 3's
 * failing tests reach the assertions.
 */
export function parseDate(_raw: string, _locale: string): Date | null {
  return null;
}

/**
 * Order in which Intl renders year/month/day for `locale`.
 * en-US → `['month', 'day', 'year']`, ru-RU → `['day', 'month', 'year']`.
 */
export function getLocaleDateOrder(_locale: string): readonly ('year' | 'month' | 'day')[] {
  return ['year', 'month', 'day'] as const;
}

/** ISO `YYYY-MM-DD` representation in local time. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
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
