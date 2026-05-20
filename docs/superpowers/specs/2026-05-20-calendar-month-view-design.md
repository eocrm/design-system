# Calendar — PR 2: `<Calendar>` shell + Month view

**Date:** 2026-05-20
**Status:** Spec — proceeding to plan
**Scope:** Calendar UI component with Month view only. Consumes the headless date primitives from PR 1 (`useMonth`, `useLocale`).

## Goal

Ship the first usable Calendar UI surface for the CRM:

- `<Calendar>` shell — title, prev/next/today navigation, locale handling, controlled/uncontrolled cursor.
- `<MonthView>` (internal) — month grid with Google-Calendar-style continuous event bars spanning consecutive days.
- Locale-aware (uses `useMonth` + `useLocale` from PR 1).
- Read-mostly — click handlers fire on day cells and event chips; no built-in popover/modal (consumer wires their own detail UI).

## Non-goals

- Week/Day views — PR 3.
- Agenda view — PR 4.
- View switcher chrome — the `view` prop accepts `'month'` only; the segmented control arrives in PR 3 alongside the other views.
- DatePicker — separate PR; will reuse `useMonth` against a compact-cell renderer, not Calendar.
- Drag-to-create / drag-to-reschedule.
- Event creation / editing popovers.
- Recurring event expansion. Consumer pre-expands.
- Time-zone awareness — all events use local-time `Date` (matches PR 1 stance).
- Sticky "today" indicator line on Week/Day views — different views, different concern.

## File layout

```
packages/design-system/src/components/Calendar/
  Calendar.tsx              # Shell — owns title, prev/next/today, events, view child
  Calendar.module.scss
  Calendar.test.tsx
  MonthView.tsx             # Month grid (week rows × day columns + event bars)
  MonthView.module.scss
  MonthView.test.tsx
  DayCell.tsx               # Single cell — header (day number) + lane stack + overflow chip
  DayCell.module.scss
  EventChip.tsx             # Single event bar / chip (one or multi-day-span)
  EventChip.module.scss
  types.ts                  # CalendarEvent, CalendarView, EventBar
  utils.ts                  # layoutEventsForMonth — clipping, lane assignment
  utils.test.ts
  index.ts
```

`Calendar.tsx` / `Calendar.test.tsx` / `Calendar.module.scss` / `index.ts` satisfy `structure.test.ts`. The internal helpers (`MonthView`, `DayCell`, `EventChip`, `types`, `utils`) are file siblings — same pattern as Select. `MonthView.test.tsx` and `utils.test.ts` cover the rendering hot-path and the layout algorithm respectively. `DayCell` and `EventChip` are exercised through MonthView's tests.

## Public API (`types.ts` + `Calendar.tsx`)

```ts
// types.ts
export type CalendarEventTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface CalendarEvent {
  /** Stable unique ID. Used as React key and as the argument to `onEventClick`. */
  id: string;
  /** Display title. Single line; ellipses on overflow. */
  title: string;
  /** When the event starts (local time). */
  startsAt: Date;
  /**
   * When the event ends (local time). Optional.
   *
   * - For `allDay: false` (default): omit for a point-in-time event; the bar
   *   occupies the start day only. Provide for events that should span multiple
   *   days — the bar will extend to the `endsAt` day (inclusive of the day).
   * - For `allDay: true`: defaults to `startsAt` (single day) when omitted.
   *
   * If `endsAt` is on a later day than `startsAt`, the event renders as a
   * continuous bar across days inside a week, and as separate bars across
   * week boundaries (with the edges flattened on the boundary side).
   */
  endsAt?: Date;
  /** Visual tone of the chip. Defaults to 'neutral'. */
  tone?: CalendarEventTone;
  /**
   * True for events that have no specific time (birthdays, anniversaries,
   * vacation days). Renders as a tone-filled band without a time prefix.
   * False (default): rendered as a tone-tinted bar with a small time prefix.
   */
  allDay?: boolean;
}

/**
 * Currently only `'month'` is supported. Defined as a union so PR 3 can extend
 * it (`'week' | 'day' | 'agenda'`) without changing the prop shape.
 */
export type CalendarView = 'month';

// Calendar.tsx
export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  events?: readonly CalendarEvent[];
  view?: CalendarView; // defaults to 'month'

  /** Navigation cursor (controlled). Any date within the target month works. */
  value?: Date;
  /** Initial cursor (uncontrolled). Defaults to `new Date()` (today). */
  defaultValue?: Date;
  /** Fires on prev/next/today/keyboard navigation. */
  onChange?: (date: Date) => void;

  /** Fires when the user clicks empty space within a day cell. */
  onDayClick?: (date: Date) => void;
  /** Fires when the user clicks an event bar/chip. */
  onEventClick?: (event: CalendarEvent) => void;

  /** Override locale. Defaults to `useLocale()`. */
  locale?: string;
  /** Override locale-derived first day of week (0=Sun..6=Sat). */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;

  /**
   * How many event lanes to render per week before showing "+N more" in
   * affected cells. Default 3. Smaller numbers help density; larger lets
   * busy weeks breathe.
   */
  maxLanesPerWeek?: number;
}
```

