# TimeField v2 — public primitive + AM/PM + arrow nav + Now button

## Goal

Promote the internal `<TimeField>` shipped in PR #97 to a public library primitive, AND ship the four features the v1 spec explicitly cut: AM/PM (12h locale) support, full WAI-ARIA APG keyboard navigation inside the popover, and a "Now" quick-pick button. One coherent PR — all changes touch TimeField and its consumers.

## Locked-in decisions

1. **Public API.** Promote `<TimeField>` to a re-export from `src/index.ts` with a manifest entry under `Forms` and a playground demo. Add it to `AGENTS.md`'s catalog.

2. **Value shape.** Change `value` from `Date | null` to `TimeValue | null` where `TimeValue = { hours: number; minutes: number }`. Cleaner public API — a standalone time input shouldn't require consumers to manufacture a `Date` just to carry a wall-clock time. The four pickers convert at the boundary (`{ hours: value.getHours(), minutes: value.getMinutes() }` in / `combineDateAndTime` out).

3. **`hourCycle?: '12' | '24' | 'auto'`** new prop on TimeField AND on all four pickers. Default `'auto'` — derived from locale via `Intl.DateTimeFormat`. en-US, en-CA, etc. → 12h; ru-RU, de-DE, fr-FR, etc. → 24h. Explicit `'12'` / `'24'` forces.

4. **AM/PM popover column.** In 12h mode the popover gets a third column (AM/PM, 2 rows). The hours column displays `12, 1, 2, ..., 11` in 12h mode and `00, 01, ..., 23` in 24h.

5. **Arrow-key navigation.** Roving tabIndex inside the popover:
   - `ArrowUp` / `ArrowDown`: move within the focused column (no wrap)
   - `ArrowLeft` / `ArrowRight`: switch column (Hours ↔ Minutes ↔ AM/PM when in 12h)
   - `Home` / `End`: first / last row in the focused column
   - `Enter` / `Space`: commit the focused row (already wired)
   - `Escape`: close popover (already wired)
   - On popover open: focus moves to the current row in the Hours column

6. **"Now" button.** Footer row inside the popover, right-aligned text button. Click → sets value to current wall-clock time rounded via `roundTimeToStep(step)`. New i18n key `datePicker.timeNow`. Visible always when the field has a non-null value (i.e., when the popover can open).

7. **Backward compatibility.** The four picker public APIs already shipped with `granularity` + `timeStep`. The new `hourCycle` prop is additive with sensible default. Internal TimeField value-shape change is a breaking change to TimeField specifically, but TimeField was never public — only the four pickers consumed it, and they're updated in the same PR.

## API surface

### Public TimeField

```ts
/** Wall-clock time of day, 24h internal representation. */
export type TimeValue = { hours: number; minutes: number };

/** How the popover hour list + text-input display + placeholder render. */
export type HourCycle = '12' | '24' | 'auto';

export interface TimeFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Selected time. `null` disables the field. */
  value: TimeValue | null;
  /** Fired when the user commits a new time (typed blur/Enter, popover row, or Now button). */
  onChange: (value: TimeValue) => void;
  /**
   * Minutes step. Default `15`. Controls the row count in the minutes column
   * (e.g., 15 → 4 rows: 00/15/30/45) AND rounds typed input on commit. Set
   * `1` to disable rounding.
   */
  step?: number;
  /**
   * Display + parse cycle.
   * - `'24'` → hour list 00–23, text shows `"HH:mm"`.
   * - `'12'` → hour list 12, 1–11 with an AM/PM column; text shows `"h:mm AM/PM"`.
   * - `'auto'` (default) → read locale via `Intl.DateTimeFormat`; en-US → 12h, ru-RU → 24h.
   *
   * Typed input is lenient regardless of cycle — both 24h and AM/PM input parses.
   */
  hourCycle?: HourCycle;
  /** Locale for hourCycle='auto' detection + text formatting. Falls back to `useLocale()`. */
  locale?: string;
  /** Hide the "Now" button. Default `false` (button shown). */
  hideNowButton?: boolean;
  /** Accessible label. Required — TimeField is a primitive with no implicit default. */
  'aria-label': string;
  /** Disables the input + popover trigger. */
  disabled?: boolean;
  /** Stable id for the input (so an external `<label htmlFor>` can target it). */
  id?: string;
  className?: string;
}
```

