# DatePicker + DateRangePicker — time granularity

## Goal

Extend `<DatePicker>` and `<DateRangePicker>` (plus their `Inline*` siblings) so consumers can pick a **date and time**, not only a date. Backward compatible — the default behavior is unchanged. A single new prop `granularity?: 'day' | 'minute'` switches the four components into datetime mode: a custom `<TimeField>` (combo of text input + popover-with-two-lists) renders below the calendar grid, and the trigger text shows `HH:mm` after the date.

The CRM has several flows that today wedge a separate `<Input>` next to a `<DatePicker>` because the picker can't carry time (event schedules, deadline-with-cutoff, audit-log filters). After this lands, those flows collapse to one picker.

## Locked-in decisions (brainstorm)

1. **API shape:** a single `granularity?: 'day' | 'minute'` prop on each of the four components. Default `'day'` (backward compat). `'minute'` reveals a `<TimeField>` and adds `HH:mm` to the trigger format.
2. **Time UI:** a custom `<TimeField>` — a text input with our chrome PLUS a chevron that opens a Floating-UI popover containing two scrollable lists (hours / minutes). Both ways of entry are supported: type freely in the input, OR click rows in the popover. The popover stays open between clicks so users can dial in both columns.
3. **Step:** `timeStep?: number` prop (minutes). Defaults to `15`. Controls the rows shown in the minutes column AND rounds typed input to the nearest step on commit. Hours column is always 0–23.
4. **Default time when picking from a null value:**
   - DatePicker → `00:00`.
   - DateRangePicker → start `00:00`, end `23:59`.
   - Both pass through `roundTimeToStep(timeStep)` so committed values are always step-aligned. (`00:00`, `23:59` are no-ops for any sensible step.)
5. **Range clamp:** if start and end fall on the same calendar day and `end.time < start.time`, set `end.time = start.time` silently on commit. No error UI.
6. **No second-granularity** in v1 — minute is sufficient for CRM. `'second'` ships if and when a consumer asks.
7. **Time preservation across date re-picks:** once a value has a time, picking a different date in the grid PRESERVES the existing time-of-day (only date components change). Picking from a `null` value uses the defaults above.

## Public API surface

```ts
// All four components add two props:
export type DateTimeGranularity = 'day' | 'minute';

export interface DatePickerProps {
  // …existing props
  /**
   * `'day'` (default) is date-only — behavior unchanged.
   * `'minute'` enables a <TimeField> below the calendar, the trigger shows
   * `HH:mm` after the date, and the hidden form mirror emits ISO datetime
   * (`2026-05-28T14:30`).
   */
  granularity?: DateTimeGranularity;

  /**
   * Step (in minutes) for the minutes list in the time popover AND for
   * rounding typed input on commit. Defaults to `15`. Set `1` for no
   * rounding. Only meaningful when `granularity='minute'`.
   */
  timeStep?: number;
}

// Identical addition on DateRangePickerProps, InlineDatePickerProps,
// InlineDateRangePickerProps. No other prop changes.
```

Re-exported from `src/index.ts` as `DateTimeGranularity`.

## `<TimeField>` — internal component

Lives at `packages/design-system/src/components/DatePicker/TimeField.tsx`. NOT exported from the package barrel — it's a DatePicker-family implementation detail. Promote to a public primitive if/when a consumer asks for a standalone time input.

### Props

```ts
interface TimeFieldProps {
  /**
   * Current value. `null` means the parent has no date yet (the field is
   * disabled in that case, since you can't pick a time without a date).
   */
  value: Date | null;
  /** Called when the user commits a new time (blur, Enter, or popover pick). */
  onChange: (hours: number, minutes: number) => void;
  /** Minutes step. Default `15`. */
  step?: number;
  /** aria-label for the input. Required (no implicit i18n default — TimeField is a primitive). */
  'aria-label': string;
  /** Disables the input + popover trigger. */
  disabled?: boolean;
  /** Stable id for the input (label `htmlFor` target). */
  id?: string;
  /** Additional className on the wrapper. */
  className?: string;
}
```

