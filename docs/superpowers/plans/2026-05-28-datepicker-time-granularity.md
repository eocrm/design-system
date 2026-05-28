# DatePicker + DateRangePicker — time granularity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Add `granularity?: 'day' | 'minute'` to all four pickers (`<DatePicker>`, `<DateRangePicker>`, `<InlineDatePicker>`, `<InlineDateRangePicker>`). Default `'day'` (backward-compat). When `'minute'`: render a native `<input type="time">` below the calendar grid (one per side for ranges), include `HH:mm` in the trigger text, emit ISO datetime via the hidden form mirror, preserve time across date re-picks, and clamp same-day end-time ≥ start-time on range commits.

**Branch:** `feat/datepicker-time-granularity` (already checked out off main).

**Spec:** `docs/superpowers/specs/2026-05-28-datepicker-time-granularity-design.md`.

---

## Task 1: i18n keys

**Files:**

- Modify: `packages/design-system/src/i18n/messages.ts` — add 3 keys
- Modify: `packages/design-system/src/i18n/en.ts` — English values
- Modify: `packages/design-system/src/i18n/ru.ts` — Russian values

Keys + values:

| Key                              | en           | ru                |
| -------------------------------- | ------------ | ----------------- |
| `datePicker.timeLabel`           | `Time`       | `Время`           |
| `dateRangePicker.startTimeLabel` | `Start time` | `Время начала`    |
| `dateRangePicker.endTimeLabel`   | `End time`   | `Время окончания` |

Run: `cd packages/design-system && npm run typecheck` — must PASS (catches missing key on either locale via the meta-test).

- [ ] Commit `i18n: add datePicker.timeLabel + dateRangePicker.{start,end}TimeLabel`.

---

## Task 2: DatePicker utils — date+time helpers

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/utils.ts`
- Modify: `packages/design-system/src/components/DatePicker/utils.test.ts`

### Public exports to add to `utils.ts`

```ts
/**
 * Format a Date with date + HH:mm (locale-aware). Uses 24-hour because the
 * native <input type="time"> reads/writes 24-hour wire format; the picker
 * trigger matches that contract.
 */
