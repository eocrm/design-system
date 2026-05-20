import { type MouseEvent } from 'react';
import clsx from 'clsx';
import { formatTime } from '../../calendar';
import { useLocale } from '../../i18n/useLocale';
import { Tooltip } from '../Tooltip';
import type { CalendarEvent, CalendarEventTone } from './types';
import styles from './EventChip.module.scss';

export interface EventChipProps {
  /** The calendar event to render. */
  event: CalendarEvent;
  /** True when the bar continues from a previous week — left edge is flattened. */
  continuesLeft?: boolean;
  /** True when the bar continues into a next week — right edge is flattened. */
  continuesRight?: boolean;
  /** Called when the chip is clicked; receives the event and the native mouse event. */
  onClick?: (event: CalendarEvent, mouseEvent: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Internal: a single event bar inside a Calendar month grid. Renders as a
 * tone-styled button wrapped in a Tooltip so the full "time + title" is
 * always reachable even when the chip text is ellipsis-clipped in narrow
 * day columns.
 *
 * - Non-`allDay` events show a subtle tinted background with a time prefix
 *   in the chip and "<time> <title>" in the tooltip.
 * - `allDay` events use a filled tone background, no time prefix, and the
 *   tooltip shows just the title.
 * - Tone defaults to `'neutral'` when not set on the event.
 *
 * @remarks
 * **When NOT to use:** Do not render `EventChip` directly in application code —
 * it is an internal building block consumed by `MonthView`. Use `Calendar` (or
 * `MonthView`) from the design system and pass events via the `events` prop.
 */
export function EventChip({
  event,
  continuesLeft = false,
  continuesRight = false,
  onClick,
}: EventChipProps) {
  const locale = useLocale();
  const tone: CalendarEventTone = event.tone ?? 'neutral';
  const isAllDay = event.allDay === true;
  const time = isAllDay ? '' : formatTime(event.startsAt, locale);
  const tooltipContent = isAllDay ? (
    <span className={styles.tooltipTitle}>{event.title}</span>
  ) : (
    <span className={styles.tooltipBody}>
      <span className={styles.tooltipTime}>{time}</span>
      <span className={styles.tooltipTitle}>{event.title}</span>
    </span>
  );

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(event, e);
  };

  return (
    <Tooltip content={tooltipContent}>
      <button
        type="button"
        className={clsx(
          styles.chip,
          styles[tone],
          isAllDay && styles.allDay,
          continuesLeft && styles.continuesLeft,
          continuesRight && styles.continuesRight,
        )}
        onClick={handleClick}
      >
        {!isAllDay && <span className={styles.time}>{time}</span>}
        <span className={styles.title}>{event.title}</span>
      </button>
    </Tooltip>
  );
}
