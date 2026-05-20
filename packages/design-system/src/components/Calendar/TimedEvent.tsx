import { type CSSProperties, type MouseEvent } from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { formatTime } from '../../calendar';
import { Tooltip } from '../Tooltip';
import { formatEventDuration } from './utils';
import type {
  CalendarEvent,
  CalendarEventTone,
  CalendarView,
  RenderEvent,
  TimedEventBlock,
} from './types';
import styles from './TimedEvent.module.scss';

export interface TimedEventProps {
  /** Placed block produced by `layoutEventsForHourGrid`. */
  block: TimedEventBlock;
  /** Pixel height per hour row (matches the hour-grid scaffold). */
  hourRowHeight: number;
  /** Which view is rendering this chip (`'week'` or `'day'`). Passed to `renderEvent` for branching. */
  view?: CalendarView;
  /** Optional custom inner content. When set, replaces the default time + title spans. */
  renderEvent?: RenderEvent;
  /** Fires when the chip is clicked; receives the `CalendarEvent`. */
  onClick?: (event: CalendarEvent) => void;
}

/**
 * Internal: a single timed-event block, absolutely positioned inside an
 * hour-grid day column. Tone-styled, wrapped in a Tooltip so the full
 * "time range + title" is reachable even when the chip is short.
 *
 * @remarks
 * **When NOT to use:** Do not render `TimedEvent` directly in application code —
 * it is an internal building block consumed by `HourGrid`. Use `Calendar` (or
 * `WeekView`/`DayView`) from the design system and pass events via the `events` prop.
 */
const MIN_BLOCK_HEIGHT_PX = 20;
/** Percent of the day column each cascade lane is offset to the right. */
const LANE_OFFSET_PERCENT = 10;
/** Z-index used for the hovered / focused block — sits above any lane. */
const HOVER_Z_INDEX = 100;

export function TimedEvent({
  block,
  hourRowHeight,
  view = 'week',
  renderEvent,
  onClick,
}: TimedEventProps) {
  const locale = useLocale();
  const tone: CalendarEventTone = block.event.tone ?? 'neutral';

  const top = (block.startMinutes / 60) * hourRowHeight;
  const rawHeight = ((block.endMinutes - block.startMinutes) / 60) * hourRowHeight;
  const height = Math.max(rawHeight, MIN_BLOCK_HEIGHT_PX);
  // Google-Calendar-style cascade: each lane shifts right by a small,
  // constant step but every block still extends to the column's right edge.
  // Higher lanes overlay earlier ones via z-index, so later events
  // partially cover the one beneath them while keeping the predecessor's
  // left edge visible. On hover, the block lifts to full width and on top
  // — see `:hover` rules in TimedEvent.module.scss.
  const leftPercent = LANE_OFFSET_PERCENT * block.lane;
  const zIndex = block.lane + 1;

  const startLabel = formatTime(block.event.startsAt, locale);
  const endLabel = block.event.endsAt ? formatTime(block.event.endsAt, locale) : null;

  // For zero-duration events the start and end times are the same (or there's
  // no endsAt) — collapse to a single time label rather than "9:30 AM – 9:30 AM".
  const isZeroDuration = !endLabel || endLabel === startLabel;
  const timeLabel = isZeroDuration ? startLabel : `${startLabel} – ${endLabel}`;

  const duration = formatEventDuration(block.event.startsAt, block.event.endsAt);
  const tooltipContent = (
    <span className={styles.tooltipBody}>
      <span className={styles.tooltipTime}>
        {timeLabel} · {duration}
      </span>
      <span className={styles.tooltipTitle}>{block.event.title}</span>
    </span>
  );

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(block.event);
  };

  // Short events use a single-line row layout (time + title side-by-side)
  // so the start time stays visible even on min-height blocks. Tall events
  // stack time above title in a column for more breathing room.
  const isShort = height < MIN_BLOCK_HEIGHT_PX + 10;

  const customContent = renderEvent
    ? renderEvent(block.event, {
        view,
        asAllDay: false,
        timeLabel,
        duration,
      })
    : null;

  return (
    <Tooltip content={tooltipContent}>
      <button
        type="button"
        className={clsx(styles.block, styles[tone], isShort && styles.short)}
        style={
          {
            top,
            height,
            '--cal-block-left': `${leftPercent}%`,
            '--cal-block-width': `${100 - leftPercent}%`,
            '--cal-block-z': zIndex,
            '--cal-block-z-hover': HOVER_Z_INDEX,
          } as CSSProperties
        }
        onClick={handleClick}
      >
        {customContent !== null ? (
          customContent
        ) : (
          <>
            <span className={styles.time}>{timeLabel}</span>
            <span className={styles.title}>{block.event.title}</span>
          </>
        )}
      </button>
    </Tooltip>
  );
}