export function formatDateTime(date: Date, locale: string): string {
  const datePart = formatDate(date, locale);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${datePart} ${timePart}`;
}

/**
 * Parse a user-typed date+time string into a local Date.
 *
 * Accepts:
 * - ISO `YYYY-MM-DDTHH:mm` and `YYYY-MM-DD HH:mm`
 * - Locale-formatted date followed by a space and `HH:mm`
 * - Pure date (no time) → defaults to 00:00 — useful for partial typing
 *
 * Returns `null` for empty input, malformed time (`25:99`, etc.), or
 * date-parse failures. Single-digit hours and minutes are accepted via the
 * same chunking pattern as parseDate.
 */
export function parseDateTime(raw: string, locale: string): Date | null {
  const str = raw.trim();
  if (str === '') return null;

  // Split into date-part + time-part. ISO uses T; otherwise the last space
  // before HH:mm-shaped token. If no time-shaped tail, fall through to date-only.
  const timeMatch = str.match(/[T\s]([0-9]{1,2}):([0-9]{2})$/);
  if (timeMatch == null) {
    const dateOnly = parseDate(str, locale);
    if (dateOnly == null) return null;
    return dateOnly;
  }
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const datePart = str.slice(0, str.length - timeMatch[0].length).trim();
  const date = parseDate(datePart, locale);
  if (date == null) return null;
  return combineDateAndTime(date, hours, minutes);
}

/** ISO local datetime: `YYYY-MM-DDTHH:mm` (no TZ, no seconds). */
export function toIsoDateTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/** Replace `date`'s hours/minutes (zero seconds + ms). Returns a new Date. */
export function combineDateAndTime(date: Date, hours: number, minutes: number): Date {
  const out = new Date(date);
  out.setHours(hours, minutes, 0, 0);
  return out;
}

/** Format a Date as `HH:mm` for `<input type="time">`'s `value` attribute. */
export function toTimeInputValue(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
```

### Tests to add to `utils.test.ts`

```ts
describe('formatDateTime', () => {
  it('produces date + zero-padded HH:mm in en-US', () => {
    expect(formatDateTime(new Date(2026, 4, 28, 14, 30), 'en-US')).toBe('05/28/2026 14:30');
  });
  it('uses 24-hour even when locale prefers 12-hour', () => {
    expect(formatDateTime(new Date(2026, 4, 28, 13, 5), 'en-US')).toBe('05/28/2026 13:05');
  });
});

describe('parseDateTime', () => {
  it('parses ISO with T separator', () => {
    expect(parseDateTime('2026-05-28T14:30', 'en-US')).toEqual(new Date(2026, 4, 28, 14, 30, 0, 0));
  });
  it('parses ISO with space separator', () => {
    expect(parseDateTime('2026-05-28 14:30', 'en-US')).toEqual(new Date(2026, 4, 28, 14, 30, 0, 0));
  });
  it('parses locale-formatted date with time', () => {
    expect(parseDateTime('05/28/2026 14:30', 'en-US')).toEqual(new Date(2026, 4, 28, 14, 30, 0, 0));
  });
  it('parses date-only as 00:00 (partial typing)', () => {
    expect(parseDateTime('05/28/2026', 'en-US')).toEqual(new Date(2026, 4, 28, 0, 0, 0, 0));
  });
  it('returns null for empty input', () => {
    expect(parseDateTime('', 'en-US')).toBeNull();
    expect(parseDateTime('   ', 'en-US')).toBeNull();
  });
  it('returns null for invalid time (25:99)', () => {
    expect(parseDateTime('05/28/2026 25:99', 'en-US')).toBeNull();
  });
  it('returns null for invalid date with valid time', () => {
    expect(parseDateTime('99/99/9999 14:30', 'en-US')).toBeNull();
  });
});

describe('toIsoDateTime', () => {
  it('zero-pads month/day/hour/minute', () => {
    expect(toIsoDateTime(new Date(2026, 0, 5, 3, 7))).toBe('2026-01-05T03:07');
  });
});

describe('combineDateAndTime', () => {
  it('replaces hours/minutes, keeps date components', () => {
    const base = new Date(2026, 4, 28, 9, 15, 30, 500);
    const result = combineDateAndTime(base, 14, 0);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(4);
    expect(result.getDate()).toBe(28);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });
  it('returns a new Date — does not mutate input', () => {
    const base = new Date(2026, 4, 28, 9, 15);
    const result = combineDateAndTime(base, 14, 0);
    expect(result).not.toBe(base);
    expect(base.getHours()).toBe(9);
  });
});

describe('toTimeInputValue', () => {
  it('formats HH:mm zero-padded', () => {
    expect(toTimeInputValue(new Date(2026, 4, 28, 3, 7))).toBe('03:07');
    expect(toTimeInputValue(new Date(2026, 4, 28, 23, 59))).toBe('23:59');
  });
});
```

Run: `cd packages/design-system && npm test -- DatePicker/utils` — all green.

- [ ] Commit `DatePicker utils: formatDateTime, parseDateTime, toIsoDateTime, combineDateAndTime, toTimeInputValue`.

---

## Task 3: DateRangePicker utils — date+time helpers

**Files:**

- Modify: `packages/design-system/src/components/DateRangePicker/utils.ts`
- Modify: `packages/design-system/src/components/DateRangePicker/utils.test.ts`

### Public exports to add

```ts
import { combineDateAndTime, formatDateTime, parseDateTime } from '../DatePicker/utils';

/** Format a DateRange including time: `MM/DD/YYYY HH:mm — MM/DD/YYYY HH:mm`. */
export function formatDateTimeRange(range: DateRange, locale: string): string {
  return `${formatDateTime(range.start, locale)} — ${formatDateTime(range.end, locale)}`;
}

/** Parse a user-typed range with date+time on each side. */
export function parseDateTimeRange(raw: string, locale: string): DateRange | null {
  const str = raw.trim();
  if (str === '') return null;
  const separators: RegExp[] = [/\s*—\s*/, /\s*–\s*/, /\s+-\s+/, /\s+to\s+/i];
  let parts: string[] | null = null;
  for (const sep of separators) {
    const split = str.split(sep);
    if (split.length === 2) {
      parts = split;
      break;
    }
  }
  if (!parts) return null;
  const left = parseDateTime(parts[0], locale);
  const right = parseDateTime(parts[1], locale);
  if (left == null || right == null) return null;
  return autoSwapRange(left, right);
}

/**
 * Clamp range.end so that, on same-day ranges, end-time ≥ start-time.
 * No-op when start and end fall on different calendar days.
 */
export function clampRangeEndAfterStart(range: DateRange): DateRange {
  const sameDay =
    range.start.getFullYear() === range.end.getFullYear() &&
    range.start.getMonth() === range.end.getMonth() &&
    range.start.getDate() === range.end.getDate();
  if (!sameDay) return range;
  if (range.end.getTime() >= range.start.getTime()) return range;
  const clampedEnd = combineDateAndTime(
    range.end,
    range.start.getHours(),
    range.start.getMinutes(),
  );
  return { start: range.start, end: clampedEnd };
}
```

### Tests to add

```ts
describe('formatDateTimeRange', () => {
  it('joins start/end with em dash', () => {
    expect(
      formatDateTimeRange(
        { start: new Date(2026, 4, 28, 9, 0), end: new Date(2026, 4, 29, 17, 30) },
        'en-US',
      ),
    ).toBe('05/28/2026 09:00 — 05/29/2026 17:30');
  });
});

describe('parseDateTimeRange', () => {
  it('parses ISO datetime range with em dash', () => {
    const r = parseDateTimeRange('2026-05-28T09:00 — 2026-05-29T17:30', 'en-US');
    expect(r?.start).toEqual(new Date(2026, 4, 28, 9, 0, 0, 0));
    expect(r?.end).toEqual(new Date(2026, 4, 29, 17, 30, 0, 0));
  });
  it('parses locale-formatted datetime range with em dash', () => {
    const r = parseDateTimeRange('05/28/2026 09:00 — 05/29/2026 17:30', 'en-US');
    expect(r?.start).toEqual(new Date(2026, 4, 28, 9, 0, 0, 0));
    expect(r?.end).toEqual(new Date(2026, 4, 29, 17, 30, 0, 0));
  });
  it('auto-swaps out-of-order pairs', () => {
    const r = parseDateTimeRange('05/29/2026 17:30 — 05/28/2026 09:00', 'en-US');
    expect(r?.start).toEqual(new Date(2026, 4, 28, 9, 0, 0, 0));
    expect(r?.end).toEqual(new Date(2026, 4, 29, 17, 30, 0, 0));
  });
  it('returns null when either half fails to parse', () => {
    expect(parseDateTimeRange('garbage — 05/29/2026 09:00', 'en-US')).toBeNull();
  });
});

describe('clampRangeEndAfterStart', () => {
  it('clamps end-time to start-time when same day end < start', () => {
    const range = {
      start: new Date(2026, 4, 28, 14, 0),
      end: new Date(2026, 4, 28, 10, 0),
    };
    const out = clampRangeEndAfterStart(range);
    expect(out.end.getHours()).toBe(14);
    expect(out.end.getMinutes()).toBe(0);
  });
  it('no-op when same day end >= start', () => {
    const range = {
      start: new Date(2026, 4, 28, 9, 0),
      end: new Date(2026, 4, 28, 17, 0),
    };
    expect(clampRangeEndAfterStart(range)).toBe(range);
  });
  it('no-op when different days', () => {
    const range = {
      start: new Date(2026, 4, 28, 14, 0),
      end: new Date(2026, 4, 29, 10, 0),
    };
    expect(clampRangeEndAfterStart(range)).toBe(range);
  });
});
```

Run: `cd packages/design-system && npm test -- DateRangePicker/utils` — all green.

- [ ] Commit `DateRangePicker utils: formatDateTimeRange, parseDateTimeRange, clampRangeEndAfterStart`.

---

## Task 4: Shared `DateTimeGranularity` type + tokens + base SCSS

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/utils.ts` (add the type export)
- Modify: `packages/design-system/src/components/DatePicker/DatePicker.tokens.scss`
- Modify: `packages/design-system/src/components/DatePicker/DatePicker.module.scss`
- Modify: `packages/design-system/src/components/DatePicker/InlineDatePicker.module.scss`
- Modify: `packages/design-system/src/components/DateRangePicker/DateRangePicker.module.scss`
- Modify: `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.module.scss`

### Type

Add to `DatePicker/utils.ts`:

```ts
/** Picker precision. `'day'` (default) is date-only; `'minute'` adds HH:mm. */
export type DateTimeGranularity = 'day' | 'minute';
```

### Tokens (`DatePicker.tokens.scss`)

Add at the end of the `:root` block:

```scss
// Time row — date + time picker mode
--datepicker-time-row-gap: var(--space-2);
--datepicker-time-input-width: 7.5rem;
```

### SCSS — same classes in each of the four `.module.scss` files

```scss
// Time row appears below the calendar grid in minute granularity. Reuses
// the existing chrome tokens for the date input.
.timeRow {
  display: flex;
  align-items: center;
  gap: var(--datepicker-time-row-gap);
  padding-top: var(--datepicker-time-row-gap);
}

.timeLabel {
  color: var(--datepicker-fg-muted, var(--color-fg-muted));
  font-size: var(--datepicker-font-size-sm, var(--font-size-sm));
}

.timeInput {
  // stylelint-disable-next-line declaration-property-value-disallowed-list -- fixed width is narrower than the trigger row's date input on purpose; this is a chip-shaped time control, not a layout primitive
  width: var(--datepicker-time-input-width);
  height: var(--input-height-sm, var(--size-sm));
  padding: 0 var(--space-2);
  font: inherit;
  color: var(--color-fg);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
}

.timeInput:focus-visible {
  outline: var(--ring-width) solid var(--ring-accent);
  outline-offset: 0;
}

.timeInput:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}
```

In `DateRangePicker.module.scss` and `InlineDateRangePicker.module.scss`, the time row needs to lay out beneath EACH of the two calendars — add a parent class:

```scss
.timeRowsPair {
  display: flex;
  gap: var(--space-4); // matches the gap between the two calendars
}

