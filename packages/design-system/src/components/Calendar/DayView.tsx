import { useMemo } from 'react';
import { useDay } from '../../calendar/useDay';
import { useLocale } from '../../i18n/useLocale';
import { useTranslation } from '../../i18n/useTranslation';
import { AllDayBand } from './AllDayBand';
import { HourGrid, HOUR_GUTTER_WIDTH, type HourGridColumn } from './HourGrid';
import { layoutBackgroundIntervals, layoutEventsForHourGrid, needsUnassignedColumn } from './utils';
import type {
  CalendarBackgroundInterval,
  CalendarDropCandidate,
  CalendarDropResult,
  CalendarEvent,
  CalendarEventMove,
  CalendarEventResize,
  CalendarResource,
  RenderEvent,
} from './types';
import styles from './DayView.module.scss';

export interface DayViewProps {
  /** The date to display. */
  cursor: Date;
  /** Events to display for the day. */
  events: readonly CalendarEvent[];
  /** Inclusive start, exclusive end of the visible hour range. */
  hourRange: readonly [number, number];
  /** Pixel height per hour row. */
  hourRowHeight: number;
  /** Override locale. */
  locale?: string;
  /**
   * Bookable subjects to split the day into. One column per entry, sharing
   * one time axis and one scroll container. Empty / omitted → a single column.
   */
  resources?: readonly CalendarResource[];
  /** Availability underlay bands. */
  backgroundIntervals?: readonly CalendarBackgroundInterval[];
  /** Fires when a timed-event block or all-day chip is clicked. */
  onEventClick?: (event: CalendarEvent) => void;
  /** Fires when empty hour-grid space is clicked, with the day's date. */
  onDayClick?: (date: Date) => void;
  /** Enables drag-to-move. */
  onEventMove?: (event: CalendarEvent, next: CalendarEventMove) => CalendarDropResult;
  /** Enables drag-to-resize. */
  onEventResize?: (event: CalendarEvent, next: CalendarEventResize) => CalendarDropResult;
  /** Live veto during a drag. */
  canDropEvent?: (event: CalendarEvent, next: CalendarDropCandidate) => boolean;
  /** Snap granularity for drags, in minutes. */
  dragSnapMinutes?: number;
  /** Optional custom event renderer (see `RenderEvent`). */
  renderEvent?: RenderEvent;
}

/**
 * Internal: single-day hour grid. Shows the day at `cursor` with an
 * AllDayBand above and an HourGrid below. With `resources`, the day splits
 * into one column per resource (the "resource day view" every scheduling
 * product ships) instead of a single column.
 *
 * @remarks
 * **When NOT to use:** Do not render `DayView` directly — use the `Calendar`
 * shell with `view='day'`.
 */
export function DayView({
  cursor,
  events,
  hourRange,
  hourRowHeight,
  locale: localeOverride,
  resources,
  backgroundIntervals,
  onEventClick,
  onDayClick,
  onEventMove,
  onEventResize,
  canDropEvent,
  dragSnapMinutes,
  renderEvent,
}: DayViewProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const t = useTranslation();
  const day = useDay(cursor, { locale });
  const unassignedLabel = t('calendar.unassigned');

  const { columns, headers } = useMemo(() => {
    const date = day.day.date;
    if (!resources || resources.length === 0) {
      const single: HourGridColumn[] = [{ date, key: day.day.key, isWeekend: day.day.isWeekend }];
      return { columns: single, headers: [<span key={day.day.key}>{day.dayLabel}</span>] };
    }

    const cols: HourGridColumn[] = resources.map((r) => ({
      date,
      key: `${day.day.key}-${r.id}`,
      resourceId: r.id,
      isWeekend: day.day.isWeekend,
    }));
    const labels = resources.map((r) => <span key={r.id}>{r.label}</span>);

    // Only rendered when something actually needs it — see
    // `needsUnassignedColumn`.
    const ids = new Set(resources.map((r) => r.id));
    if (needsUnassignedColumn(events, date, ids)) {
      cols.push({
        date,
        key: `${day.day.key}-unassigned`,
        resourceId: null,
        isWeekend: day.day.isWeekend,
      });
      labels.push(<span key="__unassigned">{unassignedLabel}</span>);
    }
    return { columns: cols, headers: labels };
  }, [
    day.day.date,
    day.day.key,
    day.day.isWeekend,
    day.dayLabel,
    events,
    resources,
    unassignedLabel,
  ]);

  const layout = useMemo(
    () => layoutEventsForHourGrid(events, columns, hourRange),
    [events, columns, hourRange],
  );

  const backgroundBlocks = useMemo(
    () => layoutBackgroundIntervals(backgroundIntervals ?? [], columns, hourRange),
    [backgroundIntervals, columns, hourRange],
  );

  return (
    <div className={styles.dayView}>
      <AllDayBand
        bars={layout.allDayBars}
        columnCount={columns.length}
        gutterWidth={HOUR_GUTTER_WIDTH}
        view="day"
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
        view="day"
        renderEvent={renderEvent}
        onEventClick={onEventClick}
        onDayClick={onDayClick}
        onEventMove={onEventMove}
        onEventResize={onEventResize}
        canDropEvent={canDropEvent}
        dragSnapMinutes={dragSnapMinutes}
        ariaLabel={day.dayLabel}
      />
    </div>
  );
}
