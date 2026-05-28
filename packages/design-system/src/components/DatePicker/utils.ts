import { startOfDay, toDateKey } from '../../calendar/dateMath';

/** Picker precision. `'day'` (default) is date-only; `'minute'` adds HH:mm. */
export type DateTimeGranularity = 'day' | 'minute';

/**
 * Display + parse cycle for hour values.
 *
 * - `'12'` — 12-hour clock with AM/PM (en-US, en-CA, …)
 * - `'24'` — 24-hour clock (ru-RU, de-DE, fr-FR, …)
 * - `'auto'` — derived from the locale via `Intl.DateTimeFormat`
 */
export type HourCycle = '12' | '24' | 'auto';

/**
 * Wall-clock time of day, 24-hour internal representation.
 *
 * `hours` is always 0–23 regardless of the chosen display cycle; the
 * 12-hour display in `<TimeField hourCycle="12">` is a presentation
 * concern that flips 0 ↔ 12 / 12 ↔ 12 at the boundary.
 */
export type TimeValue = { hours: number; minutes: number };

/**
 * Detect whether a locale prefers 12-hour or 24-hour time-of-day display.
 *
 * Samples `Intl.DateTimeFormat(locale, { hour: 'numeric' })` against an
 * afternoon hour — if the formatted result contains "am" / "pm" (case
 * insensitive), the locale is 12-hour; otherwise 24-hour.
 *
 * @example
 * getLocaleHourCycle('en-US'); // '12'
 * getLocaleHourCycle('ru-RU'); // '24'
 */
export function getLocaleHourCycle(locale: string): '12' | '24' {
  const sample = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).format(
    new Date(2000, 0, 1, 15),
  );
  return /am|pm/i.test(sample) ? '12' : '24';
}

/**
 * Resolve a {@link HourCycle} prop value to a concrete `'12'` / `'24'`.
 *
 * `'auto'` is resolved against the supplied locale; explicit `'12'` /
 * `'24'` pass through unchanged.
 */
export function resolveHourCycle(cycle: HourCycle, locale: string): '12' | '24' {
  return cycle === 'auto' ? getLocaleHourCycle(locale) : cycle;
}

/**
 * Format an hours + minutes pair for display.
 *
 * - `'24'` → zero-padded `HH:mm` (e.g. `09:00`, `14:30`)
 * - `'12'` → `h:mm AM/PM` with a one-digit hour when applicable and a
 *   zero-padded minute (e.g. `2:30 PM`, `12:00 AM`, `11:05 PM`)
 *
 * Internal hour `0` maps to `12 AM`, `12` to `12 PM`.
 */