.timeRowsPair > * {
  flex: 1 1 0;
}
```

Run: `cd packages/design-system && npm run lint:css` (from root) — must PASS.

- [ ] Commit `DatePicker tokens + SCSS: time row chrome (date+time mode)`.

---

## Task 5: `<DatePicker>` (popover variant)

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/DatePicker.tsx`
- Modify: `packages/design-system/src/components/DatePicker/DatePicker.test.tsx`

### Prop addition

Inside `DatePickerProps`, after the existing `size` prop:

```ts
/**
 * Picker precision.
 *
 * - `'day'` (default) — date only; behavior unchanged from prior releases.
 * - `'minute'` — adds a manual-entry time input below the calendar grid.
 *   The trigger text shows `HH:mm` after the date. The hidden form mirror
 *   (when `name` is set) emits ISO local datetime (`2026-05-28T14:30`).
 *
 * Time is preserved across date re-picks. Picking from a `null` value
 * defaults the time to `00:00`.
 */
granularity?: DateTimeGranularity;
```

Import `DateTimeGranularity` from `./utils`.

### Behavior changes

1. **Format trigger text.** Replace the existing `formattedValue` line:

   ```ts
   const formattedValue = value
     ? granularity === 'minute'
       ? formatDateTime(value, locale)
       : formatDate(value, locale)
     : '';
   ```

