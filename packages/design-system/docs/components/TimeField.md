# `<TimeField>` — standalone time-of-day input

```tsx
import { TimeField, type TimeValue } from '@eocrm/design-system';
const [time, setTime] = useState<TimeValue | null>({ hours: 9, minutes: 0 });
<TimeField value={time} onChange={setTime} aria-label="Start time" />;
```

```tsx
// Forced 24-hour cycle, 30-minute step, no Now button.
<TimeField
  value={time}
  onChange={setTime}
  hourCycle="24"
  step={30}
  hideNowButton
  aria-label="Departure time"
/>
```

```tsx
// Controlled inside a custom widget — the boundary conversion the picker
// family uses internally.
<TimeField
  value={value ? { hours: value.getHours(), minutes: value.getMinutes() } : null}
  onChange={(t) => setValue(combineDateAndTime(value, t.hours, t.minutes))}
  step={15}
  aria-label="Meeting time"
  disabled={value == null}
/>
```

- Bare text input + chevron toggle that opens a popover with hour / minute (and AM/PM in 12h mode) listbox columns plus a "Now" footer button. The wrapper IS the public element; the input has no border of its own — the wrapper renders the same chrome as `<Input>`.
- Used internally by `<DatePicker>` / `<DateRangePicker>` / `<InlineDatePicker>` / `<InlineDateRangePicker>` when `granularity="minute"`; public for consumers who need a time input without a date.
- **Props (canonical):**
  - `value: TimeValue | null` — `{ hours: 0-23, minutes: 0-59 }` (internal storage is always 24-hour). `null` disables the field — the pickers use this to gate time selection on a date being chosen first.
  - `onChange: (value: TimeValue) => void` — fires on typed-input commit (blur / Enter), popover row click, AM/PM column click, or Now-button click.
  - `step?: number` — minutes step. Default `15`. Controls the minute-column row count (15 → 4 rows: 00/15/30/45) AND rounds typed input on commit. Set `1` to disable rounding.
  - `hourCycle?: '12' | '24' | 'auto'` — default `'auto'` (derived from locale via `Intl.DateTimeFormat`). en-US → 12h with AM/PM column; ru-RU → 24h with 00–23 hours.
  - `locale?: string` — override for `hourCycle='auto'` detection + text formatting; defaults to `useLocale()`.
  - `hideNowButton?: boolean` — default `false`. Hide the footer "Now" quick-pick button.
  - `'aria-label': string` — **required**. TimeField is a primitive with no implicit default.
  - `disabled?: boolean` — disables the input + popover trigger.
  - `id?: string` — stable id for the input so an external `<label htmlFor>` can target it.
- Typed input is lenient regardless of cycle — both `"14:30"` (24h) and `"2:30 PM"` / `"230pm"` (AM/PM) parse in either mode. Internal storage stays 24-hour.
- Keyboard inside the popover (WAI-ARIA APG listbox pattern with roving tabIndex per column):
  - `ArrowDown` on the input opens the popover and focuses the current hour row.
  - `ArrowUp` / `ArrowDown` move within the focused column (no wrap).
  - `ArrowLeft` / `ArrowRight` switch columns (Hours ↔ Minutes ↔ AM/PM in 12h mode).
  - `Home` / `End` jump to first / last row in the focused column.
  - `Enter` / `Space` commit the focused row.
  - `Escape` closes and returns focus to the input.
  - Tab from the last row reaches the Now button (it's outside the roving set, in natural Tab order).
- Now button reads `new Date()`, applies `roundTimeToStep(step)`, fires `onChange`, and leaves the popover open so the user can fine-tune.
- Re-exports of the underlying utils are available for consumers building their own time UI on top of TimeField: `resolveHourCycle`, `getLocaleHourCycle`, `roundTimeToStep`, types `TimeValue` / `HourCycle`.
- **When NOT to use.** For datetime (date + time-of-day), use `<DatePicker>` / `<DateRangePicker>` / `<InlineDatePicker>` / `<InlineDateRangePicker>` with `granularity="minute"` — those wire the boundary `Date ↔ TimeValue` conversion plus the hidden form mirror for you. For elapsed-duration inputs (e.g. "3h 15m" meeting length), TimeField is wrong semantics — it clamps to 23:59 and parses AM/PM; use a numeric input pair. Time zones are out of scope — the value contract is wall-clock.
