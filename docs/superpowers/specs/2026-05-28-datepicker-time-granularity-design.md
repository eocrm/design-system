# DatePicker + DateRangePicker — time granularity

## Goal

Extend `<DatePicker>` and `<DateRangePicker>` (plus their `Inline*` siblings) so consumers can pick a **date and time**, not only a date. Backward compatible — the default behavior is unchanged. A single new prop `granularity?: 'day' | 'minute'` switches the four components into datetime mode: a manual-entry time input renders below the calendar grid, and the trigger text shows `HH:mm` after the date.

The CRM has several flows that today wedge a separate `<Input>` next to a `<DatePicker>` because the picker can't carry time (event schedules, deadline-with-cutoff, audit-log filters). After this lands, those flows collapse to one picker.

## Locked-in decisions (brainstorm)

1. **API shape:** a single `granularity?: 'day' | 'minute'` prop on each of the four components. Default `'day'` (backward compat). `'minute'` reveals a time input and adds `HH:mm` to the trigger format.
2. **Time UI:** native `<input type="time">`, wrapped in the same chrome the existing date input uses. Free locale support (12h vs 24h), free a11y, free manual entry — users type "14:30" or "2:30 PM" depending on locale, browser parses. Cheapest path to the requested behavior.
3. **Default time when picking from a null value:**
   - DatePicker → `00:00`.
   - DateRangePicker → start `00:00`, end `23:59`.
4. **Range clamp:** if start and end fall on the same calendar day and `end.time < start.time`, set `end.time = start.time` silently on commit. No error UI.
5. **No second-granularity** in v1 — minute is sufficient for CRM. `'second'` ships if and when a consumer asks.
6. **Time preservation across date re-picks:** once a value has a time, picking a different date in the grid PRESERVES the existing time-of-day (only date components change). Picking from a `null` value uses the defaults above.

## Public API surface

```ts
// All four components add one prop:
export type DateTimeGranularity = 'day' | 'minute';

export interface DatePickerProps {
  // …existing props
  /**
   * `'day'` (default) is date-only — behavior unchanged.
   * `'minute'` enables a time input below the calendar, the trigger shows
   * `HH:mm` after the date, and the hidden form mirror emits ISO datetime
   * (`2026-05-28T14:30`).
   */
  granularity?: DateTimeGranularity;
}

// Identical addition on DateRangePickerProps, InlineDatePickerProps,
// InlineDateRangePickerProps. No other prop changes.
```

The four components share the new prop. Re-exported from `src/index.ts` as `DateTimeGranularity`.

## Behaviors

### Trigger text format

| Component         | granularity='day' (default) | granularity='minute'                          |
| ----------------- | --------------------------- | --------------------------------------------- |
| DatePicker        | `05/28/2026`                | `05/28/2026 14:30`                            |
| DateRangePicker   | `05/28/2026 — 05/29/2026`   | `05/28/2026 14:30 — 05/29/2026 17:00`         |

The time portion uses the locale's hour/minute formatting via `Intl.DateTimeFormat({ hour: '2-digit', minute: '2-digit' })`. en-US users typically see 24-hour because we don't pass `hour12`; this matches the way native `<input type="time">` reads/writes its value. (Locale-aware AM/PM is a deferred enhancement — out of scope.)

### Typed parsing

`parseDateTime(raw, locale)` accepts:

- `YYYY-MM-DDTHH:mm` (ISO-like, T separator)
- `YYYY-MM-DD HH:mm` (ISO-like, space separator)
- Locale-formatted date followed by a space and `HH:mm` (e.g., `05/28/2026 14:30`)
- Locale-formatted date alone (falls through to date-only at 00:00 — useful for partial typing)

Invalid time fragment → revert to last good value (mirrors the existing invalid-date revert path).

For `DateRangePicker`, `parseDateTimeRange` splits on the same separators as `parseDateRange` (em/en dash, ` to `), then each half goes through `parseDateTime`. Both halves must parse; otherwise revert.

