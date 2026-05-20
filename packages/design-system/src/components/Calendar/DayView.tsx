import { useMemo } from 'react';
import { useDay } from '../../calendar/useDay';
import { useLocale } from '../../i18n/useLocale';
import { AllDayBand } from './AllDayBand';
import { HourGrid, HOUR_GUTTER_WIDTH } from './HourGrid';
import { layoutEventsForHourGrid } from './utils';
import type { CalendarEvent, RenderEvent } from './types';
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
  /** Fires when a timed-event block or all-day chip is clicked. */
  onEventClick?: (event: CalendarEvent) => void;
  /** Fires when empty hour-grid space is clicked, with the day's date. */
  onDayClick?: (date: Date) => void;
  /** Optional custom event renderer (see `RenderEvent`). */
  renderEvent?: RenderEvent;
}

/**
 * Internal: single-day hour grid. Shows the day at `cursor` with an
 * AllDayBand above and an HourGrid below.
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
  onEventClick,
  onDayClick,
  renderEvent,
}: DayViewProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const day = useDay(cursor, { locale });

  const layout = useMemo(
    () => layoutEventsForHourGrid(events, [{ date: day.day.date, key: day.day.key }], hourRange),
    [events, day.day.date, day.day.key, hourRange],
  );

  const dayRefs = [
    {
      date: day.day.date,
      key: day.day.key,
      isWeekend: day.day.isWeekend,
    },
  ];

  return (
    <div className={styles.dayView}>
      <AllDayBand
        bars={layout.allDayBars}
        columnCount={1}
        gutterWidth={HOUR_GUTTER_WIDTH}
        view="day"
        renderEvent={renderEvent}
        onEventClick={onEventClick}
      />
      <HourGrid
        days={dayRefs}
        columnHeaders={[<span>{day.dayLabel}</span>]}
        hourRange={hourRange}
        hourRowHeight={hourRowHeight}
        timedBlocks={layout.timedBlocks}
        view="day"
        renderEvent={renderEvent}
        onEventClick={onEventClick}
        onDayClick={onDayClick}
      />
    </div>
  );
}
