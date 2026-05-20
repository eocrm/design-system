import { useMemo } from 'react';
import { useLocale } from '../i18n/useLocale';
import {
  addDays,
  daysBetween,
  isSameMonth,
  isToday,
  isWeekend,
  startOfDay,
  toDateKey,
} from './dateMath';
import { formatRange } from './formatters';
import { getFirstDayOfWeek, getWeekendDays } from './weekInfo';
import type { Day } from './types';

/** Options for {@link useAgenda}. */
export interface UseAgendaOptions {
  /** Override the active locale. */
  locale?: string;
  /** Override the first day of the week. Defaults to `getFirstDayOfWeek(locale)`. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** Result shape returned by {@link useAgenda}. */
export interface AgendaResult {
  /** One `Day` per calendar day in `[from, to]`, inclusive at both ends. */
  days: readonly Day[];
  /** Localized range label spanning `from` to `to`. */
  rangeLabel: string;
}

/**
 * Returns one `Day` entry per calendar day in `[from, to]` (inclusive at both
 * ends). When `from > to` the result is a single-day agenda for `from` — pass
 * `from <= to` to the hook to get the intended range.
 *
 * Used by the future `<AgendaView>` to group events by day.
 */
export function useAgenda(from: Date, to: Date, options: UseAgendaOptions = {}): AgendaResult {
  const contextLocale = useLocale();
  const locale = options.locale ?? contextLocale;
  const weekStartsOn = options.weekStartsOn ?? getFirstDayOfWeek(locale);

  return useMemo(() => {
    const start = startOfDay(from);
    const end = startOfDay(to);
    const count = Math.max(0, daysBetween(start, end)) + 1;
    const weekendDays = getWeekendDays(locale);

    const days: Day[] = [];
    for (let i = 0; i < count; i++) {
      const date = addDays(start, i);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: isSameMonth(date, start),
        isToday: isToday(date),
        isWeekend: isWeekend(date, weekendDays),
        weekday: (date.getDay() - weekStartsOn + 7) % 7,
        key: toDateKey(date),
      });
    }

    return {
      days,
      rangeLabel: formatRange(start, end, locale),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.getTime(), to.getTime(), locale, weekStartsOn]);
}