### Layout

```
┌─────────────────────────┐
│ 14:30          ⌄        │   ← .timeField (wrapper)
└─────────────────────────┘
     ↓ (popover, opens on chevron click)
┌────────┬────────┐
│  Hours │ Minutes│
├────────┼────────┤
│   00   │   00   │
│   01   │   15   │
│  ...   │   30   │
│ [14]✓  │ [30]✓  │   ← current value highlighted
│   15   │   45   │
│  ...   │        │
│   23   │        │
└────────┴────────┘
```

- Wrapper: `<div class="timeField">` — flex row, our Input chrome (border, radius, height matches size sm).
- Input: `<input class="timeInputCore" placeholder="HH:mm" inputMode="numeric" maxLength={5}>` — free typing, parse on blur/Enter via `parseTime`.
- Chevron toggle: `<button class="timeToggle">` containing `<ChevronDown />` from lucide-react. Opens / closes the popover. Clicking the chevron focuses the input AND opens the popover.
- Popover (portal, Floating UI):
  - Two `<ul>` columns, each scrollable
  - Hours: 24 rows (`00`–`23`)
  - Minutes: `60 / step` rows starting at `00` (e.g., step=15 → `00 15 30 45`; step=30 → `00 30`; step=5 → 12 rows; step=1 → 60 rows)
  - Each row is `<button role="option">` — keyboard-focusable, click commits.
  - Currently selected row in each column has `[data-current="true"]` + a checkmark on the right edge.
  - On open: scroll each column so the current value is centered (`scrollIntoView({ block: 'center' })`).
  - Popover doesn't close after a pick — user dials in both columns. Closes on outside pointerdown, Escape, or when the parent picker's popover closes.

### Typing behavior

