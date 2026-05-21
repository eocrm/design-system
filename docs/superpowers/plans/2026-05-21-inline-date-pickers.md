# InlineDatePicker + InlineDateRangePicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `<InlineDatePicker>` and `<InlineDateRangePicker>` — standalone calendar grids (no input, no popover) that the consumer drops into any layout. Built on the existing `DatePickerGrid` (with a new optional `disabled` prop) and the same click-1/click-2/restart selection machine the popover-based `<DateRangePicker>` uses.

**Architecture:** Two sibling public components. `<InlineDatePicker>` is a thin wrapper around `<DatePickerGrid>` in single-mode with local cursor + uncontrolled-value state. `<InlineDateRangePicker>` mirrors the popover content of the existing `<DateRangePicker>` — two grids side-by-side in `selectionMode='range'` with `chevrons={false}`, external prev/next chevrons, and per-grid `onCursorChange` callbacks for keyboard cross-grid nav in both directions. Both render optional hidden `<input type="hidden">` form mirrors (`name`, `nameStart`, `nameEnd`).

**Tech Stack:** React 18 + TypeScript, SCSS modules, Vitest + RTL, `lucide-react` (chevrons). No new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-21-inline-date-pickers-design.md](../specs/2026-05-21-inline-date-pickers-design.md)