## Component behavior

### `<Calendar>` shell

- Renders a header (title + Cluster of prev/next/today buttons) and the active view's component below.
- Owns the cursor state. Controlled when `value` is provided; uncontrolled otherwise. The "Today" button calls `onChange(new Date())`; prev/next call `onChange(addMonths(cursor, ±1))`.
- Passes `events`, `cursor`, `maxLanesPerWeek`, `locale`, `weekStartsOn`, `onDayClick`, `onEventClick` down to `<MonthView>`.
- ARIA: container is a `<section aria-label="<monthLabel>">`. Header buttons are real `<Button>` instances from the design system (prev/next as `size="xs" iconOnly` ghost; Today as `size="sm" secondary`).
- The shell does NOT own a popover — consumers wire their own.

### `<MonthView>`

- Internal layout: a vertical `Stack` containing a weekday-header `Cluster` then a `Stack` of week rows.
- Each week row is a `<div role="row">` containing:
  - A 7-column day-number row (`<div role="presentation">` for the day numbers; each day cell has `role="gridcell"`).
  - Below the day-number row, a stack of "lanes" (CSS grid `grid-template-columns: repeat(7, 1fr)`). Each lane renders the bars for that lane in that week, placed via `grid-column: <startCol> / <endCol + 1>`.
- After `maxLanesPerWeek` lanes, additional lanes are dropped from rendering; cells that would have shown events in dropped lanes get a `+N more` chip in the last visible lane row (or in a footer row of the cell, when no lane footer fits).
- `+N more` is clickable; calls `onDayClick(date)`.

### `<DayCell>`

Conceptually a single day in the grid. In implementation, the cell's day-number and its "+N more" footer render in the day-number row and the cell's footer; the event bars themselves live in the per-week lane stack so they can span columns.

- Day number top-left (10px from edges).
- Today: 1px accent border on top of the cell + subtle `--color-accent-bg-subtle` fill on the day-number row.
- Weekend: `--color-bg-muted` fill.
- Leading/trailing days (other months): opacity 0.5 on the day number; bars in those days still render at full strength because events on those days still matter to the consumer.
- Click on empty cell area: fires `onDayClick(date)`. Click on the day number itself also fires `onDayClick(date)`.

### `<EventChip>`

- Renders as a button (interactive).
- Tone-driven styling:
  - `allDay`: tone-filled background (`--color-<tone>`), strong-contrast foreground (`--color-<tone>-fg`)
  - timed: tone-tinted background (`--color-<tone>-bg-subtle`), tone-strong foreground (`--color-<tone>`)
- `neutral` tone uses `--color-bg-subtle` / `--color-fg`.
- Single-line, `text-overflow: ellipsis`.
- Time prefix for timed events: e.g., `9:00 Meeting with X` — uses `formatHour(startsAt.getHours(), locale)` from PR 1.
- Border-radius `--radius-sm` on rounded sides; flattened (0px) on sides where `continuesLeft` / `continuesRight` is true (so bars look continuous across weeks).
- Font size `var(--font-size-xs)` (11px), height ~18px.
- Click fires `onEventClick(event)`.

## Layout algorithm (`utils.ts`)

This is the meat of the PR — converts a flat events array + month weeks into placed bars.

```ts
export interface EventBar {
  event: CalendarEvent;
  /** Index into MonthGrid.weeks. */
  weekIndex: number;
  /** 1..7, inclusive — first day this bar covers within the week (clipped to week boundaries). */
  startCol: number;
  /** 1..7, inclusive — last day this bar covers within the week. */
  endCol: number;
  /** 0..N — row assignment within the week's lane stack. */
  lane: number;
  /** True if the event started in a previous week — flattens the bar's left edge. */
  continuesLeft: boolean;
  /** True if the event continues into a later week — flattens the bar's right edge. */
  continuesRight: boolean;
}

export interface MonthLayout {
  /** All visible bars (lane < maxLanes) ordered by (weekIndex, lane, startCol). */
  bars: readonly EventBar[];
  /**
   * Per-cell hidden-event counts. Keyed by `toDateKey(date)`. The value is the
   * number of events that exist on that day but were placed in lanes beyond
   * `maxLanes`. Used by DayCell to render the "+N more" chip.
   */
  hiddenCounts: ReadonlyMap<string, number>;
}

export function layoutEventsForMonth(
  events: readonly CalendarEvent[],
  weeks: readonly Week[],
  maxLanes: number,
): MonthLayout;
```

