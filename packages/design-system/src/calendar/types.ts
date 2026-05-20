/**
 * A single calendar day. Produced by every Calendar primitive hook so consumer
 * components render a consistent shape regardless of view (month/week/day/agenda).
 */
export interface Day {
  /** Local midnight of this calendar day. Time component is always 00:00:00.000. */
  date: Date;
  /** 1..31. */
  dayOfMonth: number;
  /** False for trailing/leading days from adjacent months in a `useMonth` grid. */
  isCurrentMonth: boolean;
  isToday: boolean;
  /** Locale-aware — `[5, 6]` (Fri/Sat) for ar-SA/he-IL, `[0, 6]` (Sat/Sun) for most. */
  isWeekend: boolean;
  /** 0..6, where 0 is the locale's first-day-of-week. Useful for styling column position. */
  weekday: number;
  /** 'YYYY-MM-DD' in local time. Stable React key, comparison handle, event-lookup index. */
  key: string;
}

/** A full week, always seven `Day`s. */
export type Week = readonly [Day, Day, Day, Day, Day, Day, Day];

/** Result of `useMonth`. */
export interface MonthGrid {
  /** Calendar year of the anchor month (e.g., 2026). */
  year: number;
  /** 0..11, JS Date convention. */
  month: number;
  /** Localized month + year label, e.g., "May 2026" / "Май 2026". */
  monthLabel: string;
  /** Length 7, in display order (locale's first-day-of-week first). */
  weekdayLabels: readonly string[];
  /** 4–6 full weeks; leading/trailing days are filled from adjacent months. */
  weeks: readonly Week[];
}
