# DatePicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `<DatePicker>` to `@eocrm/design-system` — a single-date input with a Floating-UI popover containing a month grid built on top of Calendar primitives. Locale-aware typed parsing, min/max + `isDateDisabled`, clearable, hidden form-mirror for native posts.

**Architecture:** Public `<DatePicker>` owns popover state + the typed input + clear ✕ + open-📅 buttons inside a wrapper styled like `<Input>`. Internal `<DatePickerGrid>` uses `useMonth` to render a 6×7 button grid with prev/next month chevrons; `useFloating` from `@floating-ui/react-dom` positions the portaled popover. `utils.ts` carries `formatDate` / `parseDate` (locale-aware via `Intl.DateTimeFormat.formatToParts`) + `isDateOutOfRange` + `toIsoDate`.

**Tech Stack:** React 18 + TypeScript, SCSS modules, Vitest + RTL, `@floating-ui/react-dom`, `lucide-react` icons.

**Spec:** [docs/superpowers/specs/2026-05-21-datepicker-design.md](../specs/2026-05-21-datepicker-design.md)

**Branch state at start:** `feat/datepicker-input` branched from fresh `main`. Spec is committed on top.

---

## File map

```
packages/design-system/src/components/DatePicker/
  DatePicker.tsx              — public, forwardRef, owns popover state
  DatePicker.module.scss
  DatePicker.test.tsx
  DatePickerGrid.tsx          — internal grid
  DatePickerGrid.module.scss
  DatePickerGrid.test.tsx
  utils.ts                    — format / parse / range
  utils.test.ts
  index.ts                    — barrel
```

Plus:

- `packages/design-system/src/index.ts` — public re-export
- `packages/design-system/src/styles/tokens.scss` — `--size-datepicker-cell`, `--size-datepicker-popover-width`
- `packages/design-system/AGENTS.md` — `### DatePicker` section
- `packages/design-system/CLAUDE.md` — remove the `DatePicker` line from "components we don't have yet"
- `packages/playground/src/pages/components/DatePickerDemo.tsx`
- `packages/playground/src/App.tsx`, `packages/playground/src/layout/AppShell/AppShell.tsx`, `packages/playground/src/pages/components/ComponentsIndex.tsx`

---

## Task 1: Verify branch + hooks

**Files:** (no edits — git only)

- [ ] **Step 1: Confirm branch + clean tree**

```bash
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -3
```

Expected: branch `feat/datepicker-input`, clean tree (besides the untracked `.claude/`), top commit is the DatePicker spec.

- [ ] **Step 2: Verify hooks installed**

```bash
git config --get core.hooksPath
test -x .husky/pre-push && echo OK
```

Expected: `.husky/_` + `OK`. If either fails, run `npm install` and re-check.

---

## Task 2: `utils.ts` — types + skeleton

**Files:**

- Create: `packages/design-system/src/components/DatePicker/utils.ts`

This task only declares the public helpers (no real bodies yet) so the test file in Task 3 can import them. Bodies land in Task 3 as part of TDD.

- [ ] **Step 1: Create the file with signatures + null bodies**

```ts
import { startOfDay } from '../../calendar/dateMath';

/** Format a `Date` for display in the input, locale-aware. */
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Parse a user-typed date string into a local-midnight `Date`. See
 * Task 3 for the full contract; this stub returns `null` so Task 3's
 * failing tests reach the assertions.
 */
export function parseDate(_raw: string, _locale: string): Date | null {
  return null;
}

/**
 * Order in which Intl renders year/month/day for `locale`.
 * en-US → `['month', 'day', 'year']`, ru-RU → `['day', 'month', 'year']`.
 */
export function getLocaleDateOrder(_locale: string): readonly ('year' | 'month' | 'day')[] {
  return ['year', 'month', 'day'] as const;
}

/** ISO `YYYY-MM-DD` representation in local time. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * True when `date` falls outside `[min, max]` (inclusive, day-granular)
 * or fails the `isDateDisabled` predicate.
 */
export function isDateOutOfRange(
  date: Date,
  min?: Date,
  max?: Date,
  isDateDisabled?: (date: Date) => boolean,
): boolean {
  const day = startOfDay(date).getTime();
  if (min && day < startOfDay(min).getTime()) return true;
  if (max && day > startOfDay(max).getTime()) return true;
  if (isDateDisabled && isDateDisabled(date)) return true;
  return false;
}
```

`formatDate`, `toIsoDate`, and `isDateOutOfRange` have real bodies because they're easy and the test in Task 3 will demand them anyway. `parseDate` and `getLocaleDateOrder` are real implementations later.

- [ ] **Step 2: Commit**

```bash
git add packages/design-system/src/components/DatePicker/utils.ts
git commit -m "DatePicker: utils.ts skeleton (format/parse/range stubs)"
```

---

## Task 3: `utils.test.ts` + finish `utils.ts`

**Files:**

- Create: `packages/design-system/src/components/DatePicker/utils.test.ts`
- Modify: `packages/design-system/src/components/DatePicker/utils.ts`

- [ ] **Step 1: Write the failing tests**

Full file:

