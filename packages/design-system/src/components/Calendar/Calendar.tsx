import { forwardRef, useCallback, useState, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { addMonths } from '../../calendar/dateMath';
import { useMonth } from '../../calendar/useMonth';
import { MonthView } from './MonthView';
import type { CalendarEvent, CalendarView } from './types';
import styles from './Calendar.module.scss';

/**
 * UI strings consumed by `<Calendar>`. The design system ships locale-aware
 * month/weekday names via `Intl`, but UI strings like "Today" are the
 * consumer's responsibility — pass localized values via `labels`.
 */
export interface CalendarLabels {
  /** Text on the "Today" button. Default: `"Today"`. */
  today?: string;
  /** ARIA label on the previous-month chevron. Default: `"Previous month"`. */
  previousMonth?: string;
  /** ARIA label on the next-month chevron. Default: `"Next month"`. */
  nextMonth?: string;
  /** Template for the "+N more events" `aria-label`. Receives the hidden count. Default: `(n) => `${n} more events``. */
  moreEvents?: (count: number) => string;
}

export interface CalendarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Events to display. Calendar groups them internally; no pre-bucketing. */
  events?: readonly CalendarEvent[];
  /** Active view. Only `'month'` ships in this PR. */
  view?: CalendarView;
  /** Navigation cursor (controlled). Any date within the target month works. */
  value?: Date;
  /** Initial cursor (uncontrolled). Defaults to `new Date()`. */
  defaultValue?: Date;
  /** Fires on prev/next/today/keyboard navigation. */
  onChange?: (date: Date) => void;
  /** Fires when the user clicks empty space in a day cell. */
  onDayClick?: (date: Date) => void;
  /** Fires when the user clicks an event chip. */
  onEventClick?: (event: CalendarEvent) => void;
  /** Override locale. Defaults to `useLocale()`. */
  locale?: string;
  /** Override locale-derived first day of week. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Lane cap per week before "+N more" appears in affected cells. Default 3. */
  maxLanesPerWeek?: number;
  /** Localized UI strings. Each key has a sensible English default. */
  labels?: CalendarLabels;
}

const DEFAULT_LABELS: Required<CalendarLabels> = {
  today: 'Today',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  moreEvents: (n) => `${n} more events`,
};

/**
 * Month calendar with continuous event bars (Google-Calendar style).
 *
 * - Controlled via `value` / `onChange`, or uncontrolled via `defaultValue`.
 * - Events are arbitrary `CalendarEvent` objects; multi-day events render as
 *   continuous bars across days (and as separate bars across week boundaries).
 * - Locale-aware via `useLocale()` from `<LocaleProvider>`; override with the
 *   `locale` prop.
 * - Read-mostly: `onDayClick` / `onEventClick` callbacks fire; no built-in
 *   popover or modal. Wire your own detail UI on top.
 *
 * @example
 * <Calendar events={events} onEventClick={(e) => openDetail(e)} />
 *
 * @example
 * // Controlled cursor:
 * const [cursor, setCursor] = useState(new Date());
 * <Calendar value={cursor} onChange={(d) => setCursor(d)} events={events} />
 *
 * @remarks When NOT to use
 * - Single-date or date-range selection → use the future `<DatePicker>`.
 * - Hour-grid event scheduling → wait for `<WeekView>` / `<DayView>` in PR 3.
 * - Inline-edit calendars (drag-create, drag-reschedule) — out of scope; this
 *   component is read-mostly.
 *
 * @remarks Anti-patterns
 * - ❌ Mounting `<Calendar>` with no `events` prop AND no `onDayClick` — the
 *   grid is fully inert. Either provide events to display or a click handler.
 * - ❌ Wrapping `<Calendar>` in another component that strips the controlled
 *   `value` cursor — the cursor must travel with the consumer's state.
 * - ❌ Pre-grouping events by day in the consumer. Pass the flat array; the
 *   layout algorithm groups + lanes internally.
 */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  {
    events = [],
    view = 'month',
    value,
    defaultValue,
    onChange,
    onDayClick,
    onEventClick,
    locale,
    weekStartsOn,
    maxLanesPerWeek = 3,
    labels,
    className,
    ...rest
  },
  ref,
) {
  const [uncontrolled, setUncontrolled] = useState<Date>(() => defaultValue ?? new Date());
  const cursor = value ?? uncontrolled;
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

  const handleChange = useCallback(
    (next: Date) => {
      if (value === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [value, onChange],
  );

  const grid = useMonth(cursor, { locale, weekStartsOn });

  const goPrev = () => handleChange(addMonths(cursor, -1));
  const goNext = () => handleChange(addMonths(cursor, 1));
  const goToday = () => handleChange(new Date());

  return (
    <div ref={ref} className={clsx(styles.calendar, className)} {...rest}>
      <header className={styles.header}>
        <h2 className={styles.title}>{grid.monthLabel}</h2>
        <Cluster gap="xs" align="center">
          <Button
            size="xs"
            variant="ghost"
            iconOnly
            aria-label={resolvedLabels.previousMonth}
            onClick={goPrev}
          >
            <ChevronLeft size={14} />
          </Button>
          <Button size="sm" variant="secondary" onClick={goToday}>
            {resolvedLabels.today}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            iconOnly
            aria-label={resolvedLabels.nextMonth}
            onClick={goNext}
          >
            <ChevronRight size={14} />
          </Button>
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
          moreEventsLabel={resolvedLabels.moreEvents}
        />
      )}
    </div>
  );
});
