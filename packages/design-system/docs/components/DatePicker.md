# `<DatePicker>` — single-date input + popover

```tsx
const [value, setValue] = useState<Date | null>(null);
<DatePicker value={value} onChange={setValue} min={new Date()} />;
```

- Single-date selection (date-only by default; opt into date+time with `granularity="minute"`). Range → `<DateRangePicker>`. Year-picker — out of scope for v1.
- Looks like an `<Input>`. Click the input or press ArrowDown to open the popover. The 📅 button toggles, the ✕ button clears.
- Typed input parses on blur / Enter using the active locale: en-US `M/D/YYYY`, ru-RU `D.M.YYYY`, ja-JP `Y/M/D`. ISO `YYYY-MM-DD` is always accepted as a paste fallback. Unparseable / out-of-range / disabled input reverts to the last committed value.
- `min` / `max` (inclusive, day-granular) gate both the grid and typed input. `isDateDisabled(date) => boolean` is per-cell + per-parsed-input.
- `clearable` (default `true`) shows the ✕ button when a value is set. `name` renders a hidden mirror `<input type="hidden">` with the ISO date so native `<form>` submission works.
- `invalid` toggles the red border + `aria-invalid="true"`. Pair with a visible error and `aria-describedby`.
- Sizes: `sm` / `md` (default) / `lg`. Same scale as `<Input>`; affects the trigger row only — the popover month grid stays fixed.
- Locale-aware via `useLocale()`; override with `locale` prop. UI strings (previousMonth / nextMonth / openCalendar / clear) translate via `datePicker.*` keys — override with `<I18nProvider overrides={{ datePicker: { ... } }}>`.
- ARIA: typed input has `aria-haspopup="dialog"` + `aria-expanded`. Popover wrapper is `role="dialog"` (labelled by `aria-label={t('datePicker.openCalendar')}`); the grid inside is `role="grid"` with `role="gridcell"` buttons that carry `aria-selected` / `aria-disabled` as appropriate.
- Keyboard inside the grid: ←→↑↓ move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space selects, Escape closes and returns focus to the input. Tab leaves the grid.
- **Granularity.** Pass `granularity="minute"` to add a `<TimeField>` below the calendar grid; the trigger text becomes `MM/DD/YYYY HH:mm` (24h locales) or `MM/DD/YYYY h:mm AM/PM` (12h locales) and the hidden form mirror emits ISO local datetime (`2026-05-28T14:30`). Defaults to `'day'` (backward compat — date-only). Picking a different date re-uses the existing time-of-day, so the grid feels like it "just changes the date"; picking from `null` defaults to `00:00`. The `<TimeField>` accepts free text (parsed on blur / Enter via `parseTime` — both 24h and AM/PM shapes) AND a chevron-toggled popover with hour + minute (+ AM/PM in 12h mode) lists, plus a "Now" footer button. `timeStep` (default `15`, in minutes) controls the minute-list row count AND rounds typed input in the time field on commit; set `timeStep={1}` to disable rounding. The trigger text-input parses exactly as typed — `timeStep` does not round trigger input. `hourCycle` (default `'auto'`) forwards to the embedded TimeField and controls the trigger text — `'12'` / `'24'` force a cycle, `'auto'` derives from locale (en-US → 12h, ru-RU → 24h).
