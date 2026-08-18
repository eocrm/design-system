import { forwardRef, useCallback, useState, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { addDays, addMonths, addWeeks, startOfWeek } from '../../calendar/dateMath';
import { useMonth } from '../../calendar/useMonth';
import { useWeek } from '../../calendar/useWeek';
import { useDay } from '../../calendar/useDay';
import { useAgenda } from '../../calendar/useAgenda';
import { useLocale } from '../../i18n/useLocale';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { useTranslation } from '../../i18n/useTranslation';
import { getFirstDayOfWeek } from '../../calendar/weekInfo';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { AgendaView } from './AgendaView';
import { ViewSwitcher } from './ViewSwitcher';
import type {
  CalendarBackgroundInterval,
  CalendarDropCandidate,
  CalendarDropResult,
  CalendarEvent,
  CalendarEventMove,
  CalendarEventResize,
  CalendarResource,
  CalendarView,
  RenderEvent,
} from './types';
import styles from './Calendar.module.scss';

export interface CalendarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Events to display. */
  events?: readonly CalendarEvent[];
  /** Active view (controlled). Pair with `onViewChange`. */
  view?: CalendarView;
  /** Initial view (uncontrolled). Defaults to `'month'`. */
  defaultView?: CalendarView;
  /** Fires when the user clicks the view switcher. */
  onViewChange?: (view: CalendarView) => void;
  /** Navigation cursor (controlled). */
  value?: Date;
  /** Initial cursor (uncontrolled). Defaults to `new Date()`. */
  defaultValue?: Date;
  /** Fires on prev/next/today/keyboard navigation. */
  onChange?: (date: Date) => void;
  /**
   * Fires when the user clicks a day cell's empty space.
   * - Month view: empty space in a day cell, the "+N more" overflow chip, or
   *   keyboard activation (Enter/Space) on a focused cell.
   * - Week/Day view: empty hour-grid space inside that day's column —
   *   **mouse click only**. There is no keyboard equivalent in v3; consumers
   *   needing keyboard activation in week/day should surface their detail UI
   *   through the focusable event chips (which fire `onEventClick`).
   */
  onDayClick?: (date: Date) => void;
  /** Fires when the user clicks an event chip. */
  onEventClick?: (event: CalendarEvent) => void;
  /** Override locale. Defaults to `useLocale()`. */
  locale?: string;
  /** Override locale-derived first day of week. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Lane cap per week before "+N more" appears in affected cells (month view). Default 3. */
  maxLanesPerWeek?: number;
  /**
   * Hour range shown in week/day views (inclusive start, exclusive end).
   * Defaults to `[7, 19]` (7am–7pm). Hours outside this range are NOT
   * rendered (no row in the grid).
   */
  hourRange?: [number, number];
  /** Pixel height per hour row in week/day views. Default 48. */
  hourRowHeight?: number;
  /**
   * Split `view="day"` into one column per bookable subject — practitioner,
   * chair, room, bay — all sharing a single time axis and a single scroll
   * container. This is the "resource day view" of scheduling products.
   *
   * Events are routed by `CalendarEvent.resourceId`. A timed event whose
   * `resourceId` matches nothing (or is absent) lands in a trailing
   * "unassigned" column, which is only rendered when such an event exists.
   * All-day events without a `resourceId` are day-wide and span every column.
   *
   * Ignored by month, week and agenda views — those have their own column
   * meaning.
   */
  resources?: readonly CalendarResource[];
  /**
   * Availability underlay for week/day views: non-interactive bands painted
   * behind the events, distinguishing "closed" from "open and free". "Open
   * and busy" already reads from the event blocks themselves.
   *
   * An interval list rather than a weekly-hours object, because working
   * hours vary by day (a lunch break), by date (a holiday, a short day) and
   * by column (per-practitioner shifts). Bands take no part in the event
   * collision cascade and never intercept clicks — `onDayClick` still fires
   * through them.
   *
   * Every interval is clipped to each column's own date, so a week view needs
   * one interval per day rather than one that all seven columns share.
   */
  backgroundIntervals?: readonly CalendarBackgroundInterval[];
  /**
   * Enables drag-to-reschedule in week/day views. Called on drop with the
   * proposed placement; the event's duration is preserved.
   *
   * **Nothing moves until you commit it.** `events` stays the source of
   * truth — apply the change to your own state to make it stick. To refuse a
   * drop (the server rejects overlaps, out-of-hours bookings, …) return
   * `false`, or a promise that resolves `false` or rejects: the block snaps
   * back and the preview is discarded. Prefer `canDropEvent` for rules you
   * can evaluate synchronously — it refuses the drop *during* the drag, so
   * the user sees it before releasing.
   *
   * Omit to keep today's read-only behaviour.
   */
  onEventMove?: (event: CalendarEvent, next: CalendarEventMove) => CalendarDropResult;
  /**
   * Enables drag-to-resize in week/day views (a handle on the block's bottom
   * edge). `startsAt` is unchanged; only `endsAt` moves. Same commit and
   * rejection semantics as `onEventMove`.
   */
  onEventResize?: (event: CalendarEvent, next: CalendarEventResize) => CalendarDropResult;
  /**
   * Synchronous veto, evaluated continuously while dragging. Return `false`
   * and the placement renders as a refused drop and is never proposed to
   * `onEventMove` / `onEventResize`. Use for rules you can check locally
   * (opening hours, overlaps within the loaded event set); use the handler's
   * own return value for rules only the server can settle.
   *
   * `next.mode` says which gesture is being judged, and narrows the payload:
   * `'move'` carries the target `resourceId`, `'resize'` cannot change the
   * column so it doesn't. Rules like "shortening is always fine, relocating
   * needs approval" are otherwise inexpressible — the predicate fires while
   * the pointer is still at the origin, where both gestures report the
   * event's own start.
   *
   * Note that `backgroundIntervals` does NOT gate drops. Shading a slot
   * closed is presentation; enforcing it is this predicate's job. Derive both
   * from one source so they cannot drift.
   */
  canDropEvent?: (event: CalendarEvent, next: CalendarDropCandidate) => boolean;
  /**
   * Snap granularity for drags, in minutes. Default 15 — a drag lands on a
   * quarter-hour boundary rather than an arbitrary pixel offset. Also the
   * step size for the keyboard equivalent (Alt + arrow keys).
   *
   * Values below 1 (including 0 and negatives) are treated as 1 minute.
   */
  dragSnapMinutes?: number;
  /**
   * Optional custom renderer for the inner content of every event chip
   * across views (month chips, week/day timed blocks, all-day band chips).
   * The returned ReactNode replaces the default `<time> · <title>` markup
   * inside the chip's button wrapper — the wrapper still handles tone
   * background, click, tooltip, and (for timed blocks) absolute positioning.
   *
   * To override colors, return content with inline styling that fills the
   * wrapper (e.g., `position: absolute; inset: 0; background: <color>`).
   *
   * The `ctx` argument carries view-aware metadata: `view`, `asAllDay`,
   * `continuesLeft`/`continuesRight` (multi-day), `timeLabel`, `duration`.
   */
  renderEvent?: RenderEvent;
}

