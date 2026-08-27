import type { PaletteColor } from '../../palette';

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
  /**
   * Which resource column this event belongs to, matched against
   * `CalendarResource.id`. Only meaningful when `<Calendar>` is given
   * `resources` and rendered in `view="day"` — every other view ignores it.
   *
   * A timed event whose `resourceId` matches no supplied resource — or that
   * omits it entirely — lands in the trailing "unassigned" column, which is
   * only rendered when at least one such event exists. All-day events with no
   * `resourceId` are treated as day-wide and span every column.
   */
  resourceId?: string;
  /** Display title. Single line; ellipses on overflow. */
  title: string;
  /** When the event starts (local time). */
  startsAt: Date;
  /** When the event ends (local time). Defaults to the start day for `allDay`, or to a point-in-time for timed events. */
  endsAt?: Date;
  /**
   * Semantic state of the event — what is going on with it. Defaults to
   * `'neutral'`.
   *
   * Independent of `color`, and the two do not compete for the same pixels:
   * when `color` is also set it takes the fill and `tone` moves to a stripe on
   * the event's leading edge, so a category-coloured event can still show a
   * state that must not be missed. See `color`.
   */
  tone?: CalendarEventTone;
  /**
   * Category identity — WHICH kind of thing this event is, as one of the 30
   * `PaletteColor`s. Use it when your events belong to a colour-bearing
   * category the tenant chose (an appointment type, a calendar, a resource
   * class).
   *
   * Paints the block itself: the palette's tinted background with its saturated
   * colour for text and border. That is deliberate — in a calendar the natural
   * reading is that the block IS the colour, rather than that it carries a
   * small coloured dot.
   *
   * `color` and `tone` are different axes and are shown together rather than
   * one overriding the other: `color` takes the fill, and a non-`neutral`
   * `tone` becomes a saturated stripe down the event's leading edge. So a
   * "consultation" that is also "masked" reads as both. With no `color`, tone
   * behaves exactly as before and paints the whole block.
   *
   * In the agenda view, where the row is not filled, `color` sets the leading
   * dot and `tone` the band.
   *
   * **Unlike `Badge`**, where `color` overrides `tone` entirely, Calendar
   * renders both. The reason is that a calendar tone can carry states closer to
   * safety than decoration — a masked hour, a released slot — and silently
   * dropping one would make a free hour read as a booked one.
   *
   * **Pick category colours that contrast with the semantic tones you use.**
   * The band and the category fill are different colours by design, but some
   * pairs land almost on top of each other. Measured RGB distance between each
   * band colour and the category's own saturated colour — the worst pairs,
   * grouped by tone and ordered within each group:
   *
   * - `tone: 'success'` — `mint` (11), `emerald` (15), `teal` (35), `green` (41)
   * - `tone: 'danger'` — `red` (17), `coral` (44)
   * - `tone: 'warning'` — `orange` (16), `coral` (25), `red` (43), `amber` (44)
   * - `tone: 'accent'` — `blue` (40)
   *
   * Read it as a threshold, not a ranking. The worst pair is `success` +
   * `mint` at 11, and anything under about 20 is effectively invisible at the
   * rendered 4px — a 3px band plus the 1px border painted the same colour.
   * (The agenda row has no border, so its stripe is the 3px alone.) The low 20s
   * are detectable side-by-side but unreliable in isolation, and the low 40s
   * are where this list stops rather than where the problem does: the pair just
   * off the end is no safer than the last one on it. Nothing enforces this — if a tenant picks `mint` for a
   * category whose events can be `success`, keep that state in the title too.
   *
   * These numbers moved in #484, which raised `danger`, `success`, and `accent`
   * to clear WCAG AA as text. The bands got closer to their neighbouring
   * category colours as a result: `success` + `mint` went 18 → 11 and `danger`
   * + `red` went 36 → 17. `Calendar.collisions.test.ts` recomputes this list
   * from the shipped tokens so it cannot drift again.
   *
   * **Both axes are visual only.** Neither sets ARIA, and a 3px band is not an
   * accessible signal — same contract as `Badge`, whose tone is also decoration.
   * If a state must reach assistive tech, keep it in the event `title` (or wrap
   * your own live region); do not rely on the band alone.
   *
   * On a multi-day bar the band repeats on every segment, including ones that
   * continue from a previous week. It marks the event's state, not its start.
   *
   * @example
   * // A booked consultation: category violet, no special state.
   * { id: '1', title: 'Consultation', startsAt, color: 'violet' }
   *
   * @example
   * // Same category, but the slot was released — colour AND state, both visible.
   * { id: '2', title: 'Consultation', startsAt, color: 'violet', tone: 'success' }
   */
  color?: PaletteColor;
  /** Renders as a full-band, time-prefix-free bar. Defaults to false. */
  allDay?: boolean;
}

/**
 * One bookable subject rendered as its own column in the resource day view:
 * a practitioner, a chair, a room, a bay. Pass an array of these as
 * `<Calendar resources={…} view="day">` to split the day into lanes that
 * share one time axis and one scroll container.
 */