### Algorithm steps

1. **Normalize events.** For each event:
   - `start = startOfDay(startsAt)`
   - `end = startOfDay(endsAt ?? startsAt)` (defaults to start day)
   - If `end < start`, swap.
2. **Drop events entirely outside the grid.** The grid's first day is `weeks[0][0].date`; last is `weeks[last][6].date`. If `event.end < gridStart` or `event.start > gridEnd`, skip.
3. **Slice each event into per-week segments.** For each week, the event's segment is `[max(event.start, weekStart), min(event.end, weekEnd)]`. If the range is empty, no segment for that week.
4. **Sort all segments by (startsAt ascending, durationDesc).** Longer events get earlier lanes — looks cleaner.
5. **Per-week lane assignment (greedy).** For each week, walk segments in order. For each segment, find the lowest lane index where no existing segment in that lane overlaps the new one's column range. Assign that lane. If a new lane is needed, create one.
6. **Compute continuation flags.** For each segment: `continuesLeft = event.start < weekStart`, `continuesRight = event.end > weekEnd`.
7. **Compute `hiddenCounts`.** For each segment whose `lane >= maxLanes`, increment `hiddenCounts[toDateKey(d)]` for every day `d` in its column range.

### Edge cases

- **Single-day point-in-time event** (`endsAt` absent): `endCol === startCol`.
- **Multi-day event entirely within one week**: one bar in that week, no continuation flags.
- **Event crossing one week boundary**: two bars in consecutive weeks; first has `continuesRight: true`, second has `continuesLeft: true`.
- **Event spanning 3+ weeks**: three+ bars; middle weeks have BOTH `continuesLeft` and `continuesRight` (full-width bar across all 7 days, flattened edges).
- **Day with no events**: not in `hiddenCounts`; no overflow chip.
- **Day with exactly `maxLanes` events**: not in `hiddenCounts`; no overflow chip.
- **Day with `maxLanes + 3` events**: `hiddenCounts.get(key) === 3` (assuming each event spans only that day; if events also span other days, those days might have their own counts).
- **`allDay` events**: identical algorithm; only the visual differs in `EventChip`.

## Locale / first-day-of-week

`<Calendar>` reads `useLocale()` and computes the grid via `useMonth(value ?? defaultValue ?? new Date(), { locale, weekStartsOn })`. The `weekStartsOn` prop (when provided) overrides the locale-derived value just like in `useMonth`. Weekday labels in the header row come from the `useMonth` result.

## Keyboard / ARIA

WAI-ARIA grid pattern. Roving tab index.

