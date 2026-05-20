import { useMemo } from 'react';
import { useWeek } from '../../calendar/useWeek';
import { useLocale } from '../../i18n/useLocale';
import { formatWeekdayShort } from '../../calendar/formatters';
import { AllDayBand } from './AllDayBand';
import { HourGrid, HOUR_GUTTER_WIDTH } from './HourGrid';
import { layoutEventsForHourGrid } from './utils';
import type { CalendarEvent, RenderEvent } from './types';
import styles from './WeekView.module.scss';

export interface WeekViewProps {
  /** Navigation cursor — any date in the target week works. */
  cursor: Date;
  /** Events to display across the week. */
  events: readonly CalendarEvent[];
  /** Inclusive start, exclusive end of the visible hour range. */
  hourRange: readonly [number, number];
  /** Pixel height per hour row. */
  hourRowHeight: number;
  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Override locale-derived first day of week (0=Sun..6=Sat). */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Fires when a timed-event block or all-day chip is clicked. */
  onEventClick?: (event: CalendarEvent) => void;
  /** Fires when empty hour-grid space inside a day column is clicked, with that column's date. */
  onDayClick?: (date: Date) => void;
  /** Optional custom event renderer (see `RenderEvent`). */
  renderEvent?: RenderEvent;
  /** Override the "now" clock for the now-line. For tests; defaults to `new Date()`. */
  now?: Date;
}

/**
 * Internal: 7-day hour grid. Shows the week containing `cursor`, with an
 * AllDayBand above and an HourGrid below.
 *
 * @remarks
 * **When NOT to use:** Do not render `WeekView` directly in application code —
 * use the `Calendar` shell component, which owns view state and navigation
 * and dispatches into `WeekView` when `view === 'week'`.
 */
export function WeekView({
  cursor,
  events,
  hourRange,
  hourRowHeight,
  locale: localeOverride,
  weekStartsOn,
  onEventClick,
  onDayClick,
  renderEvent,
  now,
}: WeekViewProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const week = useWeek(cursor, { locale, weekStartsOn });

  const layout = useMemo(
    () =>
      layoutEventsForHourGrid(
        events,
        week.days.map((d) => ({ date: d.date, key: d.key })),
        hourRange,
      ),
    [events, week.days, hourRange],
  );

  const headers = week.days.map((d) => (
    <span>
      {formatWeekdayShort(d.date, locale)} <strong>{d.dayOfMonth}</strong>
    </span>
  ));

  const dayRefs = week.days.map((d) => ({
    date: d.date,
    key: d.key,
    isWeekend: d.isWeekend,
  }));

  return (
    <div className={styles.weekView}>
      <AllDayBand
        bars={layout.allDayBars}
        columnCount={7}
        gutterWidth={HOUR_GUTTER_WIDTH}
        view="week"
        renderEvent={renderEvent}
        onEventClick={onEventClick}
      />
      <HourGrid
        days={dayRefs}
        columnHeaders={headers}
        hourRange={hourRange}
        hourRowHeight={hourRowHeight}
        timedBlocks={layout.timedBlocks}
        view="week"
        renderEvent={renderEvent}
        onEventClick={onEventClick}
        onDayClick={onDayClick}
        now={now}
      />
    </div>
  );
}