- The text input maintains a local `draft` string (so partial keystrokes don't immediately mutate state).
- `useEffect` resets the draft from `value` whenever `value` changes externally.
- On blur or Enter: `parseTime(draft)` → if valid, round to `step`, call `onChange`; if invalid, revert draft to `toTimeInputValue(value)`.
- Accepts: `"HH:mm"`, `"H:mm"`, `"HHmm"`, `"Hmm"`, `"HH"`, `"H"` (`:00` implied), with leading/trailing whitespace trimmed.

### Popover-pick behavior

- Hour-row click: `onChange(rowHour, currentMinute)`.
- Minute-row click: `onChange(currentHour, rowMinute)`.
- When `value == null` (which shouldn't happen — the field is disabled — but defensive): no-op.

### A11y

- Wrapper: `role="group"` + `aria-label` matching the input's aria-label.
- Input: standard text input semantics + `aria-haspopup="listbox"` + `aria-expanded` + `aria-controls` pointing at the popover.
- Chevron: standard button. Inherits the field's aria-label as part of an accessible name like "Time, open list".
- Popover: portal-rendered. Each column is `<ul role="listbox" aria-label="Hours" / "Minutes">` with `<li role="option">` rows.

## Behaviors (unchanged from prior design except where noted)

### Trigger text format

| Component         | granularity='day' (default) | granularity='minute'                          |
| ----------------- | --------------------------- | --------------------------------------------- |
| DatePicker        | `05/28/2026`                | `05/28/2026 14:30`                            |
| DateRangePicker   | `05/28/2026 — 05/29/2026`   | `05/28/2026 14:30 — 05/29/2026 17:00`         |

### Typed parsing (trigger input — date-text input above the popover)

Unchanged from the prior spec — `parseDateTime` / `parseDateTimeRange` accept ISO, locale-formatted, and locale + space + time variants. They internally use a regex-based time-tail extraction.

### Grid date pick — time preservation

When the user clicks a day in the popover grid:

- Previous `value` is `null` → use the default time (00:00 for single, 00:00/23:59 for range), then round to `timeStep`.
- Previous `value` exists → keep its `hours`/`minutes`, replace `year`/`month`/`day`.

### Range clamp rule

After every commit in `DateRangePicker` with `granularity='minute'`:

```ts
if (sameDay(range.start, range.end) && range.end < range.start) {
  range.end = combineDateAndTime(range.end, range.start.getHours(), range.start.getMinutes());
}
```

Applies to grid clicks, time-field commits (both typed and popover-picked), AND to typed parses of the trigger text.

### Hidden form mirror

Unchanged: granularity='day' → `2026-05-28`; granularity='minute' → `2026-05-28T14:30`.

## Utility additions

### `packages/design-system/src/components/DatePicker/utils.ts`

```ts
/** Picker precision. `'day'` (default) is date-only; `'minute'` adds HH:mm. */
export type DateTimeGranularity = 'day' | 'minute';

/** Format a Date including HH:mm (locale-aware, 24h). */
export function formatDateTime(date: Date, locale: string): string;

/** Parse a user-typed date+time string. */
export function parseDateTime(raw: string, locale: string): Date | null;

/** ISO local datetime: 2026-05-28T14:30 (no TZ, no seconds). */
export function toIsoDateTime(date: Date): string;

/** Replace date's hours/minutes (zero seconds/ms). Returns a new Date. */
export function combineDateAndTime(date: Date, hours: number, minutes: number): Date;

/** Format a Date as "HH:mm" for the TimeField text input value. */
export function toTimeInputValue(date: Date): string;

/**
 * Parse a user-typed time string. Lenient — accepts:
 *  - "HH:mm" / "H:mm"
 *  - "HHmm" / "Hmm" (digits only)
 *  - "HH" / "H" (hours-only, mm defaults to 00)
 * Returns null for empty / whitespace / out-of-range / unparseable input.
 */
export function parseTime(raw: string): { hours: number; minutes: number } | null;

/**
 * Round time to the nearest stepMinutes increment, clamped to [00:00, 23:59].
 * Ties round to the higher minute (so 14:23 with step=15 → 14:30).
 * step <= 1 returns input unchanged.
 */
export function roundTimeToStep(
  hours: number,
  minutes: number,
  stepMinutes: number,
): { hours: number; minutes: number };
```

### `packages/design-system/src/components/DateRangePicker/utils.ts`

```ts
export function formatDateTimeRange(range: DateRange, locale: string): string;
export function parseDateTimeRange(raw: string, locale: string): DateRange | null;
/** Clamp range.end's time to >= range.start's time when same-day. */
export function clampRangeEndAfterStart(range: DateRange): DateRange;
```

## Internal component changes

### `<DatePicker>` (popover variant)

- Replace the prior `<input type="time">` with `<TimeField value={value} step={timeStep} onChange={(h, m) => setValue(combineDateAndTime(value, h, m))} aria-label={t('datePicker.timeLabel')} disabled={value == null || disabled} id={`${inputId}-time`} />`.
- Time row label remains (`<label htmlFor>...`).

### `<DateRangePicker>` (popover variant)

- Two `<TimeField>`s wrapped in `.timeRowsPair`. Labels "Start time" / "End time" from i18n.
- Each `onChange` re-composes the range and applies `clampRangeEndAfterStart`.

### `<InlineDatePicker>` and `<InlineDateRangePicker>`

- Same `<TimeField>` adoption; time row always visible when granularity='minute'.

## Tokens

`packages/design-system/src/components/DatePicker/DatePicker.tokens.scss`:

```scss
:root {
  // …existing tokens
  --date-picker-time-row-gap: var(--space-2);
  --date-picker-time-field-width: 9rem;       // wider than before to fit input + chevron
  --date-picker-time-popover-column-width: 4rem;
  --date-picker-time-popover-max-height: 14rem;  // 7 rows visible at 32px each
  --date-picker-time-popover-row-height: 32px;
  --date-picker-time-popover-row-current-bg: var(--color-accent-bg-subtle);
  --date-picker-time-popover-row-current-fg: var(--color-accent);
  --date-picker-time-popover-row-hover-bg: var(--color-bg-muted);
}
```

## Styles

The four picker `.module.scss` files keep `.timeRow`, `.timeLabel`, `.timeRowsPair`. The new TimeField has its own `TimeField.module.scss` that owns:

- `.timeField` — wrapper (display:inline-flex, border, radius, padding, focus-within ring)
- `.timeInputCore` — bare input (no border, transparent bg, flex:1)
- `.timeToggle` — chevron button (small, ghost)
- `.timePopover` — Floating UI panel (border, radius, shadow, z-popover)
- `.timeColumns` — two-column flex
- `.timeColumn` — `<ul>` styling (no list marker, overflow-y:auto, max-height)
- `.timeRow` — `<li> > <button>` styling (height, padding, hover, focus-visible)
- `.timeRowCurrent` — current-value highlight
- `.timeColumnDivider` — vertical line between columns (optional, for visual separation)

## i18n additions

`packages/design-system/src/i18n/messages.ts`:

```ts
'datePicker.timeLabel': string;             // "Time"
'dateRangePicker.startTimeLabel': string;   // "Start time"
'dateRangePicker.endTimeLabel': string;     // "End time"
'datePicker.timeHoursLabel': string;        // "Hours" — listbox aria-label
'datePicker.timeMinutesLabel': string;      // "Minutes" — listbox aria-label
'datePicker.timeOpenList': string;          // "Open time list" — chevron button aria-label suffix
```

Russian values follow the existing translation patterns.

## Files

| File                                                                                  | Role                                    |
| ------------------------------------------------------------------------------------- | --------------------------------------- |
| `packages/design-system/src/components/DatePicker/TimeField.tsx`                      | NEW — combo input + popover-with-lists  |
| `packages/design-system/src/components/DatePicker/TimeField.module.scss`              | NEW — all TimeField visual styles       |
| `packages/design-system/src/components/DatePicker/TimeField.test.tsx`                 | NEW — unit tests                        |
| `packages/design-system/src/components/DatePicker/utils.ts`                           | MODIFY — add `parseTime`, `roundTimeToStep` |
| `packages/design-system/src/components/DatePicker/utils.test.ts`                      | MODIFY — tests for the two new utils    |
| `packages/design-system/src/components/DatePicker/DatePicker.tsx`                     | MODIFY — granularity + `<TimeField>`    |
| `packages/design-system/src/components/DatePicker/DatePicker.tokens.scss`             | MODIFY — TimeField popover tokens       |
| `packages/design-system/src/components/DatePicker/DatePicker.module.scss`             | MODIFY — `.timeRow`, `.timeLabel`       |
| `packages/design-system/src/components/DatePicker/DatePicker.test.tsx`                | MODIFY — granularity tests              |
| `packages/design-system/src/components/DatePicker/InlineDatePicker.tsx`               | MODIFY — granularity + `<TimeField>`    |
| `packages/design-system/src/components/DatePicker/InlineDatePicker.module.scss`       | MODIFY — `.timeRow`, `.timeLabel`       |
| `packages/design-system/src/components/DatePicker/InlineDatePicker.test.tsx`          | MODIFY — granularity tests              |
| `packages/design-system/src/components/DateRangePicker/utils.ts`                      | MODIFY — already done                   |
| `packages/design-system/src/components/DateRangePicker/utils.test.ts`                 | MODIFY — already done                   |
| `packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx`           | MODIFY — granularity + 2x `<TimeField>` |
| `packages/design-system/src/components/DateRangePicker/DateRangePicker.module.scss`   | MODIFY — `.timeRow`, `.timeRowsPair`    |
| `packages/design-system/src/components/DateRangePicker/DateRangePicker.test.tsx`      | MODIFY — granularity tests              |
| `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.tsx`     | MODIFY — same                           |
| `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.module.scss` | MODIFY — same                       |
| `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.test.tsx`| MODIFY — same                           |
| `packages/design-system/src/i18n/messages.ts`                                          | MODIFY — already 3 keys done; add 3 more for popover lists |
| `packages/design-system/src/i18n/en.ts`                                                | MODIFY — same                           |
| `packages/design-system/src/i18n/ru.ts`                                                | MODIFY — same                           |
| `packages/design-system/src/index.ts`                                                  | MODIFY — re-export `DateTimeGranularity` + utils |
| `packages/design-system/AGENTS.md`                                                     | MODIFY — note granularity + timeStep on all 4 |
| `packages/playground/src/pages/components/DatePickersDemo.tsx`                         | MODIFY (per discovered structure)        |
| `packages/playground/src/pages/components/DateRangePickersDemo.tsx`                    | MODIFY                                   |

## Test surface

### Utility tests (`DatePicker/utils.test.ts`)

`parseTime` and `roundTimeToStep` get their own describe blocks (about 10 cases each).

### TimeField tests (`TimeField.test.tsx`)

- Renders as `<div role="group">` with passed aria-label
- Text input shows formatted value, default `placeholder="HH:mm"`
- Typing `"14:30"` and blurring calls `onChange(14, 30)`
- Typing `"1430"` and blurring calls `onChange(14, 30)` (auto-segment)
- Typing `"14"` and blurring calls `onChange(14, 0)`
- Typing invalid `"abc"` and blurring reverts (no onChange)
- Pressing Enter commits same as blur
- `step={15}` with typed `"14:22"` calls `onChange(14, 30)` (ties up — 14:22 → 14:30 vs 14:15: it's not a tie, but the spec says ties round UP — verify with explicit "14:23" → 14:30)
- Chevron click opens the popover (rendered to document.body via portal)
- Popover contains two listboxes: hours (24 rows) and minutes (`60/step` rows)
- Default step is 15 → 4 minute rows
- `step={30}` → 2 minute rows
- Current hour + minute rows have `[data-current="true"]`
- Clicking an hour row calls `onChange(rowHour, currentMinute)`
- Clicking a minute row calls `onChange(currentHour, rowMinute)`
- Popover stays open after a pick
- Outside click closes the popover
- Escape closes the popover
- `disabled=true` hides the chevron AND disables the input
- `value=null` disables the input and chevron (no popover)

### Component tests (each of the 4 pickers)

Per the original spec — but the test queries change from `getByLabelText('Time')` (input) plus targeted popover queries when needed. The "change time" tests now use `fireEvent.change(input)` + blur OR click a hour/minute row in the popover.

Each picker keeps a `timeStep` prop test asserting that the rendered minute list has the correct row count.

## Demo updates

`DatePickerDemo` + `DateRangePickerDemo` get a Granularity section that demonstrates:
- Typing into the time input
- Clicking the chevron and picking from the popover
- A `timeStep={15}` instance vs `timeStep={1}` to show the step effect
- The committed ISO datetime in a `<Code>` block

## When NOT to use (for JSDoc `@remarks`)

- **Seconds-precision tracking** — minute is the finest v1.
- **Recurring events / cron-style schedules** — needs a separate primitive.
- **Time-only fields (no date)** — out of scope. TimeField is internal to DatePicker; if you need a standalone time picker, we'll graduate TimeField to public when the need surfaces.

## Out of scope (v1)

- Public `<TimeField>` / `<TimeSelect>` primitive.
- AM/PM picker in the popover (24h list only — same as native `<input type="time">` in en-US in 24h mode).
- Time-zone awareness.
- `granularity='second'`.
- "Now" quick-pick button.
- Keyboard arrow nav inside the two popover columns (Tab-only for v1; arrow navigation deferred).