- Container: `<section role="grid" aria-label="<monthLabel>" aria-readonly="true">`.
- Each week row: `<div role="row">`.
- Each day cell's button-like target: `role="gridcell"` with `tabIndex={isFocused ? 0 : -1}`.
- Focus starts on `isToday` cell if visible, else first `isCurrentMonth` cell.
- Arrow Left/Right: move focus by 1 day (wraps across week boundaries).
- Arrow Up/Down: move focus by 7 days (wraps across month boundaries — also calls `onChange` to scroll the cursor).
- Home / End: first / last cell of the week containing focus.
- PageUp / PageDown: prev/next month; focus moves to the same day-of-month (clamped to the new month's length).
- Enter / Space on a focused cell: calls `onDayClick(date)`.
- Event chips are NOT in the grid's roving-tab order. They're separately reachable by pressing Tab from the grid (standard sequential tab order); pressing Enter on a focused chip calls `onEventClick(event)`.
- `+N more` chip: same focus behavior as a normal button; reached via Tab; Enter calls `onDayClick(date)`.

## SCSS / tokens

All values from tokens. New tokens needed (added to `src/styles/tokens.scss` only if they don't exist):

- Reuse existing `--color-accent`, `--color-accent-bg-subtle`, `--color-success`, `--color-success-bg-subtle`, `--color-warning`, `--color-warning-bg-subtle`, `--color-danger`, `--color-danger-bg-subtle` for the 4 non-neutral tones. If `*-bg-subtle` variants don't exist for any tone, add them.
- Cell minimum height: `var(--space-12)` ≈ 96px (3 lane rows × ~24px + day-number row + buffers). May need a new token like `--calendar-cell-min-height: 6.5rem` if `--space-12` doesn't quite fit; preferred to inline `6.5rem`-equivalent in tokens.

No raw values in `.module.scss`. Stylelint enforces.

Rule 4 (no layout properties): Calendar's `*.module.scss` files MUST NOT set `margin`, `width: <value>`, `position: absolute/fixed`, `top/left/right/bottom`, `flex: 1`, `align-self`. Internal grid uses `display: grid` + `grid-template-columns: repeat(7, 1fr)` which is OK (intrinsic layout of the component, not consuming parent space).

## Playground demo

`packages/playground/src/pages/components/CalendarDemo.tsx`:

1. **Default (empty)** — bare shell, nav buttons work, no events.
2. **With events** — sample CRM-ish events showing all 5 tones, an `allDay` band, a 3-day meeting bar.
3. **Overflow** — a day with 7 events showing `+4 more`.
4. **Multi-week event** — a 10-day event spanning across two week boundaries (3 bars, edges flattened correctly).
5. **`ru-RU` locale** — Monday-start, Russian labels.
6. **Controlled navigation** — example with `value`/`onChange` showing the cursor in the URL hash (or just in component state).

Wired into `App.tsx` route, `AppShell.tsx` sidebar (under Display group), `ComponentsIndex.tsx`. Per playground hard rule 4.

## Test plan

### `utils.test.ts` — the layout algorithm

The bulk of complexity lives here. Tests use a fixed reference month (May 2026, Sun-start) to make assertions predictable.

- Single-day event → 1 bar in the right week
- 2-day event Mon–Tue → 1 bar with `startCol=2, endCol=3`
- 7-day event Sun–Sat (one week) → 1 bar `startCol=1, endCol=7`
- Event crossing week boundary (Fri–Tue) → 2 bars, first `continuesRight: true`, second `continuesLeft: true`
- Event spanning 3 weeks → 3 bars; middle has both continuation flags
- Two overlapping single-day events → 2 bars, lane 0 and lane 1
- Three events same day → 3 bars across 3 lanes
- 5 events same day with `maxLanes=3` → 3 bars rendered, `hiddenCounts.get(key) === 2`
- Event entirely outside the visible grid → 0 bars
- Empty events array → empty layout
- Sort stability: events with identical `startsAt` retain input order (or by `id` if specified — design choice)
- `allDay` events sort before timed events on the same day

### `MonthView.test.tsx`

- Renders 4-6 week rows for various anchor months
- Weekday header has 7 entries matching `useMonth.weekdayLabels`
- Today highlighted when visible
- Event bars rendered with correct column spans
- Multi-week event renders multiple bars; flattened-edge bars carry the appropriate class
- `+N more` chip appears when a day has hidden events
- `+N more` click fires `onDayClick`
- Event chip click fires `onEventClick`
- Empty cell click fires `onDayClick`
- Keyboard: arrow keys move focus; PageUp/Down navigates month + calls `onChange`; Enter calls `onDayClick`
- Locale `ru-RU`: Mon-first grid, Cyrillic labels

### `Calendar.test.tsx`

- Renders with default uncontrolled value (current month)
- Controlled `value` switches the displayed month
- Prev/Next buttons call `onChange` with `±1 month`
- Today button calls `onChange(new Date())`
- Forwards `className` to root
- Locale override prop wins over `useLocale()` Context
- `weekStartsOn` override wins over the locale-derived value

### `EventChip` — tested indirectly through `MonthView.test.tsx` since `EventChip` is internal.

## Verification (post-implementation)

Hard rule 8 review-fix cycle applies. Gates: `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system`. Then fresh-context reviewer until `clean enough to stop`.

Manual visual check at `make up` for the CalendarDemo:

- Default shell, empty: title + nav buttons visible and aligned
- With events: tones look right; chip text doesn't overflow ugly
- Multi-week bar: edges flatten correctly at week boundaries
- Overflow: `+N more` legible, click opens the consumer popover (in the demo, it can fire an alert)
- `ru-RU`: locale labels correct
- Focus ring visible on focused cells when tabbing
- Disabled states n/a (no disabled props in this PR)

## Risks / open items

- **Lane-stacking visual fidelity.** With many lanes per week, the cell heights grow. We don't dynamically size the cell; we fix `maxLanesPerWeek` and overflow. This is the conventional approach but means a busy week may show overflow chips heavily — verify visually in the demo.
- **Week-boundary continuation flag testing.** The algorithm is the trickiest part; spending extra test cases on this is worth it.
- **`role="grid"` vs `<table>`.** The reference WAI-ARIA pattern allows either. We use divs because the event bars need to span columns, which is messy in semantic `<table>` markup. Set `role="grid"` explicitly.
- **`useMonth` and `MonthView` both compute the week grid.** Calendar passes the `MonthGrid` from `useMonth` down to MonthView; MonthView does not call `useMonth` itself. Single source of truth.
- **`maxLanesPerWeek` default of 3.** Subjective. May need to tune after seeing the demo.
- **`structure.test.ts`** is unaffected — Calendar lives in `components/Calendar/` with the required four files (`Calendar.tsx`, `Calendar.test.tsx`, `Calendar.module.scss`, `index.ts`). Sibling files are fine (same pattern as Select).