### Picker prop addition

All four pickers get one new prop:

```ts
/**
 * Display cycle for the time field + trigger text. Defaults to `'auto'`
 * (derives from locale). Only meaningful when `granularity='minute'`.
 */
hourCycle?: HourCycle;
```

The pickers wire it through to TimeField AND to the trigger text formatter (`formatDateTime` becomes locale + cycle aware).

## Utility additions / changes

### `DatePicker/utils.ts`

```ts
/** Detect 12h vs 24h from locale. */
export function getLocaleHourCycle(locale: string): '12' | '24';

/** Format hours+minutes per cycle. 24: "HH:mm". 12: "h:mm AM/PM". */
export function formatTime(
  hours: number,
  minutes: number,
  hourCycle: '12' | '24',
): string;

// REPLACES the existing toTimeInputValue: same call shape but cycle-aware.
// The existing toTimeInputValue stays as an alias to `formatTime(h, m, '24')`
// for the consumers that need the wire-format value (e.g., hidden form mirrors).
export function toTimeInputValue(date: Date): string;  // still 24h, used for hidden mirror

/** Resolve hourCycle 'auto' against a locale. */
export function resolveHourCycle(hourCycle: HourCycle, locale: string): '12' | '24';
```

`parseTime(raw)` extends to accept AM/PM input case-insensitively, with or without space, optional period in "P.M.":
- `"2:30 PM"`, `"2:30PM"`, `"2:30 P.M."`, `"230pm"`, `"2pm"`, `"12am"` → 24h-internal
- `"14:30"`, `"1430"`, etc. → unchanged

The 24h-style path is tried first; AM/PM is a fallback.

### `DatePicker/utils.ts` — `formatDateTime` update

`formatDateTime(date, locale, hourCycle?: '12' | '24')` — third arg controls the time portion. Default behavior (no third arg) → 24h, matching today. Pickers pass through their resolved cycle.

Same for `formatDateTimeRange` in `DateRangePicker/utils.ts`.

## TimeField internal changes

### Keyboard navigation

Track focused column + index via state:

```ts
type FocusColumn = 'hours' | 'minutes' | 'period';
const [focus, setFocus] = useState<{ column: FocusColumn; index: number } | null>(null);
```

- On popover open: set focus to `{ column: 'hours', index: currentHourIndex }`. Use a ref to that row and call `.focus()` after rAF.
- On Arrow keys (popover's onKeyDown):
  - Up/Down: clamp index within column length
  - Left/Right: switch column. Preserve the destination column's "current" index (not the source's) — `currentHourIndex` when moving to hours, `currentMinuteIndex` when moving to minutes, `currentPeriodIndex` when moving to AM/PM
  - Home/End: index 0 / length-1
- Each row's `tabIndex={focus?.column === colName && focus.index === i ? 0 : -1}`
- A `useEffect` keyed on `focus` calls `rowRef.current?.focus()` for the row at `tabIndex=0`

### AM/PM column

When `resolvedCycle === '12'`:

- Hours rows displayed as `12, 1, 2, ..., 11` (not 0-23). Internal storage stays 0-23; display via `displayHourFromInternal(h, '12')`.
- New AM/PM column with 2 rows: `t('datePicker.timePeriodAm')` / `t('datePicker.timePeriodPm')`. Click → re-compute internal hour via the period flip:
  - AM clicked + currentHour >= 12 → new hour = currentHour - 12
  - PM clicked + currentHour < 12 → new hour = currentHour + 12
  - Otherwise no-op