### Grid date pick — time preservation

When the user clicks a day in the popover grid:

- Previous `value` is `null` → use the default time (00:00 for single, 00:00/23:59 for range).
- Previous `value` exists → keep its `hours`/`minutes`, replace `year`/`month`/`day` from the clicked cell.

This makes the date grid feel "just changes the date" even when the picker is in minute mode.

### Time input behavior

The time input is `<input type="time">` styled to match the rest of the chrome:

- Step `60` (whole minutes). No seconds. No milliseconds.
- Value is `HH:mm` string (24-hour wire format; the browser locale-formats the display).
- `aria-label` from i18n (`datePicker.timeLabel`, `dateRangePicker.startTimeLabel`, `dateRangePicker.endTimeLabel`).
- Disabled when the parent picker is disabled.
- Tab order: input (date text) → calendar trigger → popover opens → first focusable grid cell → time input → (range: second time input).

On change of the time input:
- DatePicker: compute next value = `combineDateAndTime(currentValue ?? today, hours, minutes)`. If `currentValue` is `null`, the time input is disabled (you need a date first).
- DateRangePicker: compute next start/end with `combineDateAndTime`. Then apply `clampRangeEndAfterStart`.

### Range clamp rule

After every commit (date-grid click OR time-input change) in `DateRangePicker` with `granularity='minute'`:

```ts
if (start.toDateString() === end.toDateString() && end < start) {
  end = new Date(end);
  end.setHours(start.getHours(), start.getMinutes(), 59, 999);
}
```

Different days → no clamp; the range is valid regardless of time-of-day on each side.

### Hidden form mirror

| granularity | DatePicker `name`          | DateRangePicker `nameStart`/`nameEnd` |
| ----------- | -------------------------- | --------------------------------------- |
| `'day'`     | `2026-05-28` (ISO date)    | same, two fields                        |
| `'minute'`  | `2026-05-28T14:30` (local) | same shape                              |

Local datetime, no timezone suffix — consumers handle TZ at boundary. Matches `<input type="datetime-local">`'s wire format.

## Utility additions

### `packages/design-system/src/components/DatePicker/utils.ts`

```ts
/** Format a Date including HH:mm (locale-aware via Intl). */
export function formatDateTime(date: Date, locale: string): string;

/**
 * Parse a user-typed date+time string.
 * Returns a Date (local time), or null on parse failure / empty input.
 */
export function parseDateTime(raw: string, locale: string): Date | null;

/** ISO local datetime: 2026-05-28T14:30 (no TZ, no seconds). */
export function toIsoDateTime(date: Date): string;

/** Replace date's hours/minutes (and zero seconds/ms). Returns a new Date. */
export function combineDateAndTime(date: Date, hours: number, minutes: number): Date;

/** Extract { hours, minutes } from a Date as a 0-padded "HH:mm" string for native <input type="time">. */
export function toTimeInputValue(date: Date): string;
```

### `packages/design-system/src/components/DateRangePicker/utils.ts`

```ts
export function formatDateTimeRange(range: DateRange, locale: string): string;
export function parseDateTimeRange(raw: string, locale: string): DateRange | null;
/** Clamp range.end's time to >= range.start's time when same-day. No-op otherwise. */
export function clampRangeEndAfterStart(range: DateRange): DateRange;
```

`autoSwapRange` keeps its current day-granular comparison; if same day, it doesn't swap. The new `clampRangeEndAfterStart` runs AFTER `autoSwapRange` for same-day cases.

## Internal component changes

### `<DatePicker>` (popover variant)

- `useState` for time string `timeValue: string` derived from `value`. Updated on date pick + on time-input change.
- Time input rendered inside the popover, in a row beneath `<DatePickerGrid>`. Conditional on `granularity === 'minute'`.
- Trigger placeholder defaults to `"05/28/2026"` for day, `"05/28/2026 14:30"` for minute (constructed via the format util).

### `<DateRangePicker>` (popover variant)

