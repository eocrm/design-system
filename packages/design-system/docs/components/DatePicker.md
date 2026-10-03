# `<DatePicker>` — single-date input + popover

```tsx
const [value, setValue] = useState<Date | null>(null);
<DatePicker value={value} onChange={setValue} min={new Date()} />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `Date \| null` | no | Selected date. `null` = no value. Pair with `onChange` for controlled use. |
| `defaultValue` | `Date \| null` | no | Initial selected date for uncontrolled use. |
| `onChange` | `((date: Date \| null) => void)` | no | Fires when the value changes. |
| `locale` | `string` | no | Override locale (otherwise reads `useLocale()`). |
| `min` | `Date` | no | Earliest selectable date (inclusive, day-granular). Gates both the grid and typed input. |
| `max` | `Date` | no | Latest selectable date (inclusive). |
| `isDateDisabled` | `((date: Date) => boolean)` | no | Per-date disable callback; applied per grid cell and to parsed typed input. |
| `clearable` | `boolean` | no | Show the ✕ clear button when a value is set. Defaults to `true`. |
| `invalid` | `boolean` | no | Toggle red border + focus ring + `aria-invalid="true"`. Pair with a visible error and `aria-describedby`. |
| `name` | `string` | no | Form name. When set, renders a hidden mirror `<input>` with the ISO date so native `<form>` submission works. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | Field height + type scale. Same scale as `<Input>`. Defaults to `'md'`. Affects only the trigger row; the popover month grid is fixed-size. - `'sm'` — 24px tall. - `'md'` — 32px tall (default). - `'lg'` — 40px tall. |
| `granularity` | `'day' \| 'minute'` | no | Picker precision. - `'day'` (default) — date only; behavior unchanged from prior releases. - `'minute'` — adds a manual-entry time input below the calendar grid. The trigger text shows `HH:mm` after the date. The hidden form mirror (when `name` is set) emits ISO local datetime (`2026-05-28T14:30`). Time is preserved across date re-picks. Picking from a `null` value defaults the time to `00:00`. |
| `timeStep` | `number` | no | Minutes step for the `<TimeField>` popover and for rounding typed time input on commit. Defaults to `15`. Set `1` to disable rounding. Only meaningful when `granularity='minute'`. |
| `hourCycle` | `'12' \| '24' \| 'auto'` | no | Display cycle for the embedded `<TimeField>` + the trigger's time tail. - `'24'` — `"HH:mm"` in the trigger; 24h hour list in the time popover. - `'12'` — `"h:mm AM/PM"` in the trigger; 12h hour list + AM/PM column. - `'auto'` (default) — derives from the active locale via Intl. en-US → `'12'`; ru-RU / de-DE / fr-FR → `'24'`. Only meaningful when `granularity='minute'`. Typed input is lenient regardless of cycle — both `"14:30"` and `"2:30 PM"` parse on blur. |
| …native | | | plus native `<input>` attributes |

<!-- props:end -->

- Single-date selection (date-only by default; opt into date+time with `granularity="minute"`). Range → `<DateRangePicker>`. Year-picker — out of scope for v1.
- Looks like an `<Input>`. Click the input or press ArrowDown to open the popover. The 📅 button toggles, the ✕ button clears.
- Typed input parses on blur / Enter using the active locale: en-US `M/D/YYYY`, ru-RU `D.M.YYYY`, ja-JP `Y/M/D`. ISO `YYYY-MM-DD` is always accepted as a paste fallback. Unparseable / out-of-range / disabled input reverts to the last committed value.
- Locale-aware via `useLocale()`; override with `locale` prop. UI strings (previousMonth / nextMonth / openCalendar / clear) translate via `datePicker.*` keys — override with `<I18nProvider overrides={{ datePicker: { ... } }}>`.
- ARIA: typed input has `aria-haspopup="dialog"` + `aria-expanded`. Popover wrapper is `role="dialog"` (labelled by `aria-label={t('datePicker.openCalendar')}`); the grid inside is `role="grid"` with `role="gridcell"` buttons that carry `aria-selected` / `aria-disabled` as appropriate.
- Keyboard inside the grid: ←→↑↓ move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space selects, Escape closes and returns focus to the input. Tab leaves the grid.
- **Granularity.** Pass `granularity="minute"` to add a `<TimeField>` below the calendar grid; the trigger text becomes `MM/DD/YYYY HH:mm` (24h locales) or `MM/DD/YYYY h:mm AM/PM` (12h locales) and the hidden form mirror emits ISO local datetime (`2026-05-28T14:30`). Defaults to `'day'` (backward compat — date-only). Picking a different date re-uses the existing time-of-day, so the grid feels like it "just changes the date"; picking from `null` defaults to `00:00`. The `<TimeField>` accepts free text (parsed on blur / Enter via `parseTime` — both 24h and AM/PM shapes) AND a chevron-toggled popover with hour + minute (+ AM/PM in 12h mode) lists, plus a "Now" footer button. `timeStep` (default `15`, in minutes) controls the minute-list row count AND rounds typed input in the time field on commit; set `timeStep={1}` to disable rounding. The trigger text-input parses exactly as typed — `timeStep` does not round trigger input. `hourCycle` (default `'auto'`) forwards to the embedded TimeField and controls the trigger text — `'12'` / `'24'` force a cycle, `'auto'` derives from locale (en-US → 12h, ru-RU → 24h).

```tsx
// Uncontrolled, today as the default
<DatePicker defaultValue={new Date()} onChange={(d) => console.log(d)} />

// Constrained
<DatePicker
  value={value}
  onChange={setValue}
  min={new Date()}
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>

// Form integration via the hidden mirror
<form action="/dates"><DatePicker name="dob" /></form>
```

The popover is portaled into `document.body`, so it escapes overflow-hidden ancestors.

#### When NOT to use

- Datetime with seconds precision: only `granularity="minute"` is supported; compose with a separate input.
- Time-only fields (no date): out of scope.
- Free-form date strings without a clear locale: use a plain `<Input>`.

#### Anti-patterns

- ❌ Wrapping the picker in `<label htmlFor={id}>` while also passing `aria-label` — pick one. The wrapper label is preferred.
- ❌ Using `value` without `onChange` and expecting state to update on user input — the picker is fully controlled when `value` is passed.