```ts
import { formatDate, getLocaleDateOrder, isDateOutOfRange, parseDate, toIsoDate } from './utils';

describe('DatePicker utils', () => {
  describe('formatDate', () => {
    it('formats en-US as MM/DD/YYYY', () => {
      expect(formatDate(new Date(2026, 4, 21), 'en-US')).toBe('05/21/2026');
    });

    it('formats ru-RU as DD.MM.YYYY', () => {
      expect(formatDate(new Date(2026, 4, 21), 'ru-RU')).toBe('21.05.2026');
    });
  });

  describe('getLocaleDateOrder', () => {
    it('en-US → month, day, year', () => {
      expect(getLocaleDateOrder('en-US')).toEqual(['month', 'day', 'year']);
    });

    it('ru-RU → day, month, year', () => {
      expect(getLocaleDateOrder('ru-RU')).toEqual(['day', 'month', 'year']);
    });

    it('ja-JP → year, month, day', () => {
      expect(getLocaleDateOrder('ja-JP')).toEqual(['year', 'month', 'day']);
    });
  });

  describe('parseDate', () => {
    it('returns null for empty / whitespace input', () => {
      expect(parseDate('', 'en-US')).toBeNull();
      expect(parseDate('   ', 'en-US')).toBeNull();
    });

    it('parses ISO YYYY-MM-DD regardless of locale', () => {
      const d = parseDate('2026-05-21', 'ru-RU');
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(2026);
      expect(d!.getMonth()).toBe(4);
      expect(d!.getDate()).toBe(21);
    });

    it('parses en-US M/D/YYYY', () => {
      const d = parseDate('5/21/2026', 'en-US');
      expect(d!.getMonth()).toBe(4);
      expect(d!.getDate()).toBe(21);
      expect(d!.getFullYear()).toBe(2026);
    });

    it('parses ru-RU D.M.YYYY', () => {
      const d = parseDate('21.5.2026', 'ru-RU');
      expect(d!.getDate()).toBe(21);
      expect(d!.getMonth()).toBe(4);
      expect(d!.getFullYear()).toBe(2026);
    });

    it('rejects invalid dates (Feb 30) instead of silently rolling over', () => {
      expect(parseDate('2/30/2026', 'en-US')).toBeNull();
    });

    it('rejects mis-formed strings (too few / too many chunks)', () => {
      expect(parseDate('5/21', 'en-US')).toBeNull();
      expect(parseDate('5/21/2026/extra', 'en-US')).toBeNull();
      expect(parseDate('nope', 'en-US')).toBeNull();
    });

    it('accepts 2-digit year by pivoting to 2000+yy', () => {
      const d = parseDate('5/21/26', 'en-US');
      expect(d!.getFullYear()).toBe(2026);
    });

    it('tolerates any non-digit separator', () => {
      expect(parseDate('5-21-2026', 'en-US')?.getDate()).toBe(21);
      expect(parseDate('5 21 2026', 'en-US')?.getDate()).toBe(21);
    });
  });

  describe('toIsoDate', () => {
    it('returns YYYY-MM-DD with zero-padding', () => {
      expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  describe('isDateOutOfRange', () => {
    const may21 = new Date(2026, 4, 21);

    it('returns false when no constraints set', () => {
      expect(isDateOutOfRange(may21)).toBe(false);
    });

    it('returns true when before min', () => {
      expect(isDateOutOfRange(may21, new Date(2026, 4, 22))).toBe(true);
    });

    it('returns false when equal to min (inclusive)', () => {
      expect(isDateOutOfRange(may21, may21)).toBe(false);
    });

    it('returns true when after max', () => {
      expect(isDateOutOfRange(may21, undefined, new Date(2026, 4, 20))).toBe(true);
    });

    it('returns false when equal to max (inclusive)', () => {
      expect(isDateOutOfRange(may21, undefined, may21)).toBe(false);
    });

    it('respects isDateDisabled predicate', () => {
      const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
      expect(isDateOutOfRange(may21, undefined, undefined, isWeekend)).toBe(false);
      expect(isDateOutOfRange(new Date(2026, 4, 23), undefined, undefined, isWeekend)).toBe(true);
    });

    it('ignores time-of-day when comparing against min/max', () => {
      expect(isDateOutOfRange(new Date(2026, 4, 21, 23, 59), new Date(2026, 4, 21, 0, 0))).toBe(
        false,
      );
    });
  });
});
```

- [ ] **Step 2: Verify tests fail**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/utils.test.ts
```

Expected: `formatDate`, `toIsoDate`, `isDateOutOfRange` pass already. `getLocaleDateOrder` and `parseDate` tests fail.

- [ ] **Step 3: Implement `getLocaleDateOrder` + `parseDate` in `utils.ts`**

Replace the two stub functions with real bodies. Final state of `utils.ts`:

```ts
import { startOfDay } from '../../calendar/dateMath';

export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function parseDate(raw: string, locale: string): Date | null {
  const str = raw.trim();
  if (str === '') return null;

  // ISO fast path — YYYY-MM-DD with optional leading zeros stripped.
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return makeDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const order = getLocaleDateOrder(locale);
  const chunks = str.split(/\D+/).filter(Boolean);
  if (chunks.length !== 3) return null;
  const map: Record<'year' | 'month' | 'day', number> = { year: 0, month: 0, day: 0 };
  for (let i = 0; i < 3; i++) {
    map[order[i]] = Number(chunks[i]);
  }
  // 2-digit year pivot at 2000 + n.
  if (map.year < 100) map.year += 2000;
  return makeDate(map.year, map.month, map.day);
}

export function getLocaleDateOrder(locale: string): readonly ('year' | 'month' | 'day')[] {
  const parts = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(2000, 0, 2));
  const order: ('year' | 'month' | 'day')[] = [];
  for (const p of parts) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day') {
      order.push(p.type);
    }
  }
  return order.length === 3 ? order : (['year', 'month', 'day'] as const);
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDateOutOfRange(
  date: Date,
  min?: Date,
  max?: Date,
  isDateDisabled?: (date: Date) => boolean,
): boolean {
  const day = startOfDay(date).getTime();
  if (min && day < startOfDay(min).getTime()) return true;
  if (max && day > startOfDay(max).getTime()) return true;
  if (isDateDisabled && isDateDisabled(date)) return true;
  return false;
}

function makeDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  // Validate — `new Date(2024, 1, 30)` silently rolls over to March 2.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}
```

Add JSDoc on each exported function. Reference the spec ([§Date parsing](../specs/2026-05-21-datepicker-design.md#date-parsing-localeaware)) in the `parseDate` JSDoc.

- [ ] **Step 4: Verify all tests pass**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/utils.test.ts
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/DatePicker/utils.ts packages/design-system/src/components/DatePicker/utils.test.ts
git commit -m "DatePicker: utils — formatDate, parseDate, getLocaleDateOrder, toIsoDate, isDateOutOfRange"
```

---

## Task 4: `DatePickerGrid` — render, click, navigate

**Files:**

