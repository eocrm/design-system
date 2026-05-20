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
import { getWeekendDays } from './weekInfo';
import type { Day } from './types';

export interface UseAgendaOptions {
  /** Override the active locale. */
  locale?: string;
}

export interface AgendaResult {
  /** One `Day` per calendar day in `[from, to]`, inclusive at both ends. */
  days: readonly Day[];
  /** Localized range label spanning `from` to `to`. */
  rangeLabel: string;
}

/**
 * Returns one `Day` entry per calendar day in `[from, to]` (inclusive).
 * Used by the future `<AgendaView>` to group events by day.
 */
export function useAgenda(from: Date, to: Date, options: UseAgendaOptions = {}): AgendaResult {
  const contextLocale = useLocale();
  const locale = options.locale ?? contextLocale;

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
        weekday: i,
        key: toDateKey(date),
      });
    }

    return {
      days,
      rangeLabel: formatRange(start, end, locale),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.getTime(), to.getTime(), locale]);
}