### Now button

Footer inside `.timePopover`:

```tsx
<div className={styles.timeFooter}>
  <button type="button" className={styles.timeNowButton} onClick={handleNow}>
    {t('datePicker.timeNow')}
  </button>
</div>
```

`handleNow` reads `new Date()`, applies `roundTimeToStep`, calls `onChange`. Doesn't close the popover (stays open so user can fine-tune).

Footer integrates into the keyboard nav as a 4th focus target: Tab from the last row in the rightmost column lands on Now; Shift+Tab from the input crosses INTO the popover at Now (or the chevron, depending). For simplicity: Now is in the natural Tab order AFTER the listbox columns. Arrow keys don't focus it.

## Tokens additions

`DatePicker.tokens.scss`:

```scss
:root {
  // …existing tokens
  --date-picker-time-popover-footer-padding: var(--space-2);
  --date-picker-time-popover-footer-border-color: var(--color-border);
  --date-picker-time-now-button-fg: var(--color-accent);
  --date-picker-time-period-column-width: 3.5rem;  // narrower than hours/minutes
}
```

## i18n additions

```ts
'datePicker.timeNow': string;             // "Now"
'datePicker.timePeriodLabel': string;     // listbox aria-label — "Period"
'datePicker.timePeriodAm': string;        // "AM"
'datePicker.timePeriodPm': string;        // "PM"
```