**Branch state at start:** `feat/inline-date-pickers` branched from fresh `main` (PR #24 DateRangePicker merged). Spec is committed on top.

---

## File map

```
packages/design-system/src/components/DatePicker/
  DatePickerGrid.tsx                # MODIFY — add optional `disabled` prop
  DatePickerGrid.module.scss        # MODIFY — add `.disabledGrid` rule
  DatePickerGrid.test.tsx           # MODIFY — 1 new test for `disabled`
  InlineDatePicker.tsx              # NEW
  InlineDatePicker.module.scss      # NEW
  InlineDatePicker.test.tsx         # NEW
  index.ts                          # MODIFY — barrel-export new component + types

packages/design-system/src/components/DateRangePicker/
  InlineDateRangePicker.tsx         # NEW
  InlineDateRangePicker.module.scss # NEW
  InlineDateRangePicker.test.tsx    # NEW
  index.ts                          # MODIFY — barrel-export new component + types

packages/design-system/src/index.ts                  # MODIFY — public re-exports
packages/design-system/AGENTS.md                     # MODIFY — two new sections

packages/playground/src/pages/components/InlineDatePickerDemo.tsx       # NEW
packages/playground/src/pages/components/InlineDateRangePickerDemo.tsx  # NEW
packages/playground/src/pages/components/InputExample.tsx               # MODIFY — `width='auto'` short-circuit
packages/playground/src/App.tsx                                         # MODIFY — 2 new routes
packages/playground/src/layout/AppShell/AppShell.tsx                    # MODIFY — 2 new Forms entries
packages/playground/src/pages/components/ComponentsIndex.tsx            # MODIFY — 2 new cards
packages/playground/src/pages/mockups/registry.ts                       # MODIFY — `ComponentName` union
```

---

## Task 1: Verify branch + hooks

**Files:** (no edits — git only)

- [ ] **Step 1: Confirm branch + clean tree**

```bash
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -3
```

Expected: branch `feat/inline-date-pickers`, clean tree (besides `.claude/`), top commit is the inline-date-pickers spec.

- [ ] **Step 2: Verify hooks**

```bash
git config --get core.hooksPath
test -x .husky/pre-push && echo OK
```

Expected: `.husky/_` + `OK`. If either fails, `npm install` from repo root and re-check.

---

## Task 2: DatePickerGrid — add optional `disabled` prop

**Files:**
- Modify: `packages/design-system/src/components/DatePicker/DatePickerGrid.tsx`
- Modify: `packages/design-system/src/components/DatePicker/DatePickerGrid.module.scss`
- Modify: `packages/design-system/src/components/DatePicker/DatePickerGrid.test.tsx`

- [ ] **Step 1: Write the failing test**

Append the following `it` block to the existing `describe('DatePickerGrid', ...)` block in `DatePickerGrid.test.tsx`, immediately above the closing `});`:

```tsx
  it('disabled grid: chevrons are disabled, cells get tabIndex=-1, clicks are no-ops', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onCursorChange = vi.fn();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={onSelect}
        onCursorChange={onCursorChange}
        labels={LABELS}
        disabled
      />,
      { wrapper: wrap() },
    );
    // Chevrons disabled
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    // Cells non-focusable (tabIndex -1)
    const cell15 = screen.getByRole('gridcell', { name: /^15$/ });
    expect(cell15).toHaveAttribute('tabindex', '-1');
    // Click no-ops
    await user.click(cell15);
    expect(onSelect).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePickerGrid.test.tsx
```

Expected: 18 of the existing tests pass; the new test FAILS — `disabled` is not yet a prop, so chevrons render enabled and cell click fires `onSelect`.

- [ ] **Step 3: Add the `disabled` prop and wire it through `DatePickerGrid.tsx`**

In `DatePickerGridProps`, append after the existing `chevrons` prop:

```ts
  /**
   * When true: cells render muted, clicks no-op, chevrons are disabled,
   * and all cells get `tabIndex={-1}` so the grid isn't a tab stop.
   * Used by inline pickers to surface a non-interactive grid; the
   * field-based `<DatePicker>` / `<DateRangePicker>` don't pass this
   * (their `disabled` lives at the wrapper level — the popover never
   * opens, so the grid never renders).
   */
  disabled?: boolean;
```

In the component-parameter destructuring (where `chevrons = true` is destructured), add `disabled = false,` alongside the other defaults.

Update `tabIndexFor`'s top so it short-circuits when disabled. Replace the existing function body:

```ts
const tabIndexFor = (date: Date, isTodayCell: boolean): number => {
  if (disabled) return -1;
  if (selectionMode === 'range') {
    if (rangeStart != null && isSameDay(date, rangeStart)) return 0;
    if (
      rangeStart != null &&
      rangeEnd != null &&
      !isSameMonth(rangeStart, cursor) &&
      isSameDay(date, rangeEnd)
    )
      return 0;
    if (rangeStart == null && isTodayCell) return 0;
    return -1;
  }
  return value != null && isSameDay(date, value)
    ? 0
    : value == null && isTodayCell
      ? 0
      : -1;
};
```

Add `disabled` to the chevron buttons (find both `<button type="button" className={styles.navButton}` blocks; add `disabled={disabled}` after the `onClick` prop):

```tsx
<button
  type="button"
  className={styles.navButton}
  aria-label={labels.previousMonth}
  onClick={goPrev}
  disabled={disabled}
>
  <ChevronLeft size={14} />
</button>
```

(Same for the Next chevron.)

Gate the cell `onClick` on `disabled`:

```tsx
onClick={() => {
  if (disabled || isDisabled(day.date)) return;
  onSelect(day.date);
}}
```

(Locate the existing cell button's `onClick` and replace it with the version above. `isDisabled(day.date)` already exists.)

Add the `.disabledGrid` class to the outer `.grid` div when `disabled`:

```tsx
<div className={clsx(styles.grid, disabled && styles.disabledGrid)}>
```

(Locate the existing `<div className={styles.grid}>` and update.)

- [ ] **Step 4: Add the `.disabledGrid` SCSS rule**

Append at the bottom of `DatePickerGrid.module.scss`:

```scss
// Disabled state — applied to the outer grid container by inline pickers
// that want to show the calendar but block interaction. Visual mute via
// opacity; pointer-events disabled on the inner content so even custom
// styles can't intercept clicks. Chevrons and cells already carry their
// own `disabled` attribute / tabIndex=-1, but the visual blanket keeps
// the whole grid reading as inert.
.disabledGrid {
  opacity: var(--opacity-disabled);
}
```

We deliberately do NOT use `pointer-events: none` here — chevrons + cells already have their `disabled` / no-op handlers wired. `pointer-events: none` would block hover styles too, which is a worse UX than letting the cursor change.

- [ ] **Step 5: Run tests — all pass**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePickerGrid.test.tsx
```

Expected: 19/19 passing (18 existing + 1 new).

- [ ] **Step 6: Typecheck + lint:css clean**

```bash
npx tsc --noEmit -p packages/design-system/tsconfig.json
npm run lint:css
```

Both clean.

- [ ] **Step 7: Confirm DatePicker and DateRangePicker suites still pass**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePicker.test.tsx src/components/DateRangePicker/DateRangePicker.test.tsx
```

Expected: 24 (DP) + 24 (DRP) = 48/48 passing. The `disabled` prop defaults to false, so existing consumers see no behavior change.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/DatePicker/DatePickerGrid.tsx \
        packages/design-system/src/components/DatePicker/DatePickerGrid.module.scss \
        packages/design-system/src/components/DatePicker/DatePickerGrid.test.tsx
git commit -m "DatePickerGrid: add optional `disabled` prop (no-op clicks, tabIndex=-1, muted visual)"
```

---

## Task 3: InlineDatePicker — component + SCSS + index barrel

**Files:**
- Create: `packages/design-system/src/components/DatePicker/InlineDatePicker.tsx`
- Create: `packages/design-system/src/components/DatePicker/InlineDatePicker.module.scss`
- Modify: `packages/design-system/src/components/DatePicker/index.ts`

- [ ] **Step 1: Create the SCSS module**

`packages/design-system/src/components/DatePicker/InlineDatePicker.module.scss`:

```scss
// Inline picker wrapper — the calendar lives in flow (no popover, no
// portal). The wrapper carries no Rule-4 layout properties of its own;
// width is intrinsic to the underlying `<DatePickerGrid>` (~15rem) and
// the consumer's container controls overall placement.
.inline {
  display: inline-block;
}
```

- [ ] **Step 2: Create the component**

`packages/design-system/src/components/DatePicker/InlineDatePicker.tsx`:

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { DatePickerGrid } from './DatePickerGrid';
import { toIsoDate } from './utils';
import styles from './InlineDatePicker.module.scss';

export interface InlineDatePickerLabels {
  previousMonth?: string;
  nextMonth?: string;
}

export interface InlineDatePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Selected date. `null` = no value. Pair with `onChange` for controlled use. */
  value?: Date | null;
  /** Initial selected date for uncontrolled use. */
  defaultValue?: Date | null;
  /** Fires when the user clicks a cell. */
  onChange?: (date: Date | null) => void;

  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable callback. Disabled cells are non-clickable; arrow-key nav skips them. */
  isDateDisabled?: (date: Date) => boolean;

  /** Form name. When set, renders a hidden `<input type="hidden">` mirror with the ISO date. */
  name?: string;

  /** Disables interaction — cells / chevrons / keyboard nav all blocked. Defaults to `false`. */
  disabled?: boolean;

  /** Localized chevron strings. */
  labels?: InlineDatePickerLabels;
}

const DEFAULT_LABELS: Required<InlineDatePickerLabels> = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
};

/**
 * Inline single-date calendar — same month grid as `<DatePicker>` but
 * always rendered in flow (no input, no popover). Composes the shared
 * `<DatePickerGrid>` in single-mode.
 *
 * Cursor is sticky after user interaction: it anchors to `value ?? new
 * Date()` on mount and stays where the user navigates with the chevrons
 * / PageUp / PageDown. Programmatic `value` changes do NOT re-anchor the
 * cursor — the consumer owns scroll/focus into the new month if they
 * want it (via `ref`).
 *
 * @example
 * <InlineDatePicker value={date} onChange={setDate} />
 *
 * @example
 * // Constrained + form-mirror:
 * <form action="/api/dates">
 *   <InlineDatePicker name="dob" min={new Date()} />
 *   <button type="submit">Save</button>
 * </form>
 *
 * @example
 * // Disabled (read-only display):
 * <InlineDatePicker disabled defaultValue={new Date()} />
 *
 * @remarks When NOT to use
 * - Compact form field → use `<DatePicker>` (the popover variant).
 * - Choosing a range → use `<InlineDateRangePicker>`.
 * - Datetime selection → not supported in v1.
 *
 * @remarks Anti-patterns
 * - ❌ Rendering multiple `<InlineDatePicker>`s in the same flex row
 *   without giving them their intrinsic width — the calendar gets
 *   squashed. Wrap in `<Stack>` or give each a column.
 * - ❌ Using `value` without `onChange` — the picker is controlled when
 *   `value` is set; user clicks have no effect.
 */
export const InlineDatePicker = forwardRef<HTMLDivElement, InlineDatePickerProps>(
  function InlineDatePicker(
    {
      value: valueProp,
      defaultValue = null,
      onChange,
      locale: localeOverride,
      min,
      max,
      isDateDisabled,
      name,
      disabled = false,
      labels,
      className,
      ...rest
    },
    ref,
  ) {
    const contextLocale = useLocale();
    const locale = localeOverride ?? contextLocale;
    const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

    const [uncontrolled, setUncontrolled] = useState<Date | null>(defaultValue);
    const value = valueProp !== undefined ? valueProp : uncontrolled;
    const setValue = useCallback(
      (next: Date | null) => {
        if (valueProp === undefined) setUncontrolled(next);
        onChange?.(next);
      },
      [valueProp, onChange],
    );

    // Sticky cursor — anchor once on mount, then leave it alone.
    const [cursor, setCursor] = useState<Date>(value ?? new Date());
    // Re-anchor only on the FIRST controlled `value` set when it was previously null.
    // (Avoids surprise scroll when consumer updates state programmatically.)
    const valueRef = useRef(value);
    useEffect(() => {
      if (valueRef.current == null && value != null) setCursor(value);
      valueRef.current = value;
    }, [value]);

    const handleSelect = useCallback(
      (date: Date) => {
        setValue(date);
      },
      [setValue],
    );

    return (
      <div ref={ref} className={clsx(styles.inline, className)} {...rest}>
        <DatePickerGrid
          cursor={cursor}
          value={value}
          onSelect={handleSelect}
          onCursorChange={setCursor}
          min={min}
          max={max}
          isDateDisabled={isDateDisabled}
          locale={locale}
          labels={resolvedLabels}
          disabled={disabled}
        />
        {name && (
          <input type="hidden" name={name} value={value ? toIsoDate(value) : ''} />
        )}
      </div>
    );
  },
);
```

Add the missing `useRef` import at the top — replace the import line so it reads:

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
```

- [ ] **Step 3: Update the barrel**

In `packages/design-system/src/components/DatePicker/index.ts`, append after the existing exports:

```ts
export { InlineDatePicker } from './InlineDatePicker';
export type { InlineDatePickerProps, InlineDatePickerLabels } from './InlineDatePicker';
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit -p packages/design-system/tsconfig.json
```

Expected: clean.

- [ ] **Step 5: Commit (no tests yet — they land in Task 4)**

```bash
git add packages/design-system/src/components/DatePicker/InlineDatePicker.tsx \
        packages/design-system/src/components/DatePicker/InlineDatePicker.module.scss \
        packages/design-system/src/components/DatePicker/index.ts
git commit -m "InlineDatePicker: public component + barrel export"
```

---

## Task 4: InlineDatePicker tests

**Files:**
- Create: `packages/design-system/src/components/DatePicker/InlineDatePicker.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { InlineDatePicker } from './InlineDatePicker';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('InlineDatePicker', () => {
  it('renders the month grid for the cursor month (anchored to value on mount)', () => {
    render(<InlineDatePicker defaultValue={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: /^21$/, selected: true })).toBeInTheDocument();
  });

  it('uncontrolled: clicking a cell commits via onChange', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(
      <InlineDatePicker defaultValue={new Date(2026, 4, 1)} onChange={onChange} aria-label="Date" />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('gridcell', { name: /^15$/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]!.getDate()).toBe(15);
  });

  it('controlled: value updates when consumer changes it', () => {
    function Driver() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 21));
      return (
        <>
          <InlineDatePicker value={v} onChange={setV} aria-label="Date" />
          <button onClick={() => setV(new Date(2026, 4, 5))}>Pick May 5</button>
        </>
      );
    }
    render(<Driver />, { wrapper: wrap() });
    expect(screen.getByRole('gridcell', { name: /^21$/, selected: true })).toBeInTheDocument();
  });

  it('chevrons step the cursor (month header updates)', async () => {
    const user = userEvent.setup();
    render(<InlineDatePicker defaultValue={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText(/June 2026/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText(/April 2026/)).toBeInTheDocument();
  });

  it('min / max disable out-of-range cells; clicks are no-ops', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 15)}
        min={new Date(2026, 4, 10)}
        max={new Date(2026, 4, 20)}
        onChange={onChange}
        aria-label="Date"
      />,
      { wrapper: wrap() },
    );
    const cell5 = screen.getByRole('gridcell', { name: /^5$/ });
    expect(cell5).toHaveAttribute('aria-disabled', 'true');
    await user.click(cell5);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('isDateDisabled blocks specific cells', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 1)}
        isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        onChange={onChange}
        aria-label="Weekday only"
      />,
      { wrapper: wrap() },
    );
    // Sat May 2, 2026
    const sat = screen.getByRole('gridcell', { name: /^2$/ });
    expect(sat).toHaveAttribute('aria-disabled', 'true');
    await user.click(sat);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disabled blocks all interaction', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 21)}
        disabled
        onChange={onChange}
        aria-label="Date"
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    await user.click(screen.getByRole('gridcell', { name: /^15$/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('name renders a hidden form mirror with the ISO date', () => {
    const { container } = render(
      <InlineDatePicker
        name="dob"
        defaultValue={new Date(2026, 4, 21)}
        aria-label="Date"
      />,
      { wrapper: wrap() },
    );
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="dob"]',
    );
    expect(hidden?.value).toBe('2026-05-21');
  });

  it('name with null value emits an empty hidden mirror', () => {
    const { container } = render(
      <InlineDatePicker name="dob" aria-label="Date" />,
      { wrapper: wrap() },
    );
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="dob"]',
    );
    expect(hidden?.value).toBe('');
  });

  it('forwards ref to the wrapper div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<InlineDatePicker ref={ref} aria-label="Date" />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className from props with the internal wrapper class', () => {
    const { container } = render(
      <InlineDatePicker className="custom" aria-label="Date" />,
      { wrapper: wrap() },
    );
    const wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.className).toMatch(/custom/);
    expect(wrapper.className).toMatch(/inline/);
  });

  it('ru-RU locale shows Cyrillic month + weekday labels', () => {
    render(
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 21)}
        locale="ru-RU"
        aria-label="Дата"
      />,
      { wrapper: wrap('ru-RU') },
    );
    expect(document.body.textContent).toMatch(/[Ѐ-ӿ]/);
  });
});
```

- [ ] **Step 2: Run tests — all pass**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/InlineDatePicker.test.tsx
```