export interface CalendarResource {
  /** Stable id. Matched against `CalendarEvent.resourceId`. */
  id: string;
  /** Column header text. Not translated by the library — pass it localized. */
  label: string;
}

/**
 * Shading intent for a `CalendarBackgroundInterval`.
 *
 * - `'unavailable'` — outside working hours / closed / blocked. Shaded, so
 *   the user can see that the row exists and is not bookable.
 * - `'available'` — working and free. Lightly tinted, so bookable space
 *   reads differently from closed space.
 */
export type CalendarBackgroundTone = 'available' | 'unavailable';

/**
 * A non-interactive band painted behind the hour grid — the availability
 * underlay. Use it to distinguish "closed" from "open and free"; "open and
 * busy" is already expressed by the event blocks themselves.
 *
 * Intervals are an interval list rather than a weekly-hours object on
 * purpose: working hours vary per day (a lunch break, a Tuesday late
 * evening), per date (a public holiday, a short day) and per column (each
 * practitioner has their own shift), and only an interval list expresses all
 * three.
 */
export interface CalendarBackgroundInterval {
  /** Start instant (local time). */
  startsAt: Date;
  /** End instant (local time). Must be after `startsAt`; equal/inverted intervals are dropped. */
  endsAt: Date;
  /**
   * Restrict this band to one resource column. Ignored unless the view
   * actually has resource columns — in week view and in a resource-less day
   * view every interval applies to whichever columns its dates cover.
   *
   * Note that dropping the `resourceId` filter does NOT make an interval
   * span the week: intervals are always clipped to each column's own date,
   * so shading 08:00–09:00 across a week takes seven intervals, one per day.
   */
  resourceId?: string;
  /** Shading intent. Defaults to `'unavailable'`. */
  tone?: CalendarBackgroundTone;
}

/**
 * The new placement proposed by a drag. Passed to `onEventMove`.
 *
 * The event's wall-clock duration is preserved: a 90-minute booking stays 90
 * minutes on the clock. On a daylight-saving transition day that is not the
 * same as preserving elapsed time — the proposal keeps the clock duration,
 * which is what a calendar means by "the same appointment, an hour later" —
 * and a start that lands in a skipped hour normalizes forward (02:30 → 03:30).
 */
export interface CalendarEventMove {
  /** Proposed new start instant (local time), snapped to `dragSnapMinutes`. */
  startsAt: Date;
  /**
   * Proposed new end instant (local time). Always present, even for an event
   * that omitted `endsAt` — such an event has zero duration, so `endsAt`
   * equals `startsAt`. Committing the proposal verbatim therefore turns an
   * open-ended event into an explicitly zero-length one; keep `endsAt`
   * undefined in your own state if that distinction matters to you.
   */
  endsAt: Date;
  /**
   * The resource column the event was dropped on, when the view has resource
   * columns. `undefined` means the unassigned column (or a view without
   * resource columns at all).
   */
  resourceId?: string;
}

/**
 * The new duration proposed by a resize. Passed to `onEventResize`;
 * `startsAt` is unchanged from the original event.
 */
export interface CalendarEventResize {
  /** Unchanged start instant. */
  startsAt: Date;
  /** Proposed new end instant (local time), snapped to `dragSnapMinutes`. */
  endsAt: Date;
}

/**
 * The placement `canDropEvent` is asked to judge, discriminated by which
 * gesture produced it.
 *
 * A move and a resize are different questions — "may this booking be
 * relocated (possibly to another practitioner)?" versus "may it run longer?" —
 * and ordinary rules distinguish them. Without the tag they are
 * indistinguishable: the predicate fires continuously *during* the drag,
 * including while the pointer is still at the origin, where both gestures
 * report the event's own start.
 *
 * `mode` narrows the payload, so `resourceId` is only reachable on the branch
 * where a drag can actually change it.
 */
export type CalendarDropCandidate =
  | ({ mode: 'move' } & CalendarEventMove)
  | ({
      mode: 'resize';
      /**
       * The lane the event is already in. Present on this branch too — a
       * resize cannot CHANGE the column, but per-resource rules ("Ben's shift
       * ends at 14:00") still need to know which one they are judging.
       */
      resourceId?: string;
    } & CalendarEventResize);

/**
 * What a drag handler may return. Returning `false` — or a promise that
 * resolves to `false` or rejects — rejects the drop and the block snaps back
 * to where it started. Returning nothing accepts it.
 *
 * Accepting does NOT move the event on its own: `events` stays the source of
 * truth, so the consumer must commit the change to their own state.
 */
export type CalendarDropResult = void | boolean | Promise<void | boolean>;