en + ru. Russian: "Сейчас" / "Период" / "AM" / "PM" (the AM/PM tokens themselves are conventionally untranslated; consumers in 24h locales don't see them anyway).

## SCSS additions to `TimeField.module.scss`

- `.timeColumnPeriod` — narrow column for AM/PM (3.5rem vs 4rem default)
- `.timeFooter` — flex row, border-top, padding
- `.timeNowButton` — text button with accent color

## Files

| File | Role |
| --- | --- |
| `packages/design-system/src/components/DatePicker/utils.ts` | MODIFY — `getLocaleHourCycle`, `resolveHourCycle`, `formatTime`, extend `parseTime` for AM/PM, `formatDateTime` adds cycle arg |
| `packages/design-system/src/components/DatePicker/utils.test.ts` | MODIFY — tests for new utils + AM/PM parsing |
| `packages/design-system/src/components/DatePicker/TimeField.tsx` | MAJOR REWRITE — TimeValue shape, hourCycle, AM/PM column, arrow-nav, Now button |
| `packages/design-system/src/components/DatePicker/TimeField.module.scss` | MODIFY — `.timeColumnPeriod`, `.timeFooter`, `.timeNowButton` |
| `packages/design-system/src/components/DatePicker/TimeField.test.tsx` | MODIFY — value-shape tests + new feature tests |
| `packages/design-system/src/components/DatePicker/DatePicker.tokens.scss` | MODIFY — footer + period column tokens |
| `packages/design-system/src/components/DatePicker/DatePicker.tsx` | MODIFY — hourCycle prop, convert TimeValue at boundary, pass through to TimeField, update trigger format |
| `packages/design-system/src/components/DatePicker/InlineDatePicker.tsx` | MODIFY — same |
| `packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx` | MODIFY — hourCycle prop, boundary conversion for 2 TimeFields |
| `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.tsx` | MODIFY — same |
| `packages/design-system/src/components/DateRangePicker/utils.ts` | MODIFY — `formatDateTimeRange` accepts hourCycle |
| All 4 picker test files | MODIFY — adjust to new TimeField shape; add hourCycle / Now-button / arrow-nav tests |
| `packages/design-system/src/i18n/messages.ts` + en.ts + ru.ts | MODIFY — 4 new keys |
| `packages/design-system/src/index.ts` | MODIFY — export `TimeField`, `TimeValue`, `HourCycle`, `TimeFieldProps` |
| `packages/design-system/src/components.manifest.json` + `_meta/manifest.ts` | MODIFY — register TimeField as primitive in Forms cluster |
| `packages/design-system/AGENTS.md` | MODIFY — TimeField catalog entry + hourCycle blurb on 4 pickers |
| `packages/playground/src/pages/components/TimeFieldDemo.tsx` | NEW — standalone TimeField examples |
| `packages/playground/src/App.tsx` | MODIFY — `/components/timefield` route |
| `packages/playground/src/layout/AppShell/AppShell.tsx` | MODIFY — sidebar entry under Forms |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` | MODIFY — overview card |
| `packages/playground/src/pages/mockups/registry.ts` | MODIFY — `'TimeField'` in union |
| `packages/playground/src/pages/components/DatePickerDemo.tsx` (and 3 siblings) | MODIFY — add 12h-mode + Now-button demo sections |

## Tests (new)

### TimeField

- Value shape: pass `{ hours: 14, minutes: 30 }` → renders "14:30" or "2:30 PM" per cycle
- `hourCycle='24'` (forced): hours column 24 rows, no period column
- `hourCycle='12'` (forced): hours column 12 rows (`12, 1..11`), period column 2 rows
- `hourCycle='auto'` + en-US locale: 12h mode
- `hourCycle='auto'` + ru-RU locale: 24h mode
- AM/PM click flips period (AM hour 0 → PM hour 12; PM hour 14 → AM hour 2)
- Typed "2:30 PM" → onChange({ hours: 14, minutes: 30 })
- Typed "230pm" → same
- Typed "14:30" in 12h mode → onChange({ hours: 14, minutes: 30 })
- Now button click → onChange with current rounded time; popover stays open
- `hideNowButton` → footer not rendered
- Arrow nav: ArrowDown moves focus to next row; clamps at last row
- ArrowRight from Hours moves focus to Minutes' current row
- ArrowRight from Minutes (24h mode) is a no-op (no Period column)
- ArrowRight from Minutes (12h mode) moves to Period column
- Home/End jump to first/last row in column
- Tab from last row reaches Now button
- Existing tests adapted: queries that previously asserted on a `Date` value-shape now use TimeValue

### Pickers (each of 4)

- `hourCycle='12'` propagates: trigger shows AM/PM
- `hourCycle='auto'` + ru-RU locale: trigger shows 24h
- Typed `"05/28/2026 2:30 PM"` parses correctly
- AM/PM mode + typing 24h `"14:30"` still works
- Now button inside the time popover commits and stays open

### Backward compat

- `hourCycle` omitted + en-US locale: trigger now shows AM/PM (BEHAVIOR CHANGE from v1 — opt out via `hourCycle='24'`)
- `hourCycle` omitted + ru-RU locale: trigger still shows 24h (no change)

**Behavior change note:** v1 shipped en-US in 24h because we passed `hour12: false` everywhere. v2 reads the locale, so en-US consumers now get 12h by default. This is the correct localization behavior, but it IS a visible change. Document loudly in the PR description; consumers wanting the prior look pass `hourCycle='24'`.

## Demo page outline

`TimeFieldDemo.tsx` shows:

1. Single uncontrolled TimeField (default, 12h auto for en-US)
2. Forced 24h cycle
3. `step={30}` (2 minute rows)
4. `hideNowButton`
5. Controlled with onChange logging to a `<Code>` block
6. Disabled state

`DatePicker` / `DateRangePicker` demos add a "12-hour vs 24-hour cycle" section side-by-side.

## When NOT to use (TimeField specifically)

- For datetime: use `<DatePicker>` / `<DateRangePicker>` with `granularity='minute'`.
- For recurring schedules / cron: out of scope for any current primitive.
- As a duration input (hours + minutes elapsed): wrong semantics. Use a `<NumberInput>` + scale prop in a custom widget.

## Out of scope (still)

- Time zones — value contract stays wall-clock, no TZ.
- `granularity='second'` (seconds column) — not needed.
- Drag-to-scroll inertia on the popover columns — out of scope.