Expected: 11/11 passing.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/DatePicker/InlineDatePicker.test.tsx
git commit -m "InlineDatePicker: tests (renders, controlled/uncontrolled, click, chevrons, min/max/isDateDisabled, disabled, form mirror, ref, className, locale)"
```

---

## Task 5: InlineDateRangePicker — component + SCSS + barrel

**Files:**
- Create: `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.tsx`
- Create: `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.module.scss`
- Modify: `packages/design-system/src/components/DateRangePicker/index.ts`

- [ ] **Step 1: Create the SCSS module**

`packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.module.scss`:

```scss
@use '../../styles/mixins' as *;

// Inline range picker — mirrors the DateRangePicker popover content but
// lives in flow (no popover, no portal). Wrapper carries no Rule-4
// layout properties; the inner grid pair is intrinsically sized.
.inline {
  display: inline-flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
}

// Disabled — mute the entire inline group. Chevrons inside already
// carry their own `disabled` attribute (Task 2 wired it); cells inside
// each grid get tabIndex=-1 via the grid's own disabled handling.
.disabled {
  opacity: var(--opacity-disabled);
}

// External chevron header — same shape as DateRangePicker.popoverHeader.
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-1);
}

.headerSpacer {
  flex: 1;
}

.navButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--space-6);
  height: var(--space-6);
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-fg-muted);
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--color-bg-subtle);
    color: var(--color-fg);
  }

  &:focus-visible {
    @include focus-ring;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

// Two grids side-by-side with a small gutter.
.grids {
  display: flex;
  gap: var(--space-3);
}
```

- [ ] **Step 2: Create the component**

`packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.tsx`:

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from '../../i18n/useLocale';
import { addMonths } from '../../calendar/dateMath';
import { DatePickerGrid } from '../DatePicker/DatePickerGrid';
import { toIsoDate } from '../DatePicker/utils';
import { autoSwapRange, type DateRange } from './utils';
import styles from './InlineDateRangePicker.module.scss';

export interface InlineDateRangePickerLabels {
  previousMonth?: string;
  nextMonth?: string;
}

export interface InlineDateRangePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Selected range. `null` = no range. Pair with `onChange` for controlled use. */
  value?: DateRange | null;
  /** Initial range for uncontrolled use. */
  defaultValue?: DateRange | null;
  /** Fires when a complete range commits (second click, auto-swapped). */
  onChange?: (range: DateRange | null) => void;

  /** Override locale. */
  locale?: string;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable predicate. */
  isDateDisabled?: (date: Date) => boolean;

  /** Form name for the START half (hidden `<input>` mirror). */
  nameStart?: string;
  /** Form name for the END half. */
  nameEnd?: string;

  /** Disables interaction. Defaults to `false`. */
  disabled?: boolean;

  /** Localized chevron strings. */
  labels?: InlineDateRangePickerLabels;
}

const DEFAULT_LABELS: Required<InlineDateRangePickerLabels> = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
};

/**
 * Inline date-range calendar — same two-month grid as `<DateRangePicker>`
 * but always rendered in flow (no input, no popover). Composes two
 * `<DatePickerGrid>` instances in `selectionMode='range'` with the same
 * click-1 / click-2 / restart selection machine.
 *
 * Cursor is sticky after user interaction; the external prev/next
 * chevrons in the header shift both grids by ±1 month at once.
 * Keyboard cross-grid navigation works in both directions (per-grid
 * `onCursorChange` callbacks; right grid's translates via
 * `addMonths(c, -1)`).
 *
 * @example
 * <InlineDateRangePicker value={range} onChange={setRange} />
 *
 * @example
 * <form action="/api/bookings">
 *   <InlineDateRangePicker
 *     nameStart="bookingStart"
 *     nameEnd="bookingEnd"
 *     min={new Date()}
 *   />
 *   <button type="submit">Save</button>
 * </form>
 *
 * @remarks When NOT to use
 * - Compact form field → use `<DateRangePicker>` (the popover variant).
 * - Single-date selection → use `<InlineDatePicker>`.
 *
 * @remarks Anti-patterns
 * - ❌ Wrapping in a narrow container (< ~32rem). The two grids need
 *   side-by-side room; squashing them clips the right grid.
 * - ❌ Using `value` without `onChange`.
 */
export const InlineDateRangePicker = forwardRef<
  HTMLDivElement,
  InlineDateRangePickerProps
>(function InlineDateRangePicker(
  {
    value: valueProp,
    defaultValue = null,
    onChange,
    locale: localeOverride,
    min,
    max,
    isDateDisabled,
    nameStart,
    nameEnd,
    disabled = false,
    labels,
    className,
    ...rest
  },
  ref,
) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

  const [uncontrolled, setUncontrolled] = useState<DateRange | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : uncontrolled;
  const setValue = useCallback(
    (next: DateRange | null) => {
      if (valueProp === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [valueProp, onChange],
  );

  const [cursor, setCursor] = useState<Date>(value?.start ?? new Date());

  // Re-anchor only on the FIRST controlled `value` set when it was previously null.
  const valueRef = useRef(value);
  useEffect(() => {
    if (valueRef.current == null && value != null) setCursor(value.start);
    valueRef.current = value;
  }, [value]);

  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const handleGridSelect = useCallback(
    (date: Date) => {
      if (selectionStart == null) {
        setSelectionStart(date);
        setHoverDate(null);
      } else {
        const range = autoSwapRange(selectionStart, date);
        setSelectionStart(null);
        setHoverDate(null);
        setValue(range);
      }
    },
    [selectionStart, setValue],
  );

  // Per-grid cursor-change callbacks — same translation as the popover
  // variant. Right grid's `onCursorChange(M)` means "show month M on the
  // right," which requires DRP cursor = M − 1 (because right always
  // renders cursor + 1).
  const handleLeftGridCursorChange = useCallback((c: Date) => {
    setCursor(c);
  }, []);
  const handleRightGridCursorChange = useCallback((c: Date) => {
    setCursor(addMonths(c, -1));
  }, []);

  const goPrev = useCallback(() => {
    setCursor((c) => addMonths(c, -1));
  }, []);
  const goNext = useCallback(() => {
    setCursor((c) => addMonths(c, 1));
  }, []);

  const gridRangeStart = selectionStart ?? value?.start ?? null;
  const gridRangeEnd = selectionStart != null ? null : (value?.end ?? null);
  const rightCursor = addMonths(cursor, 1);

  return (
    <div
      ref={ref}
      className={clsx(styles.inline, disabled && styles.disabled, className)}
      {...rest}
    >
      <header className={styles.header}>
        <button
          type="button"
          className={styles.navButton}
          aria-label={resolvedLabels.previousMonth}
          onClick={goPrev}
          disabled={disabled}
        >
          <ChevronLeft size={14} />
        </button>
        <div className={styles.headerSpacer} />
        <button
          type="button"
          className={styles.navButton}
          aria-label={resolvedLabels.nextMonth}
          onClick={goNext}
          disabled={disabled}
        >
          <ChevronRight size={14} />
        </button>
      </header>
      <div className={styles.grids}>
        <DatePickerGrid
          cursor={cursor}
          value={null}
          onCursorChange={handleLeftGridCursorChange}
          onSelect={handleGridSelect}
          min={min}
          max={max}
          isDateDisabled={isDateDisabled}
          locale={locale}
          labels={resolvedLabels}
          selectionMode="range"
          rangeStart={gridRangeStart}
          rangeEnd={gridRangeEnd}
          hoverDate={hoverDate}
          onHoverDate={setHoverDate}
          chevrons={false}
          disabled={disabled}
        />
        <DatePickerGrid
          cursor={rightCursor}
          value={null}
          onCursorChange={handleRightGridCursorChange}
          onSelect={handleGridSelect}
          min={min}
          max={max}
          isDateDisabled={isDateDisabled}
          locale={locale}
          labels={resolvedLabels}
          selectionMode="range"
          rangeStart={gridRangeStart}
          rangeEnd={gridRangeEnd}
          hoverDate={hoverDate}
          onHoverDate={setHoverDate}
          chevrons={false}
          disabled={disabled}
        />
      </div>
      {nameStart && (
        <input
          type="hidden"
          name={nameStart}
          value={value ? toIsoDate(value.start) : ''}
        />
      )}
      {nameEnd && (
        <input
          type="hidden"
          name={nameEnd}
          value={value ? toIsoDate(value.end) : ''}
        />
      )}
    </div>
  );
});
```

- [ ] **Step 3: Update the barrel**

In `packages/design-system/src/components/DateRangePicker/index.ts`, append:

```ts
export { InlineDateRangePicker } from './InlineDateRangePicker';
export type {
  InlineDateRangePickerProps,
  InlineDateRangePickerLabels,
} from './InlineDateRangePicker';
```

- [ ] **Step 4: Typecheck + lint:css**

```bash
npx tsc --noEmit -p packages/design-system/tsconfig.json
npm run lint:css
```

Both clean.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.tsx \
        packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.module.scss \
        packages/design-system/src/components/DateRangePicker/index.ts
git commit -m "InlineDateRangePicker: public component + barrel export"
```

---

## Task 6: InlineDateRangePicker tests

**Files:**
- Create: `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { InlineDateRangePicker } from './InlineDateRangePicker';
import type { DateRange } from './utils';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

const MAY = (d: number) => new Date(2026, 4, d);
const JUN = (d: number) => new Date(2026, 5, d);
const SAMPLE: DateRange = { start: MAY(21), end: JUN(4) };

describe('InlineDateRangePicker', () => {
  it('renders two month grids with external prev/next chevrons', () => {
    render(
      <InlineDateRangePicker defaultValue={SAMPLE} aria-label="Range" />,
      { wrapper: wrap() },
    );
    expect(screen.getAllByRole('grid')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
    expect(screen.getByText(/June 2026/)).toBeInTheDocument();
  });

  it('two grid clicks commit a range (start then end)', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker
        defaultValue={null}
        onChange={onChange}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    expect(onChange).not.toHaveBeenCalled();
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(tens[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(10);
  });

  it('clicking end-before-start auto-swaps', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker
        defaultValue={null}
        onChange={onChange}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(tens[0]);
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(10);
  });

  it('third click after a committed range restarts selection', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker
        defaultValue={null}
        onChange={onChange}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    // First range: 5 → 10
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(fives[0]);
    await user.click(tens[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    // Third click → restart. Second range: 15 → 20.
    const fifteens = screen.getAllByRole('gridcell', { name: /^15$/ });
    await user.click(fifteens[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const twenties = screen.getAllByRole('gridcell', { name: /^20$/ });
    await user.click(twenties[0]);
    expect(onChange).toHaveBeenCalledTimes(2);
    const r2 = onChange.mock.calls[1][0]!;
    expect(r2.start.getDate()).toBe(15);
    expect(r2.end.getDate()).toBe(20);
  });

  it('external chevrons step the cursor (both grids advance/retreat)', async () => {
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker defaultValue={SAMPLE} aria-label="Range" />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText(/June 2026/)).toBeInTheDocument();
    expect(screen.getByText(/July 2026/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText(/April 2026/)).toBeInTheDocument();
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
  });

  it('keyboard ArrowRight at left-grid end-of-month advances the cursor (exercises handleLeftGridCursorChange)', async () => {
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker
        defaultValue={{ start: new Date(2026, 4, 31), end: new Date(2026, 4, 31) }}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    // Focus the rangeStart cell (May 31 in left grid).
    const focusable = document.querySelectorAll<HTMLButtonElement>(
      '[role="gridcell"][tabindex="0"]',
    );
    expect(focusable.length).toBeGreaterThan(0);
    focusable[0].focus();
    expect((document.activeElement as HTMLElement)?.textContent).toBe('31');
    await user.keyboard('{ArrowRight}');
    expect((document.activeElement as HTMLElement)?.textContent).toBe('1');
  });

  it('keyboard ArrowLeft from a right-grid cell shifts cursor backward (exercises handleRightGridCursorChange)', async () => {
    const user = userEvent.setup();
    // defaultValue spans April→May → cursor=April, LEFT=April, RIGHT=May.
    // Right grid's May 1 cell becomes the rangeEnd fallback tabIndex=0.
    render(
      <InlineDateRangePicker
        defaultValue={{ start: new Date(2026, 3, 30), end: new Date(2026, 4, 1) }}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const focusable = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="gridcell"][tabindex="0"]'),
    );
    // Last focusable cell is the right grid's May 1 (rangeEnd in a different month from rangeStart).
    const rightMay1 = focusable[focusable.length - 1];
    rightMay1.focus();
    expect((document.activeElement as HTMLElement)?.textContent).toBe('1');
    await user.keyboard('{ArrowLeft}');
    // Right grid now shows April; focus lands on April 30.
    expect((document.activeElement as HTMLElement)?.textContent).toBe('30');
  });

  it('min / max reject out-of-range clicks', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker
        defaultValue={null}
        min={new Date(2026, 4, 10)}
        max={new Date(2026, 4, 20)}
        onChange={onChange}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const cell5 = screen.getAllByRole('gridcell', { name: /^5$/ })[0];
    expect(cell5).toHaveAttribute('aria-disabled', 'true');
    await user.click(cell5);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('isDateDisabled blocks specific cells from both halves', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InlineDateRangePicker
        defaultValue={null}
        isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        onChange={onChange}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    // Saturday cell (some day-of-month varies — find by aria-disabled)
    const disabledCells = screen
      .getAllByRole('gridcell')
      .filter((c) => c.getAttribute('aria-disabled') === 'true');
    expect(disabledCells.length).toBeGreaterThan(0);
    await user.click(disabledCells[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('nameStart and nameEnd render two hidden mirrors with ISO dates', () => {
    const { container } = render(
      <InlineDateRangePicker
        nameStart="from"
        nameEnd="to"
        defaultValue={SAMPLE}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const start = container.querySelector<HTMLInputElement>('input[name="from"]');
    const end = container.querySelector<HTMLInputElement>('input[name="to"]');
    expect(start?.value).toBe('2026-05-21');
    expect(end?.value).toBe('2026-06-04');
  });

  it('null value emits empty hidden mirrors', () => {
    const { container } = render(
      <InlineDateRangePicker nameStart="from" nameEnd="to" aria-label="Range" />,
      { wrapper: wrap() },
    );
    expect(container.querySelector<HTMLInputElement>('input[name="from"]')?.value).toBe('');
    expect(container.querySelector<HTMLInputElement>('input[name="to"]')?.value).toBe('');
  });

  it('disabled blocks all interaction', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker
        disabled
        defaultValue={SAMPLE}
        onChange={onChange}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    await user.click(screen.getAllByRole('gridcell', { name: /^15$/ })[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards ref to the wrapper div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<InlineDateRangePicker ref={ref} aria-label="Range" />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className with internal wrapper class', () => {
    const { container } = render(
      <InlineDateRangePicker className="custom" aria-label="Range" />,
      { wrapper: wrap() },
    );
    const wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.className).toMatch(/custom/);
    expect(wrapper.className).toMatch(/inline/);
  });

  it('ru-RU locale shows Cyrillic month + weekday labels', () => {
    render(
      <InlineDateRangePicker
        defaultValue={SAMPLE}
        locale="ru-RU"
        aria-label="Диапазон"
      />,
      { wrapper: wrap('ru-RU') },
    );
    expect(document.body.textContent).toMatch(/[Ѐ-ӿ]/);
  });
});
```

- [ ] **Step 2: Run tests — all pass**

```bash
cd packages/design-system && npx vitest run src/components/DateRangePicker/InlineDateRangePicker.test.tsx
```

Expected: 15/15 passing.

- [ ] **Step 3: Confirm no regression in the full design-system suite**

```bash
cd packages/design-system && npx vitest run
```

Expected: existing tests + 11 (InlineDP) + 15 (InlineDRP) + 1 (Task 2 disabled grid) = ~771 passing.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.test.tsx
git commit -m "InlineDateRangePicker: tests (renders, selection flow, restart, chevrons, keyboard cross-grid, min/max, isDateDisabled, form mirrors, disabled, ref, className, locale)"
```

---

## Task 7: Re-export from `src/index.ts`

**Files:**
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Add the re-exports**

After the existing `DateRangePicker` block in `src/index.ts`, append:

```ts
export { InlineDatePicker } from './components/DatePicker';
export type {
  InlineDatePickerProps,
  InlineDatePickerLabels,
} from './components/DatePicker';

export { InlineDateRangePicker } from './components/DateRangePicker';
export type {
  InlineDateRangePickerProps,
  InlineDateRangePickerLabels,
} from './components/DateRangePicker';
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
cd packages/design-system && npx vitest run src/structure.test.ts
```

Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/index.ts
git commit -m "InlineDatePicker + InlineDateRangePicker: re-export from package root"
```

---

## Task 8: Playground — `InputExample` `width='auto'` short-circuit + inline demos

**Files:**
- Modify: `packages/playground/src/pages/components/InputExample.tsx`
- Create: `packages/playground/src/pages/components/InlineDatePickerDemo.tsx`
- Create: `packages/playground/src/pages/components/InlineDateRangePickerDemo.tsx`
- Modify: `packages/playground/src/App.tsx` — routes
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` — Forms entries
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` — cards
- Modify: `packages/playground/src/pages/mockups/registry.ts` — `ComponentName` union

- [ ] **Step 1: Extend `InputExample` to support `width='auto'`**

Replace `packages/playground/src/pages/components/InputExample.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { Cluster } from '@eocrm/design-system';

export interface InputExampleProps {
  /**
   * Fixed width (in px or any CSS length) of the inner column. Defaults
   * to `320` — enough to fit `<Input>` / `<Select>` / `<DatePicker>` /
   * `<DateRangePicker>` with a realistic placeholder + suffix buttons.
   * Pass a larger value for compound rows (form + submit button beside
   * the field), or `'auto'` for intrinsically-sized content (e.g.
   * inline calendars) — the inner column then doesn't impose a width
   * and the `<Cluster>` still centers the children.
   */
  width?: number | string;
  /** The field (single component) or composed row (Stack / form) to render inside. */
  children: ReactNode;
}

/**
 * Demo helper. Wraps an input-shaped component (Input, Select,
 * DatePicker, DateRangePicker, InlineDatePicker, …) in a centered,
 * width-limited container so every field-component demo lays out
 * consistently.
 *
 * - Default width 320px centers the field at a realistic CRM-form size.
 * - `width="auto"` skips the inner width constraint so intrinsically
 *   sized children (inline calendars) render at their natural size,
 *   still centered.
 */
export function InputExample({ width = 320, children }: InputExampleProps) {
  if (width === 'auto') {
    return (
      <Cluster gap="md" justify="center">
        {children}
      </Cluster>
    );
  }
  return (
    <Cluster gap="md" justify="center">
      <div style={{ width }}>{children}</div>
    </Cluster>
  );
}
```

- [ ] **Step 2: Create `InlineDatePickerDemo.tsx`**

```tsx
import { useState } from 'react';
import { Button, InlineDatePicker, Stack, toDateKey } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import tsxSource from '@lib-source/components/DatePicker/InlineDatePicker.tsx?raw';
import scssSource from '@lib-source/components/DatePicker/InlineDatePicker.module.scss?raw';

const TODAY = new Date();
const IN_90 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);

function ControlledDemo() {
  const [value, setValue] = useState<Date | null>(TODAY);
  return (
    <Stack gap="xs">
      <InlineDatePicker value={value} onChange={setValue} aria-label="Controlled date" />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? toDateKey(value) : 'null'}
      </code>
    </Stack>
  );
}

function FormDemo() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSubmitted(String(fd.get('dob') ?? ''));
      }}
    >
      <Stack gap="xs">
        <InlineDatePicker name="dob" defaultValue={TODAY} aria-label="Date of birth" />
        <Button type="submit" size="sm">
          Submit
        </Button>
        {submitted !== null && (
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            dob = {submitted || '(empty)'}
          </code>
        )}
      </Stack>
    </form>
  );
}

export function InlineDatePickerDemo() {
  return (
    <DemoLayout
      name="InlineDatePicker"
      componentName="InlineDatePicker"
      description="Single-date calendar grid embedded directly in the page (no input, no popover). Same selection / keyboard / locale behavior as <DatePicker>; useful for always-visible date selection (sidebar calendars, schedule editors)."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="InlineDatePicker.tsx"
      scssFilename="InlineDatePicker.module.scss"
    >
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Click a cell to set; use the chevrons or PageUp/PageDown to navigate."
        code={`<InlineDatePicker defaultValue={new Date()} />`}
      >
        <InputExample width="auto">
          <InlineDatePicker defaultValue={TODAY} aria-label="Uncontrolled date" />
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value via `value` + `onChange`. The picker's cursor stays where the user navigated — programmatic value changes don't scroll the calendar."
        code={`const [value, setValue] = useState<Date | null>(new Date());
<InlineDatePicker value={value} onChange={setValue} />`}
      >
        <InputExample width="auto">
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Min / max"
        description="Restrict picks to a window. Out-of-range cells are non-clickable; arrow nav skips them."
        code={`const today = new Date();
const in90 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

<InlineDatePicker min={today} max={in90} />`}
      >
        <InputExample width="auto">
          <InlineDatePicker
            defaultValue={TODAY}
            min={TODAY}
            max={IN_90}
            aria-label="Date within 90 days"
          />
        </InputExample>
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell. Disabled cells are non-clickable and arrow-key navigation skips them."
        code={`<InlineDatePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
      >
        <InputExample width="auto">
          <InlineDatePicker
            aria-label="Weekday only"
            isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
          />
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="Use `disabled` when the calendar is unavailable in the current context. Cells / chevrons / keyboard nav all blocked; the grid mutes visually."
        code={`<InlineDatePicker disabled defaultValue={new Date()} />`}
      >
        <InputExample width="auto">
          <InlineDatePicker disabled defaultValue={TODAY} aria-label="Disabled date" />
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="When `name` is set, the picker renders a hidden mirror `<input>` with the ISO date so native `<form>` submission works."
        code={`<form action="/api/dates">
  <InlineDatePicker name="dob" defaultValue={new Date()} />
  <button type="submit">Submit</button>
</form>`}
      >
        <InputExample width="auto">
          <FormDemo />
        </InputExample>
      </Example>

      <Example
        title="ru-RU locale"
        description="Locale-aware month + weekday labels."
        code={`<InlineDatePicker
  defaultValue={new Date()}
  locale="ru-RU"
  labels={{
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
  }}
/>`}
      >
        <InputExample width="auto">
          <InlineDatePicker
            defaultValue={TODAY}
            locale="ru-RU"
            aria-label="Дата"
            labels={{
              previousMonth: 'Предыдущий месяц',
              nextMonth: 'Следующий месяц',
            }}
          />
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 3: Create `InlineDateRangePickerDemo.tsx`**

```tsx
import { useState } from 'react';
import {
  Button,
  InlineDateRangePicker,
  Stack,
  toDateKey,
  type DateRange,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import tsxSource from '@lib-source/components/DateRangePicker/InlineDateRangePicker.tsx?raw';
import scssSource from '@lib-source/components/DateRangePicker/InlineDateRangePicker.module.scss?raw';

const TODAY = new Date();
const IN_14 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 14);
const IN_90 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);

function ControlledDemo() {
  const [value, setValue] = useState<DateRange | null>({ start: TODAY, end: IN_14 });
  return (
    <Stack gap="xs">
      <InlineDateRangePicker
        value={value}
        onChange={setValue}
        aria-label="Controlled range"
      />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? `${toDateKey(value.start)} → ${toDateKey(value.end)}` : 'null'}
      </code>
    </Stack>
  );
}

function FormDemo() {
  const [submitted, setSubmitted] = useState<{ start: string; end: string } | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSubmitted({
          start: String(fd.get('bookingStart') ?? ''),
          end: String(fd.get('bookingEnd') ?? ''),
        });
      }}
    >
      <Stack gap="xs">
        <InlineDateRangePicker
          nameStart="bookingStart"
          nameEnd="bookingEnd"
          defaultValue={{ start: TODAY, end: IN_14 }}
          aria-label="Booking dates"
        />
        <Button type="submit" size="sm">
          Submit
        </Button>
        {submitted !== null && (
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            bookingStart = {submitted.start || '(empty)'} · bookingEnd ={' '}
            {submitted.end || '(empty)'}
          </code>
        )}
      </Stack>
    </form>
  );
}

export function InlineDateRangePickerDemo() {
  return (
    <DemoLayout
      name="InlineDateRangePicker"
      componentName="InlineDateRangePicker"
      description="Date-range calendar grid (two months side-by-side) embedded directly in the page. Same click-1/click-2/restart selection, hover preview, auto-swap, and keyboard cross-grid navigation as <DateRangePicker>, without the input / popover."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="InlineDateRangePicker.tsx"
      scssFilename="InlineDateRangePicker.module.scss"
    >
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Click start then end; hover (or arrow-key) between clicks shows the preview range."
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<InlineDateRangePicker defaultValue={{ start: today, end: in14 }} />`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            defaultValue={{ start: TODAY, end: IN_14 }}
            aria-label="Uncontrolled range"
          />
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value via `value` + `onChange`. Useful when the form layer reacts to range changes (validation, summary panels)."
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
const [value, setValue] = useState<DateRange | null>({ start: today, end: in14 });

<InlineDateRangePicker value={value} onChange={setValue} />`}
      >
        <InputExample width="auto">
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Min / max"
        description="Out-of-range cells are non-clickable on both halves."
        code={`const today = new Date();
const in90 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

<InlineDateRangePicker min={today} max={in90} />`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            defaultValue={{ start: TODAY, end: IN_14 }}
            min={TODAY}
            max={IN_90}
            aria-label="Range within 90 days"
          />
        </InputExample>
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell on both halves and gates the boundary picks."
        code={`<InlineDateRangePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            aria-label="Weekday range only"
            isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
          />
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="`disabled` blocks selection and chevron navigation; the entire grid pair mutes visually."
        code={`<InlineDateRangePicker disabled defaultValue={{ start: today, end: in14 }} />`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            disabled
            defaultValue={{ start: TODAY, end: IN_14 }}
            aria-label="Disabled range"
          />
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="When `nameStart` and `nameEnd` are set, the picker renders two hidden mirror `<input>`s with ISO dates so native `<form>` submission works."
        code={`<form action="/api/bookings">
  <InlineDateRangePicker nameStart="bookingStart" nameEnd="bookingEnd" />
  <button type="submit">Submit</button>
</form>`}
      >
        <InputExample width="auto">
          <FormDemo />
        </InputExample>
      </Example>

      <Example
        title="ru-RU locale"
        description="Locale-aware labels. UI strings (chevron tooltips) localized via the labels prop."
        code={`<InlineDateRangePicker
  defaultValue={{ start: today, end: in14 }}
  locale="ru-RU"
  labels={{
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
  }}
/>`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            defaultValue={{ start: TODAY, end: IN_14 }}
            locale="ru-RU"
            aria-label="Диапазон дат"
            labels={{
              previousMonth: 'Предыдущий месяц',
              nextMonth: 'Следующий месяц',
            }}
          />
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 4: Add the routes**

In `packages/playground/src/App.tsx`:

- Add imports (alphabetical):
  ```tsx
  import { InlineDatePickerDemo } from './pages/components/InlineDatePickerDemo';
  import { InlineDateRangePickerDemo } from './pages/components/InlineDateRangePickerDemo';
  ```
- Add routes (alphabetical position; between DatePicker and Input):
  ```tsx
  <Route path="/components/inline-datepicker" element={<InlineDatePickerDemo />} />
  <Route path="/components/inline-daterangepicker" element={<InlineDateRangePickerDemo />} />
  ```

- [ ] **Step 5: Add to AppShell sidebar Forms group**

In `packages/playground/src/layout/AppShell/AppShell.tsx`:

- Add `CalendarDays` (or another distinct calendar icon) to the `lucide-react` import if not present. Use `CalendarHeart` for the range variant.
- Insert two new entries in the Forms group (alphabetical — between DatePicker and Input):
  ```tsx
  { to: '/components/inline-datepicker', label: 'InlineDatePicker', icon: CalendarDays, end: false },
  { to: '/components/inline-daterangepicker', label: 'InlineDateRangePicker', icon: CalendarHeart, end: false },
  ```

If `CalendarDays` is already in use by DatePicker, pick a different distinct icon from `lucide-react` (e.g., `CalendarPlus`, `CalendarClock`) — the visual just needs to read as "calendar" and differ from the field-based pickers' icons.

- [ ] **Step 6: Add to ComponentsIndex**

In `packages/playground/src/pages/components/ComponentsIndex.tsx`:

- Add imports for `InlineDatePicker` and `InlineDateRangePicker`.
- Insert two new cards after `DateRangePicker` (alphabetical):
  ```tsx
  {
    to: '/components/inline-datepicker',
    name: 'InlineDatePicker',
    description: 'Single-date calendar embedded in flow (no input, no popover).',
    preview: (
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 21)}
        aria-label="Preview"
      />
    ),
  },
  {
    to: '/components/inline-daterangepicker',
    name: 'InlineDateRangePicker',
    description: 'Date-range calendar (two months side-by-side) embedded in flow.',
    preview: (
      <InlineDateRangePicker
        defaultValue={{
          start: new Date(2026, 4, 21),
          end: new Date(2026, 5, 4),
        }}
        aria-label="Preview"
      />
    ),
  },
  ```

(Use the exact card shape used by the existing entries. Match property names / order.)

- [ ] **Step 7: Extend the ComponentName union**

In `packages/playground/src/pages/mockups/registry.ts`, add `'InlineDatePicker'` and `'InlineDateRangePicker'` to the union (alphabetical position).

- [ ] **Step 8: Build + typecheck**

```bash
npm run typecheck
npm run build
```

Both clean.

- [ ] **Step 9: Commit**

```bash
git add packages/playground
git commit -m "playground: InlineDatePicker + InlineDateRangePicker demos + nav + components index"
```

---

## Task 9: AGENTS.md sections

**Files:**
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Insert two new sections**

Place these in `packages/design-system/AGENTS.md` immediately AFTER the existing `### <DateRangePicker>` section and BEFORE `### Calendar primitives`.

```markdown
### `<InlineDatePicker>` — single-date calendar in flow

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
```

```markdown
### `<InlineDateRangePicker>` — date-range calendar in flow

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
```

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "InlineDatePicker + InlineDateRangePicker: AGENTS.md sections"
```

---

## Task 10: Final gates + Hard Rule 8 review-fix cycles + PR

**Files:** (no edits — gates + review)

- [ ] **Step 1: Run all gates**

```bash
npm test --run
npm run typecheck
npm run lint:css
npm run build
npx prettier --check "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md"
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "\.test\.|node_modules" | head
```

Expected:
- tests: ~771 / ~771 passing (existing + 11 InlineDP + 15 InlineDRP + 1 DatePickerGrid disabled)
- typecheck: clean
- lint:css: clean
- build: succeeds
- prettier: clean (if not, `npx prettier --write` the offenders and re-check)
- `npm pack --dry-run`: no `.test.` files in the tarball

- [ ] **Step 2: Run inline picker test files 5x for flake detection**

```bash
for i in 1 2 3 4 5; do
  echo "--- run $i ---"
  cd packages/design-system && \
    npx vitest run src/components/DatePicker/InlineDatePicker.test.tsx src/components/DateRangePicker/InlineDateRangePicker.test.tsx 2>&1 | \
    grep -E "^ (Tests|Test Files)"
  cd ../..
done
```

Expected: every run reports the same passing count, no flakes.

- [ ] **Step 3: Push branch**

```bash
git push -u origin feat/inline-date-pickers
```

- [ ] **Step 4: Run Hard Rule 8 review cycle 1**

Dispatch a fresh-context `general-purpose` review agent with the standard 10-category brief from `packages/design-system/CLAUDE.md` Hard Rule 8. Required reading: repo `CLAUDE.md`, package `CLAUDE.md`, `AGENTS.md`, design spec `docs/superpowers/specs/2026-05-21-inline-date-pickers-design.md`, full branch diff `git diff main..HEAD -- packages/`. Output: Critical / Important / Nice-to-have / Regression-watch + verdict.

- [ ] **Step 5: Fix Critical + Important findings**

Apply fixes inline, run gates, push, repeat.

- [ ] **Step 6: Run review cycles 2+ until verdict is `clean enough to stop`**

- [ ] **Step 7: Open PR**

```bash
gh pr create --title "InlineDatePicker + InlineDateRangePicker — standalone calendars without input + popover" --body "$(cat <<'EOF'
## Summary

- Two new public components: `<InlineDatePicker>` and `<InlineDateRangePicker>` — the same month grid (and click-1/click-2/restart range selection) as the popover-based pickers, rendered directly in flow.
- `<InlineDatePicker>` composes one `<DatePickerGrid>` (single mode); `<InlineDateRangePicker>` composes two grids in `selectionMode='range'` with external prev/next chevrons and per-grid `onCursorChange` callbacks for keyboard cross-grid navigation in both directions.
- Keep form-mirror props (`name`, `nameStart`, `nameEnd`) so consumers can post via native `<form>`.
- Small additive change to `DatePickerGrid`: new optional `disabled?: boolean` prop (cells non-clickable, chevrons disabled, tabIndex=-1, muted visual). Existing field-based pickers don't pass it; no behavior change.
- `<InputExample>` (playground helper) gains `width='auto'` to let inline calendars render at their intrinsic size while staying centered.

## Test plan

- [x] `npm test --run` — ~771/~771 passing (existing + 11 InlineDP + 15 InlineDRP + 1 new DatePickerGrid `disabled` test)
- [x] `npm run typecheck` clean
- [x] `npm run lint:css` clean
- [x] `npm run build` clean
- [x] `npx prettier --check` clean
- [x] `npm pack --dry-run -w @eocrm/design-system` — no test files in tarball
- [x] 5 consecutive runs of both new test files — no flakes
- [x] DatePicker + DateRangePicker suites unchanged (no regressions from the `DatePickerGrid` `disabled` extension)
- [x] Hard Rule 8 review-fix cycles — final verdict: clean enough to stop

## Design spec / plan

- Spec: `docs/superpowers/specs/2026-05-21-inline-date-pickers-design.md`
- Plan: `docs/superpowers/plans/2026-05-21-inline-date-pickers.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

Spec coverage:

- §Architecture / file layout → Tasks 3-6 (Inline DP + Inline DRP), Task 8 (demos), Task 7 (re-exports), Task 9 (AGENTS.md)
- §Small additive change to `DatePickerGrid` → Task 2
- §Public API (`InlineDatePickerProps`, `InlineDateRangePickerProps`, `Labels` types) → Tasks 3 + 5
- §Behavior (cursor stickiness, click-1/click-2 flow, per-grid callbacks, form mirrors, disabled) → Tasks 3 + 5 + 6 (tests)
- §Hard rules compliance → Task 2 (DatePickerGrid Rule 3 — `.disabledGrid` token-only), Tasks 3+5 (Rule 6 forwardRef, Rule 7 JSDoc), Task 7 (Rule 5 re-exports), Task 8 (Rule 2 demos), Task 9 (Rule 7 docs), Task 10 (Rule 8 cycle)
- §Testing surface → Tasks 4 (InlineDP) + 6 (InlineDRP) + Task 2 Step 1 (DatePickerGrid disabled)
- §Playground (8 examples per inline demo file) → Task 8
- §AGENTS.md two sections → Task 9
- §Risks/open questions (cursor stickiness, autosubmit, multiple pickers, forwardRef-to-div) → covered by Task 3+5 JSDoc + tests

Type consistency:

- `DateRange = { start: Date; end: Date }` re-used from `../DateRangePicker/utils` in Task 5 (no new type).
- `InlineDatePickerProps`, `InlineDatePickerLabels` defined in Task 3, re-exported in Task 7.
- `InlineDateRangePickerProps`, `InlineDateRangePickerLabels` defined in Task 5, re-exported in Task 7.
- `disabled?: boolean` consistent across `DatePickerGridProps` (Task 2), `InlineDatePickerProps` (Task 3), `InlineDateRangePickerProps` (Task 5).
- `name` (InlineDP, Task 3), `nameStart` / `nameEnd` (InlineDRP, Task 5) — matches the established popover-variant API.

No placeholders. All file paths absolute. All commit messages present. All TDD steps include test code AND implementation code.