2. **Parse on commit.** Inside `commit(raw)`:

   ```ts
   const parsed = granularity === 'minute' ? parseDateTime(raw, locale) : parseDate(raw, locale);
   ```

3. **Grid pick preserves time.** Replace `handleSelect`:

   ```ts
   const handleSelect = useCallback(
     (next: Date) => {
       let withTime = next;
       if (granularity === 'minute') {
         if (value != null) {
           withTime = combineDateAndTime(next, value.getHours(), value.getMinutes());
         } else {
           withTime = combineDateAndTime(next, 0, 0);
         }
       }
       setValue(withTime);
       setOpen(false);
       inputRef.current?.focus();
     },
     [granularity, value, setValue],
   );
   ```

4. **Time-input row in the popover.** After `<DatePickerGrid …/>` inside the floating div:

   ```tsx
   {
     granularity === 'minute' && (
       <div className={styles.timeRow}>
         <label className={styles.timeLabel} htmlFor={`${inputId}-time`}>
           {t('datePicker.timeLabel')}
         </label>
         <input
           id={`${inputId}-time`}
           type="time"
           step={60}
           className={styles.timeInput}
           value={value ? toTimeInputValue(value) : ''}
           disabled={value == null || disabled}
           aria-label={t('datePicker.timeLabel')}
           onChange={(e) => {
             if (value == null) return;
             const [hh, mm] = e.target.value.split(':').map(Number);
             if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
             setValue(combineDateAndTime(value, hh, mm));
           }}
         />
       </div>
     );
   }
   ```