/**
 * Active Calendar view. Month / week / day render a grid; agenda is a
 * scannable list of events grouped by day for the cursor's current week.
 */
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

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
 *
 * Horizontal placement (Google-Calendar-style cascade):
 * - Lanes are offset to the right by a small constant step per lane
 *   (`LANE_OFFSET_PERCENT` in TimedEvent.tsx — currently 10% of the column
 *   width). Every block still extends to the column's right edge.
 * - Higher lanes overlay earlier ones via `z-index = lane + 1`, so the
 *   later/right-side event partially covers the one beneath while keeping
 *   the predecessor's left edge visible.
 * - On hover or keyboard focus, a block lifts to `left: 0; width: 100%`
 *   above all neighbours — see TimedEvent.module.scss.
 */
export interface TimedEventBlock {
  event: CalendarEvent;
  /**
   * Column index within the rendered view (0..N-1). One per weekday in week
   * view; `0` in a plain day view; one per resource (plus the trailing
   * unassigned column, when present) in a resource day view.
   */
  dayIndex: number;
  /** Minutes from `hourRange[0] * 60`. May be negative if the event started earlier. */
  startMinutes: number;
  /** Minutes from `hourRange[0] * 60`. May exceed `(hourRange[1] - hourRange[0]) * 60`. */
  endMinutes: number;
  /** Cascade lane within the collision group (0..N). Drives both left offset and z-index. */
  lane: number;
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

/**
 * One painted band of the availability underlay, positioned inside a single
 * hour-grid column. Produced by `layoutBackgroundIntervals`.
 */
export interface BackgroundBlock {
  /** Stable React key (interval index + column index). */
  key: string;
  /** Column index within the rendered view. */
  dayIndex: number;
  /** Minutes from `hourRange[0] * 60`, clamped to the visible range. */
  startMinutes: number;
  /** Minutes from `hourRange[0] * 60`, clamped to the visible range. */
  endMinutes: number;
  /** Resolved tone (defaults applied). */
  tone: CalendarBackgroundTone;
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
 *
 * Note on truncation. The rule, rather than the per-view markup, because the
 * markup differs. A flex item gets an automatic minimum size — a floor at its
 * own content's min-content width — while its computed `overflow` is
 * NON-SCROLLABLE (CSS Flexbox §4.5). The non-scrollable values are `visible`
 * and `clip`, which keep the floor; the scrollable ones (`hidden` / `auto` /
 * `scroll`) drop it to `0`. So wherever your
 * content lands in a flex ROW, anything you put there that is not a scroll
 * container is floored, and a long `<Text truncate>` inside it never
 * ellipsizes.
 *
 * That is the whole difference between your content and the DS default title.
 * The default title's span sets `overflow: hidden`, making it a scroll
 * container, so it has no automatic minimum to begin with — not because it is a
 * direct child, and not because of the `min-width: 0` it also carries. A
 * `Cluster` sets no `overflow` at all, so it is floored, and `minWidth0` is how
 * you release it.
 *
 * `<Text truncate>` sets both `overflow: hidden` and `min-width: 0`, which is
 * why the inner text is fine either way. What it cannot do is release the floor
 * on a WRAPPER around it — and you need a wrapper as soon as your content has a
 * leading element (a `Dot`, an icon). Inside the button the only valid wrapper
 * among the DS layout primitives is `<Cluster as="span">` (`Stack` and `Constrain`
 * render a `<div>`), so that is where `minWidth0` goes:
 *
 * ```tsx
 * <Cluster as="span" gap="xs" align="center" wrap={false} minWidth0>
 * ```
 *
 * Where that applies: the event chip — month cells AND the all-day band, so in
 * month, week and day — and short hour-grid blocks, where the button itself is
 * the row; plus the agenda row, where the row is an inner span rather than the
 * button.
 *
 * What happens to the overflow is decided by the ELEMENT, not the view:
 * `EventChip`'s chip and `TimedEvent`'s block set `overflow: hidden` on
 * themselves, so they cut it. The agenda row sets none anywhere up the tree, so
 * an unguarded wrapper there does not clip — it widens the document and gives
 * the whole page a horizontal scrollbar, which is the louder failure of the
 * two.
 *
 * Where it does NOT: a tall hour-grid block is `flex-direction: column` (see
 * the layout note below), and the automatic minimum size applies only on the
 * main axis, so there is no horizontal floor to release and `minWidth0` is a
 * no-op.
 *
 * ```tsx
 * renderEvent={(event) => (
 *   <Cluster as="span" gap="xs" align="center" wrap={false} minWidth0>
 *     <Dot color="violet" />
 *     <Text as="span" size="inherit" truncate>{event.title}</Text>
 *   </Cluster>
 * )}
 * ```
 *
 * Note on layout: for hour-grid blocks shorter than ~30px tall (`isShort`),
 * the wrapping `<button>` switches from `flex-direction: column` to `row`
 * to keep the start time visible alongside the title. Author your inner
 * content so it works in both layouts (e.g., let text shrink with
 * `min-width: 0; overflow: hidden` instead of pinning a fixed width).
 */
export type RenderEvent = (
  event: CalendarEvent,
  ctx: RenderEventContext,
) => import('react').ReactNode;
