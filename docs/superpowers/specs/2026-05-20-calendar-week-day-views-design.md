# Calendar — PR 3: Week + Day views

**Date:** 2026-05-20
**Status:** Spec — proceeding to plan
**Scope:** Add `<WeekView>` (7 cols × hour rows) and `<DayView>` (1 col × hour rows) to the Calendar surface, plus a view switcher in the Calendar shell. Consumes existing primitives from PRs 1–2.

## Goal

Ship the time-based views of the Calendar — week and day grids with positioned event blocks, an all-day band, a "now" indicator, and a view switcher that lets the consumer toggle between month/week/day.

## Non-goals

- Agenda view — PR 4.
- DatePicker — separate PR, reuses `useMonth`.
- Drag-to-create / drag-to-reschedule / drag-to-resize event blocks.
- Event creation popovers.
- Recurring-event expansion.
- Time-zone-aware event math — all events use local-time `Date`.
- Snap-to-grid editing.
- Print stylesheet.

## File layout

New files under `packages/design-system/src/components/Calendar/`:

```
HourGrid.tsx              # Shared primitive: hour-row scaffold + column grid + "now" line
HourGrid.module.scss
WeekView.tsx              # 7-day hour grid using HourGrid + AllDayBand
WeekView.module.scss
WeekView.test.tsx
DayView.tsx               # Single-day hour grid using HourGrid + AllDayBand
DayView.module.scss
DayView.test.tsx
TimedEvent.tsx            # One positioned timed-event block inside an hour grid column
TimedEvent.module.scss
AllDayBand.tsx            # Multi-column band above the hour grid for allDay + multi-day events
AllDayBand.module.scss
ViewSwitcher.tsx          # Segmented control for the Calendar shell (Month/Week/Day)
ViewSwitcher.module.scss
```

Modified files:

```
Calendar.tsx                  # View dispatch (month/week/day), view switcher chrome
Calendar.test.tsx             # Tests for view switching
types.ts                      # CalendarView union extends; TimedEventBlock, AllDayBar types
utils.ts                      # Add layoutEventsForHourGrid + layoutAllDayEvents
utils.test.tsx                # Algorithm tests
AGENTS.md                     # Updated <Calendar> TL;DR for the new views
```

Internal helpers (`HourGrid`, `TimedEvent`, `AllDayBand`, `ViewSwitcher`) are file siblings of `Calendar.tsx`, tested indirectly through `WeekView.test.tsx` and `DayView.test.tsx`. The structure test only requires `<Name>.tsx`/`<Name>.test.tsx`/`<Name>.module.scss`/`index.ts` on the `Calendar` component directory itself — siblings are unconstrained.

## Public API additions

### `types.ts`

```ts
/** Calendar views. Previously `'month'`. */
export type CalendarView = 'month' | 'week' | 'day';

/** One positioned timed-event block inside an `<HourGrid>` column. */
export interface TimedEventBlock {
  event: CalendarEvent;
  /** Day index within the rendered view. 0..6 for WeekView, always 0 for DayView. */
  dayIndex: number;
  /** Vertical position (minutes from `hourRange[0] * 60`). Can be negative if the event started before `hourRange[0]`. */
  startMinutes: number;
  /** Vertical end (minutes from `hourRange[0] * 60`). */
  endMinutes: number;
  /** 0..laneCount-1 — horizontal lane within the day's collision group. */
  lane: number;
  /** Total lanes in this block's collision group (siblings overlapping this event in time). */
  laneCount: number;
}

/** One bar in the AllDayBand. Multi-day events span columns. */
export interface AllDayBar {
  event: CalendarEvent;
  /** First column the bar covers (inclusive, 0-indexed within the view). */
  startCol: number;
  /** Last column the bar covers (inclusive). */
  endCol: number;
  /** 0..laneCount-1 — row position within the band stack. */
  lane: number;
  /** True when the event begins before the view's first day. */
  continuesLeft: boolean;
  /** True when the event continues past the view's last day. */
  continuesRight: boolean;
}
```

### `CalendarProps`