5. **Hidden form mirror.** Replace the `{name && …}` line:

   ```tsx
   {
     name && (
       <input
         type="hidden"
         name={name}
         value={value ? (granularity === 'minute' ? toIsoDateTime(value) : toIsoDate(value)) : ''}
       />
     );
   }
   ```

6. **Placeholder.** Update the existing placeholder fallback to include time when minute:
   ```ts
   placeholder={
     placeholder ??
     (granularity === 'minute'
       ? formatDateTime(new Date(2000, 0, 2, 14, 30), locale)
       : formatDate(new Date(2000, 0, 2), locale))
   }
   ```

### Tests to add to `DatePicker.test.tsx`

```ts
describe('granularity', () => {
  it('granularity defaults to "day" — no time input, no HH:mm in trigger', () => {
    render(<DatePicker defaultValue={new Date(2026, 4, 28, 14, 30)} />);
    expect(screen.queryByLabelText('Time')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('05/28/2026')).toBeInTheDocument();
  });

  it('granularity="minute" renders the time input inside the popover', async () => {
    const user = userEvent.setup();
    render(<DatePicker defaultValue={new Date(2026, 4, 28, 14, 30)} granularity="minute" />);
    await user.click(screen.getByLabelText(/open calendar/i));
    const timeInput = await screen.findByLabelText('Time');
    expect(timeInput).toHaveValue('14:30');
  });

  it('granularity="minute" includes HH:mm in trigger text', () => {
    render(<DatePicker defaultValue={new Date(2026, 4, 28, 14, 30)} granularity="minute" />);
    expect(screen.getByDisplayValue('05/28/2026 14:30')).toBeInTheDocument();
  });

  it('picking a date from null defaults time to 00:00', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker granularity="minute" onChange={onChange} />);
    await user.click(screen.getByLabelText(/open calendar/i));
    // pick the 15th of the current month (first 15 in any month)
    await user.click(screen.getByRole('gridcell', { name: /^15/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const got = onChange.mock.calls[0][0] as Date;
    expect(got.getHours()).toBe(0);
    expect(got.getMinutes()).toBe(0);
  });

  it('picking a different date preserves existing time-of-day', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        granularity="minute"
        defaultValue={new Date(2026, 4, 28, 14, 30)}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText(/open calendar/i));
    await user.click(screen.getByRole('gridcell', { name: /^15/ }));
    const got = onChange.mock.calls[0][0] as Date;
    expect(got.getHours()).toBe(14);
    expect(got.getMinutes()).toBe(30);
  });

  it('changing the time input updates time only', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DatePicker
        granularity="minute"
        defaultValue={new Date(2026, 4, 28, 14, 30)}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText(/open calendar/i));
    const timeInput = await screen.findByLabelText('Time');
    await user.clear(timeInput);
    await user.type(timeInput, '09:15');
    const got = onChange.mock.calls.at(-1)?.[0] as Date;
    expect(got.getFullYear()).toBe(2026);
    expect(got.getMonth()).toBe(4);
    expect(got.getDate()).toBe(28);
    expect(got.getHours()).toBe(9);
    expect(got.getMinutes()).toBe(15);
  });

  it('time input is disabled when value is null', async () => {
    const user = userEvent.setup();
    render(<DatePicker granularity="minute" />);
    await user.click(screen.getByLabelText(/open calendar/i));
    expect(await screen.findByLabelText('Time')).toBeDisabled();
  });

  it('hidden form mirror emits ISO datetime when granularity="minute"', () => {
    const { container } = render(
      <DatePicker
        granularity="minute"
        name="when"
        defaultValue={new Date(2026, 4, 28, 14, 30)}
      />,
    );
    const hidden = container.querySelector('input[type="hidden"][name="when"]');
    expect(hidden).toHaveAttribute('value', '2026-05-28T14:30');
  });

  it('hidden form mirror still emits ISO date when granularity="day"', () => {
    const { container } = render(
      <DatePicker name="when" defaultValue={new Date(2026, 4, 28, 14, 30)} />,
    );
    const hidden = container.querySelector('input[type="hidden"][name="when"]');
    expect(hidden).toHaveAttribute('value', '2026-05-28');
  });

  it('typed input parses date+time on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker granularity="minute" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, '05/28/2026 14:30');
    await user.tab();
    const got = onChange.mock.calls.at(-1)?.[0] as Date;
    expect(got.getFullYear()).toBe(2026);
    expect(got.getHours()).toBe(14);
    expect(got.getMinutes()).toBe(30);
  });
});
```

