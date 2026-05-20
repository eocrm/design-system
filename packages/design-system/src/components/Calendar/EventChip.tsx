import { type MouseEvent } from 'react';
import clsx from 'clsx';
import { formatHour } from '../../calendar';
import { useLocale } from '../../i18n/useLocale';
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
 * tone-styled button. Use the `continuesLeft` / `continuesRight` flags to
 * flatten edges where the event spans into adjacent weeks.
 *
 * - Non-`allDay` events show a subtle tinted background with a time prefix.
 * - `allDay` events use a filled tone background with a contrast foreground.
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

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(event, e);
  };

  return (
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
      title={event.title}
    >
      {!isAllDay && (
        <span className={styles.time}>{formatHour(event.startsAt.getHours(), locale)}</span>
      )}
      <span className={styles.title}>{event.title}</span>
    </button>
  );
}
