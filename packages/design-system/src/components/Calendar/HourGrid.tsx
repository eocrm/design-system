import { useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { formatHour } from '../../calendar';
import { isSameDay } from '../../calendar/dateMath';
import { TimedEvent } from './TimedEvent';
import type { CalendarEvent, TimedEventBlock } from './types';
import styles from './HourGrid.module.scss';

/** Default hour-gutter width in pixels. */
export const HOUR_GUTTER_WIDTH = 60;

export interface HourGridProps {
  /** One date per column (1 for DayView, 7 for WeekView). */
  days: readonly { date: Date; key: string; isWeekend?: boolean }[];
  /** Localized column header content (one per day). */
  columnHeaders: readonly ReactNode[];
  /** Inclusive start, exclusive end. */
  hourRange: readonly [number, number];
  /** Pixel height per hour row. */
  hourRowHeight: number;
  /** Timed events positioned within columns. */
  timedBlocks: readonly TimedEventBlock[];
  /** Today's date (injected for testability). Defaults to `new Date()`. */
  now?: Date;
  /** Fires when a timed-event block in a day column is clicked. */
  onEventClick?: (event: CalendarEvent) => void;
}

/**
 * Internal: hour-grid scaffold for Week and Day views. Renders the column
 * headers, hour gutter labels, the column bodies (with timed events
 * positioned absolutely inside), and a horizontal "now" line in today's
 * column when today is in the rendered range. Re-renders every minute so
 * the now-line stays accurate.
 *
 * @remarks
 * **When NOT to use:** Do not render `HourGrid` directly in application code —
 * it is an internal building block consumed by `WeekView`/`DayView`. Use `Calendar`
 * from the design system and pass events via the `events` prop.
 */
export function HourGrid({
  days,
  columnHeaders,
  hourRange,
  hourRowHeight,
  timedBlocks,
  now,
  onEventClick,
}: HourGridProps) {
  const locale = useLocale();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  // `tick` only exists to invalidate the time-derived memos
  void tick;

  const currentTime = now ?? new Date();

  const hourLabels = useMemo(() => {
    const labels: string[] = [];
    for (let h = hourRange[0]; h < hourRange[1]; h++) {
      labels.push(formatHour(h, locale));
    }
    return labels;
  }, [hourRange, locale]);

  const columnCount = days.length;
  const blocksByDay = useMemo(() => {
    const m = new Map<number, TimedEventBlock[]>();
    for (const b of timedBlocks) {
      const list = m.get(b.dayIndex) ?? [];
      list.push(b);
      m.set(b.dayIndex, list);
    }
    return m;
  }, [timedBlocks]);

  const totalHours = hourRange[1] - hourRange[0];
  const nowMinutesFromStart =
    (currentTime.getHours() - hourRange[0]) * 60 + currentTime.getMinutes();
  const nowVisible = nowMinutesFromStart >= 0 && nowMinutesFromStart <= totalHours * 60;
  const todayColumnIndex = days.findIndex((d) => isSameDay(d.date, currentTime));

  return (
    <div className={styles.scroll}>
      <div
        className={styles.grid}
        style={{
          gridTemplateColumns: `${HOUR_GUTTER_WIDTH}px repeat(${columnCount}, 1fr)`,
          gridTemplateRows: `auto repeat(${totalHours}, ${hourRowHeight}px)`,
        }}
      >
        <div className={styles.cornerCell} aria-hidden="true" />
        {columnHeaders.map((header, i) => (
          <div
            key={`header-${days[i].key}`}
            role="columnheader"
            className={clsx(
              styles.columnHeader,
              days[i].isWeekend && styles.weekendHeader,
              todayColumnIndex === i && styles.todayHeader,
            )}
          >
            {header}
          </div>
        ))}
        {hourLabels.map((label, h) => (
          <div
            key={`hour-${h}`}
            className={styles.hourLabel}
            style={{ gridColumn: 1, gridRow: h + 2 }}
          >
            {label}
          </div>
        ))}
        {days.map((day, i) => {
          const blocks = blocksByDay.get(i) ?? [];
          return (
            <div
              key={day.key}
              className={clsx(
                styles.dayColumn,
                day.isWeekend && styles.weekendColumn,
                todayColumnIndex === i && styles.todayColumn,
              )}
              style={{ gridColumn: i + 2, gridRow: `2 / span ${totalHours}` }}
            >
              {Array.from({ length: totalHours }).map((_, h) => (
                <div
                  key={`sep-${h}`}
                  className={styles.hourSeparator}
                  style={{ top: h * hourRowHeight }}
                  aria-hidden="true"
                />
              ))}
              {nowVisible && todayColumnIndex === i && (
                <div
                  className={styles.nowLine}
                  style={{ top: (nowMinutesFromStart / 60) * hourRowHeight }}
                  aria-hidden="true"
                />
              )}
              {blocks.map((b) => (
                <TimedEvent
                  key={b.event.id}
                  block={b}
                  hourRowHeight={hourRowHeight}
                  onClick={onEventClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