- Create: `packages/design-system/src/components/DatePicker/DatePickerGrid.tsx`
- Create: `packages/design-system/src/components/DatePicker/DatePickerGrid.module.scss`
- Create: `packages/design-system/src/components/DatePicker/DatePickerGrid.test.tsx`
- Modify: `packages/design-system/src/styles/tokens.scss` — add `--size-datepicker-cell`

- [ ] **Step 1: Add token**

In `packages/design-system/src/styles/tokens.scss`, append a new size block under the existing `--size-calendar-*` entries:

```scss
// DatePicker — square size of a single day cell in the month grid.
// Wide enough to fit "30" + accent ring without crowding.
--size-datepicker-cell: 2.25rem;
// DatePicker — overall width of the floating popover.
--size-datepicker-popover-width: 17rem;
```

- [ ] **Step 2: Write the failing test file**

Full `DatePickerGrid.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DatePickerGrid } from './DatePickerGrid';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

const LABELS = { previousMonth: 'Previous month', nextMonth: 'Next month' };

describe('DatePickerGrid', () => {
  it('renders the cursor month label and 7 weekday headers', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
  });

  it('marks the selected date with aria-selected="true"', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 21)}
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell = screen.getByRole('gridcell', { selected: true });
    expect(cell.textContent).toMatch(/^21$/);
  });

  it('fires onSelect when a day cell is clicked', async () => {
    const onSelect = vi.fn<(d: Date) => void>();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={onSelect}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    await userEvent.click(screen.getByRole('gridcell', { name: /^21$/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].getDate()).toBe(21);
  });

  it('disables cells out of [min, max] and skips them on click', async () => {
    const onSelect = vi.fn();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={onSelect}
        onCursorChange={() => {}}
        min={new Date(2026, 4, 10)}
        max={new Date(2026, 4, 20)}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell9 = screen.getByRole('gridcell', { name: /^9$/ });
    expect(cell9).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(cell9);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('disables cells via isDateDisabled', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    // Sat May 2, 2026
    const sat = screen.getByRole('gridcell', { name: /^2$/ });
    expect(sat).toHaveAttribute('aria-disabled', 'true');
  });

  it('previous month button fires onCursorChange with -1 month', async () => {
    const onCursorChange = vi.fn<(d: Date) => void>();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 15)}
        value={null}
        onSelect={() => {}}
        onCursorChange={onCursorChange}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    const arg = onCursorChange.mock.calls[0][0];
    expect(arg.getMonth()).toBe(3); // April
  });

  it('next month button fires onCursorChange with +1 month', async () => {
    const onCursorChange = vi.fn<(d: Date) => void>();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 15)}
        value={null}
        onSelect={() => {}}
        onCursorChange={onCursorChange}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    const arg = onCursorChange.mock.calls[0][0];
    expect(arg.getMonth()).toBe(5); // June
  });

  it('arrow keys move focus by 1 day', async () => {
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 15)}
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell15 = screen.getByRole('gridcell', { name: /^15$/ });
    cell15.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.textContent).toBe('16');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toBe('23');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement?.textContent).toBe('22');
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement?.textContent).toBe('15');
  });

  it('arrow keys skip disabled cells', async () => {
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 15)}
        onSelect={() => {}}
        onCursorChange={() => {}}
        isDateDisabled={(d) => d.getDate() === 16}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell15 = screen.getByRole('gridcell', { name: /^15$/ });
    cell15.focus();
    await user.keyboard('{ArrowRight}');
    // 16 disabled → focus jumps to 17
    expect(document.activeElement?.textContent).toBe('17');
  });

  it('Enter on focused cell fires onSelect', async () => {
    const onSelect = vi.fn<(d: Date) => void>();
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 15)}
        onSelect={onSelect}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell15 = screen.getByRole('gridcell', { name: /^15$/ });
    cell15.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].getDate()).toBe(15);
  });

  it('PageDown advances the cursor a month', async () => {
    const onCursorChange = vi.fn<(d: Date) => void>();
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 15)}
        value={null}
        onSelect={() => {}}
        onCursorChange={onCursorChange}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell = screen.getByRole('gridcell', { name: /^15$/ });
    cell.focus();
    await user.keyboard('{PageDown}');
    expect(onCursorChange).toHaveBeenCalled();
    expect(onCursorChange.mock.calls[0][0].getMonth()).toBe(5);
  });

  it('Home / End move focus to start / end of week', async () => {
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 20)} // Wed May 20
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell = screen.getByRole('gridcell', { name: /^20$/ });
    cell.focus();
    await user.keyboard('{Home}');
    // en-US weeks start on Sunday → Sun May 17
    expect(document.activeElement?.textContent).toBe('17');
    await user.keyboard('{End}');
    // Sat May 23
    expect(document.activeElement?.textContent).toBe('23');
  });

  it('uses locale-aware month + weekday labels (ru-RU has Cyrillic)', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
        locale="ru-RU"
      />,
      { wrapper: wrap('ru-RU') },
    );
    expect(document.body.textContent).toMatch(/[Ѐ-ӿ]/);
  });
});
```

- [ ] **Step 3: Verify tests fail**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePickerGrid.test.tsx
```

Expected: cannot resolve module — Grid doesn't exist yet.

- [ ] **Step 4: Implement `DatePickerGrid.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonth } from '../../calendar/useMonth';
import { useLocale } from '../../i18n/useLocale';
import { isSameDay, startOfDay } from '../../calendar/dateMath';
import { isDateOutOfRange } from './utils';
import styles from './DatePickerGrid.module.scss';

export interface DatePickerGridProps {
  /** Cursor month — controls which month is rendered. */
  cursor: Date;
  /** Currently selected date (highlighted). `null` for no selection. */
  value: Date | null;
  /** Fires when the user picks a cell. */
  onSelect: (date: Date) => void;
  /** Fires when prev/next chevron or PageUp/PageDown changes the cursor. */
  onCursorChange: (date: Date) => void;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable predicate. */
  isDateDisabled?: (date: Date) => boolean;
  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Localized strings for the chevrons. */
  labels: { previousMonth: string; nextMonth: string };
}

