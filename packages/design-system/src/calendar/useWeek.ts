import { useMemo } from 'react';
import { useLocale } from '../i18n/useLocale';
import { addDays, isToday, isWeekend, isSameMonth, startOfWeek, toDateKey } from './dateMath';
import { formatRange, formatWeekdayShort } from './formatters';
import { getFirstDayOfWeek, getWeekendDays } from './weekInfo';
import type { Day, Week } from './types';

export interface UseWeekOptions {
  /** Override the active locale. */
  locale?: string;
  /** Override the first day of the week. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export interface WeekResult {
  /** Localized range label, e.g., "May 18 – 24, 2026". */
  weekLabel: string;
  /** Seven days starting from the locale-determined (or overridden) week start. */
  days: Week;
  /** Length 7, display order. */
  weekdayLabels: readonly string[];
}

/**
 * Returns the 7-day week containing `anchor`, starting from the locale's
 * first-day-of-week. Useful for the future `<WeekView>` (7 columns × 24 hours).
 */
export function useWeek(anchor: Date, options: UseWeekOptions = {}): WeekResult {
  const contextLocale = useLocale();
  const locale = options.locale ?? contextLocale;
  const weekStartsOn = options.weekStartsOn ?? getFirstDayOfWeek(locale);

  return useMemo(() => {
    const start = startOfWeek(anchor, weekStartsOn);
    const weekendDays = getWeekendDays(locale);

    const days: Day[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: isSameMonth(date, anchor),
        isToday: isToday(date),
        isWeekend: isWeekend(date, weekendDays),
        weekday: i,
        key: toDateKey(date),
      });
    }

    const weekdayLabels = days.map((d) => formatWeekdayShort(d.date, locale));

    return {
      weekLabel: formatRange(start, days[6].date, locale),
      days: days as unknown as Week,
      weekdayLabels,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor.getTime(), locale, weekStartsOn]);
}
