import { type MouseEvent } from 'react';
import clsx from 'clsx';
import { formatTime } from '../../calendar';
import { useLocale } from '../../i18n/useLocale';
import { Tooltip } from '../Tooltip';
import { resolveEventColor } from './eventColor';
import { formatEventDuration } from './utils';
import type { CalendarEvent, CalendarView, RenderEvent } from './types';
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
  /** Which view is rendering this chip (passed to `renderEvent` for branching). Defaults to `'month'`. */
  view?: CalendarView;
  /** Optional custom inner content. When set, replaces the default time + title spans. */
  renderEvent?: RenderEvent;
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
  view = 'month',
  renderEvent,
}: EventChipProps) {
  const locale = useLocale();
  // `color` takes the surface and moves `tone` to a leading-edge stripe; with
  // no `color` this resolves to the tone class alone, exactly as before.
  const {
    toneClass,
    hasStripe,
    style: colorStyle,
  } = resolveEventColor(event, '--calendar-event-chip-fg-');
  const isAllDay = event.allDay === true;
  const time = isAllDay ? '' : formatTime(event.startsAt, locale);
  const duration = formatEventDuration(event.startsAt, event.endsAt, isAllDay);
  const tooltipContent = isAllDay ? (
    <span className={styles.tooltipBody}>
      <span className={styles.tooltipTime}>{duration}</span>
      <span className={styles.tooltipTitle}>{event.title}</span>
    </span>
  ) : (
    <span className={styles.tooltipBody}>
      <span className={styles.tooltipTime}>
        {time} · {duration}
      </span>
      <span className={styles.tooltipTitle}>{event.title}</span>
    </span>
  );

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(event, e);
  };

  const customContent = renderEvent
    ? renderEvent(event, {
        view,
        asAllDay: isAllDay,
        continuesLeft,
        continuesRight,
        timeLabel: isAllDay ? undefined : time,
        duration,
      })
    : null;

  return (
    <Tooltip content={tooltipContent}>
      <button
        type="button"
        className={clsx(
          styles.chip,
          toneClass && styles[toneClass],
          colorStyle && styles.colored,
          hasStripe && styles.striped,
          isAllDay && styles.allDay,
          continuesLeft && styles.continuesLeft,
          continuesRight && styles.continuesRight,
        )}
        style={colorStyle}
        onClick={handleClick}
      >
        {customContent !== null ? (
          customContent
        ) : (
          <>
            {!isAllDay && <span className={styles.time}>{time}</span>}
            <span className={styles.title}>{event.title}</span>
          </>
        )}
      </button>
    </Tooltip>
  );
}
