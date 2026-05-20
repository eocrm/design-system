import { useMemo } from 'react';
import { useLocale } from '../i18n/useLocale';
import {
  addDays,
  isSameMonth,
  isToday,
  isWeekend,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from './dateMath';
import { formatMonth, formatWeekdayShort } from './formatters';
import { getFirstDayOfWeek, getWeekendDays } from './weekInfo';
import type { Day, MonthGrid, Week } from './types';

export interface UseMonthOptions {
  /** Override the active locale. Defaults to `useLocale()`. */
  locale?: string;
  /** Override the first day of the week. Defaults to `getFirstDayOfWeek(locale)`. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Returns the month grid containing `anchor`, with leading/trailing days from
 * adjacent months so every week has exactly 7 days. Locale-aware month label,
 * weekday header labels, and first-day-of-week.
 *
 * The result is `useMemo`-stable across re-renders for the same
 * `(anchor.getTime(), locale, weekStartsOn)`.
 */
export function useMonth(anchor: Date, options: UseMonthOptions = {}): MonthGrid {
  const contextLocale = useLocale();
  const locale = options.locale ?? contextLocale;
  const weekStartsOn = options.weekStartsOn ?? getFirstDayOfWeek(locale);

  return useMemo(() => {
    const anchorMonth = startOfMonth(anchor);
    const gridStart = startOfWeek(anchorMonth, weekStartsOn);
    const weekendDays = getWeekendDays(locale);

    const weeks: Week[] = [];
    let cursor = gridStart;
    for (let w = 0; w < 6; w++) {
      const week: Day[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(cursor);
        week.push({
          date,
          dayOfMonth: date.getDate(),
          isCurrentMonth: isSameMonth(date, anchor),
          isToday: isToday(date),
          isWeekend: isWeekend(date, weekendDays),
          weekday: d,
          key: toDateKey(date),
        });
        cursor = addDays(cursor, 1);
      }
      weeks.push(week as unknown as Week);
      const lastDay = week[6];
      if (lastDay.date >= anchorMonth && !isSameMonth(lastDay.date, anchor)) {
        break;
      }
    }

    const weekdayLabels: string[] = [];
    for (let d = 0; d < 7; d++) {
      weekdayLabels.push(formatWeekdayShort(addDays(gridStart, d), locale));
    }

    return {
      year: anchor.getFullYear(),
      month: anchor.getMonth(),
      monthLabel: formatMonth(anchor, locale),
      weekdayLabels,
      weeks,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor.getTime(), locale, weekStartsOn]);
}
