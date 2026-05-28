# TimeField v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Promote `<TimeField>` to a public primitive; add `hourCycle` (12/24/auto), AM/PM popover column, full APG keyboard navigation, and "Now" quick-pick button. One PR spanning utils, TimeField, all four pickers, exports/manifest/docs, and playground demos.

**Branch:** `feat/timefield-v2-amp-arrowkeys-now` (already checked out).

**Spec:** `docs/superpowers/specs/2026-05-28-timefield-v2-design.md`.

---

## Task 1: i18n + utils

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts`
- Modify: `packages/design-system/src/components/DatePicker/utils.ts`
- Modify: `packages/design-system/src/components/DatePicker/utils.test.ts`
- Modify: `packages/design-system/src/components/DateRangePicker/utils.ts`
- Modify: `packages/design-system/src/components/DateRangePicker/utils.test.ts`

### i18n keys

| Key | en | ru |
| --- | --- | --- |
| `datePicker.timeNow` | `Now` | `Сейчас` |
| `datePicker.timePeriodLabel` | `Period` | `Период` |
| `datePicker.timePeriodAm` | `AM` | `AM` |
| `datePicker.timePeriodPm` | `PM` | `PM` |

### Utils additions (`DatePicker/utils.ts`)

```ts
/** Display+parse cycle. */
export type HourCycle = '12' | '24' | 'auto';

/** Wall-clock time of day, 24h internal representation. */
export type TimeValue = { hours: number; minutes: number };

/** True 12-hour locale detection via Intl. */
export function getLocaleHourCycle(locale: string): '12' | '24' {
  const sample = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).format(new Date(2000, 0, 1, 15));
  return /am|pm/i.test(sample) ? '12' : '24';
}

/** Resolve 'auto' to a concrete cycle. */
export function resolveHourCycle(cycle: HourCycle, locale: string): '12' | '24' {
  return cycle === 'auto' ? getLocaleHourCycle(locale) : cycle;
}

