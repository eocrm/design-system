# `<InlineDateRangePicker>` — date-range calendar in flow

```tsx
const [range, setRange] = useState<DateRange | null>(null);
<InlineDateRangePicker value={range} onChange={setRange} />;
```

- Two-month calendar grid (side-by-side) embedded directly in the page. Same click-1/click-2/restart selection machine, hover preview, auto-swap on out-of-order picks, and keyboard cross-grid navigation as `<DateRangePicker>` — without the input + popover.
- External prev/next chevrons in the header shift both grids by ±1 month at once.
- Sticky cursor (anchors to `value?.start ?? new Date()` on mount; stays where the user navigated).
- `min` / `max` / `isDateDisabled` gate both boundaries.
- `nameStart` / `nameEnd` render independent hidden form mirrors (post both, only one, or neither — caller's choice).
- `disabled` mutes everything; ref forwards to the outer wrapper.
- Use when the consumer wants the calendar permanently visible. For a compact form field with the same selection model, use `<DateRangePicker>`. Don't render inside containers narrower than ~32rem — the two grids need side-by-side room.
- **Granularity.** Pass `granularity="minute"` to render dual `<TimeField>`s (start + end) below the two-month grid; the hidden form mirrors emit ISO local datetime. Defaults to `'day'`. The start/end time inputs are shown and editable below the grid even before a range is picked — defaulting to `00:00` start / `23:59` end. Times set in this empty state are applied when the range is committed (no need to seed a placeholder range), and existing times are preserved across subsequent date picks. Same-day end-time silently clamps to ≥ start-time on every commit; different-day ranges are not clamped. `timeStep` (default `15`, in minutes) applies to BOTH TimeFields, controlling each minute-list row count AND rounding typed input in the time fields on commit; set `timeStep={1}` to disable rounding. `hourCycle` (default `'auto'`) forwards to both embedded TimeFields — `'12'` / `'24'` force a cycle, `'auto'` derives from locale.
