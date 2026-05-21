# DateRangePicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `<DateRangePicker>` to `@eocrm/design-system` — a single-field date-range input with a Floating-UI popover that shows **two months side-by-side**, with hover preview between clicks, auto-swap on out-of-order picks, and separate `nameStart`/`nameEnd` form mirrors. Reuses the `DatePickerGrid` from PR #23 via a new range mode.

**Architecture:** `DateRangePicker` owns the popover + selection state + typed input. It composes two `DatePickerGrid` instances (extended with `selectionMode='range'`, `rangeStart`, `rangeEnd`, `hoverDate`, `onHoverDate`, `chevrons=false`) and renders its own prev/next chevrons outside them. New `utils.ts` adds `parseDateRange` / `formatDateRange` / `autoSwapRange` on top of the existing `DatePicker/utils` `parseDate`/`formatDate`/`toIsoDate`.

**Tech Stack:** React 18 + TypeScript, SCSS modules, Vitest + RTL, `@floating-ui/react-dom`, `lucide-react`.

**Spec:** [docs/superpowers/specs/2026-05-21-daterange-picker-design.md](../specs/2026-05-21-daterange-picker-design.md)

**Branch state at start:** `feat/daterange-picker` branched from fresh `main` (PR #23 DatePicker is merged into main). Spec is committed on top.

---

## File map

```
packages/design-system/src/components/DateRangePicker/        # NEW folder
  DateRangePicker.tsx
  DateRangePicker.module.scss
  DateRangePicker.test.tsx
  utils.ts                          — parseDateRange / formatDateRange / autoSwapRange
  utils.test.ts
  index.ts

packages/design-system/src/components/DatePicker/
  DatePickerGrid.tsx                # MODIFY — add range-mode props
  DatePickerGrid.module.scss        # MODIFY — add .rangeStart, .rangeEnd, .inRange
  DatePickerGrid.test.tsx           # MODIFY — new range-mode tests

packages/design-system/src/index.ts              # MODIFY — re-export
packages/design-system/src/styles/tokens.scss    # MODIFY — --size-daterange-popover-width
packages/design-system/AGENTS.md                 # MODIFY — ### DateRangePicker section
packages/playground/src/pages/components/DateRangePickerDemo.tsx  # NEW
packages/playground/src/App.tsx                                   # MODIFY
packages/playground/src/layout/AppShell/AppShell.tsx              # MODIFY
packages/playground/src/pages/components/ComponentsIndex.tsx      # MODIFY
packages/playground/src/pages/mockups/registry.ts                 # MODIFY (ComponentName union)
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

Expected: branch `feat/daterange-picker`; clean tree (besides the untracked `.claude/`); top commits are the DateRangePicker spec and the merged DatePicker PR #23.

- [ ] **Step 2: Verify hooks**

```bash
git config --get core.hooksPath
test -x .husky/pre-push && echo OK
```

Expected: `.husky/_` + `OK`. If either fails, `npm install` from repo root and re-check.

---

## Task 2: Extend `DatePickerGrid` with range-mode props (skeleton)

This task adds the new props + their plumbing through `DatePickerGrid.tsx` WITHOUT yet rendering the new cell classes. The visual styles + tests land in Task 3 (after the plumbing is in place so the test imports compile).

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/DatePickerGrid.tsx`

- [ ] **Step 1: Extend `DatePickerGridProps`**

Add the following props to the existing `DatePickerGridProps` interface (file at the top of `DatePickerGrid.tsx`). Append them after `labels`:

```ts
  /** Selection model. Defaults to 'single'. */
  selectionMode?: 'single' | 'range';
  /** Range start (when mode='range'). The left boundary of the committed range. */
  rangeStart?: Date | null;
  /** Range end (when mode='range'). The right boundary. */
  rangeEnd?: Date | null;
  /** In-flight hover preview (when mode='range' and only rangeStart is set). */
  hoverDate?: Date | null;
  /** Fires on cell mouseenter (the date) and on grid mouseleave (null). */
  onHoverDate?: (date: Date | null) => void;
  /** Show the prev / next month chevrons. Defaults to true; the month label is always shown. */
  chevrons?: boolean;
```

- [ ] **Step 2: Wire defaults in the component params**

Update the destructuring at the top of the `DatePickerGrid` function (where `cursor`, `value`, `onSelect`, etc. are pulled out) to also pull the new props with sane defaults:

```tsx
export function DatePickerGrid({
  cursor,
  value,
  onSelect,
  onCursorChange,
  min,
  max,
  isDateDisabled,
  locale: localeOverride,
  labels,
  selectionMode = 'single',
  rangeStart = null,
  rangeEnd = null,
  hoverDate = null,
  onHoverDate,
  chevrons = true,
}: DatePickerGridProps) {
```

- [ ] **Step 3: Compute range-cell predicates**

Inside the function body, add helpers near the existing `today` / `isDisabled` definitions:

```tsx
// Range-mode helpers — no-op when selectionMode === 'single'.
const rangeAnchorStart = selectionMode === 'range' ? rangeStart : null;
const rangeAnchorEnd = selectionMode === 'range' ? (rangeEnd ?? hoverDate) : null;
const isInRange = useCallback(
  (date: Date) => {
    if (!rangeAnchorStart || !rangeAnchorEnd) return false;
    const a = startOfDay(rangeAnchorStart).getTime();
    const b = startOfDay(rangeAnchorEnd).getTime();
    const t = startOfDay(date).getTime();
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return t >= lo && t <= hi;
  },
  [rangeAnchorStart, rangeAnchorEnd],
);
const isRangeStartCell = (date: Date) =>
  selectionMode === 'range' && rangeStart != null && isSameDay(date, rangeStart);
const isRangeEndCell = (date: Date) =>
  selectionMode === 'range' &&
  (rangeEnd != null
    ? isSameDay(date, rangeEnd)
    : rangeStart != null && hoverDate != null && isSameDay(date, hoverDate));
```

- [ ] **Step 4: Gate `chevrons` in the header**

Locate the existing header block in the JSX (it renders the two `<button>` chevrons + the month label `<span>`). Wrap the two chevrons in `{chevrons && ( ... )}` so they only render when `chevrons === true`. Keep the month label always rendered. The header markup becomes:

```tsx
<header className={styles.header}>
  {chevrons && (
    <button
      type="button"
      className={styles.navButton}
      aria-label={labels.previousMonth}
      onClick={goPrev}
    >
      <ChevronLeft size={14} />
    </button>
  )}
  <span className={styles.monthLabel} aria-live="polite">
    {grid.monthLabel}
  </span>
  {chevrons && (
    <button
      type="button"
      className={styles.navButton}
      aria-label={labels.nextMonth}
      onClick={goNext}
    >
      <ChevronRight size={14} />
    </button>
  )}
</header>
```

- [ ] **Step 5: Wire `onHoverDate` + range cell classes on cells**

Locate the cell render (the `<button role="gridcell">` inside the per-week map). Replace its `className` and event handlers to include range-aware bits. The new shape:

```tsx
<button
  key={key}
  ref={(el) => {
    if (el) cellsRef.current.set(key, el);
    else cellsRef.current.delete(key);
  }}
  type="button"
  role="gridcell"
  className={clsx(
    styles.cell,
    !day.isCurrentMonth && styles.outside,
    isSelected && styles.selected,
    isTodayCell && styles.today,
    disabled && styles.disabled,
    isInRange(day.date) && styles.inRange,
    isRangeStartCell(day.date) && styles.rangeStart,
    isRangeEndCell(day.date) && styles.rangeEnd,
  )}
  aria-selected={isSelected || isRangeStartCell(day.date) || isRangeEndCell(day.date) || undefined}
  aria-disabled={disabled || undefined}
  tabIndex={tabIndexFor(day.date, isTodayCell)}
  onClick={() => {
    if (!disabled) onSelect(day.date);
  }}
  onKeyDown={(e) => handleCellKeyDown(e, day.date)}
  onMouseEnter={() => {
    if (!disabled && onHoverDate) onHoverDate(day.date);
  }}
>
  {day.dayOfMonth}
</button>
```

Add a `tabIndexFor` helper near the existing tabIndex logic (replace the previous inline expression with a function):

```tsx
const tabIndexFor = (date: Date, isTodayCell: boolean): number => {
  if (selectionMode === 'range') {
    if (rangeStart != null && isSameDay(date, rangeStart)) return 0;
    if (rangeStart == null && isTodayCell) return 0;
    return -1;
  }
  return value != null && isSameDay(date, value) ? 0 : value == null && isTodayCell ? 0 : -1;
};
```

- [ ] **Step 6: Wire `onMouseLeave` on the grid container**

On the inner `<div role="grid">` that wraps the day rows, add `onMouseLeave={() => onHoverDate?.(null)}`. (The header sits outside this container, so leaving via the chevrons doesn't fire null.)

```tsx
<div role="grid" className={styles.cells} onMouseLeave={() => onHoverDate?.(null)}>
  {/* weekday row + week rows */}
</div>
```

- [ ] **Step 7: Confirm typecheck still passes**

```bash
npx tsc --noEmit -p packages/design-system/tsconfig.json
```

Expected: clean. (No tests exist yet for the new props — they ship in Task 3.)

- [ ] **Step 8: Confirm existing tests still pass**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePickerGrid.test.tsx
```

Expected: all 13 existing tests still green (range mode is opt-in via `selectionMode='range'`; defaults preserve single-mode behavior).

- [ ] **Step 9: Commit**

```bash
git add packages/design-system/src/components/DatePicker/DatePickerGrid.tsx
git commit -m "DatePickerGrid: add range-mode props (selectionMode, rangeStart/End, hoverDate, onHoverDate, chevrons)"
```

---

## Task 3: Range-mode SCSS + tests on DatePickerGrid

**Files:**

- Modify: `packages/design-system/src/components/DatePicker/DatePickerGrid.module.scss`
- Modify: `packages/design-system/src/components/DatePicker/DatePickerGrid.test.tsx`

- [ ] **Step 1: Write failing tests**

Append the following 5 new tests at the bottom of the existing `describe('DatePickerGrid', () => { ... })` block in `DatePickerGrid.test.tsx`. Insert ABOVE the closing `});` of the describe:

```tsx
it('range mode: rangeStart and rangeEnd cells carry aria-selected and class markers', () => {
  render(
    <DatePickerGrid
      cursor={new Date(2026, 4, 1)}
      value={null}
      onSelect={() => {}}
      onCursorChange={() => {}}
      labels={LABELS}
      selectionMode="range"
      rangeStart={new Date(2026, 4, 5)}
      rangeEnd={new Date(2026, 4, 10)}
    />,
    { wrapper: wrap() },
  );
  const startCell = screen.getByRole('gridcell', { name: /^5$/ });
  const endCell = screen.getByRole('gridcell', { name: /^10$/ });
  expect(startCell).toHaveAttribute('aria-selected', 'true');
  expect(endCell).toHaveAttribute('aria-selected', 'true');
  expect(startCell.className).toMatch(/rangeStart/);
  expect(endCell.className).toMatch(/rangeEnd/);
  // Middle cells get .inRange
  const middle = screen.getByRole('gridcell', { name: /^7$/ });
  expect(middle.className).toMatch(/inRange/);
});

