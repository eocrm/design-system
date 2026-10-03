# `<DateRangePicker>` — date-range input + two-month popover

```tsx
const [range, setRange] = useState<DateRange | null>(null);
<DateRangePicker value={range} onChange={setRange} min={new Date()} />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `DateRange \| null` | no | — | Selected range. `null` = no range. Pair with `onChange` for controlled use. |
| `defaultValue` | `DateRange \| null` | no | — | Initial range for uncontrolled use. |
| `onChange` | `((range: DateRange \| null) => void)` | no | — | Fires when a complete range commits (after second click in grid, or successful typed parse on blur). |
| `locale` | `string` | no | — | Override locale (otherwise reads `useLocale()`). |
| `min` | `Date` | no | — | Earliest selectable date (inclusive). Both halves and typed input are gated. |
| `max` | `Date` | no | — | Latest selectable date (inclusive). |
| `isDateDisabled` | `((date: Date) => boolean)` | no | — | Per-date disable predicate; gates both the popover grid and typed-input parsing. |
| `size` | `DateRangePickerSize` | no | — | Field height + type scale. Same scale as `<DatePicker>`. Defaults to `'md'`. Affects only the trigger row; the two-month popover grid is fixed-size. - `'sm'` — 24px tall. - `'md'` — 32px tall (default). - `'lg'` — 40px tall. |
| `clearable` | `boolean` | no | — | Show the ✕ clear button when a range is set. Defaults to `true`. |
| `invalid` | `boolean` | no | — | Toggle red border + focus ring + `aria-invalid="true"`. Pair with a visible error and `aria-describedby`. |
| `nameStart` | `string` | no | — | Form name for the START half (hidden `<input>` with an ISO date, so native `<form>` submission works). Post both keys or just one. |
| `nameEnd` | `string` | no | — | Form name for the END half. |
| `granularity` | `DateTimeGranularity` | no | — | Picker precision. - `'day'` (default) — date only; behavior unchanged from prior releases. - `'minute'` — adds two manual-entry time inputs (start + end) below the two-month grid. The trigger text shows `HH:mm` after each date. Hidden form mirrors (when `nameStart` / `nameEnd` are set) emit ISO local datetime (`2026-05-28T14:30`). At `'minute'` the start/end time inputs are shown and editable in the popover even before a range is picked (defaulting to `00:00` / `23:59`). Times entered in the empty state are applied when the range is committed (instead of the bare defaults), and existing times are preserved across date re-picks. Same-day ranges with end-time < start-time are silently clamped so end-time ≥ start-time. |
| `timeStep` | `number` | no | — | Minutes step for the start + end `<TimeField>` popovers and for rounding typed time input on commit. Defaults to `15`. Set `1` to disable rounding. Only meaningful when `granularity='minute'`. |
| `hourCycle` | `HourCycle` | no | — | Display cycle for the two embedded `<TimeField>`s + the trigger's time tails. - `'24'` — `"HH:mm"` in trigger + 24h hour lists in popovers. - `'12'` — `"h:mm AM/PM"` in trigger + 12h hour lists + AM/PM column. - `'auto'` (default) — derives from the active locale via Intl. en-US → `'12'`; ru-RU → `'24'`. Only meaningful when `granularity='minute'`. Typed input is lenient regardless of cycle — both `"14:30"` and `"2:30 PM"` parse on blur. |
| …native | | | | plus native `<input>` attributes |

<!-- props:end -->

- Date-range selection (date-only by default; opt into date+time on each side with `granularity="minute"`). Single-date → `<DatePicker>`. Multi-date / preset ranges (Today, Last 7 days) — out of scope for v1.
- Looks like an `<Input>`. Click the input or press ArrowDown to open; the popover shows two months side-by-side. The 📅 button toggles, the ✕ button clears the whole range.
- Selection flow: first click sets the start; hover (or keyboard-focus) another cell to preview the range; second click commits and closes. If the second pick is earlier than the start, the range is auto-swapped to `[earlier, later]`. A third click in a reopened popover restarts selection.
- Typed input parses on blur / Enter using the active locale. Accepts `—` (em dash), `–` (en dash), `-` (hyphen with spaces), or `to` (case-insensitive word) as the separator. ISO `YYYY-MM-DD` works for each half too. Out-of-order typed input is auto-swapped. Anything unparseable / out-of-range / disabled reverts to the last committed value.
- ARIA: typed input has `aria-haspopup="dialog"` + `aria-expanded`. Popover wrapper is `role="dialog"` (labelled by `aria-label={t('datePicker.openCalendar')}`); each grid inside is `role="grid"` with `gridcell` buttons. The range-start and range-end cells (and the live hover end during selection) carry `aria-selected="true"`.
- Keyboard inside a grid: ←→↑↓ move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space drives the same first-click → second-click flow, Escape closes and returns focus to the input. With selection-start set, the focused cell acts as the hover end so the preview range follows arrow keys.
- Reuses `<DatePickerGrid>` via `selectionMode='range'` + `rangeStart`/`rangeEnd`/`hoverDate`/`onHoverDate` + `chevrons={false}`. The two grids share the same cursor; the picker renders its own prev/next chevrons outside them.
- **Granularity.** Pass `granularity="minute"` to add dual `<TimeField>`s (start + end) below the two-month grid; the trigger text becomes `MM/DD/YYYY HH:mm — MM/DD/YYYY HH:mm` (24h locales) or `MM/DD/YYYY h:mm AM/PM — MM/DD/YYYY h:mm AM/PM` (12h locales) and the hidden form mirrors emit ISO local datetime. Defaults to `'day'` (backward compat). The start/end time inputs are shown and editable in the popover even before a range is picked — defaulting to `00:00` start / `23:59` end. Times set in this empty state are applied when the range is committed (no need to seed a placeholder range), and existing times are preserved across subsequent date picks. Same-day ranges silently clamp end-time to ≥ start-time on every commit; different-day ranges are not clamped. `timeStep` (default `15`, in minutes) applies to BOTH TimeFields, controlling each minute-list row count AND rounding typed input in the time fields on commit; set `timeStep={1}` to disable rounding. The trigger text-input parses exactly as typed — `timeStep` does not round trigger input. `hourCycle` (default `'auto'`) forwards to both embedded TimeFields and controls the trigger text — `'12'` / `'24'` force a cycle, `'auto'` derives from locale.

```tsx
// Uncontrolled
<DateRangePicker defaultValue={{ start: new Date(), end: new Date() }} />

// Controlled, constrained to a 90-day window
<DateRangePicker
  value={range}
  onChange={setRange}
  min={new Date()}
  max={new Date(Date.now() + 90 * 86_400_000)}
/>

// Form mirror, two separate fields
<form action="/api/bookings">
  <DateRangePicker nameStart="bookingStart" nameEnd="bookingEnd" />
</form>
```

#### When NOT to use

- Single date: use `<DatePicker>`.
- Seconds-precision tracking: only `granularity="minute"` is supported.
- Time-only fields (no date): out of scope.
- Multi-date selection (3+ non-contiguous dates): out of scope.

#### Anti-patterns

- ❌ Passing `value` without `onChange` — the picker is fully controlled when `value` is set; user input has no effect.
- ❌ Using `defaultValue` AND `value` together — pick one.
