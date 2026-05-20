type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Static fallbacks for when Intl.Locale.getWeekInfo is unavailable (older runtimes).
// firstDay: 0=Sun, 1=Mon (JS day numbering).
const FALLBACK_FIRST_DAY: Record<string, DayIndex> = {
  'en-US': 0,
  'en-CA': 0,
  'ja-JP': 0,
};

// weekend: arrays in JS day numbering (0=Sun, 6=Sat), sorted ascending.
const FALLBACK_WEEKEND: Record<string, readonly DayIndex[]> = {
  'ar-SA': [5, 6],
  'he-IL': [5, 6],
};

/**
 * Try `Intl.Locale(locale).getWeekInfo()`; return `undefined` if the API
 * is unavailable (older runtimes) or the locale throws.
 *
 * NOTE: getWeekInfo uses ISO weekday numbering (Mon=1…Sun=7).
 * We normalise to JS day numbering (Sun=0…Sat=6) via `isoDay % 7`.
 */
function tryWeekInfo(locale: string): { firstDay: DayIndex; weekend: readonly DayIndex[] } | undefined {
  try {
    const loc = new Intl.Locale(locale);
    const getWeekInfo = (loc as Intl.Locale & { getWeekInfo?: () => { firstDay: number; weekend: number[] } })
      .getWeekInfo;
    if (!getWeekInfo) return undefined;
    const info = getWeekInfo.call(loc);
    if (!info) return undefined;
    // Convert ISO weekday (1=Mon…7=Sun) → JS day (0=Sun…6=Sat)
    const firstDay = (info.firstDay % 7) as DayIndex;
    const weekend = info.weekend
      .map((d) => (d % 7) as DayIndex)
      .sort((a, b) => a - b);
    return { firstDay, weekend };
  } catch {
    return undefined;
  }
}

/**
 * Lookup `locale` in a fallback map first by exact tag (`en-US`), then by
 * primary language subtag (`en`), then return `defaultValue`.
 */
function lookup<T>(map: Record<string, T>, locale: string, defaultValue: T): T {
  if (locale in map) return map[locale];
  const primary = locale.split('-')[0];
  if (primary in map) return map[primary];
  return defaultValue;
}

/**
 * Returns the first day of the week for the given locale as a JS day index
 * (0=Sunday, 1=Monday, …, 6=Saturday).
 *
 * Uses `Intl.Locale.getWeekInfo()` when available; falls back to a static
 * table for well-known locales, then defaults to Monday (1).
 */
export function getFirstDayOfWeek(locale: string): DayIndex {
  const info = tryWeekInfo(locale);
  if (info !== undefined) {
    return info.firstDay;
  }
  return lookup(FALLBACK_FIRST_DAY, locale, 1);
}

/**
 * Returns the weekend days for the given locale as an array of JS day indices
 * (0=Sunday, 6=Saturday), sorted ascending.
 *
 * Uses `Intl.Locale.getWeekInfo()` when available; falls back to a static
 * table for well-known locales, then defaults to [0, 6] (Sat/Sun).
 */
export function getWeekendDays(locale: string): readonly DayIndex[] {
  const info = tryWeekInfo(locale);
  if (info !== undefined) {
    return info.weekend;
  }
  return lookup(FALLBACK_WEEKEND, locale, [0, 6]);
}