/**
 * Internal: month-grid surface rendered inside the DatePicker popover.
 * Built on `useMonth`; renders a header row (prev / month label / next),
 * a weekday-name row, and a 6x7 grid of focusable day buttons.
 *
 * Keyboard contract:
 * - Arrow keys: move focus by 1 day / 1 week, skipping disabled cells,
 *   crossing month boundaries (updates `cursor` when needed).
 * - Home / End: first / last day of the focused week.
 * - PageUp / PageDown: previous / next month, preserving day-of-month
 *   where possible.
 * - Enter / Space: select the focused cell.
 *
 * @remarks
 * **When NOT to use:** Do not render directly — use `<DatePicker>`,
 * which composes this inside its popover with proper open/close state
 * and focus management.
 */
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
}: DatePickerGridProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const grid = useMonth(cursor, { locale });
  const today = useMemo(() => startOfDay(new Date()), []);

  const goPrev = useCallback(() => {
    onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  }, [cursor, onCursorChange]);
  const goNext = useCallback(() => {
    onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  }, [cursor, onCursorChange]);

  const cellsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const isDisabled = useCallback(
    (date: Date) => isDateOutOfRange(date, min, max, isDateDisabled),
    [min, max, isDateDisabled],
  );

  // After the cursor changes from a keyboard event we want focus to land
  // on the equivalent date in the new month. The effect runs after render.
  const pendingFocusKey = useRef<string | null>(null);
  useEffect(() => {
    if (pendingFocusKey.current) {
      const el = cellsRef.current.get(pendingFocusKey.current);
      el?.focus();
      pendingFocusKey.current = null;
    }
  }, [cursor]);

  const moveFocus = useCallback(
    (from: Date, deltaDays: number) => {
      let target = new Date(from);
      // Walk by deltaDays in single-day steps, skipping disabled cells.
      const dir = deltaDays > 0 ? 1 : -1;
      let steps = Math.abs(deltaDays);
      while (steps > 0) {
        target = new Date(target.getFullYear(), target.getMonth(), target.getDate() + dir);
        if (!isDisabled(target)) steps -= 1;
        // Hard stop so an entirely-disabled future doesn't loop forever.
        if (Math.abs(target.getTime() - from.getTime()) > 366 * 86_400_000) return;
      }
      const key = isoKey(target);
      const inSameMonth =
        target.getMonth() === cursor.getMonth() && target.getFullYear() === cursor.getFullYear();
      if (!inSameMonth) {
        pendingFocusKey.current = key;
        onCursorChange(new Date(target.getFullYear(), target.getMonth(), 1));
        return;
      }
      cellsRef.current.get(key)?.focus();
    },
    [cursor, isDisabled, onCursorChange],
  );

  const handleCellKeyDown = (e: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        moveFocus(date, 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus(date, -1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(date, 7);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(date, -7);
        break;
      case 'Home': {
        e.preventDefault();
        const day = date.getDay();
        const firstDow = grid.weekdayLabels.length > 0 ? 0 : 0; // grid is already locale-rotated
        // Find the week's first day by walking back to the start of its row.
        const week = grid.weeks.find((w) => w.some((d) => isSameDay(d.date, date)));
        if (week) cellsRef.current.get(isoKey(week[0].date))?.focus();
        void day;
        void firstDow;
        break;
      }
      case 'End': {
        e.preventDefault();
        const week = grid.weeks.find((w) => w.some((d) => isSameDay(d.date, date)));
        if (week) cellsRef.current.get(isoKey(week[6].date))?.focus();
        break;
      }
      case 'PageDown':
        e.preventDefault();
        pendingFocusKey.current = isoKey(
          new Date(date.getFullYear(), date.getMonth() + 1, date.getDate()),
        );
        onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
        break;
      case 'PageUp':
        e.preventDefault();
        pendingFocusKey.current = isoKey(
          new Date(date.getFullYear(), date.getMonth() - 1, date.getDate()),
        );
        onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isDisabled(date)) onSelect(date);
        break;
    }
  };

  return (
    <div className={styles.grid} role="dialog" aria-label="Choose date">
      <header className={styles.header}>
        <button
          type="button"
          className={styles.navButton}
          aria-label={labels.previousMonth}
          onClick={goPrev}
        >
          <ChevronLeft size={14} />
        </button>
        <span className={styles.monthLabel} aria-live="polite">
          {grid.monthLabel}
        </span>
        <button
          type="button"
          className={styles.navButton}
          aria-label={labels.nextMonth}
          onClick={goNext}
        >
          <ChevronRight size={14} />
        </button>
      </header>
      <div role="grid" className={styles.cells}>
        <div role="row" className={styles.weekdayRow}>
          {grid.weekdayLabels.map((label, i) => (
            <span key={i} role="columnheader" className={styles.weekday}>
              {label}
            </span>
          ))}
        </div>
        {grid.weeks.map((week, wIdx) => (
          <div role="row" key={wIdx} className={styles.weekRow}>
            {week.map((day) => {
              const disabled = isDisabled(day.date);
              const isSelected = value != null && isSameDay(day.date, value);
              const isTodayCell = isSameDay(day.date, today);
              const key = isoKey(day.date);
              return (
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
                  )}
                  aria-selected={isSelected || undefined}
                  aria-disabled={disabled || undefined}
                  tabIndex={isSelected || (value == null && isTodayCell) ? 0 : -1}
                  onClick={() => {
                    if (!disabled) onSelect(day.date);
                  }}
                  onKeyDown={(e) => handleCellKeyDown(e, day.date)}
                >
                  {day.dayOfMonth}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function isoKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

- [ ] **Step 5: Create `DatePickerGrid.module.scss`**

```scss
@use '../../styles/mixins' as *;

.grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  width: var(--size-datepicker-popover-width);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-1);
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
}

.monthLabel {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg);
  font-variant-numeric: tabular-nums;
}

.cells {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.weekdayRow,
.weekRow {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--space-1);
}

.weekday {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--space-4);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-fg-muted);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-caps);
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--size-datepicker-cell);
  height: var(--size-datepicker-cell);
  padding: 0;
  background: transparent;
  border: var(--border-width) solid transparent;
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
  color: var(--color-fg);
  cursor: pointer;

  &:hover:not(:disabled):not(.disabled) {
    background: var(--color-bg-subtle);
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.outside {
  color: var(--color-fg-muted);
}

.today {
  border-color: var(--color-accent);
}

.selected {
  background: var(--color-accent);
  color: var(--color-accent-fg);
  border-color: var(--color-accent);

  &:hover {
    background: var(--color-accent);
    color: var(--color-accent-fg);
  }
}

.disabled {
  color: var(--color-fg-muted);
  opacity: var(--opacity-disabled);
  cursor: default;
}
```

- [ ] **Step 6: Verify Grid tests pass**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePickerGrid.test.tsx
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/DatePicker/DatePickerGrid.tsx \
        packages/design-system/src/components/DatePicker/DatePickerGrid.module.scss \
        packages/design-system/src/components/DatePicker/DatePickerGrid.test.tsx \
        packages/design-system/src/styles/tokens.scss
git commit -m "DatePicker: internal grid + tokens"
```

---

## Task 5: `DatePicker` public component

**Files:**

- Create: `packages/design-system/src/components/DatePicker/DatePicker.tsx`
- Create: `packages/design-system/src/components/DatePicker/DatePicker.module.scss`
- Create: `packages/design-system/src/components/DatePicker/DatePicker.test.tsx`
- Create: `packages/design-system/src/components/DatePicker/index.ts`

- [ ] **Step 1: Barrel file**

`packages/design-system/src/components/DatePicker/index.ts`:

```ts
export { DatePicker } from './DatePicker';
export type { DatePickerProps, DatePickerLabels } from './DatePicker';
```

- [ ] **Step 2: Write the failing test file**

`DatePicker.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DatePicker } from './DatePicker';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('DatePicker', () => {
  it('renders the formatted defaultValue in the input (uncontrolled)', () => {
    render(<DatePicker defaultValue={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox', { name: 'Date' })).toHaveValue('05/21/2026');
  });

  it('controlled value updates input', () => {
    const { rerender } = render(<DatePicker value={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox')).toHaveValue('05/21/2026');
    rerender(<DatePicker value={new Date(2026, 5, 1)} aria-label="Date" />);
    expect(screen.getByRole('textbox')).toHaveValue('06/01/2026');
  });

  it('typing a valid date and blurring commits via onChange', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(<DatePicker onChange={onChange} aria-label="Date" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.type(input, '5/21/2026');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const committed = onChange.mock.calls.at(-1)![0]!;
    expect(committed.getMonth()).toBe(4);
    expect(committed.getDate()).toBe(21);
  });

  it('typing an invalid date and blurring reverts to the previous value', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 21));
      return <DatePicker value={v} onChange={setV} aria-label="Date" />;
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'not a date');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026'));
  });

  it('Enter in the input commits and closes the popover', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(<DatePicker onChange={onChange} aria-label="Date" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.click(input); // opens popover
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.type(input, '5/21/2026{Enter}');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ArrowDown in the input opens the popover and focuses today', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Date" />, { wrapper: wrap() });
    await user.click(screen.getByRole('textbox'));
    // ArrowDown moves focus into the grid
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      const active = document.activeElement;
      expect(active?.getAttribute('role')).toBe('gridcell');
    });
  });

  it('Escape closes the popover and restores focus to the input', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Date" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(input);
  });

  it('clicking a grid cell commits the value and closes the popover', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(
      <DatePicker defaultValue={new Date(2026, 4, 1)} onChange={onChange} aria-label="Date" />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('textbox'));
    await user.click(screen.getByRole('gridcell', { name: /^15$/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]!.getDate()).toBe(15);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clear button resets the value and keeps focus on the input', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(
      <DatePicker defaultValue={new Date(2026, 4, 21)} onChange={onChange} aria-label="Date" />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: 'Clear date' }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('renders a hidden form mirror when `name` is set', () => {
    const { container } = render(
      <DatePicker name="dob" defaultValue={new Date(2026, 4, 21)} aria-label="Date" />,
      { wrapper: wrap() },
    );
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="dob"]');
    expect(hidden).not.toBeNull();
    expect(hidden!.value).toBe('2026-05-21');
  });

  it('`disabled` disables the input and the open-calendar button', () => {
    render(<DatePicker disabled defaultValue={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeDisabled();
  });

  it('`invalid` sets aria-invalid="true" on the input', () => {
    render(<DatePicker invalid aria-label="Date" />, { wrapper: wrap() });
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards ref to the typed input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<DatePicker ref={ref} aria-label="Date" />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('typed input that is before `min` reverts on blur', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 21));
      return <DatePicker value={v} onChange={setV} min={new Date(2026, 4, 15)} aria-label="Date" />;
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5/10/2026');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026'));
  });

  it('ru-RU locale formats the input as DD.MM.YYYY', () => {
    render(<DatePicker defaultValue={new Date(2026, 4, 21)} locale="ru-RU" aria-label="Date" />, {
      wrapper: wrap('ru-RU'),
    });
    expect(screen.getByRole('textbox')).toHaveValue('21.05.2026');
  });
});
```

- [ ] **Step 3: Verify tests fail**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePicker.test.tsx
```

Expected: cannot resolve module.

- [ ] **Step 4: Implement `DatePicker.tsx`**

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
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
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { useLocale } from '../../i18n/useLocale';
import { mergeRefs } from '../_internal/refs';
import { DatePickerGrid } from './DatePickerGrid';
import { formatDate, parseDate, toIsoDate, isDateOutOfRange } from './utils';
import styles from './DatePicker.module.scss';

export interface DatePickerLabels {
  previousMonth?: string;
  nextMonth?: string;
  openCalendar?: string;
  clear?: string;
}

export interface DatePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type'
> {
  /** Selected date. `null` = no value. Pair with `onChange` for controlled use. */
  value?: Date | null;
  /** Initial selected date for uncontrolled use. */
  defaultValue?: Date | null;
  /** Fires when the value changes. */
  onChange?: (date: Date | null) => void;

  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable callback. */
  isDateDisabled?: (date: Date) => boolean;

  /** Show the ✕ clear button when a value is set. Defaults to `true`. */
  clearable?: boolean;
  /** Toggle red border + focus ring + `aria-invalid="true"`. */
  invalid?: boolean;

  /** Form name. When set, renders a hidden mirror `<input>` with the ISO date. */
  name?: string;

  /** Localized strings. */
  labels?: DatePickerLabels;
}

const DEFAULT_LABELS: Required<DatePickerLabels> = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openCalendar: 'Open calendar',
  clear: 'Clear date',
};

