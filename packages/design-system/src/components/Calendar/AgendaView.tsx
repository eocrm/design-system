import { useMemo, type MouseEvent } from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { formatDayLong, formatTime } from '../../calendar';
import { startOfDay } from '../../calendar/dateMath';
import type { Day } from '../../calendar/types';
import { formatEventDuration } from './utils';
import type { CalendarEvent, CalendarEventTone, RenderEvent } from './types';
import styles from './AgendaView.module.scss';

export interface AgendaViewProps {
  /** One `Day` per calendar day in the agenda window (inclusive at both ends). */
  days: readonly Day[];
  /** Localized range label for the agenda window (e.g., "May 18 – 24, 2026"). */
  rangeLabel: string;
  /** Events to project into the window. Multi-day events appear under every day they span. */
  events: readonly CalendarEvent[];
  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Empty-state message shown when no events fall inside the window. Defaults to "No events". */
  emptyLabel?: string;
  /** Fires when the user clicks an event row. */
  onEventClick?: (event: CalendarEvent) => void;
  /** Optional custom event renderer (see `RenderEvent`). */
  renderEvent?: RenderEvent;
}

interface AgendaRow {
  event: CalendarEvent;
  /** True when this row represents an `allDay` or multi-day event. */
  isAllDay: boolean;
  /** Pre-formatted duration ("30m", "1h", "3d") — locale-independent. */
  duration: string;
}

interface DayGroup {
  day: Day;
  rows: AgendaRow[];
}

/**
 * Internal: agenda (list) view for `<Calendar view='agenda'>`. Projects the
 * cursor's current-week event window into a chronological list grouped by
 * day. Days without events are hidden so the list stays scannable.
 *
 * - Multi-day events appear under every day they span, each row marked
 *   `asAllDay` so the time gutter shows "All day" instead of a clock time.
 * - Single-day timed events show the start time in the gutter.
 * - Within a day: all-day events first, then timed events by start time.
 *
 * @remarks
 * **When NOT to use:** Do not render `AgendaView` directly — use the
 * `Calendar` shell with `view='agenda'` (or `defaultView='agenda'`). The
 * shell owns cursor / locale / labels and dispatches into this component.
 */
export function AgendaView({
  days,
  rangeLabel,
  events,
  locale: localeOverride,
  emptyLabel = 'No events',
  onEventClick,
  renderEvent,
}: AgendaViewProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;

  const groups = useMemo(() => buildDayGroups(days, events), [days, events]);

  if (groups.length === 0) {
    return (
      <div className={styles.agenda} role="list" aria-label={rangeLabel}>
        <p className={styles.empty}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={styles.agenda} role="list" aria-label={rangeLabel}>
      {groups.map(({ day, rows }) => (
        <div
          key={day.key}
          role="listitem"
          className={clsx(styles.dayGroup, day.isToday && styles.todayGroup)}
        >
          <h3 className={styles.dayHeader}>{formatDayLong(day.date, locale)}</h3>
          <div className={styles.rows}>
            {rows.map((row) => (
              <AgendaRowItem
                key={`${day.key}-${row.event.id}`}
                row={row}
                locale={locale}
                onClick={onEventClick}
                renderEvent={renderEvent}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface AgendaRowItemProps {
  row: AgendaRow;
  locale: string;
  onClick?: (event: CalendarEvent) => void;
  renderEvent?: RenderEvent;
}

function AgendaRowItem({ row, locale, onClick, renderEvent }: AgendaRowItemProps) {
  const { event, isAllDay, duration } = row;
  const tone: CalendarEventTone = event.tone ?? 'neutral';
  const startLabel = isAllDay ? undefined : formatTime(event.startsAt, locale);
  const endLabel = !isAllDay && event.endsAt ? formatTime(event.endsAt, locale) : undefined;
  const timeLabel =
    !isAllDay && endLabel && endLabel !== startLabel ? `${startLabel} – ${endLabel}` : startLabel;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(event);
  };

  const customContent = renderEvent
    ? renderEvent(event, {
        view: 'agenda',
        asAllDay: isAllDay,
        timeLabel: isAllDay ? undefined : timeLabel,
        duration,
      })
    : null;

  return (
    <button type="button" className={clsx(styles.rowButton, styles[tone])} onClick={handleClick}>
      <span className={styles.timeGutter}>
        {isAllDay ? <em className={styles.allDay}>All day</em> : timeLabel}
      </span>
      <span className={styles.toneDot} aria-hidden="true" />
      <span className={styles.body}>
        {customContent !== null ? (
          customContent
        ) : (
          <span className={styles.title}>{event.title}</span>
        )}
      </span>
    </button>
  );
}

/**
 * Group events by day across the agenda window. Multi-day events appear
 * under every day they span. Empty days are dropped. Within a day rows
 * are sorted: all-day first (by startsAt), then timed events by startsAt.
 */
function buildDayGroups(days: readonly Day[], events: readonly CalendarEvent[]): DayGroup[] {
  if (days.length === 0 || events.length === 0) return [];

  // Pre-normalize each event into row data once.
  interface Normalized {
    event: CalendarEvent;
    startDayMs: number;
    endDayMs: number;
    isAllDay: boolean;
    isMultiDay: boolean;
  }
  const normalized: Normalized[] = events.map((ev) => {
    const startDayMs = startOfDay(ev.startsAt).getTime();
    const endDayMs = ev.endsAt ? startOfDay(ev.endsAt).getTime() : startDayMs;
    const isAllDayProp = ev.allDay === true;
    const isMultiDay = endDayMs > startDayMs;
    // Multi-day events render with an "All day" gutter regardless of allDay
    // flag — there's no single time that's meaningful across the span.
    return {
      event: ev,
      startDayMs,
      endDayMs,
      isAllDay: isAllDayProp || isMultiDay,
      isMultiDay,
    };
  });

  const groups: DayGroup[] = [];
  for (const day of days) {
    const dayMs = startOfDay(day.date).getTime();
    const dayEvents = normalized.filter((n) => n.startDayMs <= dayMs && dayMs <= n.endDayMs);
    if (dayEvents.length === 0) continue;

    // Sort: allDay/multi-day first by startsAt, then timed by startsAt.
    dayEvents.sort((a, b) => {
      if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
      return a.event.startsAt.getTime() - b.event.startsAt.getTime();
    });

    const rows: AgendaRow[] = dayEvents.map((n) => ({
      event: n.event,
      isAllDay: n.isAllDay,
      duration: formatEventDuration(n.event.startsAt, n.event.endsAt, n.isAllDay),
    }));
    groups.push({ day, rows });
  }
  return groups;
}