it('range mode: hoverDate previews end when only rangeStart is set', () => {
  render(
    <DatePickerGrid
      cursor={new Date(2026, 4, 1)}
      value={null}
      onSelect={() => {}}
      onCursorChange={() => {}}
      labels={LABELS}
      selectionMode="range"
      rangeStart={new Date(2026, 4, 5)}
      hoverDate={new Date(2026, 4, 12)}
    />,
    { wrapper: wrap() },
  );
  const startCell = screen.getByRole('gridcell', { name: /^5$/ });
  const hoverEndCell = screen.getByRole('gridcell', { name: /^12$/ });
  expect(startCell.className).toMatch(/rangeStart/);
  expect(hoverEndCell.className).toMatch(/rangeEnd/);
  expect(screen.getByRole('gridcell', { name: /^8$/ }).className).toMatch(/inRange/);
});

it('range mode: fires onHoverDate on cell mouseenter and null on grid mouseleave', async () => {
  const user = userEvent.setup();
  const onHoverDate = vi.fn<(d: Date | null) => void>();
  render(
    <DatePickerGrid
      cursor={new Date(2026, 4, 1)}
      value={null}
      onSelect={() => {}}
      onCursorChange={() => {}}
      labels={LABELS}
      selectionMode="range"
      rangeStart={new Date(2026, 4, 5)}
      onHoverDate={onHoverDate}
    />,
    { wrapper: wrap() },
  );
  const cell = screen.getByRole('gridcell', { name: /^12$/ });
  await user.hover(cell);
  expect(onHoverDate).toHaveBeenCalledWith(expect.any(Date));
  expect(onHoverDate.mock.calls.at(-1)?.[0]?.getDate()).toBe(12);

  // Move the pointer off the entire grid (somewhere outside).
  await user.unhover(cell);
  // userEvent.unhover only triggers cell-level mouseleave; we need
  // the grid-container leave. Manually dispatch on the grid element.
  const grid = document.querySelector<HTMLElement>('[role="grid"]');
  if (grid) {
    const evt = new MouseEvent('mouseleave', { bubbles: false });
    grid.dispatchEvent(evt);
  }
  expect(onHoverDate).toHaveBeenLastCalledWith(null);
});

it('range mode: disabled cell does not fire onHoverDate', async () => {
  const user = userEvent.setup();
  const onHoverDate = vi.fn();
  render(
    <DatePickerGrid
      cursor={new Date(2026, 4, 1)}
      value={null}
      onSelect={() => {}}
      onCursorChange={() => {}}
      labels={LABELS}
      selectionMode="range"
      rangeStart={new Date(2026, 4, 5)}
      isDateDisabled={(d) => d.getDate() === 12}
      onHoverDate={onHoverDate}
    />,
    { wrapper: wrap() },
  );
  const disabled = screen.getByRole('gridcell', { name: /^12$/ });
  await user.hover(disabled);
  expect(onHoverDate).not.toHaveBeenCalled();
});