Run: `cd packages/design-system && npm test -- DatePicker` — all DatePicker tests pass (existing + new).

- [ ] Commit `<DatePicker>: granularity prop + time input`.

---

## Task 6: `<InlineDatePicker>` (popover-less variant)

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/InlineDatePicker.tsx`
- Modify: `packages/design-system/src/components/DatePicker/InlineDatePicker.test.tsx`

Mirror the changes in Task 5 — but no trigger, no popover. The time row renders inline beneath the grid, always visible when granularity='minute'.

### Prop addition

Same `granularity?: DateTimeGranularity` JSDoc + import as Task 5.

### Behavior

- Grid `onSelect`: same time-preservation logic. If `value == null` and granularity='minute' → use 00:00. Otherwise preserve `value`'s time.
- Hidden form mirror: same ISO date vs ISO datetime branch.
- Time row: always rendered when granularity='minute'. Time input is disabled when `value == null` (since there's no date yet).

### Test additions

Same 5–6 tests as Task 5 minus the "click to open" sequence (Inline has no popover):

- defaults to day mode, no time input
- minute mode renders the time input
- picking a date from null → 00:00
- picking a different date preserves time
- changing the time input updates time only
- time input disabled when value is null
- hidden form mirror: ISO datetime for minute, ISO date for day

Run: `cd packages/design-system && npm test -- InlineDatePicker` — all green.

- [ ] Commit `<InlineDatePicker>: granularity prop + inline time row`.

---

## Task 7: `<DateRangePicker>` (popover variant)

**Files:**

- Modify: `packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx`
- Modify: `packages/design-system/src/components/DateRangePicker/DateRangePicker.test.tsx`

### Prop addition

Same `granularity?: DateTimeGranularity` JSDoc as Task 5.

### Behavior

1. **Format trigger text.**

   ```ts
   const formatted = value
     ? granularity === 'minute'
       ? formatDateTimeRange(value, locale)
       : formatDateRange(value, locale)
     : '';
   ```

2. **Typed parse.**

   ```ts
   const parsed =
     granularity === 'minute' ? parseDateTimeRange(raw, locale) : parseDateRange(raw, locale);
   ```

3. **Range-grid commit.** When the user completes a range click (second click or hover-locked second click), apply:

   ```ts
   const next = autoSwapRange(firstClick, secondClick);
   let withTime = next;
   if (granularity === 'minute') {
     // Preserve existing times if value exists; otherwise 00:00 / 23:59.
     const startTime = value?.start ?? null;
     const endTime = value?.end ?? null;
     withTime = {
       start: combineDateAndTime(
         next.start,
         startTime?.getHours() ?? 0,
         startTime?.getMinutes() ?? 0,
       ),
       end: combineDateAndTime(next.end, endTime?.getHours() ?? 23, endTime?.getMinutes() ?? 59),
     };
     withTime = clampRangeEndAfterStart(withTime);
   }
   setValue(withTime);
   ```

4. **Two time inputs in the popover.** Below the two-month grid:

   ```tsx
   {
     granularity === 'minute' && value != null && (
       <div className={styles.timeRowsPair}>
         <div className={styles.timeRow}>
           <label className={styles.timeLabel} htmlFor={`${inputId}-start-time`}>
             {t('dateRangePicker.startTimeLabel')}
           </label>
           <input
             id={`${inputId}-start-time`}
             type="time"
             step={60}
             className={styles.timeInput}
             value={toTimeInputValue(value.start)}
             aria-label={t('dateRangePicker.startTimeLabel')}
             onChange={(e) => {
               const [hh, mm] = e.target.value.split(':').map(Number);
               if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
               const next = {
                 start: combineDateAndTime(value.start, hh, mm),
                 end: value.end,
               };
               setValue(clampRangeEndAfterStart(next));
             }}
           />
         </div>
         <div className={styles.timeRow}>
           <label className={styles.timeLabel} htmlFor={`${inputId}-end-time`}>
             {t('dateRangePicker.endTimeLabel')}
           </label>
           <input
             id={`${inputId}-end-time`}
             type="time"
             step={60}
             className={styles.timeInput}
             value={toTimeInputValue(value.end)}
             aria-label={t('dateRangePicker.endTimeLabel')}
             onChange={(e) => {
               const [hh, mm] = e.target.value.split(':').map(Number);
               if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
               const next = {
                 start: value.start,
                 end: combineDateAndTime(value.end, hh, mm),
               };
               setValue(clampRangeEndAfterStart(next));
             }}
           />
         </div>
       </div>
     );
   }
   ```

5. **Hidden form mirrors.** Use `toIsoDateTime` when granularity='minute', `toIsoDate` otherwise — applied to both `nameStart` and `nameEnd` hidden inputs.

6. **Placeholder.** Similar to DatePicker — append time format when minute.

### Tests to add

Mirror DatePicker tests, adapted for ranges:

- granularity='day' default (no time inputs)
- granularity='minute' renders both time inputs
- trigger text includes both `HH:mm`s
- fresh range pick → start 00:00, end 23:59
- subsequent date pick preserves both times
- changing start-time updates start only
- changing end-time updates end only
- same-day range with end-time < start-time → clamp end to start
- different-day range with end-time < start-time → no clamp
- hidden form mirrors emit ISO datetime
- typed input parses datetime range

Run: `cd packages/design-system && npm test -- DateRangePicker` — all green.

- [ ] Commit `<DateRangePicker>: granularity prop + dual time inputs + clamp`.

---

## Task 8: `<InlineDateRangePicker>`

**Files:**

- Modify: `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.tsx`
- Modify: `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.test.tsx`

Same behavior as Task 7 but inline (no popover, no trigger). Time rows always visible when granularity='minute' AND value is non-null.

Run: `cd packages/design-system && npm test -- InlineDateRangePicker` — all green.

- [ ] Commit `<InlineDateRangePicker>: granularity prop + inline dual time inputs`.

---

## Task 9: Barrel + AGENTS.md

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/AGENTS.md`

