const MS_PER_DAY = 86_400_000;

/** Return a new Date `n` days after `date`. Local-time anchored. Does not mutate `date`. */
export function addDays(date: Date, n: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

/**
 * Return a new Date `n` months after `date`. Clamps day-of-month onto shorter
 * target months (Jan 31 + 1 month → Feb 28/29). Does not mutate `date`.
 */
export function addMonths(date: Date, n: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + n);
  // Clamp day to the target month's last day (handles Jan 31 + 1m → Feb 28/29)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

/** Return a new Date `n` weeks after `date` (sugar for `addDays(date, n * 7)`). */
export function addWeeks(date: Date, n: number): Date {
  return addDays(date, n * 7);
}

/** Return a new Date with the same calendar day at local 00:00:00.000. */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Return the local-midnight start of the week containing `date`. `weekStartsOn`
 * is the column index of the locale's first-day-of-week (0 = Sunday, 1 = Monday).
 */
export function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date {
  const result = startOfDay(date);
  const delta = (result.getDay() - weekStartsOn + 7) % 7;
  result.setDate(result.getDate() - delta);
  return result;
}

/** Return the 1st of `date`'s month at local midnight. */
export function startOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  return result;
}

/** Return the last day of `date`'s month at local midnight (e.g., Jan 31, Feb 28/29). */
export function endOfMonth(date: Date): Date {
  // Day 0 of next month = last day of current month.
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** True when `a` and `b` fall on the same calendar day (ignores time component). */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** True when `a` and `b` fall in the same calendar month and year. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * True when `date` is today. Pass an explicit `now` for deterministic tests;
 * defaults to `new Date()`.
 */
export function isToday(date: Date, now: Date = new Date()): boolean {
  return isSameDay(date, now);
}

/**
 * True when `date.getDay()` is in `weekendDays` (e.g., `[0, 6]` for Sat/Sun
 * in most locales; `[5, 6]` for Fri/Sat in ar-SA / he-IL). Use
 * `getWeekendDays(locale)` to derive the array.
 */
export function isWeekend(date: Date, weekendDays: readonly number[]): boolean {
  return weekendDays.includes(date.getDay());
}

/**
 * Calendar-day difference between `a` and `b`. DST-safe — rounds to whole
 * days so the ±1 hour offset across a DST boundary doesn't shift the count.
 * Positive when `b` is after `a`.
 */
export function daysBetween(a: Date, b: Date): number {
  const startA = startOfDay(a).getTime();
  const startB = startOfDay(b).getTime();
  return Math.round((startB - startA) / MS_PER_DAY);
}

/** Return `'YYYY-MM-DD'` in local time. Zero-padded month and day. */
export function toDateKey(date: Date): string {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Parse a `'YYYY-MM-DD'` key (as produced by `toDateKey`) to a local-midnight Date. */
export function fromDateKey(key: string): Date {
  const [yyyy, mm, dd] = key.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}