it('chevrons={false} hides nav buttons but keeps the month label', () => {
  render(
    <DatePickerGrid
      cursor={new Date(2026, 4, 1)}
      value={null}
      onSelect={() => {}}
      onCursorChange={() => {}}
      labels={LABELS}
      chevrons={false}
    />,
    { wrapper: wrap() },
  );
  expect(screen.queryByRole('button', { name: 'Previous month' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Next month' })).toBeNull();
  expect(screen.getByText(/May 2026/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePickerGrid.test.tsx
```

Expected: 13 existing pass; 4 of the 5 new ones FAIL because:

- The first two fail on `.toMatch(/rangeStart/)` / `.toMatch(/inRange/)` etc. — the styles aren't defined yet so CSS-modules returns `undefined` for those keys, and the resulting `clsx` output omits them.
- Hover + mouseleave + chevrons-hidden tests pass already (Task 2's TSX work covers them).

- [ ] **Step 3: Add range cell classes to `DatePickerGrid.module.scss`**

Append the following at the bottom of `DatePickerGrid.module.scss`:

```scss
// Range-mode cell markers — applied when `selectionMode='range'` and the
// cell falls inside the [rangeStart, rangeEnd|hoverDate] window. Disabled
// cells inside the range keep their muted color but still get .inRange so
// the band reads as contiguous.
.inRange {
  background: var(--color-accent-bg-subtle);
  color: var(--color-accent);
  border-radius: 0;
}

// The two range boundaries get the same fill as a regular `.selected`
// cell, but with rounded edges only on the OUTSIDE of the range so they
// visually anchor the band.
.rangeStart {
  background: var(--color-accent);
  color: var(--color-accent-fg);
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}

.rangeEnd {
  background: var(--color-accent);
  color: var(--color-accent-fg);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

// Single-day range — both rangeStart AND rangeEnd are the same cell.
.rangeStart.rangeEnd {
  border-radius: var(--radius-sm);
}
```

- [ ] **Step 4: Re-run tests — all green**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePickerGrid.test.tsx
```

Expected: 18 / 18 passing (13 existing + 5 new).

- [ ] **Step 5: Lint:css clean**

```bash
npm run lint:css
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/DatePicker/DatePickerGrid.module.scss \
        packages/design-system/src/components/DatePicker/DatePickerGrid.test.tsx
git commit -m "DatePickerGrid: range-mode cell classes (.inRange, .rangeStart, .rangeEnd) + tests"
```

---

## Task 4: DateRangePicker `utils.ts` + tests

**Files:**

- Create: `packages/design-system/src/components/DateRangePicker/utils.ts`
- Create: `packages/design-system/src/components/DateRangePicker/utils.test.ts`

- [ ] **Step 1: Create utils.ts skeleton**

```ts
import { startOfDay } from '../../calendar/dateMath';
import { formatDate, parseDate } from '../DatePicker/utils';

/** A complete date range. Both ends inclusive, day-granular. */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Order a pair of dates so the earlier one is `start` and the later one
 * is `end`. Day-granular comparison via `startOfDay`. Same-day input
 * returns both halves equal (single-day range).
 */
export function autoSwapRange(a: Date, b: Date): DateRange {
  if (startOfDay(a).getTime() <= startOfDay(b).getTime()) {
    return { start: a, end: b };
  }
  return { start: b, end: a };
}

/**
 * Format a `DateRange` for display: `${formatDate(start)} — ${formatDate(end)}`.
 * Single-day ranges still render both halves with the em dash for visual
 * consistency.
 */
export function formatDateRange(range: DateRange, locale: string): string {
  return `${formatDate(range.start, locale)} — ${formatDate(range.end, locale)}`;
}

/**
 * Parse a user-typed range string into a `DateRange`. See spec
 * `../../../docs/superpowers/specs/2026-05-21-daterange-picker-design.md`
 * §Date-range parsing.
 *
 * - Empty / whitespace → null.
 * - Splits on the first occurrence of any of: ` — ` (em dash), ` – `
 *   (en dash), ` - ` (hyphen with spaces), ` to ` (word, space-padded,
 *   case-insensitive).
 * - Each half parses via `parseDate(half, locale)`. If either fails, null.
 * - Out-of-order pairs are auto-swapped.
 */
export function parseDateRange(raw: string, locale: string): DateRange | null {
  const str = raw.trim();
  if (str === '') return null;

  // Try separators in order. Each captures with whitespace on both sides
  // except the em / en dash variants where the dash itself is the anchor.
  const separators: RegExp[] = [
    /\s+—\s+/, // em dash with spaces
    /\s+–\s+/, // en dash with spaces
    /\s+-\s+/, // hyphen with spaces
    /\s+to\s+/i, // word with spaces
  ];
  let parts: string[] | null = null;
  for (const sep of separators) {
    const split = str.split(sep);
    if (split.length === 2) {
      parts = split;
      break;
    }
  }
  if (!parts) return null;
  const [leftRaw, rightRaw] = parts;
  if (leftRaw.trim() === '' || rightRaw.trim() === '') return null;

  const left = parseDate(leftRaw, locale);
  const right = parseDate(rightRaw, locale);
  if (left == null || right == null) return null;
  return autoSwapRange(left, right);
}
```

- [ ] **Step 2: Create utils.test.ts**

```ts
import { autoSwapRange, formatDateRange, parseDateRange } from './utils';

describe('DateRangePicker utils', () => {
  describe('autoSwapRange', () => {
    it('returns the pair unchanged when start <= end', () => {
      const r = autoSwapRange(new Date(2026, 4, 5), new Date(2026, 4, 10));
      expect(r.start.getDate()).toBe(5);
      expect(r.end.getDate()).toBe(10);
    });

    it('swaps when end < start', () => {
      const r = autoSwapRange(new Date(2026, 4, 10), new Date(2026, 4, 5));
      expect(r.start.getDate()).toBe(5);
      expect(r.end.getDate()).toBe(10);
    });

    it('returns equal dates for same-day pair (single-day range)', () => {
      const same = new Date(2026, 4, 5);
      const r = autoSwapRange(same, same);
      expect(r.start.getDate()).toBe(5);
      expect(r.end.getDate()).toBe(5);
    });

    it('ignores time-of-day (day-granular)', () => {
      const a = new Date(2026, 4, 5, 23, 59);
      const b = new Date(2026, 4, 5, 0, 0);
      const r = autoSwapRange(a, b);
      // Same day, either may be start; both halves are May 5.
      expect(r.start.getDate()).toBe(5);
      expect(r.end.getDate()).toBe(5);
    });
  });

  describe('formatDateRange', () => {
    it('formats en-US as MM/DD/YYYY — MM/DD/YYYY', () => {
      expect(
        formatDateRange({ start: new Date(2026, 4, 21), end: new Date(2026, 5, 4) }, 'en-US'),
      ).toBe('05/21/2026 — 06/04/2026');
    });

    it('formats ru-RU as DD.MM.YYYY — DD.MM.YYYY', () => {
      expect(
        formatDateRange({ start: new Date(2026, 4, 21), end: new Date(2026, 5, 4) }, 'ru-RU'),
      ).toBe('21.05.2026 — 04.06.2026');
    });

    it('single-day range still renders both halves', () => {
      const same = new Date(2026, 4, 21);
      expect(formatDateRange({ start: same, end: same }, 'en-US')).toBe('05/21/2026 — 05/21/2026');
    });
  });

  describe('parseDateRange', () => {
    it('returns null for empty / whitespace input', () => {
      expect(parseDateRange('', 'en-US')).toBeNull();
      expect(parseDateRange('   ', 'en-US')).toBeNull();
    });

    it('parses en-US with em dash', () => {
      const r = parseDateRange('5/21/2026 — 6/4/2026', 'en-US');
      expect(r).not.toBeNull();
      expect(r!.start.getDate()).toBe(21);
      expect(r!.end.getDate()).toBe(4);
      expect(r!.end.getMonth()).toBe(5); // June
    });

    it('parses with en dash', () => {
      const r = parseDateRange('5/21/2026 – 6/4/2026', 'en-US');
      expect(r!.start.getDate()).toBe(21);
      expect(r!.end.getDate()).toBe(4);
    });

    it('parses with hyphen-with-spaces', () => {
      const r = parseDateRange('5/21/2026 - 6/4/2026', 'en-US');
      expect(r!.start.getDate()).toBe(21);
    });

    it('parses with " to " word separator (case-insensitive)', () => {
      const r1 = parseDateRange('5/21/2026 to 6/4/2026', 'en-US');
      const r2 = parseDateRange('5/21/2026 TO 6/4/2026', 'en-US');
      expect(r1!.start.getDate()).toBe(21);
      expect(r2!.start.getDate()).toBe(21);
    });

    it('parses ru-RU with hyphen-with-spaces', () => {
      const r = parseDateRange('21.5.2026 - 4.6.2026', 'ru-RU');
      expect(r!.start.getDate()).toBe(21);
      expect(r!.start.getMonth()).toBe(4);
      expect(r!.end.getDate()).toBe(4);
      expect(r!.end.getMonth()).toBe(5);
    });

    it('auto-swaps out-of-order typed input', () => {
      const r = parseDateRange('6/4/2026 — 5/21/2026', 'en-US');
      expect(r!.start.getDate()).toBe(21); // May 21 is earlier
      expect(r!.end.getDate()).toBe(4); // Jun 4 is later
    });

    it('returns null when one half is unparseable', () => {
      expect(parseDateRange('5/21/2026 — junk', 'en-US')).toBeNull();
      expect(parseDateRange('junk — 6/4/2026', 'en-US')).toBeNull();
    });

    it('returns null when no separator is found', () => {
      expect(parseDateRange('5/21/2026 6/4/2026', 'en-US')).toBeNull();
    });

    it('returns null when three chunks (multiple separators)', () => {
      // The split takes the FIRST occurrence — if there are two em dashes
      // separating three chunks, the first split is 2-way: ["5/21", "6/4 — 7/1"].
      // The right half then fails to parse because it contains an embedded
      // em dash. So the function returns null.
      expect(parseDateRange('5/21/2026 — 6/4/2026 — 7/1/2026', 'en-US')).toBeNull();
    });
  });
});
```

- [ ] **Step 3: Run tests — expect 16 passing**

```bash
cd packages/design-system && npx vitest run src/components/DateRangePicker/utils.test.ts
```

Expected: 16 / 16 pass.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit -p packages/design-system/tsconfig.json
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DateRangePicker/utils.ts \
        packages/design-system/src/components/DateRangePicker/utils.test.ts
git commit -m "DateRangePicker: utils — parseDateRange / formatDateRange / autoSwapRange"
```

---

## Task 5: New token + DateRangePicker SCSS skeleton

**Files:**

- Modify: `packages/design-system/src/styles/tokens.scss`
- Create: `packages/design-system/src/components/DateRangePicker/DateRangePicker.module.scss`

- [ ] **Step 1: Add the popover-width token**

In `packages/design-system/src/styles/tokens.scss`, locate the `--size-datepicker-*` block (added by the DatePicker PR). Add the new range-picker token immediately after it, with a blank line before the comment block to satisfy stylelint's `scss/double-slash-comment-empty-line-before`:

```scss
--size-datepicker-popover-width: 17rem;

// DateRangePicker — overall width of the floating popover. Fits two
// 17rem month grids side-by-side with a small gutter between them.
--size-daterange-popover-width: 36rem;
```

- [ ] **Step 2: Create DateRangePicker.module.scss**

```scss
@use '../../styles/mixins' as *;

// Wrapper mimics <Input> exactly — same as DatePicker.module.scss. The
// wrapper IS the public component box; the popover is portaled so it
// doesn't participate in flow layout.
.wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast);

  &:focus-within {
    @include focus-ring;
    border-color: var(--color-accent);
  }
}

.invalid {
  border-color: var(--color-danger);

  &:focus-within {
    @include focus-ring(var(--ring-danger));
    border-color: var(--color-danger);
  }
}

.disabled {
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  cursor: not-allowed;
}

// The typed input flexes inside the wrapper — same Rule-4 escape hatch
// as DatePicker.module.scss. The wrapper is `inline-flex` with fixed-
// width sibling buttons (clear, open); the input must flex; `min-width: 0`
// lets it shrink below intrinsic width when the wrapper is constrained.
.input {
  flex: 1;
  min-width: 0;
  height: var(--size-md);
  padding: 0;
  background: transparent;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: var(--font-size-md);
  color: var(--color-fg);

  &::placeholder {
    color: var(--color-fg-muted);
  }
}

.clearButton,
.openButton {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--space-5);
  height: var(--space-5);
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
    opacity: var(--opacity-disabled);
  }
}

.popover {
  z-index: var(--z-popover);
  width: var(--size-daterange-popover-width);
  padding: var(--space-2);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

// External chevrons (prev/next), rendered by DateRangePicker. Centered
// vertically above the two grids; same shape as the grid's own chevrons.
.popoverHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-1);
}

.popoverHeaderSpacer {
  flex: 1;
}

.popoverNavButton {
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
}

// Two grids side by side, separated by a small gutter.
.grids {
  display: flex;
  gap: var(--space-3);
}
```

- [ ] **Step 3: Lint:css clean**

```bash
npm run lint:css
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/styles/tokens.scss \
        packages/design-system/src/components/DateRangePicker/DateRangePicker.module.scss
git commit -m "DateRangePicker: SCSS module + --size-daterange-popover-width token"
```

---

## Task 6: DateRangePicker public component

**Files:**

- Create: `packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx`
- Create: `packages/design-system/src/components/DateRangePicker/DateRangePicker.test.tsx`
- Create: `packages/design-system/src/components/DateRangePicker/index.ts`

- [ ] **Step 1: Create the barrel**

`packages/design-system/src/components/DateRangePicker/index.ts`:

```ts
export { DateRangePicker } from './DateRangePicker';
export type { DateRangePickerProps, DateRangePickerLabels } from './DateRangePicker';
export type { DateRange } from './utils';
```

- [ ] **Step 2: Create the failing test file**

`DateRangePicker.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DateRangePicker } from './DateRangePicker';
import type { DateRange } from './utils';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

const MAY = (d: number) => new Date(2026, 4, d);
const JUN = (d: number) => new Date(2026, 5, d);
const SAMPLE_RANGE: DateRange = { start: MAY(21), end: JUN(4) };

describe('DateRangePicker', () => {
  it('renders the formatted defaultValue in the input (uncontrolled)', () => {
    render(<DateRangePicker defaultValue={SAMPLE_RANGE} aria-label="Range" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox', { name: 'Range' })).toHaveValue('05/21/2026 — 06/04/2026');
  });

  it('controlled value updates input', () => {
    const { rerender } = render(<DateRangePicker value={SAMPLE_RANGE} aria-label="Range" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox')).toHaveValue('05/21/2026 — 06/04/2026');
    rerender(<DateRangePicker value={{ start: MAY(1), end: MAY(7) }} aria-label="Range" />);
    expect(screen.getByRole('textbox')).toHaveValue('05/01/2026 — 05/07/2026');
  });

  it('typing a valid range and blurring commits via onChange', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox');
    await user.type(input, '5/21/2026 — 6/4/2026');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const committed = onChange.mock.calls.at(-1)![0]!;
    expect(committed.start.getDate()).toBe(21);
    expect(committed.end.getDate()).toBe(4);
  });

  it('typing an invalid range reverts to the previous value', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<DateRange | null>(SAMPLE_RANGE);
      return <DateRangePicker value={v} onChange={setV} aria-label="Range" />;
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'not a range');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026 — 06/04/2026'));
  });

  it('typing out-of-order auto-swaps on commit', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox');
    await user.type(input, '6/4/2026 — 5/21/2026');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const committed = onChange.mock.calls.at(-1)![0]!;
    expect(committed.start.getDate()).toBe(21);
    expect(committed.start.getMonth()).toBe(4); // May
    expect(committed.end.getDate()).toBe(4);
    expect(committed.end.getMonth()).toBe(5); // June
  });

  it('Enter in the input commits and closes the popover', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.type(input, '5/21/2026 — 6/4/2026{Enter}');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ArrowDown opens popover and focuses today/start cell', async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Range" />, { wrapper: wrap() });
    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      const active = document.activeElement;
      expect(active?.getAttribute('role')).toBe('gridcell');
    });
  });

  it('Escape closes the popover and restores focus to the input', async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Range" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(input);
  });

  it('two grid clicks commit a range (start then end)', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('textbox'));
    // Anchor cursor at May 2026 by typing then clearing — simpler: just
    // grab any visible "5" cell in the left grid. Two grids both have a 5;
    // getAllByRole returns both. Click the first.
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    expect(onChange).not.toHaveBeenCalled(); // not yet committed
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(tens[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(10);
  });

  it('clicking end before start auto-swaps', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('textbox'));
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(tens[0]);
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(10);
  });

  it('same-cell double-click commits a single-day range', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('textbox'));
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    await user.click(fives[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(5);
  });

  it('third click after a committed range restarts selection', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('textbox'));
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(fives[0]);
    await user.click(tens[0]);
    // Popover closes; reopen.
    await user.click(screen.getByRole('textbox'));
    // Now click a third cell — should restart, not commit anything.
    const fifteens = screen.getAllByRole('gridcell', { name: /^15$/ });
    await user.click(fifteens[0]);
    // Only the first range commit has happened so far.
    expect(onChange).toHaveBeenCalledTimes(1);
    const twenties = screen.getAllByRole('gridcell', { name: /^20$/ });
    await user.click(twenties[0]);
    // Now the second commit lands.
    expect(onChange).toHaveBeenCalledTimes(2);
    const r2 = onChange.mock.calls[1][0]!;
    expect(r2.start.getDate()).toBe(15);
    expect(r2.end.getDate()).toBe(20);
  });

  it('clear button resets the value and keeps focus on the input', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={SAMPLE_RANGE} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('button', { name: 'Clear range' }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('renders both hidden form mirrors when nameStart and nameEnd are set', () => {
    const { container } = render(
      <DateRangePicker
        nameStart="bookingStart"
        nameEnd="bookingEnd"
        defaultValue={SAMPLE_RANGE}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const start = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="bookingStart"]',
    );
    const end = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="bookingEnd"]',
    );
    expect(start?.value).toBe('2026-05-21');
    expect(end?.value).toBe('2026-06-04');
  });

  it('renders empty hidden mirrors when value is null', () => {
    const { container } = render(
      <DateRangePicker nameStart="bookingStart" nameEnd="bookingEnd" aria-label="Range" />,
      { wrapper: wrap() },
    );
    const start = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="bookingStart"]',
    );
    expect(start?.value).toBe('');
  });

  it('`disabled` disables the input and the open-calendar button', () => {
    render(<DateRangePicker disabled defaultValue={SAMPLE_RANGE} aria-label="Range" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeDisabled();
  });

  it('`invalid` sets aria-invalid="true"', () => {
    render(<DateRangePicker invalid aria-label="Range" />, { wrapper: wrap() });
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards ref to the typed input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<DateRangePicker ref={ref} aria-label="Range" />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('typed range outside [min, max] reverts on blur', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<DateRange | null>(SAMPLE_RANGE);
      return (
        <DateRangePicker value={v} onChange={setV} min={MAY(15)} max={JUN(15)} aria-label="Range" />
      );
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5/10/2026 — 5/12/2026');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026 — 06/04/2026'));
  });

  it('ru-RU formats DD.MM.YYYY — DD.MM.YYYY', () => {
    render(<DateRangePicker defaultValue={SAMPLE_RANGE} locale="ru-RU" aria-label="Range" />, {
      wrapper: wrap('ru-RU'),
    });
    expect(screen.getByRole('textbox')).toHaveValue('21.05.2026 — 04.06.2026');
  });

  it('click outside closes the popover and commits any pending draft', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(r: DateRange | null) => void>();
    render(<DateRangePicker onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, '5/21/2026 — 6/4/2026');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests — expect "cannot resolve module"**

```bash
cd packages/design-system && npx vitest run src/components/DateRangePicker/DateRangePicker.test.tsx
```

Expected: cannot resolve `./DateRangePicker`.

- [ ] **Step 4: Create DateRangePicker.tsx**

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { useLocale } from '../../i18n/useLocale';
import { mergeRefs } from '../_internal/refs';
import { addMonths } from '../../calendar/dateMath';
import { DatePickerGrid } from '../DatePicker/DatePickerGrid';
import { toIsoDate, isDateOutOfRange } from '../DatePicker/utils';
import { type DateRange, autoSwapRange, formatDateRange, parseDateRange } from './utils';
import styles from './DateRangePicker.module.scss';

export interface DateRangePickerLabels {
  previousMonth?: string;
  nextMonth?: string;
  openCalendar?: string;
  clear?: string;
  dialogLabel?: string;
}

export interface DateRangePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'name'
> {
  /** Selected range. `null` = no range. Pair with `onChange` for controlled use. */
  value?: DateRange | null;
  /** Initial range for uncontrolled use. */
  defaultValue?: DateRange | null;
  /** Fires when a complete range commits (after second click in grid, or successful typed parse on blur). */
  onChange?: (range: DateRange | null) => void;

  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Earliest selectable date (inclusive). Both halves and typed input are gated. */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable predicate. */
  isDateDisabled?: (date: Date) => boolean;

  /** Show the ✕ clear button when a range is set. Defaults to `true`. */
  clearable?: boolean;
  /** Toggle red border + focus ring + `aria-invalid="true"`. */
  invalid?: boolean;

  /** Form name for the START half (hidden `<input>`). */
  nameStart?: string;
  /** Form name for the END half. */
  nameEnd?: string;

  /** Localized strings. */
  labels?: DateRangePickerLabels;
}

const DEFAULT_LABELS: Required<DateRangePickerLabels> = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openCalendar: 'Open calendar',
  clear: 'Clear range',
  dialogLabel: 'Choose date range',
};