### `src/index.ts`

Add the type export alongside `DatePicker`'s existing exports:

```ts
export type { DateTimeGranularity } from './components/DatePicker/utils';
```

Also export `formatDateTime`, `parseDateTime`, `toIsoDateTime`, `combineDateAndTime` (these are useful for consumers integrating with forms and serializers). And export `formatDateTimeRange`, `parseDateTimeRange`, `clampRangeEndAfterStart` from the DateRangePicker barrel.

### `AGENTS.md`

Add a short note to each of the four picker sections:

> **Granularity.** Pass `granularity="minute"` to add a manual-entry time input below the grid; the trigger text becomes `MM/DD/YYYY HH:mm` and the hidden form mirror emits ISO local datetime. Defaults to `'day'`. Time is preserved across date re-picks; same-day range ends are clamped to ≥ the start time silently.

Run: `cd packages/design-system && npm run typecheck` — must PASS.

- [ ] Commit `Docs: granularity on DatePicker family in AGENTS.md`.

---

## Task 10: Playground demos

**Files:**

- Modify: `packages/playground/src/pages/components/DatePickerDemo.tsx`
- Modify: `packages/playground/src/pages/components/DateRangePickerDemo.tsx`
- Modify: `packages/playground/src/pages/components/InlineDatePickerDemo.tsx` (if exists)
- Modify: `packages/playground/src/pages/components/InlineDateRangePickerDemo.tsx` (if exists)

