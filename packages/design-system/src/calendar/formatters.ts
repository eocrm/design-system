const cache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    cache.set(key, f);
  }
  return f;
}

/**
 * "May 2026" / "Май 2026" — capitalized standalone month name + numeric year,
 * without the locale's era suffix.
 *
 * `Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' })` in some
 * locales (notably `ru-RU`) yields "май 2026 г." — lowercase genitive month
 * with an era marker. For calendar headers we want a nominative-cased
 * standalone month, so we format month and year separately and uppercase the
 * first character of the month with locale-aware casing.
 */
export function formatMonth(date: Date, locale: string): string {
  const month = getFormatter(locale, { month: 'long' }).format(date);
  const year = date.getFullYear();
  const capitalized = month.charAt(0).toLocaleUpperCase(locale) + month.slice(1);
  return `${capitalized} ${year}`;
}

/** "Mon" (Intl 'short' weekday). */
export function formatWeekdayShort(date: Date, locale: string): string {
  return getFormatter(locale, { weekday: 'short' }).format(date);
}

/** "M" (Intl 'narrow' weekday — for tight column headers). */
export function formatWeekdayNarrow(date: Date, locale: string): string {
  return getFormatter(locale, { weekday: 'narrow' }).format(date);
}

/** "Wed 20" */
export function formatDayShort(date: Date, locale: string): string {
  return getFormatter(locale, { weekday: 'short', day: 'numeric' }).format(date);
}

/** "Wednesday, May 20" */
export function formatDayLong(date: Date, locale: string): string {
  return getFormatter(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

/** "May 18 – 24, 2026" via Intl.DateTimeFormat#formatRange. */
export function formatRange(from: Date, to: Date, locale: string): string {
  return getFormatter(locale, { year: 'numeric', month: 'long', day: 'numeric' }).formatRange(
    from,
    to,
  );
}

/** "9 AM" / "09:00" — hour only, 12/24-hour determined by locale default. */
export function formatHour(hour: number, locale: string): string {
  const date = new Date(2000, 0, 1, hour);
  return getFormatter(locale, { hour: 'numeric' }).format(date);
}

/**
 * "9:00 AM" / "09:00" — hour + minute, suitable for event start times.
 * 12/24-hour determined by locale default.
 */
export function formatTime(date: Date, locale: string): string {
  return getFormatter(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
}

/** Test-only helper. Resets the formatter cache between tests. */
export function _resetFormatterCacheForTests(): void {
  cache.clear();
}
