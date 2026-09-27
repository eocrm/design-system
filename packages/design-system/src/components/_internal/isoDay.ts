/**
 * Calendar days as ISO `'YYYY-MM-DD'` strings, formatted in UTC so the host
 * timezone can never shift a day (a booking's day belongs to the business's
 * timezone, not the browser's). Used by DateStrip.
 */
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `'2026-10-07'` → `Date` at 2026-10-07T00:00:00Z. Throws on anything else. */
export function parseIsoDay(iso: string): Date {
  const m = ISO_DAY.exec(iso);
  if (!m) throw new Error(`[isoDay] expected 'YYYY-MM-DD', got '${iso}'`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Format one ISO day in UTC. */
export function formatIsoDay(
  iso: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(parseIsoDay(iso));
}

/** Format a first..last ISO day range in UTC ("October 2026", "September – October 2026"). */
export function formatIsoRange(
  first: string,
  last: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const f = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
  return first === last
    ? f.format(parseIsoDay(first))
    : f.formatRange(parseIsoDay(first), parseIsoDay(last));
}
