export type CalendarEventTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

/**
 * One event to render on the Calendar.
 *
 * - `startsAt` is the local-time start instant. `endsAt` (optional) is the
 *   local-time end instant. For multi-day events, the bar extends from the
 *   start day through the end day inclusive; week boundaries split it into
 *   continuous bars with flattened edges.
 * - `allDay: true` renders a tone-filled band without a time prefix
 *   (birthdays, vacations). Default `false` renders a tone-tinted bar with
 *   a hour-formatted time prefix.
 */
export interface CalendarEvent {
  /** Stable unique ID. Used as React key and as the `onEventClick` argument. */
  id: string;
  /** Display title. Single line; ellipses on overflow. */
  title: string;
  /** When the event starts (local time). */
  startsAt: Date;
  /** When the event ends (local time). Defaults to the start day for `allDay`, or to a point-in-time for timed events. */
  endsAt?: Date;
  /** Visual tone of the bar. Defaults to 'neutral'. */
  tone?: CalendarEventTone;
  /** Renders as a full-band, time-prefix-free bar. Defaults to false. */
  allDay?: boolean;
}

/**
 * Active Calendar view. Month + week + day in v3. Agenda lands in PR 4.
 */
export type CalendarView = 'month' | 'week' | 'day';

/**
 * One placed event bar inside the month grid. Produced by
 * `layoutEventsForMonth` and consumed by `MonthView`.
 */
export interface EventBar {
  event: CalendarEvent;
  /** Index into `MonthGrid.weeks`. */
  weekIndex: number;
  /** 1..7, inclusive — first day this bar covers within the week. */
  startCol: number;
  /** 1..7, inclusive — last day this bar covers within the week. */
  endCol: number;
  /** 0..N — lane row assignment for stacking within the week. */
  lane: number;
  /** True when the event began in a previous week — the bar's left edge is flattened. */
  continuesLeft: boolean;
  /** True when the event continues into a later week — the bar's right edge is flattened. */
  continuesRight: boolean;
}

/** Result of `layoutEventsForMonth`. */
export interface MonthLayout {
  /** Visible bars (lane < `maxLanes`) ordered by (weekIndex, lane, startCol). */
  bars: readonly EventBar[];
  /**
   * Per-cell count of events hidden because their lane is >= `maxLanes`.
   * Keyed by `toDateKey(day)`. Used by `DayCell` to render "+N more".
   */
  hiddenCounts: ReadonlyMap<string, number>;
}

/**
 * One positioned timed-event block inside an `<HourGrid>` column. Produced
 * by `layoutEventsForHourGrid` and consumed by `WeekView`/`DayView`.
 */
export interface TimedEventBlock {
  event: CalendarEvent;
  /** Column index within the rendered view (0..N-1; always 0 for DayView). */
  dayIndex: number;
  /** Minutes from `hourRange[0] * 60`. May be negative if the event started earlier. */
  startMinutes: number;
  /** Minutes from `hourRange[0] * 60`. May exceed `(hourRange[1] - hourRange[0]) * 60`. */
  endMinutes: number;
  /** 0..laneCount-1 — horizontal lane within the day's collision group. */
  lane: number;
  /** Lane count for this block's collision group; bar width = `100% / laneCount`. */
  laneCount: number;
}

/**
 * One bar in the AllDayBand (above the hour grid in WeekView/DayView).
 * Multi-day events span columns as a single visual element.
 */
export interface AllDayBar {
  event: CalendarEvent;
  /** First column the bar covers (inclusive, 0-indexed within the view). */
  startCol: number;
  /** Last column the bar covers (inclusive). */
  endCol: number;
  /** 0..N — row position within the band stack. */
  lane: number;
  /** True when the event begins before the view's first day. */
  continuesLeft: boolean;
  /** True when the event continues past the view's last day. */
  continuesRight: boolean;
}

/** Result of `layoutEventsForHourGrid`. */
export interface HourGridLayout {
  /** Positioned timed-event blocks, one per non-allDay event placed in the view. */
  timedBlocks: readonly TimedEventBlock[];
  /** Continuous bars in the all-day band above the hour grid. */
  allDayBars: readonly AllDayBar[];
}

/**
 * Context passed to a `renderEvent` callback. The chip wrapper (button +
 * tone background + tooltip + click handler + positioning) stays default;
 * the consumer's returned ReactNode replaces the inner content (time + title
 * labels). To override the chip's background fully, wrap your content in an
 * element with `position: absolute; inset: 0; background: ...` so it covers
 * the default tone fill.
 */
export interface RenderEventContext {
  /** Which view is rendering this chip. */
  view: CalendarView;
  /** True when the chip is in the all-day band (week/day) or `event.allDay` (month). */
  asAllDay: boolean;
  /** True when the bar continues from a previous week (multi-day events). */
  continuesLeft?: boolean;
  /** True when the bar continues into a next week (multi-day events). */
  continuesRight?: boolean;
  /** Pre-formatted time label. Single time (e.g., "9:00 AM") for zero-duration; range otherwise. Absent for all-day. */
  timeLabel?: string;
  /** Pre-formatted human duration ("30m" / "1h 30m" / "2d 5h"). */
  duration: string;
}

/**
 * Custom event renderer. When provided on `<Calendar>`, it's called for every
 * event chip across views; the returned ReactNode replaces the inner content
 * of the default chip. The chip wrapper still handles positioning, click,
 * tooltip, and tone background — return content with inline `background` /
 * `style` to override colors.
 */
export type RenderEvent = (
  event: CalendarEvent,
  ctx: RenderEventContext,
) => import('react').ReactNode;