export function formatTime(hours: number, minutes: number, cycle: '12' | '24'): string {
  const mm = String(minutes).padStart(2, '0');
  if (cycle === '24') return `${String(hours).padStart(2, '0')}:${mm}`;
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${mm} ${period}`;
}

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
 * @see {@link ../../../../../docs/superpowers/specs/2026-05-21-datepicker-design.md} §Date parsing
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

/**
 * Format a Date with date + time (locale-aware).
 *
 * The third arg controls the time portion:
 * - `'24'` (default, back-compat) → `HH:mm` zero-padded.
 * - `'12'` → `h:mm AM/PM` for en-US-style display.
 *
 * Callers omitting `cycle` preserve the pre-v2 24-hour output (matches
 * the native `<input type="time">` wire format used by hidden form
 * mirrors). The four pickers pass through their resolved {@link HourCycle}.
 */
export function formatDateTime(date: Date, locale: string, cycle: '12' | '24' = '24'): string {
  const datePart = formatDate(date, locale);
  const timePart = formatTime(date.getHours(), date.getMinutes(), cycle);
  return `${datePart} ${timePart}`;
}

/**
 * Parse a user-typed date+time string into a local Date.
 *
 * Accepts:
 * - ISO `YYYY-MM-DDTHH:mm` and `YYYY-MM-DD HH:mm`
 * - Locale-formatted date followed by a space and `HH:mm`
 * - Pure date (no time) → defaults to 00:00 — useful for partial typing
 *
 * Returns `null` for empty input, malformed time (`25:99`, etc.), or
 * date-parse failures. Single-digit hours and minutes are accepted via the
 * same chunking pattern as parseDate.
 */
export function parseDateTime(raw: string, locale: string): Date | null {
  const str = raw.trim();
  if (str === '') return null;

  // Split into date-part + time-part. ISO uses T; otherwise the last space
  // before HH:mm-shaped token. If no time-shaped tail, fall through to date-only.
  const timeMatch = str.match(/[T\s]([0-9]{1,2}):([0-9]{2})$/);
  if (timeMatch == null) {
    const dateOnly = parseDate(str, locale);
    if (dateOnly == null) return null;
    return dateOnly;
  }
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const datePart = str.slice(0, str.length - timeMatch[0].length).trim();
  const date = parseDate(datePart, locale);
  if (date == null) return null;
  return combineDateAndTime(date, hours, minutes);
}

/** ISO local datetime: `YYYY-MM-DDTHH:mm` (no TZ, no seconds). */
export function toIsoDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/** Replace `date`'s hours/minutes (zero seconds + ms). Returns a new Date. */
export function combineDateAndTime(date: Date, hours: number, minutes: number): Date {
  const out = new Date(date);
  out.setHours(hours, minutes, 0, 0);
  return out;
}

/** Format a Date as `HH:mm` for the `<TimeField>` text input's value. */
export function toTimeInputValue(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Parse a user-typed time string into `{ hours, minutes }`.
 *
 * Lenient — accepts both 24-hour and 12-hour AM/PM shapes:
 * - `"HH:mm"` / `"H:mm"` (colon-separated; minutes must be exactly 2 digits)
 * - `"HHmm"` / `"Hmm"` (digits only — auto-segments the trailing two as minutes)
 * - `"HH"` / `"H"` (hours-only; minutes default to `00`)
 * - `"h:mm AM/PM"` / `"h AM/PM"` / `"hmm AM/PM"` (12-hour with suffix —
 *   case-insensitive, optional space, optional periods in `"P.M."`)
 *
 * The 24-hour shapes are tried first; AM/PM matching is a fallback.
 * Internal output is always 24-hour. `12 AM` → `0`, `12 PM` → `12`.
 *
 * Leading and trailing whitespace are trimmed. Returns `null` for empty
 * input, out-of-range values (`24:00`, `12:60`, `13:00 PM`), or strings
 * that don't match any supported shape.
 *
 * @example
 * parseTime('14:30');    // { hours: 14, minutes: 30 }
 * parseTime('1430');     // { hours: 14, minutes: 30 }
 * parseTime('9');        // { hours: 9, minutes: 0 }
 * parseTime('2:30 PM');  // { hours: 14, minutes: 30 }
 * parseTime('230pm');    // { hours: 14, minutes: 30 }
 * parseTime('12am');     // { hours: 0, minutes: 0 }
 * parseTime('abc');      // null
 * parseTime('24:00');    // null
 * parseTime('13:00 PM'); // null
 */
export function parseTime(raw: string): { hours: number; minutes: number } | null {
  const str = raw.trim();
  if (str === '') return null;
  // With colon: "H:mm" or "HH:mm" — minutes must be exactly 2 digits.
  let m = str.match(/^([0-9]{1,2}):([0-9]{2})$/);
  if (m) {
    const h = Number(m[1]);
    const mm = Number(m[2]);
    return h <= 23 && mm <= 59 ? { hours: h, minutes: mm } : null;
  }
  // Digits only: 3 or 4 digits → auto-segment (last two are minutes).
  m = str.match(/^([0-9]{1,2})([0-9]{2})$/);
  if (m) {
    const h = Number(m[1]);
    const mm = Number(m[2]);
    return h <= 23 && mm <= 59 ? { hours: h, minutes: mm } : null;
  }
  // Hours only: 1 or 2 digits, minutes implied 00.
  m = str.match(/^([0-9]{1,2})$/);
  if (m) {
    const h = Number(m[1]);
    return h <= 23 ? { hours: h, minutes: 0 } : null;
  }
  // AM/PM with optional ":mm". Accepts "2:30 PM", "2:30PM", "2:30 P.M.",
  // "2 PM", "2pm", "12am", case-insensitive, optional period in "P.M.".
  m = str.match(/^([0-9]{1,2})(?::([0-9]{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)$/i);
  if (m) {
    const h12 = Number(m[1]);
    const mm = m[2] != null ? Number(m[2]) : 0;
    const isPm = /p/i.test(m[3]);
    if (h12 < 1 || h12 > 12 || mm > 59) return null;
    const h24 = (h12 % 12) + (isPm ? 12 : 0);
    return { hours: h24, minutes: mm };
  }
  // AM/PM with a digits-only hour+minute clump, e.g. "230pm" / "1230 a.m.".
  m = str.match(/^([0-9]{1,2})([0-9]{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)$/i);
  if (m) {
    const h12 = Number(m[1]);
    const mm = Number(m[2]);
    const isPm = /p/i.test(m[3]);
    if (h12 < 1 || h12 > 12 || mm > 59) return null;
    const h24 = (h12 % 12) + (isPm ? 12 : 0);
    return { hours: h24, minutes: mm };
  }
  return null;
}

/**
 * Round `{ hours, minutes }` to the nearest `stepMinutes`, clamped to
 * `[00:00, 23:59]`.
 *
 * Ties round UP (`Math.round` of `.5`), so 14:23 with `step=15` → 14:30,
 * not 14:15. `stepMinutes <= 1` returns the input unchanged (used by
 * `timeStep={1}` for "no rounding" mode).
 *
 * @example
 * roundTimeToStep(14, 23, 15);  // { hours: 14, minutes: 30 }
 * roundTimeToStep(14, 0, 15);   // { hours: 14, minutes: 0 }
 * roundTimeToStep(23, 59, 30);  // { hours: 23, minutes: 59 } — clamped
 * roundTimeToStep(9, 27, 1);    // { hours: 9, minutes: 27 } — no-op
 */
export function roundTimeToStep(
  hours: number,
  minutes: number,
  stepMinutes: number,
): { hours: number; minutes: number } {
  if (stepMinutes <= 1) return { hours, minutes };
  const total = hours * 60 + minutes;
  const rounded = Math.round(total / stepMinutes) * stepMinutes;
  const clamped = Math.min(rounded, 23 * 60 + 59);
  return { hours: Math.floor(clamped / 60), minutes: clamped % 60 };
}