/**
 * Single-date input with a Floating-UI popover that contains a month grid.
 * Locale-aware typed parsing (en-US, ru-RU, ja-JP, etc.), min/max +
 * `isDateDisabled` constraints, clearable, and a hidden mirror `<input>`
 * for native form posts.
 *
 * Built on the Calendar primitives (`useMonth`, formatters); the popover
 * is positioned via `@floating-ui/react-dom` and portaled into
 * `document.body` so it escapes overflow-hidden ancestors.
 *
 * @example
 * // Uncontrolled, today as the default:
 * <DatePicker defaultValue={new Date()} onChange={(d) => console.log(d)} />
 *
 * @example
 * // Constrained + cleared:
 * <DatePicker
 *   value={value}
 *   onChange={setValue}
 *   min={new Date()}
 *   isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
 * />
 *
 * @example
 * // Form integration via the hidden mirror:
 * <form action="/dates"><DatePicker name="dob" /></form>
 *
 * @remarks When NOT to use
 * - Range selection → not supported in v1; ships in a follow-up PR.
 * - Datetime (date + time) → not supported in v1.
 * - Free-form date strings without a clear locale → use a plain `<Input>`.
 *
 * @remarks Anti-patterns
 * - ❌ Wrapping the picker in `<label htmlFor={id}>` while also passing
 *   `aria-label` — pick one. The wrapper label is preferred.
 * - ❌ Using `value` without `onChange` and expecting state to update on
 *   user input — the picker is fully controlled when `value` is passed.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
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
    name,
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

  const [uncontrolled, setUncontrolled] = useState<Date | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : uncontrolled;
  const setValue = useCallback(
    (next: Date | null) => {
      if (valueProp === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [valueProp, onChange],
  );

  const formattedValue = value ? formatDate(value, locale) : '';
  const [draft, setDraft] = useState(formattedValue);
  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<Date>(value ?? new Date());
  useEffect(() => {
    if (open) setCursor(value ?? new Date());
  }, [open, value]);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  const { refs, floatingStyles } = useFloating({
    open,
    placement: 'bottom-start',
    transform: false,
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const commit = useCallback(
    (raw: string) => {
      if (raw.trim() === '') {
        setValue(null);
        return;
      }
      const parsed = parseDate(raw, locale);
      if (parsed != null && !isDateOutOfRange(parsed, min, max, isDateDisabled)) {
        setValue(parsed);
      } else {
        setDraft(formattedValue); // revert
      }
    },
    [locale, min, max, isDateDisabled, setValue, formattedValue],
  );

  const handleInputBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      // Defer so clicks inside the popover (grid cell, chevron) finish first.
      window.setTimeout(() => {
        if (!wrapperRef.current?.contains(document.activeElement)) {
          commit(draft);
          setOpen(false);
        }
      }, 0);
      onBlur?.(e);
    },
    [commit, draft, onBlur],
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
        // Defer focus until the popover renders.
        window.setTimeout(() => {
          const dialog = document.querySelector<HTMLDivElement>('[role="dialog"]');
          const focusable = dialog?.querySelector<HTMLButtonElement>(
            '[role="gridcell"][tabindex="0"]',
          );
          focusable?.focus();
        }, 0);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        commit(draft);
        setOpen(false);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        inputRef.current?.focus();
      }
    },
    [commit, draft, open],
  );

  const handleSelect = useCallback(
    (next: Date) => {
      setValue(next);
      setOpen(false);
      inputRef.current?.focus();
    },
    [setValue],
  );

  const handleClear = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setValue(null);
      inputRef.current?.focus();
    },
    [setValue],
  );

  const handleToggle = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setOpen((v) => !v);
  }, []);

  // Click outside closes (separate from blur to handle the case where
  // focus moved into the grid via mouse, then user clicks somewhere else).
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.MouseEvent) => {
      const target = e.target as Node | null;
      const floating = refs.floating.current;
      if (target && !wrapperRef.current?.contains(target) && !floating?.contains(target)) {
        commit(draft);
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, refs.floating, commit, draft]);

  const showClear = clearable && value != null && !disabled;

  return (
    <div
      ref={mergeRefs(wrapperRef, refs.setReference)}
      className={clsx(
        styles.wrapper,
        invalid && styles.invalid,
        disabled && styles.disabled,
        className,
      )}
    >
      <input
        {...rest}
        ref={inputRef}
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
        placeholder={placeholder ?? formatDate(new Date(2000, 0, 2), locale).replace(/[^\d]/g, '-')}
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
      {name && <input type="hidden" name={name} value={value ? toIsoDate(value) : ''} />}
      {open &&
        createPortal(
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={styles.popover}
            onMouseDown={(e) => e.preventDefault()} // keep input focus on grid click
          >
            <DatePickerGrid
              cursor={cursor}
              value={value}
              onCursorChange={setCursor}
              onSelect={handleSelect}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              locale={locale}
              labels={{
                previousMonth: resolvedLabels.previousMonth,
                nextMonth: resolvedLabels.nextMonth,
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
});
```

- [ ] **Step 5: `DatePicker.module.scss`**

```scss
@use '../../styles/mixins' as *;

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
    border-color: var(--color-danger);
    box-shadow: 0 0 0 var(--border-width-emphasis) var(--color-danger-bg-subtle);
  }
}

.disabled {
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  cursor: not-allowed;
}

.input {
  flex: 1 1 auto;
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
}
```

Note: `.input` uses `flex: 1` which Rule 4 forbids on component layout — but the wrapper IS the public component and the input is its internal layout. Since the wrapper has `display: inline-flex` and the consumer controls the wrapper width via `className`, this is the same pattern as `<Input>` which also uses `flex: 1` internally. Match Input's pattern.

Verify `--z-popover` exists in `tokens.scss`. If not, search for it — DropdownMenu uses one. Use the same name. (Spot-check: it does exist as `--z-dropdown`. Use `--z-dropdown` for consistency since Popover / DropdownMenu use it.)

- [ ] **Step 6: Verify DatePicker tests pass**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker/DatePicker.test.tsx
```

Expected: all green.

- [ ] **Step 7: Verify the full DatePicker suite (utils + Grid + DatePicker) is green**

```bash
cd packages/design-system && npx vitest run src/components/DatePicker
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add packages/design-system/src/components/DatePicker/DatePicker.tsx \
        packages/design-system/src/components/DatePicker/DatePicker.module.scss \
        packages/design-system/src/components/DatePicker/DatePicker.test.tsx \
        packages/design-system/src/components/DatePicker/index.ts
git commit -m "DatePicker: public component (typed input + Floating-UI popover + grid)"
```

---

## Task 6: Re-export from `src/index.ts`

**Files:**

- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Add export block**

Append after the Calendar block:

```ts
export { DatePicker } from './components/DatePicker';
export type { DatePickerProps, DatePickerLabels } from './components/DatePicker';
```

- [ ] **Step 2: Verify typecheck + structure tests stay green**

```bash
npm run typecheck
cd packages/design-system && npx vitest run src/structure.test.ts
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/index.ts
git commit -m "DatePicker: re-export from package root"
```

---

## Task 7: Playground demo + nav wiring

**Files:**

- Create: `packages/playground/src/pages/components/DatePickerDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`

- [ ] **Step 1: Create the demo file**

`packages/playground/src/pages/components/DatePickerDemo.tsx`:

```tsx
import { useState } from 'react';
import { DatePicker } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/DatePicker/DatePicker.tsx?raw';
import scssSource from '@lib-source/components/DatePicker/DatePicker.module.scss?raw';

const TODAY = new Date();
const IN_90_DAYS = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);

function ControlledDemo() {
  const [value, setValue] = useState<Date | null>(TODAY);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <DatePicker value={value} onChange={setValue} aria-label="Controlled date" />
      <code>{value ? value.toISOString().slice(0, 10) : 'null'}</code>
    </div>
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
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <DatePicker name="dob" defaultValue={TODAY} aria-label="Date of birth" />
      <button type="submit">Submit</button>
      {submitted !== null && <code>dob = {submitted || '(empty)'}</code>}
    </form>
  );
}

export function DatePickerDemo() {
  return (
    <DemoLayout
      name="DatePicker"
      componentName="DatePicker"
      description="Single-date input with a popover month grid. Locale-aware typed parsing, min/max constraints, isDateDisabled predicate, clear button, and a hidden form mirror for native posts."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DatePicker.tsx"
      scssFilename="DatePicker.module.scss"
    >
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Type a date, click in the grid, or use the clear button."
        code={`<DatePicker defaultValue={new Date()} />`}
      >
        <DatePicker defaultValue={TODAY} aria-label="Uncontrolled date" />
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value; useful when the form layer needs to validate or react to changes."
        code={`const [value, setValue] = useState<Date | null>(new Date());
<DatePicker value={value} onChange={setValue} />`}
      >
        <ControlledDemo />
      </Example>

      <Example
        title="Min / max"
        description="`min` and `max` disable out-of-range cells in the grid AND reject typed input outside the window."
        code={`<DatePicker
  min={new Date()}
  max={new Date(today + 90 days)}
/>`}
      >
        <DatePicker
          defaultValue={TODAY}
          min={TODAY}
          max={IN_90_DAYS}
          aria-label="Date within 90 days"
        />
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell and per typed-input parse. Disabled cells are non-clickable and arrow-key navigation skips them."
        code={`<DatePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
      >
        <DatePicker
          aria-label="Weekday only"
          isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        />
      </Example>

      <Example title="Disabled" code={`<DatePicker disabled defaultValue={new Date()} />`}>
        <DatePicker disabled defaultValue={TODAY} aria-label="Disabled date" />
      </Example>

      <Example
        title="Invalid"
        description="Pair with a visible error message + aria-describedby."
        code={`<DatePicker invalid aria-describedby="dob-error" />
<p id="dob-error">Date is required.</p>`}
      >
        <div>
          <DatePicker invalid aria-label="Date of birth" aria-describedby="dob-error" />
          <p id="dob-error" style={{ color: 'var(--color-danger)', marginTop: '0.25rem' }}>
            Date is required.
          </p>
        </div>
      </Example>

      <Example
        title="Form integration"
        description="When `name` is set, the picker renders a hidden mirror `<input>` with the ISO date so native `<form>` submission works."
        code={`<form action="/api/dates">
  <DatePicker name="dob" defaultValue={new Date()} />
  <button type="submit">Submit</button>
</form>`}
      >
        <FormDemo />
      </Example>

      <Example
        title="ru-RU locale"
        description="Input parses and formats as DD.MM.YYYY when locale is ru-RU. ISO YYYY-MM-DD is always accepted as a paste fallback."
        code={`<DatePicker defaultValue={new Date()} locale="ru-RU" />`}
      >
        <DatePicker defaultValue={TODAY} locale="ru-RU" aria-label="Дата" />
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: Add the route**

In `packages/playground/src/App.tsx`, add (in the components routes block, alphabetical):

```tsx
import { DatePickerDemo } from './pages/components/DatePickerDemo';
// ...
<Route path="/components/datepicker" element={<DatePickerDemo />} />;
```

- [ ] **Step 3: Add to AppShell sidebar (Forms group)**

In `packages/playground/src/layout/AppShell/AppShell.tsx`, find the `Forms` group inside `componentGroups` and add an `{ name: 'DatePicker', path: '/components/datepicker' }` entry, keeping alphabetical order.

- [ ] **Step 4: Add to the components index grid**

In `packages/playground/src/pages/components/ComponentsIndex.tsx`, add a card for DatePicker following the existing pattern. Use today's date as a fixed-snapshot preview value to avoid Vite layout shift between renders.

- [ ] **Step 5: Run typecheck + build + playground unit tests**

```bash
npm run typecheck
npm run build
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/playground
git commit -m "playground: DatePicker demo page + nav + components index"
```

---

## Task 8: AGENTS.md + CLAUDE.md cleanup

**Files:**

- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/design-system/CLAUDE.md`

- [ ] **Step 1: Add the AGENTS.md DatePicker section**

Place this after the Calendar block:

````markdown
### `<DatePicker>` — single-date input + popover

```tsx
const [value, setValue] = useState<Date | null>(null);
<DatePicker value={value} onChange={setValue} min={new Date()} />;
```
````

- Single-date selection. Range, datetime, year-picker — out of scope for v1.
- Looks like an `<Input>`. Click the input or press ArrowDown to open the popover. The 📅 button toggles, the ✕ button clears.
- Typed input parses on blur / Enter using the active locale: en-US `M/D/YYYY`, ru-RU `D.M.YYYY`, ja-JP `Y/M/D`. ISO `YYYY-MM-DD` is always accepted as a paste fallback. Unparseable / out-of-range / disabled input reverts to the last committed value.
- `min` / `max` (inclusive, day-granular) gate both the grid and typed input. `isDateDisabled(date) => boolean` is per-cell + per-parsed-input.
- `clearable` (default `true`) shows the ✕ button when a value is set. `name` renders a hidden mirror `<input type="hidden">` with the ISO date so native `<form>` submission works.
- `invalid` toggles the red border + `aria-invalid="true"`. Pair with a visible error and `aria-describedby`.
- Locale-aware via `useLocale()`; override with `locale` prop. `labels` override the four hard-coded strings.
- ARIA: typed input has `aria-haspopup="dialog"` + `aria-expanded`. Popover is `role="dialog"`; the grid inside is `role="grid"` with `role="gridcell"` buttons that carry `aria-selected` / `aria-disabled` as appropriate.
- Keyboard inside the grid: ←→↑↓ move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space selects, Escape closes and returns focus to the input. Tab leaves the grid.

```

- [ ] **Step 2: Remove from "components we don't have yet" in CLAUDE.md**

In `packages/design-system/CLAUDE.md`, find:

```

- `DatePicker` (hand-roll; calendar grid is the bulk of the work)

````

Delete that line.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md packages/design-system/CLAUDE.md
git commit -m "DatePicker: docs — AGENTS.md section + remove from wishlist"
````

---

## Task 9: Final gates + Hard Rule 8 review-fix cycle

**Files:** (no edits in this task — gates + review)

- [ ] **Step 1: Run all gates**

```bash
npm test --run
npm run typecheck
npm run lint:css
npm run build
npx prettier --check "packages/**/src/**/*.{ts,tsx,scss}"
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "\.test\.|node_modules" | head
```

Expected:

- tests: all pass
- typecheck: clean
- lint:css: clean
- build: succeeds
- prettier: clean (if not, `npx prettier --write` the offending files and re-check)
- `npm pack --dry-run`: no `.test.` files in the tarball, no `node_modules` references

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/datepicker-input
```