```ts
export interface CalendarProps {
  // ... existing props ...

  /** Active view (controlled). When provided, pair with `onViewChange`. */
  view?: CalendarView;
  /** Initial view (uncontrolled). Defaults to `'month'`. */
  defaultView?: CalendarView;
  /** Fires when the user clicks the view switcher. */
  onViewChange?: (view: CalendarView) => void;
  /**
   * Hour range shown in week/day views (inclusive start, exclusive end).
   * Defaults to `[7, 19]` (7am–7pm). Hours outside the range are reachable
   * by scrolling the view container.
   */
  hourRange?: [number, number];
  /** Pixel height per hour row. Default 48. */
  hourRowHeight?: number;
}
```

`view` follows the same controlled/uncontrolled pattern as `value`/`defaultValue`: pass `view`+`onViewChange` for controlled, or `defaultView` for uncontrolled internal state. The view switcher renders inside the Calendar shell header.

### `CalendarLabels`

```ts
export interface CalendarLabels {
  // ... existing fields ...
  /** Segmented control labels. Defaults: 'Month' / 'Week' / 'Day'. */
  viewMonth?: string;
  viewWeek?: string;
  viewDay?: string;
}
```

## Behavior

### `<ViewSwitcher>`

Wraps the design system's `<Tabs>` component as a segmented control. Activates on click; calls Calendar's `onViewChange`. Labels come from `labels.viewMonth/viewWeek/viewDay`.

Renders to the right of the prev/next/today buttons in the Calendar header:

```
┌────────────────────────────────────────────────────────────────────┐
│  May 2026          [<] [Today] [>]   [Month][Week][Day]            │
├────────────────────────────────────────────────────────────────────┤
│  ...view content...                                                │
└────────────────────────────────────────────────────────────────────┘
```

### `<HourGrid>` — internal primitive

Renders a scrollable container with:

- A column header row (sticky top) — day labels for WeekView, single day label for DayView.
- An hour gutter on the left — labels like `9 AM`, `10 AM`, etc.
- Hour-row backgrounds (horizontal lines every `hourRowHeight` px).
- N day columns (1 or 7) with `position: relative` so timed-event blocks can position absolutely inside.
- A "now" indicator (horizontal line) when today is within the rendered range.

Layout via CSS grid:

```scss
.hourGrid {
  display: grid;
  grid-template-columns: var(--hour-gutter-width) repeat(var(--column-count), 1fr);
  /* Header row + N hour rows */
  grid-template-rows: auto repeat(var(--hour-count), var(--hour-row-height));
}
```

Each timed event block is `position: absolute` inside its day column (which is `position: relative`). `top` = `(startMinutes / 60) * hourRowHeight` px; `height` = `((endMinutes - startMinutes) / 60) * hourRowHeight` px; `width` = `100% / laneCount`; `left` = `lane * (100% / laneCount)`.

Rule 4 allows `position: relative` for child anchors. `position: absolute` on the timed-event blocks is internal layout — they're positioning themselves within their parent column, not consuming parent space. This is the same `relative + absolute` anchor pattern Tooltip/Popover use.

### `<WeekView>`

- Consumes `useWeek(cursor, { locale, weekStartsOn })` from PR 1.
- Renders an `AllDayBand` above the `HourGrid`.
- `HourGrid` with 7 columns; column headers are weekday labels + day numbers (e.g., "Mon 11").
- Today's column gets the same background tint as today in Month view.
- Weekend columns get a muted background.
- Scroll position on mount: scroll to `hourRange[0]` (top of the visible range — already the top).

### `<DayView>`

- Consumes `useDay(cursor, { locale })`.
- Same structure but with 1 column.
- Column header shows the long day label (`Wednesday, May 20`).
- Otherwise identical to WeekView's column behavior.

### `<TimedEvent>`

- Renders an `EventChip`-like button positioned absolutely inside its column.
- Wrapped in `<Tooltip>` so the full "time range + title" is reachable.
- Tone colors match `EventChip` (tinted background, strong-color text).
- Click → `onEventClick(event)`.
- Shows event title + a small time-range prefix (e.g., "9–10:30").
- If `endMinutes - startMinutes < 30`, hide the time prefix and show only the title (or just an icon if even tighter).

### `<AllDayBand>`

- Same continuous-bar approach as MonthView's bars: events spanning multiple columns render as a single bar across them, with `continuesLeft`/`continuesRight` flags flattening edges when the event extends beyond the visible range.
- Lane stacking: events sorted by `(startsAt asc, durationDesc)`, greedy lane assignment.
- Cap on visible lanes (default 2 in week/day views — narrower band than month). Overflow shows `+N more` (no popover; calls `onDayClick` like in MonthView).

