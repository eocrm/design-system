import { useMemo } from 'react';
import { useLocale } from '../i18n/useLocale';
import { isToday, isWeekend, startOfDay, toDateKey } from './dateMath';
import { formatDayLong, formatDayShort } from './formatters';
import { getFirstDayOfWeek, getWeekendDays } from './weekInfo';
import type { Day } from './types';

/** Options for {@link useDay}. */
export interface UseDayOptions {
  /** Override the active locale. */
  locale?: string;
}

/** Result shape returned by {@link useDay}. */
export interface DayResult {
  day: Day;
  /** "Wednesday, May 20" */
  dayLabel: string;
  /** "Wed 20" */
  dayShortLabel: string;
}

/**
 * Returns the canonical `Day` for `date` plus localized labels. Used by
 * the future `<DayView>` (1 column × 24 hours).
 */
export function useDay(date: Date, options: UseDayOptions = {}): DayResult {
  const contextLocale = useLocale();
  const locale = options.locale ?? contextLocale;

  return useMemo(() => {
    const normalized = startOfDay(date);
    const weekendDays = getWeekendDays(locale);
    const weekStartsOn = getFirstDayOfWeek(locale);
    const day: Day = {
      date: normalized,
      dayOfMonth: normalized.getDate(),
      isCurrentMonth: true,
      isToday: isToday(normalized),
      isWeekend: isWeekend(normalized, weekendDays),
      weekday: (normalized.getDay() - weekStartsOn + 7) % 7,
      key: toDateKey(normalized),
    };
    return {
      day,
      dayLabel: formatDayLong(normalized, locale),
      dayShortLabel: formatDayShort(normalized, locale),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.getTime(), locale]);
}