/**
 * Single-field date-range input with a Floating-UI popover that shows
 * two months side-by-side. Locale-aware typed parsing, min/max +
 * `isDateDisabled`, clearable, hover preview between clicks, auto-swap
 * on out-of-order picks, and separate `nameStart`/`nameEnd` form
 * mirrors. Built on the same `DatePickerGrid` as `<DatePicker>` (with a
 * new `selectionMode='range'`).
 *
 * @example
 * <DateRangePicker defaultValue={{ start: new Date(), end: new Date() }} />
 *
 * @example
 * // Controlled, constrained to a 90-day window:
 * <DateRangePicker
 *   value={range}
 *   onChange={setRange}
 *   min={new Date()}
 *   max={new Date(Date.now() + 90 * 86_400_000)}
 * />
 *
 * @example
 * // Form-mirror, two separate fields:
 * <form action="/api/bookings">
 *   <DateRangePicker nameStart="bookingStart" nameEnd="bookingEnd" />
 * </form>
 *
 * @remarks When NOT to use
 * - Single date → use `<DatePicker>`.
 * - Datetime (date + time) → not supported.
 * - Multi-date selection (3+ non-contiguous dates) → out of scope.
 *
 * @remarks Anti-patterns
 * - ❌ Passing `value` without `onChange` — picker is fully controlled
 *   when `value` is set; user input has no effect.
 * - ❌ Using `defaultValue` AND `value` together — pick one.
 */