### Now indicator

- A 1px horizontal line in `--color-danger` across today's column at the current time.
- Positioned absolutely inside the day column. `top = (nowMinutesFromHourRangeStart / 60) * hourRowHeight`.
- Updated every minute via `setInterval(60_000)` (cleared on unmount).
- Hidden when today is not in the rendered week or when the current time is outside `hourRange`.

### Collision layout (`layoutEventsForHourGrid`)

Algorithm — produces `TimedEventBlock[]`:

1. Filter events to those overlapping the visible date range, excluding `allDay` (those go to `AllDayBand`).
2. For each day in the range, collect events that touch that day.
3. Sort by `(startsAt asc, endsAt desc)` so longer events get earlier lanes.
4. Greedy lane assignment: walk events in order, assign to the lowest lane index where no existing event in that lane overlaps in time (`a.end > b.start && a.start < b.end`).
5. Compute `laneCount` per collision group: events that mutually overlap share a lane count. Two events with no time overlap can both be in lane 0 with laneCount=1.

The trickiest part: `laneCount` is the **maximum lane count seen across the event's collision group**, not just the global max. E.g., morning has 3 overlapping events (laneCount=3 for all of them), afternoon has 2 overlapping (laneCount=2 for those, NOT 3).

Detail: walk events in time order. Maintain "active set" = events whose interval contains the current time. For each event, its `laneCount` is `max(activeSet size at any moment during its interval)`.

```ts
export function layoutEventsForHourGrid(
  events: readonly CalendarEvent[],
  days: readonly Day[],
  hourRange: readonly [number, number],
): {
  timedBlocks: readonly TimedEventBlock[];
  allDayBars: readonly AllDayBar[];
};
```

Returns both the timed blocks (positioned within hour rows) and the all-day bars (positioned in the band).

## Visual details

- **Hour gutter width**: 60px (enough for `12:00 PM` / `09:00`).
- **Hour row height**: 48px default (configurable via `hourRowHeight`).
- **Column header height**: 40px.
- **All-day band height**: `auto` based on lane count, max ~3 lanes × 24px + padding.
- **Hour labels**: top-aligned to their row, in the gutter only (not repeated per column).
- **Hour row separator**: 1px line on `--color-border` between rows.
- **Half-hour separator**: optional, dashed line at 30-minute mark — defer unless visual demands it.
- **Today's column**: subtle `--color-accent-bg-subtle` tint.
- **Weekend columns**: subtle `--color-bg-muted` tint.

## Keyboard / ARIA

- View switcher: standard `<Tabs>` keyboard handling (already implemented in Tabs).
- HourGrid container: `role="grid"`, `aria-label="<weekLabel>"` or day label.
- Column headers: `role="columnheader"`.
- Each hour-cell intersection (not user-visible as a cell but ARIA-mapped) can be `role="gridcell"`, OR we treat each timed event as a `role="gridcell"`. **Simpler approach for v1**: only the timed event blocks are gridcells; intersection cells are presentational. Future enhancement could add click-empty-slot-to-create.
- Keyboard navigation for events: Tab from view switcher → AllDayBand events → timed events. Standard sequential focus, no roving tab index across the grid (would be confusing with absolute-positioned events).
- "Now" line: `aria-hidden="true"` — purely visual.

## Locale

- Same `<LocaleProvider>` wrapping pattern from PR 2 — Calendar wraps subtree in LocaleProvider when `locale` prop is provided, so HourGrid and TimedEvent's `formatTime` calls pick up the override.
- Hour labels formatted via `formatHour(hour, locale)` — already in the codebase from PR 1.

## Demo updates

`packages/playground/src/pages/components/CalendarDemo.tsx`:

- Add a new "Week view" Example showing the same `SAMPLE_EVENTS` with `view='week'` and `defaultView='week'`.
- Add a "Day view" Example.
- Add a "View switching (controlled)" Example demonstrating `view`/`onViewChange`.
- Update the existing ru-RU Example to pass `viewMonth`/`viewWeek`/`viewDay` labels.

The relative-date helpers (`fromToday`, `mondaysOfThisMonth`) stay — events shift to today's month.