- Two time inputs, one beneath each calendar in the two-month popover. Labelled "Start time" / "End time".
- Same `clampRangeEndAfterStart` rule on every commit.
- Trigger placeholder includes the time when minute.

### `<InlineDatePicker>` and `<InlineDateRangePicker>`

- Same time input(s) rendered as the last row of the inline component, since there's no popover. Layout: `Stack gap="sm"` around grid + time row.

## Tokens

No new component tokens. The time input borrows the existing date-input chrome via shared SCSS classes (`.timeInput` reuses `.input` styles with width override). One spacing addition:

`packages/design-system/src/components/DatePicker/DatePicker.tokens.scss`:

```scss
:root {
  // …existing tokens
  --datepicker-time-row-gap: var(--space-2);    // gap between grid and time row inside the popover
  --datepicker-time-input-width: 7.5rem;        // wide enough for "HH:mm" + a bit, narrow enough that the time field reads as separate from the date input
}
```

DateRangePicker shares the same tokens (already inherits much of DatePicker's styling).

## i18n additions

`packages/design-system/src/i18n/messages.ts`:

```ts
'datePicker.timeLabel': string;             // "Time"
'dateRangePicker.startTimeLabel': string;   // "Start time"
'dateRangePicker.endTimeLabel': string;     // "End time"
```

en.ts / ru.ts get the values. Russian: "Время" / "Время начала" / "Время окончания".

## Files

| File                                                                                  | Role                                    |
| ------------------------------------------------------------------------------------- | --------------------------------------- |
| `packages/design-system/src/components/DatePicker/utils.ts`                           | MODIFY — add the 5 utils above          |
| `packages/design-system/src/components/DatePicker/utils.test.ts`                      | MODIFY — tests for the new utils        |
| `packages/design-system/src/components/DatePicker/DatePicker.tsx`                     | MODIFY — granularity prop + time row    |
| `packages/design-system/src/components/DatePicker/DatePicker.tokens.scss`             | MODIFY — 2 new spacing tokens           |
| `packages/design-system/src/components/DatePicker/DatePicker.module.scss`             | MODIFY — `.timeRow`, `.timeInput`       |
| `packages/design-system/src/components/DatePicker/DatePicker.test.tsx`                | MODIFY — granularity tests              |
| `packages/design-system/src/components/DatePicker/InlineDatePicker.tsx`               | MODIFY — granularity prop + time row    |
| `packages/design-system/src/components/DatePicker/InlineDatePicker.module.scss`       | MODIFY — `.timeRow`, `.timeInput`       |
| `packages/design-system/src/components/DatePicker/InlineDatePicker.test.tsx`          | MODIFY — granularity tests              |
| `packages/design-system/src/components/DateRangePicker/utils.ts`                      | MODIFY — add 3 utils above              |
| `packages/design-system/src/components/DateRangePicker/utils.test.ts`                 | MODIFY — tests for the new utils        |
| `packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx`           | MODIFY — granularity prop + 2 time rows |
| `packages/design-system/src/components/DateRangePicker/DateRangePicker.module.scss`   | MODIFY — `.timeRow`, `.timeInput`       |
| `packages/design-system/src/components/DateRangePicker/DateRangePicker.test.tsx`      | MODIFY — granularity tests              |
| `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.tsx`     | MODIFY — granularity prop + 2 time rows |
| `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.module.scss` | MODIFY — `.timeRow`, `.timeInput`   |
| `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.test.tsx`| MODIFY — granularity tests              |
| `packages/design-system/src/i18n/messages.ts`                                          | MODIFY — 3 new keys                     |
| `packages/design-system/src/i18n/en.ts`                                                | MODIFY — English values                 |
| `packages/design-system/src/i18n/ru.ts`                                                | MODIFY — Russian values                 |
| `packages/design-system/src/index.ts`                                                  | MODIFY — re-export `DateTimeGranularity`|
| `packages/design-system/AGENTS.md`                                                     | MODIFY — note the new prop on all 4     |
| `packages/playground/src/pages/components/DatePickerDemo.tsx`                          | MODIFY — add granularity='minute' demo  |
| `packages/playground/src/pages/components/DateRangePickerDemo.tsx`                     | MODIFY — add granularity='minute' demo  |
| `packages/playground/src/pages/components/InlineDatePickerDemo.tsx`                    | MODIFY (if exists)                       |
| `packages/playground/src/pages/components/InlineDateRangePickerDemo.tsx`               | MODIFY (if exists)                       |

## Test surface

### Util tests (`DatePicker/utils.test.ts`)

- `formatDateTime` produces `MM/DD/YYYY HH:mm` for en-US, locale-aware for ru-RU
- `parseDateTime` parses ISO with T, ISO with space, locale + space + time, and pure date (00:00 default)
- `parseDateTime` rejects malformed time (`25:99`, single digit hours without leading zero — actually, accept single digit hours via the same chunking pattern as parseDate)
- `parseDateTime` returns `null` for empty / whitespace
- `toIsoDateTime` formats `2026-05-28T14:30` (zero-padded, no seconds)
- `combineDateAndTime` keeps year/month/day, replaces hours/minutes, zeros seconds + ms
- `toTimeInputValue` formats `HH:mm` (zero-padded)

### Util tests (`DateRangePicker/utils.test.ts`)

- `formatDateTimeRange` joins with em dash
- `parseDateTimeRange` parses both halves with time component
- `parseDateTimeRange` falls through to date-only when neither half has time
- `clampRangeEndAfterStart` adjusts same-day end-time, leaves cross-day untouched

### Component tests

For each of the 4 components, **granularity='day' (default) tests must continue to pass unmodified**. New tests:

- granularity='minute' renders the time input(s); granularity='day' does not
- granularity='minute' trigger text includes `HH:mm` after the date
- Picking a date from `null` value applies the default time (00:00 single, 00:00/23:59 range)
- Picking a different date PRESERVES existing time-of-day
- Time-input change updates the value's time without touching the date
- Range: same-day end-time < start-time → end-time clamps to start-time
- Range: different-day end-time < start-time → no clamp
- Hidden form mirror emits ISO datetime when `name` set + granularity='minute'
- Hidden form mirror still emits ISO date when granularity='day'
- Typed `parseDateTime` round-trips on blur (input → date → input)
- ru-RU locale renders date+time in Russian order

## Demo updates

`DatePickerDemo.tsx`: new section "Granularity: minute" showing a controlled DatePicker with `granularity="minute"`, a small `<Code>` showing the committed value's ISO string.

`DateRangePickerDemo.tsx`: same shape — a "Granularity: minute" section, including a same-day range to demonstrate the end-time clamp.

`InlineDatePickerDemo.tsx` / `InlineDateRangePickerDemo.tsx`: similar additions if the demos exist; otherwise just verify the inline variants stay green.

## When NOT to use (for JSDoc `@remarks`)

- **Seconds-precision tracking** — `granularity='minute'` is the finest v1. If you need second-level (e.g., scientific instrument timestamps), wrap two inputs yourself; granularity won't widen automatically.
- **Recurring events / cron-style schedules** — these need a separate schedule primitive, not a datetime picker.
- **Time-only fields (no date)** — out of scope. If a consumer needs "set an alarm" with no date, a future `<TimePicker>` is the right primitive.

## Out of scope (v1)

- Locale-aware AM/PM display in the trigger text. Native `<input type="time">` already handles 12h vs 24h based on browser locale; the trigger text uses 24h to match the wire format. AM/PM in the trigger would require Intl `hour12: true` + a wider parser. Deferred.
- A `granularity='second'` value.
- Time-zone awareness. Values are local-time `Date` objects throughout, consistent with the rest of the library.
- A separate `<TimePicker>` primitive. Deferred until time-only fields surface as a consumer need.
- A "Now" / "Today" quick-pick button on the time input. Easy to add later if requested.
