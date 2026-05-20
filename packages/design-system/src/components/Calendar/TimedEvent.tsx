import { type MouseEvent } from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { formatTime } from '../../calendar';
import { Tooltip } from '../Tooltip';
import { formatEventDuration } from './utils';
import type { CalendarEvent, CalendarEventTone, TimedEventBlock } from './types';
import styles from './TimedEvent.module.scss';

export interface TimedEventProps {
  /** Placed block produced by `layoutEventsForHourGrid`. */
  block: TimedEventBlock;
  /** Pixel height per hour row (matches the hour-grid scaffold). */
  hourRowHeight: number;
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

export function TimedEvent({ block, hourRowHeight, onClick }: TimedEventProps) {
  const locale = useLocale();
  const tone: CalendarEventTone = block.event.tone ?? 'neutral';

  const top = (block.startMinutes / 60) * hourRowHeight;
  const rawHeight = ((block.endMinutes - block.startMinutes) / 60) * hourRowHeight;
  const height = Math.max(rawHeight, MIN_BLOCK_HEIGHT_PX);
  const width = `${100 / block.laneCount}%`;
  const left = `${(100 / block.laneCount) * block.lane}%`;

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

  return (
    <Tooltip content={tooltipContent}>
      <button
        type="button"
        className={clsx(styles.block, styles[tone], isShort && styles.short)}
        style={{ top, height, width, left }}
        onClick={handleClick}
      >
        <span className={styles.time}>{timeLabel}</span>
        <span className={styles.title}>{block.event.title}</span>
      </button>
    </Tooltip>
  );
}