## Testing strategy

### `utils.test.tsx` — extend with hour-grid algorithm tests

- Single timed event → 1 block, lane 0, laneCount 1.
- Two non-overlapping events same day → 2 blocks, both lane 0, each laneCount 1.
- Two overlapping events same day → 2 blocks, lanes 0 and 1, both laneCount 2.
- Three overlapping events → 3 blocks, lanes 0/1/2, all laneCount 3.
- Morning has 3 overlapping, afternoon has 2 different overlapping → morning blocks laneCount=3, afternoon blocks laneCount=2.
- Multi-day event → renders only in AllDayBand (excluded from timed blocks).
- Event starting before hour range → block clipped at top (`startMinutes` negative in input; clamped at 0 when rendered).
- Event ending after hour range → block clipped at bottom.
- `allDay` events → only in AllDayBand.

### `WeekView.test.tsx`

- Renders 7 column headers with locale-aware weekday labels.
- Renders the hour gutter with `hourRange` labels (default 7am–7pm = 12 labels).
- Custom `hourRange={[9, 17]}` → 8 hour rows.
- Custom `hourRowHeight={64}` → CSS variable / inline style updated.
- Timed event renders at correct vertical position.
- Two overlapping events → both visible at 50% width side-by-side.
- Today's column has the today class.
- Now indicator renders when today is in the week.
- All-day band renders multi-day spans.
- `onEventClick` fires from a timed event block.

### `DayView.test.tsx`

- Renders 1 column header.
- Single timed event positioned correctly.
- All-day band renders for that day only.
- Now indicator renders when the day === today.

### `Calendar.test.tsx`

- View switcher renders 3 buttons (Month/Week/Day).
- Clicking Week fires `onViewChange('week')` and renders WeekView.
- Clicking Day renders DayView.
- Uncontrolled (`defaultView='week'`) renders WeekView on mount.
- ru-RU label override changes the segmented control labels.

## SCSS / tokens

- Reuse all existing tokens.
- New SCSS module exports `--hour-row-height` and `--hour-count` as CSS custom properties — set inline from the JSX based on `hourRowHeight` and `hourRange` props.
- Hour gutter: `--hour-gutter-width: 60px` (could become a token if reused; for now inline).
- Rule 4: no `margin`, no `position: absolute` on the **outer** wrapper; absolute positioning on internal children (timed event blocks, now-line) is the explicit relative-anchor pattern.

## Risks / open items

- **Collision algorithm correctness.** Lane-count-per-event is the tricky bit. Extensive `utils.test.tsx` coverage.
- **Scroll behavior across view changes.** Switching views resets scroll. Acceptable for v1; could add scroll-restore later.
- **Now indicator re-renders.** `setInterval(60_000)` on every mounted `<WeekView>`/`<DayView>` is fine — only one is mounted at a time. Cleared on unmount.
- **Tabs as segmented control.** The design system's `<Tabs>` is full-fledged for tab navigation. Using it for a 3-option segmented control may be heavy. Alternative: a small custom segmented `<Cluster>` of buttons. Decision: **use `<Tabs>` for consistency** with the rest of the design system; if the styling feels off in the visual review, swap to a custom segmented Button group then.
- **All-day band visual density.** Default lane cap of 2 may be too few for busy weeks. Make `maxLanesPerWeek` apply to both Month and the all-day band, or add a separate `allDayMaxLanes` option. Defer — see how it looks first.
- **DayView is mostly WeekView with N=1.** Worth keeping as a separate component for ergonomics (`<Calendar view="day">` reads better than `<Calendar view="week" columnCount={1}>`), but the internal shared primitive is `HourGrid`.

## Verification (post-implementation)

Hard rule 8 review-fix cycle applies. Gates: `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system`. Then fresh-context reviewer until verdict is `clean enough to stop`.

Manual visual check at `/components/calendar`:

- Switch between Month/Week/Day — view changes without flicker.
- Week view shows a continuous "Web Summit" all-day band across the week.
- Timed events in the week match their hour positions.
- Overlapping events split into side-by-side lanes.
- Now indicator appears in today's column.
- Custom `hourRange={[9, 17]}` shows only 8 hour rows.
- ru-RU shows Russian month label + Russian segmented-control labels (when passed).
