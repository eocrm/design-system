# `<InlineDatePicker>` — single-date calendar in flow

```tsx
const [date, setDate] = useState<Date | null>(null);
<InlineDatePicker value={date} onChange={setDate} min={new Date()} />;
```

- Same month-grid surface as `<DatePicker>` but always rendered in flow — no input, no popover, no portal. Use when the calendar should be visible at all times (sidebar pickers, schedule editors, quick-filter panels).
- Cursor anchors to `value ?? new Date()` on mount and stays sticky after user navigation. Programmatic `value` changes do NOT re-anchor — consumers own scroll-into-view via `ref` if they want it.
- `min` / `max` / `isDateDisabled` gate cell clicks just like the popover variant.
- `name` renders a hidden `<input type="hidden">` mirror with the ISO date so native `<form>` submission works.
- `disabled` mutes the entire grid (chevrons disabled, cells get `tabIndex=-1`, clicks no-op).
- `forwardRef` points at the outer wrapper `<div>` (no input to forward to).
- ARIA: same `role="grid"` + `role="gridcell"` cells from `DatePickerGrid`. No dialog role — the picker is in flow.
- **Granularity.** Pass `granularity="minute"` to render a `<TimeField>` below the grid (always visible — there's no popover to gate it on); the hidden form mirror emits ISO local datetime. Defaults to `'day'`. Time is preserved across date re-picks; the field is disabled until a date is set. Same trigger-text contract is not applicable (no trigger). `timeStep` (default `15`, in minutes) controls the TimeField's minute-list row count AND rounds typed input in the time field on commit; set `timeStep={1}` to disable rounding. `hourCycle` (default `'auto'`) forwards to the embedded TimeField — `'12'` / `'24'` force a cycle, `'auto'` derives from locale.