/** Format hours+minutes per cycle. 24: "HH:mm". 12: "h:mm AM/PM" (zero-padded mm). */
export function formatTime(hours: number, minutes: number, cycle: '12' | '24'): string {
  const mm = String(minutes).padStart(2, '0');
  if (cycle === '24') return `${String(hours).padStart(2, '0')}:${mm}`;
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${mm} ${period}`;
}
```

`formatDateTime(date, locale, cycle?: '12' | '24')` — extend with optional third arg. Default behavior (no third arg) → `'24'` (preserves library-internal callers like the hidden form mirror). The pickers pass through their resolved cycle.

```ts
export function formatDateTime(
  date: Date,
  locale: string,
  cycle: '12' | '24' = '24',
): string {
  const datePart = formatDate(date, locale);
  const timePart = formatTime(date.getHours(), date.getMinutes(), cycle);
  return `${datePart} ${timePart}`;
}
```

Extend `parseTime(raw)` to accept AM/PM input. Implementation:

```ts
export function parseTime(raw: string): { hours: number; minutes: number } | null {
  const str = raw.trim();
  if (str === '') return null;
  // 24h-style first
  const colon = str.match(/^([0-9]{1,2}):([0-9]{2})$/);
  if (colon) {
    const h = Number(colon[1]); const m = Number(colon[2]);
    return h <= 23 && m <= 59 ? { hours: h, minutes: m } : null;
  }
  const digits = str.match(/^([0-9]{1,2})([0-9]{2})$/);
  if (digits) {
    const h = Number(digits[1]); const m = Number(digits[2]);
    return h <= 23 && m <= 59 ? { hours: h, minutes: m } : null;
  }
  const hoursOnly = str.match(/^([0-9]{1,2})$/);
  if (hoursOnly) {
    const h = Number(hoursOnly[1]);
    return h <= 23 ? { hours: h, minutes: 0 } : null;
  }
  // AM/PM patterns — strip period (.), normalize whitespace, lowercase suffix
  const ampm = str.match(/^([0-9]{1,2})(?::([0-9]{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)$/i);
  if (ampm) {
    const h12 = Number(ampm[1]);
    const m = ampm[2] != null ? Number(ampm[2]) : 0;
    const isPm = /p/i.test(ampm[3]);
    if (h12 < 1 || h12 > 12 || m > 59) return null;
    const h24 = (h12 % 12) + (isPm ? 12 : 0);
    return { hours: h24, minutes: m };
  }
  // AM/PM with digits-only hour: "230pm"
  const digitsAmpm = str.match(/^([0-9]{1,2})([0-9]{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)$/i);
  if (digitsAmpm) {
    const h12 = Number(digitsAmpm[1]);
    const m = Number(digitsAmpm[2]);
    const isPm = /p/i.test(digitsAmpm[3]);
    if (h12 < 1 || h12 > 12 || m > 59) return null;
    const h24 = (h12 % 12) + (isPm ? 12 : 0);
    return { hours: h24, minutes: m };
  }
  return null;
}
```

### DateRangePicker utils

`formatDateTimeRange(range, locale, cycle?: '12' | '24')` — same third-arg extension.

### Tests

For each new util: 5-10 cases. Cover en-US → 12, ru-RU → 24, edge cases (24:00 invalid, 12:00 AM → 0:00, 12:00 PM → 12:00, "230pm" digits-form, mixed-case "P.M.", empty/whitespace null).

Don't break existing tests — `formatDateTime(date, locale)` with no cycle arg keeps the 24h output.

Run: `cd packages/design-system && npm test -- utils && npm run typecheck` — green.

- [ ] Commit `Utils: hourCycle resolution + formatTime + AM/PM parseTime + 4 i18n keys`.

---

## Task 2: Tokens + SCSS scaffolding for new TimeField features

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/DatePicker.tokens.scss`
- Modify: `packages/design-system/src/components/DatePicker/TimeField.module.scss`

### Tokens

Append to `:root`:

```scss
--date-picker-time-popover-footer-padding: var(--space-2);
--date-picker-time-popover-footer-border-color: var(--color-border);
--date-picker-time-now-button-fg: var(--color-accent);
--date-picker-time-now-button-bg-hover: var(--color-bg-muted);
--date-picker-time-period-column-width: 3.5rem;
```

### SCSS

Add to `TimeField.module.scss`:

```scss
.timeColumnPeriod {
  // narrower than hours/minutes
  width: var(--date-picker-time-period-column-width);
}

.timeFooter {
  display: flex;
  justify-content: flex-end;
  padding: var(--date-picker-time-popover-footer-padding);
  border-top: var(--date-picker-time-popover-border-width, var(--border-width)) solid
    var(--date-picker-time-popover-footer-border-color);
}

.timeNowButton {
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- button reset
  background: transparent;
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- button reset
  border: 0;
  color: var(--date-picker-time-now-button-fg);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font: inherit;
  font-weight: var(--font-weight-medium);
}

.timeNowButton:hover,
.timeNowButton:focus-visible {
  background: var(--date-picker-time-now-button-bg-hover);
}

.timeNowButton:focus-visible {
  outline: var(--ring-width) solid var(--ring-accent);
  outline-offset: 1px;
}
```

Run: `npm run lint:css` from repo root — green.

- [ ] Commit `TimeField tokens + SCSS: period column, footer, Now button`.

---

## Task 3: TimeField rewrite — TimeValue shape + hourCycle + AM/PM column + Now button + arrow nav

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/TimeField.tsx`
- Modify: `packages/design-system/src/components/DatePicker/TimeField.test.tsx`

### Public API (replace existing TimeFieldProps)

```ts
import type { HourCycle, TimeValue } from './utils';

export type { TimeValue, HourCycle };

export interface TimeFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value: TimeValue | null;
  onChange: (value: TimeValue) => void;
  step?: number;
  hourCycle?: HourCycle;
  locale?: string;
  hideNowButton?: boolean;
  'aria-label': string;
  disabled?: boolean;
  id?: string;
  className?: string;
}
```

### Internal logic changes

1. **Resolve cycle:**
   ```ts
   const localeFromContext = useLocale();
   const resolvedCycle = resolveHourCycle(hourCycle, locale ?? localeFromContext);
   ```

2. **Derived `currentHour` / `currentMinute`:** from `value` (now TimeValue), not Date.

3. **Text input format:** `value ? formatTime(value.hours, value.minutes, resolvedCycle) : ''`. Placeholder: `resolvedCycle === '24' ? 'HH:mm' : 'h:mm AM/PM'`. The `maxLength` should bump to 8 for 12h ("12:00 PM").

4. **Hours row set:**
   ```ts
   const hoursRows: readonly number[] =
     resolvedCycle === '24'
       ? Array.from({ length: 24 }, (_, i) => i)
       : [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];  // internal 0 displays as 12, 1-11 stays
   ```
   But internal storage is always 24h. When a 12h row is clicked, convert via period.

5. **Period column** (12h only): `[0, 1]` representing AM/PM. Row labels via `t('datePicker.timePeriodAm')` / `t('datePicker.timePeriodPm')`. Listbox aria-label `t('datePicker.timePeriodLabel')`.

6. **Click handlers:**
   - 24h: same as before
   - 12h hour-pick: if `period === 'PM'` then `internalHour = (displayHour === 12 ? 12 : displayHour + 12)`; else `internalHour = (displayHour === 12 ? 0 : displayHour)`
   - 12h period-pick: AM → clear PM bit (h-12 if >=12); PM → set PM bit (h+12 if <12)

7. **Roving tabIndex / arrow nav:**

```ts
type FocusColumn = 'hours' | 'minutes' | 'period';

// Maintain focused row per column AND the focused column.
const [focused, setFocused] = useState<{ column: FocusColumn; index: number }>({
  column: 'hours',
  index: 0,
});

// On popover open, set focused to current hour row.
useEffect(() => {
  if (open) {
    setFocused({ column: 'hours', index: hoursRows.indexOf(displayHour) });
  }
}, [open]);

// Ref map: each row ref by `${column}-${index}`. Use a Map<string, HTMLLIElement | null>.
const rowRefs = useRef(new Map<string, HTMLLIElement | null>());

// After focused change, focus the ref.
useEffect(() => {
  if (!open) return;
  const ref = rowRefs.current.get(`${focused.column}-${focused.index}`);
  ref?.focus();
}, [focused, open]);
```

Popover-level `onKeyDown`:

```ts
const handlePopoverKeyDown = (e: ReactKeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setFocused((f) => ({ ...f, index: Math.min(f.index + 1, columnLength(f.column) - 1) }));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setFocused((f) => ({ ...f, index: Math.max(f.index - 1, 0) }));
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    moveColumn(+1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    moveColumn(-1);
  } else if (e.key === 'Home') {
    e.preventDefault();
    setFocused((f) => ({ ...f, index: 0 }));
  } else if (e.key === 'End') {
    e.preventDefault();
    setFocused((f) => ({ ...f, index: columnLength(f.column) - 1 }));
  }
};

const moveColumn = (delta: number) => {
  const columns: FocusColumn[] = resolvedCycle === '12' ? ['hours', 'minutes', 'period'] : ['hours', 'minutes'];
  setFocused((f) => {
    const i = columns.indexOf(f.column);
    const next = columns[Math.min(Math.max(0, i + delta), columns.length - 1)];
    return { column: next, index: defaultFocusedIndexFor(next) };
  });
};
```

Where `defaultFocusedIndexFor` returns the current-value's index in that column.

Each `<li role="option">` row carries `tabIndex={focused.column === col && focused.index === i ? 0 : -1}` and `ref={(el) => rowRefs.current.set(\`\${col}-\${i}\`, el)}`.

8. **Now button:**

```ts
const handleNow = () => {
  const now = new Date();
  const rounded = roundTimeToStep(now.getHours(), now.getMinutes(), step);
  onChange({ hours: rounded.hours, minutes: rounded.minutes });
};

{!hideNowButton && (
  <div className={styles.timeFooter}>
    <button type="button" className={styles.timeNowButton} onClick={handleNow}>
      {t('datePicker.timeNow')}
    </button>
  </div>
)}
```

Now button is NOT in the listbox roving tabIndex set — it's in the natural Tab order AFTER the focused row.

### Tests (TimeField.test.tsx)

Add tests per the spec's "TimeField" test list. Key sample queries:

```ts
// Value shape
const { rerender } = render(<TimeField value={{ hours: 14, minutes: 30 }} onChange={onChange} aria-label="Time" hourCycle="24" />);
expect(screen.getByDisplayValue('14:30')).toBeInTheDocument();
rerender(<TimeField value={{ hours: 14, minutes: 30 }} onChange={onChange} aria-label="Time" hourCycle="12" />);
expect(screen.getByDisplayValue('2:30 PM')).toBeInTheDocument();

// AM/PM popover
fireEvent.click(screen.getByLabelText(/open time list/i));
expect(screen.getByRole('listbox', { name: 'Period' })).toBeInTheDocument();

// Now button
fireEvent.click(screen.getByText('Now'));
expect(onChange).toHaveBeenCalled();

// Arrow nav
const input = screen.getByLabelText('Time');
fireEvent.keyDown(input, { key: 'ArrowDown' });  // opens popover
// then test ArrowDown on the popover moves focus
```

Vitest globals; no imports for describe/it/expect/vi.

Existing tests need updates:
- Replace `value={new Date(...)}` with `value={{ hours, minutes }}`
- `onChange` signature is `(value: TimeValue)` not `(hours, minutes)` — update assertions
- Add tests for 12h cycle, AM/PM column, Now button, arrow keys

Run: `cd packages/design-system && npm test -- TimeField` — all green.

- [ ] Commit `TimeField v2: TimeValue shape + hourCycle + AM/PM column + Now + arrow nav`.

---

## Task 4: Update the four pickers to the new TimeField shape

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/DatePicker.tsx`
- Modify: `packages/design-system/src/components/DatePicker/InlineDatePicker.tsx`
- Modify: `packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx`
- Modify: `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.tsx`
- Modify: each corresponding `.test.tsx`

For each picker:

1. **Add `hourCycle?: HourCycle` prop** with JSDoc (forwards to TimeField and influences trigger format). Default `'auto'`.

2. **Resolve cycle once:** `const resolvedCycle = resolveHourCycle(hourCycle, locale);`

3. **Update trigger format** to use the third arg:
   - DatePicker: `formatDateTime(value, locale, resolvedCycle)`
   - DateRangePicker: `formatDateTimeRange(value, locale, resolvedCycle)`

4. **Update placeholder defaults**: include the cycle-formatted hour example (e.g., en-US → `"05/28/2026 2:30 PM"`).

5. **TimeField wiring:**
   ```tsx
   <TimeField
     value={value ? { hours: value.getHours(), minutes: value.getMinutes() } : null}
     onChange={(time) => setValue(combineDateAndTime(value, time.hours, time.minutes))}
     step={timeStep}
     hourCycle={hourCycle}
     locale={locale}
     aria-label={t('datePicker.timeLabel')}
     disabled={value == null || disabled}
     id={`${inputId}-time`}
   />
   ```

6. **DateRangePicker / InlineDateRangePicker:** same boundary conversion for BOTH TimeFields (start + end). Each `onChange` re-composes the range and applies `clampRangeEndAfterStart`.

7. **Test updates per picker:**
   - Change `fireEvent.change(timeInput, { value: '09:15' })` to use the typed-input flow. Existing tests should mostly still work since the typed flow is unchanged.
   - Add 2-3 tests per picker: hourCycle='12' propagates (trigger shows AM/PM), Now button works through the popover, typed `"2:30 PM"` parses.
   - For tests asserting on TimeField's onChange via Date, swap to TimeValue.

Run: `cd packages/design-system && npm test` — all green.

- [ ] Commit `DatePicker family: adopt TimeField v2 + hourCycle prop`.

---

## Task 5: Public exports + manifest + AGENTS.md

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/src/components.manifest.json`
- Modify: `packages/design-system/src/_meta/manifest.ts` (and regenerate via `npm run build:manifest` if that's how the codebase works)
- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/design-system/scripts/generate-manifest.mjs` if it has a CLUSTERS map (add TimeField → Forms)

### Barrel

```ts
export { TimeField } from './components/DatePicker/TimeField';
export type { TimeFieldProps } from './components/DatePicker/TimeField';
export type { TimeValue, HourCycle } from './components/DatePicker/utils';
```

### Manifest

`TimeField` entry:

```json
"TimeField": {
  "tier": "primitive",
  "cluster": "Forms",
  "composes": [],
  "composedBy": [
    "DatePicker",
    "DateRangePicker",
    "InlineDatePicker",
    "InlineDateRangePicker"
  ]
}
```

Update the four pickers' `composes` to include `TimeField`. Run `npm run build:manifest` (or whatever script regenerates) to verify the drift test stays green.

### AGENTS.md

Add a TimeField catalog entry alphabetically (after Text, before Title, or wherever appropriate). Sketch:

```markdown
### `TimeField`

Standalone time-of-day input — text input + chevron + popover with hour/minute (and AM/PM in 12h locales) lists. Used internally by the DatePicker family; public for consumers who need a time input without a date.

\`\`\`tsx
const [time, setTime] = useState<TimeValue | null>({ hours: 9, minutes: 0 });
<TimeField value={time} onChange={setTime} aria-label="Start time" />
\`\`\`

- `value: TimeValue | null` — `{ hours: 0-23, minutes: 0-59 }` or `null` to disable
- `onChange: (value: TimeValue) => void`
- `step: number` — minutes step; default 15. Controls minute-list rows AND typed-input rounding.
- `hourCycle: '12' | '24' | 'auto'` — default `'auto'` (derived from locale). en-US → 12h; ru-RU → 24h.
- `hideNowButton: boolean` — default false; hides the popover footer "Now" button.

Keyboard: ArrowDown opens; ArrowUp/Down/Left/Right/Home/End navigate the popover; Enter commits.

**When NOT to use:** for datetime, use \`DatePicker\` with \`granularity='minute'\`. For elapsed-duration inputs (e.g., "3h 15m"), use a numeric input — `<kbd>` semantics don't fit.
```

Update each of the four picker sections to mention `hourCycle`.

- [ ] Commit `Public: export TimeField + manifest entry + AGENTS.md catalog`.

---

## Task 6: Playground demo

**Files:**

- Create: `packages/playground/src/pages/components/TimeFieldDemo.tsx`
- Modify: `packages/playground/src/App.tsx` — route `/components/timefield`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar entry under Forms (use `Clock` icon from lucide-react)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card
- Modify: `packages/playground/src/pages/mockups/registry.ts` — `'TimeField'` in union
- Modify: `packages/playground/src/pages/components/DatePickerDemo.tsx` + 3 siblings — 12h-mode + Now-button example sections

`TimeFieldDemo` covers:

1. Default (`hourCycle='auto'`, en-US → 12h)
2. Forced 24h
3. `step={30}`
4. `hideNowButton`
5. Controlled with logged onChange in a `<Code>` block
6. Disabled (null value)

Run: `make build` — green.

Visual smoke (Playwright MCP):
- Navigate to `/components/timefield` — verify all 6 examples
- Open one popover → confirm 3 columns in 12h mode, 2 columns in 24h
- Click Now → input updates
- Tab through popover → focus moves through rows; arrow keys navigate

- [ ] Commit `Playground: TimeField demo + hourCycle/Now-button additions to picker demos`.

---

## Task 7: hr8 review-fix loop

Hard rule 8 — before push:

1. Gates:
   ```bash
   cd packages/design-system && npm test && npm run typecheck && cd /Users/dpws/projects/design-system && npm run lint:css && make build && cd packages/design-system && npm pack --dry-run -w @eocrm/design-system
   ```
2. Fresh-context reviewer over 10 categories. Focus areas:
   - TimeField v2 (biggest delta — make sure listbox semantics + arrow nav obey APG)
   - Picker boundary conversions (Date ↔ TimeValue) — no regressions
   - Backward-compat note: en-US default now shows AM/PM. Confirm this is documented in PR body + the spec's "Behavior change" section.
   - i18n parity (en + ru both have the 4 new keys)
   - Tarball ships TimeField (it does now — it was already shipping; just verify it's not accidentally tree-shaken or excluded)
3. Fix Critical + Important. Re-run gates. Re-review until `clean enough to stop`.

- [ ] Commit `TimeField v2 hr8 review pass N: <summary>` per pass.

---

## Task 8: Push + PR

```bash
git push -u origin feat/timefield-v2-amp-arrowkeys-now
gh pr create --title "TimeField v2: public + AM/PM (12h locale) + arrow nav + Now button" --body "<summary>"
```

PR body MUST include the "behavior change" callout that en-US now defaults to 12h AM/PM display when `hourCycle` is omitted, and consumers can opt out via `hourCycle='24'`.

- [ ] Open PR. Report URL.