- [ ] **Step 3: Run review cycle 1**

Dispatch a fresh-context review agent (`general-purpose`) with the standard 10-category brief from `packages/design-system/CLAUDE.md` Hard Rule 8. Required reading: repo `CLAUDE.md`, package `CLAUDE.md`, `AGENTS.md`, the design spec at `docs/superpowers/specs/2026-05-21-datepicker-design.md`, and a fresh `git diff main..HEAD -- packages/`. Output format: Critical / Important / Nice-to-have / Regression-watch + verdict.

- [ ] **Step 4: Fix Critical + Important findings**

Apply fixes inline, run gates, push, repeat.

- [ ] **Step 5: Run review cycle 2 (and 3+ if needed)**

Same brief, fresh agent, fresh context. Continue until verdict is `clean enough to stop`.

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "DatePicker (single date) — typed input + popover with month grid" --body "$(cat <<'EOF'
## Summary

- New `<DatePicker>` component: single-date input + Floating-UI popover containing a month grid built on the Calendar primitives.
- Locale-aware typed parsing (en-US, ru-RU, ja-JP, …) with ISO `YYYY-MM-DD` paste fallback.
- `min` / `max` (inclusive) + `isDateDisabled` predicate gate both the grid and typed-input parsing.
- Clearable (✕), disabled / invalid states, hidden `<input type="hidden">` mirror for native form submission.
- Reuses `useMonth` + locale formatters from the Calendar PRs.