For each demo, add a new section "Granularity: minute" near the end. Show:

1. A controlled instance with `granularity="minute"`.
2. A `<Code>` block showing the committed value's ISO string (`toIsoDateTime(value)` for date, both ends for range).
3. For DateRangePicker: a note that a same-day end clamps to ≥ start time.

Run: `make build` — typecheck + bundle green.

Visual smoke (Playwright):

- `/components/datepicker` — open, switch to minute example, change time → trigger updates
- `/components/daterangepicker` — open, switch to minute example, set same-day range with reversed times → end-time snaps to start-time

- [ ] Commit `Playground: granularity demos on DatePicker family`.

---

## Task 11: Library hr8 review-fix loop

Hard rule 8 — before push:

1. Run gates:
   ```bash
   cd packages/design-system && npm test && npm run typecheck && cd ../.. && npm run lint:css && make build && cd packages/design-system && npm pack --dry-run -w @eocrm/design-system
   ```
2. Dispatch fresh-context `general-purpose` reviewer with the standard hr8 prompt (10 categories). Focus areas:
   - `DatePicker/utils.ts` + `utils.test.ts` (new exports)
   - `DateRangePicker/utils.ts` + `utils.test.ts` (new exports)
   - All four picker .tsx files (granularity branches)
   - SCSS additions (`.timeRow`, `.timeInput`, `.timeRowsPair`)
   - i18n keys (3 new)
   - Backward compatibility for the `granularity='day'` path
3. Fix all Critical + Important. Re-run gates. Re-review until `clean enough to stop`.

- [ ] Commit `DatePicker time granularity hr8 review pass N: <summary>` per pass.

---

## Task 12: Push + PR

```bash
git push -u origin feat/datepicker-time-granularity
gh pr create --title "DatePicker family: granularity='minute' (date + time)" --body "<summary>"
```

PR body sections (Summary / Implementation notes / Test plan) — model after PR #95 (Kbd).

- [ ] Open PR. Report URL.
