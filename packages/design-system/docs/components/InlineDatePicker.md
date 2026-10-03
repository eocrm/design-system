# `<InlineDatePicker>` — single-date calendar in flow

```tsx
const [date, setDate] = useState<Date | null>(null);
<InlineDatePicker value={date} onChange={setDate} min={new Date()} />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `value` | `Date \| null` | no | — | Selected date. `null` = no value. Pair with `onChange` for controlled use. |
| `defaultValue` | `Date \| null` | no | — | Initial selected date for uncontrolled use. |
| `onChange` | `((date: Date \| null) => void)` | no | — | Fires when the user clicks a cell. Currently always fires with a `Date`; `null` is reserved for a future clear / deselect mechanism. |
| `locale` | `string` | no | — | Override locale (otherwise reads `useLocale()`). |
| `min` | `Date` | no | — | Earliest selectable date (inclusive). |
| `max` | `Date` | no | — | Latest selectable date (inclusive). |
| `isDateDisabled` | `((date: Date) => boolean)` | no | — | Per-date disable callback. Disabled cells are non-clickable; arrow-key nav skips them. |
| `name` | `string` | no | — | Form name. When set, renders a hidden `<input type="hidden">` mirror with the ISO date. |
| `disabled` | `boolean` | no | — | Disables interaction — cells / chevrons / keyboard nav all blocked. Defaults to `false`. |
| `granularity` | `'day' \| 'minute'` | no | — | Picker precision. - `'day'` (default) — date only; behavior unchanged from prior releases. - `'minute'` — adds a manual-entry time input below the calendar grid. The hidden form mirror (when `name` is set) emits ISO local datetime (`2026-05-28T14:30`). Time is preserved across date re-picks. Picking from a `null` value defaults the time to `00:00`. |
| `timeStep` | `number` | no | — | Minutes step for the `<TimeField>` popover and for rounding typed time input on commit. Defaults to `15`. Set `1` to disable rounding. Only meaningful when `granularity='minute'`. |
| `hourCycle` | `'12' \| '24' \| 'auto'` | no | — | Display cycle for the embedded `<TimeField>`. - `'24'` — `"HH:mm"` text input; 24h hour list in the popover. - `'12'` — `"h:mm AM/PM"` text input; 12h hour list + AM/PM column. - `'auto'` (default) — derives from the active locale via Intl. en-US → `'12'`; ru-RU → `'24'`. Only meaningful when `granularity='minute'`. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- Same month-grid surface as `<DatePicker>` but always rendered in flow — no input, no popover, no portal. Use when the calendar should be visible at all times (sidebar pickers, schedule editors, quick-filter panels).
- Cursor anchors to `value ?? new Date()` on mount and re-anchors each time `value` transitions from `null` to a non-null date (e.g. loading an async initial value, or a consumer clearing and re-setting). After a transition, later non-null `value` changes do not move the cursor — consumers own navigation into the new month via `ref`.
- `forwardRef` points at the outer wrapper `<div>` (no input to forward to).
- ARIA: same `role="grid"` + `role="gridcell"` cells from `DatePickerGrid`. No dialog role — the picker is in flow.
- **Granularity.** Pass `granularity="minute"` to render a `<TimeField>` below the grid (always visible — there's no popover to gate it on); the hidden form mirror emits ISO local datetime. Defaults to `'day'`. Time is preserved across date re-picks; the field is disabled until a date is set. Same trigger-text contract is not applicable (no trigger). `timeStep` (default `15`, in minutes) controls the TimeField's minute-list row count AND rounds typed input in the time field on commit; set `timeStep={1}` to disable rounding. `hourCycle` (default `'auto'`) forwards to the embedded TimeField — `'12'` / `'24'` force a cycle, `'auto'` derives from locale.

```tsx
// Constrained + form mirror
<form action="/api/dates">
  <InlineDatePicker name="dob" min={new Date()} />
  <button type="submit">Save</button>
</form>

// Disabled (read-only display)
<InlineDatePicker disabled defaultValue={new Date()} />
```

#### When NOT to use

- Compact form field: use `<DatePicker>` (the popover variant).
- Choosing a range: use `<InlineDateRangePicker>`.
- Seconds-precision tracking: only `granularity="minute"` is supported.
- Time-only fields (no date): out of scope.

#### Anti-patterns

- ❌ Rendering several `<InlineDatePicker>`s in one flex row without giving them their intrinsic width — the calendars get squashed. Wrap in `<Stack>` or give each a column.
- ❌ Using `value` without `onChange` — the picker is controlled when `value` is set; user clicks have no effect.