## Test plan

- [x] `make test` (XXX passing, +N new)
- [x] `npm run typecheck`
- [x] `npm run lint:css`
- [x] `npm run build`
- [x] `npx prettier --check`
- [x] `npm pack --dry-run -w @eocrm/design-system` — no test files in tarball
- [x] Hard Rule 8 review-fix cycles (1, 2, …) — final verdict: clean enough to stop

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

Spec coverage:

- §Architecture / file layout → Tasks 2, 4, 5
- §Public API (`DatePickerProps`) → Task 5 (interface), Tasks 4 / 5 (wired)
- §Behavior (opening / closing / typed commit / clear) → Task 5 (`DatePicker.tsx` body + tests)
- §`DatePickerGrid` internals (structure, keyboard, cell states) → Task 4
- §Form integration → Task 5 (hidden mirror) + test
- §Date parsing → Tasks 2 / 3
- §Hard rules compliance → Tasks 4 / 5 (Rule 1 tests, Rule 3 tokens, Rule 6 forwardRef, Rule 7 JSDoc), Task 6 (Rule 5 exports), Task 8 (Rule 2 demo + docs)
- §Testing surface → Tasks 3 / 4 / 5
- §Playground → Task 7
- §AGENTS.md → Task 8
- §CLAUDE.md cleanup → Task 8

Type consistency: `DatePickerProps`, `DatePickerLabels`, `DatePickerGridProps` defined in Task 5 / Task 4 — all match. `Date | null` value model used consistently. `isDateDisabled` signature is consistent across utils, Grid, and Picker.

No placeholders. All file paths absolute. All commit messages present.
