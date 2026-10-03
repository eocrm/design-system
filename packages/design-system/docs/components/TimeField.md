# `<TimeField>` — standalone time-of-day input

```tsx
import { TimeField, type TimeValue } from '@eocrm/design-system';
const [time, setTime] = useState<TimeValue | null>({ hours: 9, minutes: 0 });
<TimeField value={time} onChange={setTime} aria-label="Start time" />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `TimeValue \| null` | yes | — | Selected time. `null` disables the field — the field cannot be activated until the parent supplies a value (used by the picker family to gate time selection on a date being chosen first). |
| `onChange` | `(value: TimeValue) => void` | yes | — | Fired when the user commits a new time, either by typing + blur / Enter, by clicking a row in the popover, or by clicking the Now button. The emitted value is always 24-hour internal regardless of display cycle. |
| `step` | `number` | no | — | Minutes step. Default `15`. Controls the row count in the minutes column (e.g., 15 → 4 rows: 00/15/30/45) AND rounds typed input on commit. Set `1` to disable rounding. |
| `hourCycle` | `HourCycle` | no | — | Display + parse cycle. - `'24'` — hour list 00–23, text input shows `HH:mm`, no AM/PM column. - `'12'` — hour list `12, 1, 2, …, 11` with an AM/PM column; text input shows `h:mm AM/PM`. - `'auto'` (default) — reads the active locale via `Intl.DateTimeFormat`; en-US → 12h, ru-RU → 24h. Typed input is lenient regardless of cycle — both 24h (`14:30`) and AM/PM (`2:30 PM`) shapes parse in either mode. |
| `locale` | `string` | no | — | Locale override for `hourCycle='auto'` detection + text formatting. Defaults to the active `<LocaleProvider>` / browser locale. |
| `hideNowButton` | `boolean` | no | — | Hide the "Now" quick-pick button in the popover footer. Default `false` (button shown). |
| `aria-label` | `string` | no | — | Accessible label. Optional, but the control MUST be named: pass `aria-label` for a standalone TimeField, OR `aria-labelledby` when an external element (e.g. a `<Field>` label) names it. If both are given, `aria-labelledby` wins. |
| `aria-labelledby` | `string` | no | — | Id(s) of element(s) that label this control — forwarded onto the inner `<input>` so a `<Field label>` names it. Takes precedence over `aria-label`. |
| `aria-describedby` | `string` | no | — | Id(s) of element(s) that describe this control (e.g. a `<Field>` error or helper message) — forwarded onto the inner `<input>`, not the wrapper, so the description is announced when the input is focused. |
| `disabled` | `boolean` | no | — | Disables the input + popover trigger. |
| `invalid` | `boolean` | no | — | Toggles the error visual and sets `aria-invalid="true"` on the text input. Pair with a visible message and `aria-describedby` pointing at its id, exactly like `Input` / `Textarea` / `Select`. TimeField was the only form control in the library without this — 15 other controls set `aria-invalid` and it set nothing, so a TimeField inside a `<Field error=…>` looked wrong and announced valid. |
| `required` | `boolean` | no | — | Sets `aria-required` on the text input. Field / SettingRow inject it; it used to fall through onto the wrapper div as a stray `required` attribute. |
| `id` | `string` | no | — | Stable id for the input (so an external `<label htmlFor>` can target it). |
| `className` | `string` | no | — | Additional className on the wrapper. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

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