export const DateRangePicker = forwardRef<HTMLInputElement, DateRangePickerProps>(
  function DateRangePicker(
    {
      value: valueProp,
      defaultValue = null,
      onChange,
      locale: localeOverride,
      min,
      max,
      isDateDisabled,
      clearable = true,
      invalid = false,
      disabled = false,
      nameStart,
      nameEnd,
      labels,
      placeholder,
      className,
      id: idProp,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) {
    const contextLocale = useLocale();
    const locale = localeOverride ?? contextLocale;
    const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
    const generatedId = useId();
    const inputId = idProp ?? generatedId;

    const [uncontrolled, setUncontrolled] = useState<DateRange | null>(defaultValue);
    const value = valueProp !== undefined ? valueProp : uncontrolled;
    const setValue = useCallback(
      (next: DateRange | null) => {
        if (valueProp === undefined) setUncontrolled(next);
        onChange?.(next);
      },
      [valueProp, onChange],
    );

    const formattedValue = value ? formatDateRange(value, locale) : '';
    const [draft, setDraft] = useState(formattedValue);
    useEffect(() => {
      setDraft(formattedValue);
    }, [formattedValue]);

    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState<Date>(value?.start ?? new Date());
    useEffect(() => {
      if (open) setCursor(value?.start ?? new Date());
    }, [open, value]);

    // In-flight selection state during the click-1 → click-2 dance.
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    // Focus-into-grid ticker (same pattern as DatePicker).
    const [focusGridTick, setFocusGridTick] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { refs, floatingStyles } = useFloating({
      open,
      placement: 'bottom-start',
      transform: false,
      middleware: [offset(4), flip(), shift({ padding: 8 })],
      whileElementsMounted: autoUpdate,
    });

    const setWrapperRef = useCallback(
      (node: HTMLDivElement | null) => {
        wrapperRef.current = node;
        refs.setReference(node);
      },
      [refs],
    );

    const commit = useCallback(
      (raw: string) => {
        if (raw.trim() === '') {
          setValue(null);
          return;
        }
        const parsed = parseDateRange(raw, locale);
        if (
          parsed != null &&
          !isDateOutOfRange(parsed.start, min, max, isDateDisabled) &&
          !isDateOutOfRange(parsed.end, min, max, isDateDisabled)
        ) {
          setValue(parsed);
        } else {
          setDraft(formattedValue);
        }
      },
      [locale, min, max, isDateDisabled, setValue, formattedValue],
    );

    const handleInputBlur = useCallback(
      (e: FocusEvent<HTMLInputElement>) => {
        // Defer so in-wrapper / in-popover focus moves can complete first.
        window.setTimeout(() => {
          const active = document.activeElement;
          const insideWrapper = wrapperRef.current?.contains(active);
          const insideFloating = refs.floating.current?.contains(active);
          if (!insideWrapper && !insideFloating) {
            commit(draft);
            setOpen(false);
            setSelectionStart(null);
            setHoverDate(null);
          }
        }, 0);
        onBlur?.(e);
      },
      [commit, draft, onBlur, refs.floating],
    );

    const handleInputFocus = useCallback(
      (e: FocusEvent<HTMLInputElement>) => {
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleInputClick = useCallback(() => {
      if (!disabled) setOpen(true);
    }, [disabled]);

    const handleInputKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
          setFocusGridTick((t) => t + 1);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(draft);
          setOpen(false);
          setSelectionStart(null);
          setHoverDate(null);
        }
        if (e.key === 'Escape' && open) {
          e.preventDefault();
          setOpen(false);
          setSelectionStart(null);
          setHoverDate(null);
          inputRef.current?.focus();
        }
      },
      [commit, draft, open],
    );

    // After ArrowDown opens the popover, focus the first focusable cell
    // in the LEFT grid (selected start, else today, else first selectable).
    useEffect(() => {
      if (focusGridTick === 0) return;
      const floating = refs.floating.current;
      const focusable = floating?.querySelector<HTMLButtonElement>(
        '[role="gridcell"][tabindex="0"]',
      );
      focusable?.focus();
    }, [focusGridTick, open, refs.floating]);

    // Click-1 → click-2 → commit dance.
    const handleGridSelect = useCallback(
      (date: Date) => {
        if (selectionStart == null) {
          // First click — or restart after a committed range.
          setSelectionStart(date);
          setHoverDate(null);
          // Internal-only "no committed end yet"; don't surface via onChange.
        } else {
          // Second click — commit.
          const range = autoSwapRange(selectionStart, date);
          setSelectionStart(null);
          setHoverDate(null);
          setValue(range);
          setOpen(false);
          inputRef.current?.focus();
        }
      },
      [selectionStart, setValue],
    );

    const handleClear = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setValue(null);
        setSelectionStart(null);
        setHoverDate(null);
        inputRef.current?.focus();
      },
      [setValue],
    );

    const handleToggle = useCallback((e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setOpen((v) => {
        const next = !v;
        if (next) inputRef.current?.focus();
        return next;
      });
    }, []);

    const goPrev = useCallback(() => {
      setCursor((c) => addMonths(c, -1));
    }, []);
    const goNext = useCallback(() => {
      setCursor((c) => addMonths(c, 1));
    }, []);

    // Click-outside (pointerdown capture, library convention).
    useEffect(() => {
      if (!open) return;
      const handler = (e: PointerEvent) => {
        const target = e.target as Node | null;
        const floating = refs.floating.current;
        if (target && !wrapperRef.current?.contains(target) && !floating?.contains(target)) {
          commit(draft);
          setOpen(false);
          setSelectionStart(null);
          setHoverDate(null);
        }
      };
      document.addEventListener('pointerdown', handler, true);
      return () => document.removeEventListener('pointerdown', handler, true);
    }, [open, refs.floating, commit, draft]);

    const showClear = clearable && value != null && !disabled;

    // The grids receive the in-flight selection as rangeStart while
    // selectionStart is set; otherwise the committed value drives them.
    const gridRangeStart = selectionStart ?? value?.start ?? null;
    const gridRangeEnd = selectionStart != null ? null : (value?.end ?? null);

    const rightCursor = addMonths(cursor, 1);

    return (
      <div
        ref={setWrapperRef}
        className={clsx(
          styles.wrapper,
          invalid && styles.invalid,
          disabled && styles.disabled,
          className,
        )}
      >
        <input
          {...rest}
          ref={mergeRefs(inputRef, ref)}
          id={inputId}
          type="text"
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onClick={handleInputClick}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-haspopup="dialog"
          aria-expanded={open}
          placeholder={
            placeholder ?? `${rangeFormatExample(locale)} — ${rangeFormatExample(locale)}`
          }
          autoComplete="off"
        />
        {showClear && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label={resolvedLabels.clear}
            onClick={handleClear}
          >
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          className={styles.openButton}
          aria-label={resolvedLabels.openCalendar}
          onClick={handleToggle}
          disabled={disabled}
        >
          <CalendarIcon size={14} />
        </button>
        {nameStart && (
          <input type="hidden" name={nameStart} value={value ? toIsoDate(value.start) : ''} />
        )}
        {nameEnd && (
          <input type="hidden" name={nameEnd} value={value ? toIsoDate(value.end) : ''} />
        )}
        {open &&
          createPortal(
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className={styles.popover}
              role="dialog"
              aria-modal="false"
              aria-label={resolvedLabels.dialogLabel}
              onMouseDown={(e) => e.preventDefault()}
            >
              <header className={styles.popoverHeader}>
                <button
                  type="button"
                  className={styles.popoverNavButton}
                  aria-label={resolvedLabels.previousMonth}
                  onClick={goPrev}
                >
                  <ChevronLeft size={14} />
                </button>
                <div className={styles.popoverHeaderSpacer} />
                <button
                  type="button"
                  className={styles.popoverNavButton}
                  aria-label={resolvedLabels.nextMonth}
                  onClick={goNext}
                >
                  <ChevronRight size={14} />
                </button>
              </header>
              <div className={styles.grids}>
                <DatePickerGrid
                  cursor={cursor}
                  value={null}
                  onCursorChange={() => {}}
                  onSelect={handleGridSelect}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
                  labels={{
                    previousMonth: resolvedLabels.previousMonth,
                    nextMonth: resolvedLabels.nextMonth,
                  }}
                  selectionMode="range"
                  rangeStart={gridRangeStart}
                  rangeEnd={gridRangeEnd}
                  hoverDate={hoverDate}
                  onHoverDate={setHoverDate}
                  chevrons={false}
                />
                <DatePickerGrid
                  cursor={rightCursor}
                  value={null}
                  onCursorChange={() => {}}
                  onSelect={handleGridSelect}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
                  labels={{
                    previousMonth: resolvedLabels.previousMonth,
                    nextMonth: resolvedLabels.nextMonth,
                  }}
                  selectionMode="range"
                  rangeStart={gridRangeStart}
                  rangeEnd={gridRangeEnd}
                  hoverDate={hoverDate}
                  onHoverDate={setHoverDate}
                  chevrons={false}
                />
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

// Locale-aware placeholder hint — uses the same example date as
// `getLocaleDateOrder` so the placeholder reflects the actual format.
function rangeFormatExample(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(2000, 0, 2));
}
```

- [ ] **Step 5: Run tests — all green**

```bash
cd packages/design-system && npx vitest run src/components/DateRangePicker/
```

Expected: 16 utils tests + 19 DateRangePicker tests = 35 green.

- [ ] **Step 6: Run the existing DatePicker suite — no regression**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/
```

Expected: all 52 still green (utils 21 + Grid 18 with new range tests + DatePicker 18).

- [ ] **Step 7: Typecheck + lint:css**

```bash
npx tsc --noEmit -p packages/design-system/tsconfig.json
npm run lint:css
```

Expected: both clean.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx \
        packages/design-system/src/components/DateRangePicker/DateRangePicker.test.tsx \
        packages/design-system/src/components/DateRangePicker/index.ts
git commit -m "DateRangePicker: public component (typed input + dual-grid popover)"
```

---

## Task 7: Re-export from `src/index.ts`

**Files:**

- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Add the export block**

Append after the existing DatePicker block:

```ts
export { DateRangePicker } from './components/DateRangePicker';
export type {
  DateRangePickerProps,
  DateRangePickerLabels,
  DateRange,
} from './components/DateRangePicker';
```

- [ ] **Step 2: Verify**

```bash
npm run typecheck
cd packages/design-system && npx vitest run src/structure.test.ts
```

Expected: typecheck clean; structure tests all green.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/index.ts
git commit -m "DateRangePicker: re-export from package root"
```

---

## Task 8: Playground demo + nav wiring

**Files:**

- Create: `packages/playground/src/pages/components/DateRangePickerDemo.tsx`
- Modify: `packages/playground/src/App.tsx` — route
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx` — Forms group entry
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` — card with preview
- Modify: `packages/playground/src/pages/mockups/registry.ts` — `ComponentName` union

- [ ] **Step 1: Read an existing similar demo for reference**

```bash
cat packages/playground/src/pages/components/DatePickerDemo.tsx | head -60
```

Use the same `DemoLayout` + `Example` pattern.

- [ ] **Step 2: Create DateRangePickerDemo.tsx**

```tsx
import { useState } from 'react';
import { Button, DateRangePicker, type DateRange } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/DateRangePicker/DateRangePicker.tsx?raw';
import scssSource from '@lib-source/components/DateRangePicker/DateRangePicker.module.scss?raw';

const TODAY = new Date(2026, 4, 21);
const IN_14 = new Date(2026, 5, 4);
const IN_90 = new Date(2026, 7, 19);

function ControlledDemo() {
  const [value, setValue] = useState<DateRange | null>({
    start: TODAY,
    end: IN_14,
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <DateRangePicker value={value} onChange={setValue} aria-label="Controlled range" />
      <code>
        {value
          ? `${value.start.toISOString().slice(0, 10)} → ${value.end.toISOString().slice(0, 10)}`
          : 'null'}
      </code>
    </div>
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
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
    >
      <DateRangePicker
        nameStart="bookingStart"
        nameEnd="bookingEnd"
        defaultValue={{ start: TODAY, end: IN_14 }}
        aria-label="Booking dates"
      />
      <Button type="submit" size="sm">
        Submit
      </Button>
      {submitted && (
        <code>
          bookingStart = {submitted.start} · bookingEnd = {submitted.end}
        </code>
      )}
    </form>
  );
}

export function DateRangePickerDemo() {
  return (
    <DemoLayout
      name="DateRangePicker"
      componentName="DateRangePicker"
      description="Single-field date-range input with a two-month popover, hover preview between clicks, auto-swap on out-of-order picks, and separate nameStart/nameEnd form mirrors. Built on the same DatePickerGrid as DatePicker (with a new range mode)."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DateRangePicker.tsx"
      scssFilename="DateRangePicker.module.scss"
    >
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Click the input or 📅 to open; pick start then end."
        code={`<DateRangePicker defaultValue={{ start: today, end: in14days }} />`}
      >
        <DateRangePicker
          defaultValue={{ start: TODAY, end: IN_14 }}
          aria-label="Uncontrolled range"
        />
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value via `value` + `onChange`. Useful when the form layer needs to react to changes (validation, summary panels)."
        code={`const [value, setValue] = useState<DateRange | null>({ start: today, end: in14 });
<DateRangePicker value={value} onChange={setValue} />`}
      >
        <ControlledDemo />
      </Example>

      <Example
        title="Min / max"
        description="Restrict picks to a window. Out-of-range cells in the grid are non-clickable; typed input outside the window reverts."
        code={`const today = new Date();
const in90 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

<DateRangePicker
  min={today}
  max={in90}
/>`}
      >
        <DateRangePicker
          defaultValue={{ start: TODAY, end: IN_14 }}
          min={TODAY}
          max={IN_90}
          aria-label="Range within 90 days"
        />
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell and per typed-input boundary. Disabled cells are non-clickable; arrow-key navigation skips them."
        code={`<DateRangePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
      >
        <DateRangePicker
          aria-label="Weekday range only"
          isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        />
      </Example>

      <Example
        title="Disabled"
        description="Use `disabled` when the range is unavailable in the current context. The clear button is hidden when disabled."
        code={`<DateRangePicker
  disabled
  defaultValue={{ start: today, end: in14 }}
/>`}
      >
        <DateRangePicker
          disabled
          defaultValue={{ start: TODAY, end: IN_14 }}
          aria-label="Disabled range"
        />
      </Example>

      <Example
        title="Invalid"
        description="Pair with a visible error message and aria-describedby pointing at it."
        code={`<DateRangePicker invalid aria-describedby="range-error" />
<p id="range-error">Range is required.</p>`}
      >
        <div>
          <DateRangePicker invalid aria-label="Booking dates" aria-describedby="range-error" />
          <p id="range-error" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-1)' }}>
            Range is required.
          </p>
        </div>
      </Example>

      <Example
        title="Form integration"
        description="When `nameStart` and `nameEnd` are set, the picker renders two hidden mirror `<input>`s with ISO dates so native `<form>` submission works."
        code={`<form action="/api/bookings">
  <DateRangePicker nameStart="bookingStart" nameEnd="bookingEnd" defaultValue={{ start: today, end: in14 }} />
  <button type="submit">Submit</button>
</form>`}
      >
        <FormDemo />
      </Example>

      <Example
        title="ru-RU locale"
        description="Input parses and formats as DD.MM.YYYY — DD.MM.YYYY. UI labels (button tooltips, dialog name) are the consumer's responsibility — pass localized strings via the labels prop."
        code={`<DateRangePicker
  defaultValue={{ start: today, end: in14 }}
  locale="ru-RU"
  labels={{
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    openCalendar: 'Открыть календарь',
    clear: 'Очистить диапазон',
    dialogLabel: 'Выберите диапазон дат',
  }}
/>`}
      >
        <DateRangePicker
          defaultValue={{ start: TODAY, end: IN_14 }}
          locale="ru-RU"
          aria-label="Диапазон дат"
          labels={{
            previousMonth: 'Предыдущий месяц',
            nextMonth: 'Следующий месяц',
            openCalendar: 'Открыть календарь',
            clear: 'Очистить диапазон',
            dialogLabel: 'Выберите диапазон дат',
          }}
        />
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 3: Add the route**

In `packages/playground/src/App.tsx`:

- Add import (alphabetical with other `*Demo` imports):
  ```tsx
  import { DateRangePickerDemo } from './pages/components/DateRangePickerDemo';
  ```
- Add route (alphabetical with other component routes; after `/components/datepicker`):

  ```tsx
  <Route path="/components/daterangepicker" element={<DateRangePickerDemo />} />
  ```

- [ ] **Step 4: Add to AppShell Forms group**

In `packages/playground/src/layout/AppShell/AppShell.tsx`:

- Add `CalendarRange` to the `lucide-react` import line (alphabetical with existing icons).
- In `componentGroups` find the Forms group. Insert a new entry between `DatePicker` and `Input` (alphabetical):

  ```tsx
  { to: '/components/daterangepicker', label: 'DateRangePicker', icon: CalendarRange, end: false },
  ```

- [ ] **Step 5: Add to ComponentsIndex**

In `packages/playground/src/pages/components/ComponentsIndex.tsx`:

- Add import:
  ```tsx
  import { DateRangePicker } from '@eocrm/design-system';
  ```
- Insert a card after the DatePicker card (alphabetical within Forms):

  ```tsx
  {
    to: '/components/daterangepicker',
    name: 'DateRangePicker',
    description: 'Single-field date-range input with a two-month popover.',
    preview: (
      <DateRangePicker
        defaultValue={{
          start: new Date(2026, 4, 21),
          end: new Date(2026, 5, 4),
        }}
        aria-label="Preview"
      />
    ),
  },
  ```

  Use the exact shape of the existing cards (match property names / order).

- [ ] **Step 6: Extend the ComponentName union**

In `packages/playground/src/pages/mockups/registry.ts`, add `'DateRangePicker'` to the `ComponentName` union alphabetically between `'DatePicker'` and `'Input'` (or `'Dropdown'` etc. — match where DatePicker is).

- [ ] **Step 7: Build + typecheck**

```bash
npm run typecheck
npm run build
```

Expected: both clean.

- [ ] **Step 8: Commit**

```bash
git add packages/playground
git commit -m "playground: DateRangePicker demo + nav + components index"
```

---

## Task 9: AGENTS.md section

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add the new section**

Insert the following block in `packages/design-system/AGENTS.md` immediately AFTER the existing `### <DatePicker> — single-date input + popover` section and BEFORE `### Calendar primitives`:

````markdown
### `<DateRangePicker>` — date-range input + two-month popover

```tsx
const [range, setRange] = useState<DateRange | null>(null);
<DateRangePicker value={range} onChange={setRange} min={new Date()} />;
```
````

- Date-range selection only. Single-date → `<DatePicker>`. Datetime / multi-date / preset ranges (Today, Last 7 days) — out of scope for v1.
- Looks like an `<Input>`. Click the input or press ArrowDown to open; the popover shows two months side-by-side. The 📅 button toggles, the ✕ button clears the whole range.
- Selection flow: first click sets the start; hover (or keyboard-focus) another cell to preview the range; second click commits and closes. If the second pick is earlier than the start, the range is auto-swapped to `[earlier, later]`. A third click in a reopened popover restarts selection.
- Typed input parses on blur / Enter using the active locale. Accepts `—` (em dash), `–` (en dash), `-` (hyphen with spaces), or `to` (case-insensitive word) as the separator. ISO `YYYY-MM-DD` works for each half too. Out-of-order typed input is auto-swapped. Anything unparseable / out-of-range / disabled reverts to the last committed value.
- `min` / `max` (inclusive) + `isDateDisabled(date) => boolean` gate both the popover grid AND typed-input parsing.
- `clearable` (default `true`) shows the ✕ when a range is set. `nameStart` / `nameEnd` render two hidden mirror `<input>`s with ISO dates so native `<form>` submission works (post both keys, or just one — caller's choice).
- `invalid` toggles the red border + `aria-invalid="true"`. Pair with a visible error and `aria-describedby`.
- ARIA: typed input has `aria-haspopup="dialog"` + `aria-expanded`. Popover wrapper is `role="dialog"` (labelled by `labels.dialogLabel`); each grid inside is `role="grid"` with `gridcell` buttons. The range-start and range-end cells (and the live hover end during selection) carry `aria-selected="true"`.
- Keyboard inside a grid: ←→↑↓ move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space drives the same first-click → second-click flow, Escape closes and returns focus to the input. With selection-start set, the focused cell acts as the hover end so the preview range follows arrow keys.
- Reuses `<DatePickerGrid>` via `selectionMode='range'` + `rangeStart`/`rangeEnd`/`hoverDate`/`onHoverDate` + `chevrons={false}`. The two grids share the same cursor; the picker renders its own prev/next chevrons outside them.

````

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "DateRangePicker: AGENTS.md section"
````

---

## Task 10: Final gates + Hard Rule 8 review-fix cycles + open PR

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

- tests: pass (target ≥ 696 + 16 utils + 5 grid range + 19 DateRangePicker = 736)
- typecheck: clean
- lint:css: clean
- build: succeeds
- prettier: clean (if not, `npx prettier --write` the offending files and re-check)
- pack: no `.test.` files in the tarball

- [ ] **Step 2: Run the DateRangePicker test file 5x to verify no flakiness**

```bash
for i in 1 2 3 4 5; do
  echo "--- run $i ---"
  cd packages/design-system && npx vitest run src/components/DateRangePicker/DateRangePicker.test.tsx 2>&1 | grep -E "^ (Tests|Test Files)"
  cd ../..
done
```

Expected: every run reports the same count, all passing.

- [ ] **Step 3: Push branch**

```bash
git push -u origin feat/daterange-picker
```

- [ ] **Step 4: Run Hard Rule 8 review cycle 1**

Dispatch a fresh-context review agent (`general-purpose`) with the standard 10-category brief from `packages/design-system/CLAUDE.md` Hard Rule 8. Required reading: repo `CLAUDE.md`, package `CLAUDE.md`, `AGENTS.md`, the design spec at `docs/superpowers/specs/2026-05-21-daterange-picker-design.md`, and a fresh `git diff main..HEAD -- packages/`. Output format: Critical / Important / Nice-to-have / Regression-watch + verdict.

- [ ] **Step 5: Fix Critical + Important findings**

Apply fixes inline, run gates, push, repeat.

- [ ] **Step 6: Run review cycles 2+ until verdict is `clean enough to stop`**

- [ ] **Step 7: Open PR**

```bash
gh pr create --title "DateRangePicker — typed input + two-month popover with hover preview" --body "$(cat <<'EOF'
## Summary

- New `<DateRangePicker>`: single-field date-range input with a Floating-UI popover showing two months side-by-side. Built on the existing `DatePickerGrid` via a new range mode (`selectionMode='range'` + `rangeStart`/`rangeEnd`/`hoverDate`/`onHoverDate` + `chevrons={false}`).
- Locale-aware typed parsing of `"start — end"` with multiple separators (em / en / hyphen / `to`). Out-of-order typed input auto-swaps. Invalid / out-of-range / disabled input reverts on blur.
- Selection flow: click start → click end → commit + close. Hover (or arrow-key focus) shows a live preview range between clicks. Third click in a reopened popover restarts selection.
- Separate `nameStart` / `nameEnd` form-mirror props.
- `min` / `max` / `isDateDisabled` gate both the grid and typed input.

## Test plan

- [x] `npm test --run` — total passing (XXX, +N new)
- [x] `npm run typecheck` clean
- [x] `npm run lint:css` clean
- [x] `npm run build` clean
- [x] `npx prettier --check` clean
- [x] `npm pack --dry-run -w @eocrm/design-system` — no test files in tarball
- [x] 5 consecutive runs of `DateRangePicker.test.tsx` — no flakes
- [x] DatePicker suite unchanged — single-mode grid behavior preserved
- [x] Hard Rule 8 review-fix cycles — final verdict: clean enough to stop

## Design spec / plan

- Spec: `docs/superpowers/specs/2026-05-21-daterange-picker-design.md`
- Plan: `docs/superpowers/plans/2026-05-21-daterange-picker.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

Spec coverage:

- §Architecture / file layout → Tasks 4, 5, 6
- §DatePickerGrid refactor (new props, range classes, chevrons) → Tasks 2, 3
- §Public API (`DateRangePickerProps`, `DateRange`, labels) → Task 6
- §Selection flow (first/second click, restart, auto-swap) → Task 6 (`handleGridSelect`)
- §Typed parse → Task 4 (`utils.ts`)
- §Two-month navigation → Task 6 (`goPrev`/`goNext`, right grid uses `addMonths(cursor, 1)`)
- §Form integration → Task 6 (hidden mirrors)
- §Hard rules compliance → Tasks 2/3/4/5/6 (Rule 1 tests, Rule 3 token, Rule 6 forwardRef, Rule 7 JSDoc), Task 7 (Rule 5 exports), Task 8 (Rule 2 demo + nav), Task 9 (AGENTS.md), Task 10 (Rule 8 cycle)
- §Testing surface → Tasks 3, 4, 6
- §Playground → Task 8
- §AGENTS.md → Task 9

Type consistency:

- `DateRange = { start: Date; end: Date }` defined in Task 4's `utils.ts`, re-exported from `index.ts` (Task 6) and the package root (Task 7).
- `DateRangePickerProps`, `DateRangePickerLabels` defined in Task 6, exported.
- `parseDateRange` / `formatDateRange` / `autoSwapRange` signatures all use `DateRange` consistently.
- `DatePickerGridProps` new fields (`selectionMode` etc.) used consistently across Task 2 (interface), Task 3 (test imports), and Task 6 (consumer site).

No placeholders. All file paths absolute. All commit messages present. All TDD steps include test code AND implementation code.