/**
 * Month / week / day / agenda calendar.
 *
 * - Controlled cursor via `value` / `onChange`, or uncontrolled via
 *   `defaultValue`.
 * - Controlled view via `view` / `onViewChange`, or uncontrolled via
 *   `defaultView`.
 * - Events as `CalendarEvent` objects; multi-day events render as continuous
 *   bars across the month grid and in the all-day band of week/day views.
 * - Locale-aware via `useLocale()`; override with `locale` prop. UI strings
 *   come from the i18n provider (`useTranslation`); wrap your app in
 *   `<I18nProvider locale="..." overrides={{ calendar: { today: '...' } }}>`
 *   to translate or customize them.
 * - Read-mostly by default: `onDayClick` and `onEventClick` callbacks; no
 *   built-in popover or modal. Opt into editing by wiring `onEventMove` /
 *   `onEventResize`, which turn on drag-to-reschedule in week/day views.
 * - `resources` splits `view="day"` into one column per bookable subject;
 *   `backgroundIntervals` paints the availability underlay behind events.
 *
 * @example
 * <Calendar events={events} defaultView="week" />
 *
 * @example
 * // Controlled cursor + view + Russian copy via the i18n provider:
 * const [cursor, setCursor] = useState(new Date());
 * const [view, setView] = useState<CalendarView>('month');
 * <I18nProvider locale="ru">
 *   <Calendar
 *     value={cursor}
 *     onChange={setCursor}
 *     view={view}
 *     onViewChange={setView}
 *     events={events}
 *     locale="ru-RU"
 *   />
 * </I18nProvider>;
 *
 * @example
 * // Booking screen: one column per practitioner, shifts shaded behind the
 * // events, drag to reschedule with the backend allowed to refuse the drop.
 * <Calendar
 *   view="day"
 *   events={appointments}
 *   resources={[
 *     { id: 'ana', label: 'Ana' },
 *     { id: 'ben', label: 'Ben' },
 *   ]}
 *   backgroundIntervals={shifts}
 *   canDropEvent={(ev, next) => isWithinOpeningHours(next)}
 *   onEventMove={async (ev, next) => {
 *     const ok = await api.reschedule(ev.id, next);
 *     if (!ok) return false; // snaps back
 *     setAppointments((prev) => applyMove(prev, ev.id, next));
 *   }}
 * />
 *
 * @remarks When NOT to use
 * - Single-date or date-range selection → use a future `<DatePicker>`.
 * - Drag-to-CREATE (dragging empty grid space to draft a new event) — still
 *   out of scope. Use `onDayClick` plus your own form.
 *
 * @remarks Anti-patterns
 * - ❌ Mounting `<Calendar>` with no `events` AND no `onDayClick` — the grid
 *   is fully inert. Provide events or a click handler.
 * - ❌ Pre-grouping events by day in the consumer. Pass the flat array; the
 *   layout algorithms group + lane internally.
 * - ❌ Treating `onEventMove` as the thing that moves the event. It proposes;
 *   your state disposes. Not committing means the block snaps back.
 * - ❌ Faking the availability underlay with all-day events — that pollutes
 *   the `events` array you also read back. Use `backgroundIntervals`.
 * - ❌ Approximating resource columns with N side-by-side `<Calendar view="day">`.
 *   Each brings its own header, gutter and scroll, so they drift. Use `resources`.
 */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  {
    events = [],
    view: viewProp,
    defaultView,
    onViewChange,
    value,
    defaultValue,
    onChange,
    onDayClick,
    onEventClick,
    locale,
    weekStartsOn,
    maxLanesPerWeek = 3,
    hourRange = [7, 19],
    hourRowHeight = 48,
    resources,
    backgroundIntervals,
    onEventMove,
    onEventResize,
    canDropEvent,
    dragSnapMinutes = 15,
    renderEvent,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const [uncontrolled, setUncontrolled] = useState<Date>(() => defaultValue ?? new Date());
  const cursor = value ?? uncontrolled;
  const [uncontrolledView, setUncontrolledView] = useState<CalendarView>(
    () => defaultView ?? 'month',
  );
  const view = viewProp ?? uncontrolledView;

  const handleChange = useCallback(
    (next: Date) => {
      if (value === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [value, onChange],
  );

  const handleViewChange = useCallback(
    (next: CalendarView) => {
      if (viewProp === undefined) setUncontrolledView(next);
      onViewChange?.(next);
    },
    [viewProp, onViewChange],
  );

  const contextLocale = useLocale();
  const resolvedWeekStartsOn = weekStartsOn ?? getFirstDayOfWeek(locale ?? contextLocale);

  const grid = useMonth(cursor, { locale, weekStartsOn });
  const week = useWeek(cursor, { locale, weekStartsOn });
  const day = useDay(cursor, { locale });
  // Agenda window mirrors the cursor's current week (Sun-Sat or Mon-Sun
  // depending on locale). Prev/Next on agenda steps a week, same as week view.
  const agendaFrom = startOfWeek(cursor, resolvedWeekStartsOn);
  const agendaTo = addDays(agendaFrom, 6);
  const agenda = useAgenda(agendaFrom, agendaTo, { locale, weekStartsOn });

  // Prev/Next step matches the active view: a month in month view, a week in
  // week or agenda view, a day in day view. Without this, multi-day events
  // that span several weeks aren't reachable in week/day view — each click
  // would skip over them.
  const stepBy =
    view === 'month'
      ? (d: Date, n: number) => addMonths(d, n)
      : view === 'day'
        ? (d: Date, n: number) => addDays(d, n)
        : (d: Date, n: number) => addWeeks(d, n);
  const goPrev = () => handleChange(stepBy(cursor, -1));
  const goNext = () => handleChange(stepBy(cursor, 1));
  const goToday = () => handleChange(new Date());

  // View-aware title + prev/next aria-labels. Each view's label/range
  // formatter is locale-aware (Intl-driven inside the hooks).
  const titleLabel =
    view === 'month'
      ? grid.monthLabel
      : view === 'week'
        ? week.weekLabel
        : view === 'day'
          ? day.dayLabel
          : agenda.rangeLabel;
  const prevLabel =
    view === 'month'
      ? t('calendar.previousMonth')
      : view === 'week'
        ? t('calendar.previousWeek')
        : view === 'day'
          ? t('calendar.previousDay')
          : t('calendar.previousAgenda');
  const nextLabel =
    view === 'month'
      ? t('calendar.nextMonth')
      : view === 'week'
        ? t('calendar.nextWeek')
        : view === 'day'
          ? t('calendar.nextDay')
          : t('calendar.nextAgenda');

  const body: ReactNode = (
    <div ref={ref} className={clsx(styles.calendar, className)} {...rest}>
      <header className={styles.header}>
        <h2 className={styles.title}>{titleLabel}</h2>
        <Cluster gap="sm" align="center">
          <Cluster gap="xs" align="center">
            <Button size="xs" variant="ghost" iconOnly aria-label={prevLabel} onClick={goPrev}>
              <ChevronLeft size={14} />
            </Button>
            <Button size="sm" variant="secondary" onClick={goToday}>
              {t('calendar.today')}
            </Button>
            <Button size="xs" variant="ghost" iconOnly aria-label={nextLabel} onClick={goNext}>
              <ChevronRight size={14} />
            </Button>
          </Cluster>
          <ViewSwitcher
            view={view}
            onViewChange={handleViewChange}
            monthLabel={t('calendar.viewMonth')}
            weekLabel={t('calendar.viewWeek')}
            dayLabel={t('calendar.viewDay')}
            agendaLabel={t('calendar.viewAgenda')}
          />
        </Cluster>
      </header>
      {view === 'month' && (
        <MonthView
          grid={grid}
          events={events}
          maxLanesPerWeek={maxLanesPerWeek}
          cursor={cursor}
          onChange={handleChange}
          onDayClick={onDayClick}
          onEventClick={onEventClick}
          renderEvent={renderEvent}
        />
      )}
      {view === 'week' && (
        <WeekView
          cursor={cursor}
          events={events}
          hourRange={hourRange}
          hourRowHeight={hourRowHeight}
          locale={locale}
          weekStartsOn={weekStartsOn}
          backgroundIntervals={backgroundIntervals}
          onEventClick={onEventClick}
          onDayClick={onDayClick}
          onEventMove={onEventMove}
          onEventResize={onEventResize}
          canDropEvent={canDropEvent}
          dragSnapMinutes={dragSnapMinutes}
          renderEvent={renderEvent}
        />
      )}
      {view === 'day' && (
        <DayView
          cursor={cursor}
          events={events}
          hourRange={hourRange}
          hourRowHeight={hourRowHeight}
          locale={locale}
          resources={resources}
          backgroundIntervals={backgroundIntervals}
          onEventClick={onEventClick}
          onDayClick={onDayClick}
          onEventMove={onEventMove}
          onEventResize={onEventResize}
          canDropEvent={canDropEvent}
          dragSnapMinutes={dragSnapMinutes}
          renderEvent={renderEvent}
        />
      )}
      {view === 'agenda' && (
        <AgendaView
          days={agenda.days}
          rangeLabel={agenda.rangeLabel}
          events={events}
          locale={locale}
          onEventClick={onEventClick}
          renderEvent={renderEvent}
        />
      )}
    </div>
  );

  return locale !== undefined ? <LocaleProvider locale={locale}>{body}</LocaleProvider> : body;
});
