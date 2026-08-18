import { useMemo } from 'react';
import { useWeek } from '../../calendar/useWeek';
import { useLocale } from '../../i18n/useLocale';
import { formatWeekdayShort } from '../../calendar/formatters';
import { AllDayBand } from './AllDayBand';
import { HourGrid, HOUR_GUTTER_WIDTH, type HourGridColumn } from './HourGrid';
import { layoutBackgroundIntervals, layoutEventsForHourGrid } from './utils';
import type {
  CalendarBackgroundInterval,
  CalendarDropResult,
  CalendarEvent,
  CalendarEventMove,
  CalendarEventResize,
  RenderEvent,
} from './types';
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
  /** Availability underlay bands. `resourceId` is ignored — week view has no resource columns. */
  backgroundIntervals?: readonly CalendarBackgroundInterval[];
  /** Fires when a timed-event block or all-day chip is clicked. */
  onEventClick?: (event: CalendarEvent) => void;
  /** Fires when empty hour-grid space inside a day column is clicked, with that column's date. */
  onDayClick?: (date: Date) => void;
  /** Enables drag-to-move (across days as well as within one). */
  onEventMove?: (event: CalendarEvent, next: CalendarEventMove) => CalendarDropResult;
  /** Enables drag-to-resize. */
  onEventResize?: (event: CalendarEvent, next: CalendarEventResize) => CalendarDropResult;
  /** Live veto during a drag. */
  canDropEvent?: (event: CalendarEvent, next: CalendarEventMove) => boolean;
  /** Snap granularity for drags, in minutes. */
  dragSnapMinutes?: number;
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
  backgroundIntervals,
  onEventClick,
  onDayClick,
  onEventMove,
  onEventResize,
  canDropEvent,
  dragSnapMinutes,
  renderEvent,
  now,
}: WeekViewProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const week = useWeek(cursor, { locale, weekStartsOn });

  const columns: HourGridColumn[] = useMemo(
    () => week.days.map((d) => ({ date: d.date, key: d.key, isWeekend: d.isWeekend })),
    [week.days],
  );

  const layout = useMemo(
    () => layoutEventsForHourGrid(events, columns, hourRange),
    [events, columns, hourRange],
  );

  const backgroundBlocks = useMemo(
    () => layoutBackgroundIntervals(backgroundIntervals ?? [], columns, hourRange),
    [backgroundIntervals, columns, hourRange],
  );

  const headers = week.days.map((d) => (
    <span>
      {formatWeekdayShort(d.date, locale)} <strong>{d.dayOfMonth}</strong>
    </span>
  ));

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
        columns={columns}
        columnHeaders={headers}
        hourRange={hourRange}
        hourRowHeight={hourRowHeight}
        timedBlocks={layout.timedBlocks}
        backgroundBlocks={backgroundBlocks}
        view="week"
        renderEvent={renderEvent}
        onEventClick={onEventClick}
        onDayClick={onDayClick}
        onEventMove={onEventMove}
        onEventResize={onEventResize}
        canDropEvent={canDropEvent}
        dragSnapMinutes={dragSnapMinutes}
        now={now}
        ariaLabel={week.weekLabel}
      />
    </div>
  );
}
