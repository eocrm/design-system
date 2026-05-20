import { EventChip } from './EventChip';
import type { AllDayBar, CalendarEvent, CalendarView, RenderEvent } from './types';
import styles from './AllDayBand.module.scss';

export interface AllDayBandProps {
  /** Bars produced by `layoutEventsForHourGrid`. */
  bars: readonly AllDayBar[];
  /** Number of day columns the band spans (1 or 7). */
  columnCount: number;
  /** Pixel width of the hour-gutter on the left (band aligns with the hour-grid columns). */
  gutterWidth: number;
  /** Which view contains this band — passed to `renderEvent` (`'week'` or `'day'`). */
  view?: CalendarView;
  /** Optional custom event renderer (replaces the chip's default inner content). */
  renderEvent?: RenderEvent;
  /** Fires when an all-day chip is clicked; receives the `CalendarEvent`. */
  onEventClick?: (event: CalendarEvent) => void;
}

/**
 * Internal: the all-day event band rendered above the hour grid. Multi-day
 * events span columns as continuous bars; the left gutter is empty so the
 * band aligns visually with the hour-grid columns below.
 *
 * @remarks
 * **When NOT to use:** Do not render `AllDayBand` directly in application code —
 * it is an internal building block consumed by `WeekView`/`DayView`. Use `Calendar`
 * from the design system and pass events via the `events` prop.
 */
export function AllDayBand({
  bars,
  columnCount,
  gutterWidth,
  view = 'week',
  renderEvent,
  onEventClick,
}: AllDayBandProps) {
  if (bars.length === 0) return null;
  const maxLane = bars.reduce((m, b) => Math.max(m, b.lane), 0);

  return (
    <div
      className={styles.band}
      style={{
        gridTemplateColumns: `${gutterWidth}px repeat(${columnCount}, 1fr)`,
        gridTemplateRows: `repeat(${maxLane + 1}, auto)`,
      }}
    >
      <div
        className={styles.gutter}
        style={{ gridColumn: 1, gridRow: `1 / span ${maxLane + 1}` }}
      />
      {bars.map((bar) => (
        <div
          key={bar.event.id}
          className={styles.barSlot}
          style={{
            // +2 because column 1 is the gutter; day index 0 → outer column 2
            gridColumn: `${bar.startCol + 2} / ${bar.endCol + 3}`,
            gridRow: bar.lane + 1,
          }}
        >
          <EventChip
            event={bar.event}
            continuesLeft={bar.continuesLeft}
            continuesRight={bar.continuesRight}
            view={view}
            renderEvent={renderEvent}
            onClick={(ev) => onEventClick?.(ev)}
          />
        </div>
      ))}
    </div>
  );
}
