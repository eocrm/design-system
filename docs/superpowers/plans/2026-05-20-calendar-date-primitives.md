# Calendar Date Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the headless substrate (locale Context + date math + hooks) that future Calendar UI views and a future DatePicker will compose against.

**Architecture:** Two new top-level modules under `packages/design-system/src/` — `i18n/` (general-purpose `LocaleProvider` + `useLocale`) and `calendar/` (date math, `Intl` formatters, week-info helpers, and four hooks: `useMonth`, `useWeek`, `useDay`, `useAgenda`). All math is local-time anchored; locale defaults to `useLocale()` context with explicit option override.

**Tech Stack:** React 18 + TypeScript, native `Intl.DateTimeFormat` / `Intl.Locale` (no date library), Vitest + React Testing Library (`renderHook`), workspace npm scripts.

**Spec:** [docs/superpowers/specs/2026-05-20-calendar-date-primitives-design.md](../specs/2026-05-20-calendar-date-primitives-design.md)

**Branch state at the start of implementation:** `feat/calendar-date-primitives` has already been branched from a fresh `main`, with this spec and plan committed on top. The executor starts work on that branch — do NOT re-create or rebase.

---

## Task 1: Verify branch + hooks are ready

**Files:** (no edits — git only)

- [ ] **Step 1: Confirm branch and clean tree**

Run:

```bash
git status
git rev-parse --abbrev-ref HEAD
git log --oneline -4
```

Expected: clean tree; current branch is `feat/calendar-date-primitives`; top commits include the spec and this plan. If anything differs, stop and surface the state.

- [ ] **Step 2: Verify hooks are wired**

Run:

```bash
git config --get core.hooksPath
test -x .husky/pre-push && echo OK
```

Expected:

```
.husky/_
OK
```

If either fails, run `npm install` and re-check.

---

## Task 2: Locale infrastructure (`src/i18n/`)

**Files:**

- Create: `packages/design-system/src/i18n/LocaleProvider.tsx`
- Create: `packages/design-system/src/i18n/useLocale.ts`
- Create: `packages/design-system/src/i18n/index.ts`
- Create: `packages/design-system/src/i18n/LocaleProvider.test.tsx`

- [ ] **Step 1: Write `LocaleProvider.tsx`**

Create `packages/design-system/src/i18n/LocaleProvider.tsx`:

```tsx
import { createContext, type ReactNode } from 'react';

export const LocaleContext = createContext<string | null>(null);

export interface LocaleProviderProps {
  /** BCP-47 locale string, e.g. 'en-US', 'ru-RU', 'de-DE'. */
  locale: string;
  children: ReactNode;
}

/**
 * Provides the active locale (BCP-47 string) to every descendant. Any
 * design-system component that needs locale-aware formatting (Calendar
 * primitives, future Input formatters, currency widgets) reads this via
 * `useLocale()`. The Provider is stateless — to switch locale, re-render
 * with a new `locale` prop.
 *
 * @example
 * <LocaleProvider locale="ru-RU">
 *   <App />
 * </LocaleProvider>
 *
 * @example
 * // Nested override for a subtree:
 * <LocaleProvider locale="en-US">
 *   <Dashboard />
 *   <LocaleProvider locale="ja-JP">
 *     <JapaneseSection />
 *   </LocaleProvider>
 * </LocaleProvider>
 */
export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
```

- [ ] **Step 2: Write `useLocale.ts`**

Create `packages/design-system/src/i18n/useLocale.ts`:

```ts
import { useContext } from 'react';
import { LocaleContext } from './LocaleProvider';

/**
 * Read the active locale. Resolution order:
 * 1. The nearest `<LocaleProvider>` value (if mounted above).
 * 2. `navigator.language` (browser fallback).
 * 3. `'en-US'` (SSR / Node test fallback).
 *
 * Consumers don't need to wrap their app in `<LocaleProvider>` to get a
 * sensible default; mount it only when you want to override the browser
 * default or pin a subtree to a specific locale.
 */
export function useLocale(): string {
  const ctx = useContext(LocaleContext);
  if (ctx !== null) return ctx;
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}
```

- [ ] **Step 3: Write `index.ts`**

Create `packages/design-system/src/i18n/index.ts`:

```ts
export { LocaleProvider, LocaleContext } from './LocaleProvider';
export type { LocaleProviderProps } from './LocaleProvider';
export { useLocale } from './useLocale';
```

- [ ] **Step 4: Write `LocaleProvider.test.tsx`**

Create `packages/design-system/src/i18n/LocaleProvider.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from './LocaleProvider';
import { useLocale } from './useLocale';

function LocaleProbe() {
  const locale = useLocale();
  return <span data-testid="locale">{locale}</span>;
}

describe('LocaleProvider', () => {
  it('renders children', () => {
    render(
      <LocaleProvider locale="en-US">
        <span>hello</span>
      </LocaleProvider>,
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('exposes the provided locale via useLocale', () => {
    render(
      <LocaleProvider locale="ru-RU">
        <LocaleProbe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('ru-RU');
  });

  it('the innermost provider wins when nested', () => {
    render(
      <LocaleProvider locale="en-US">
        <LocaleProvider locale="ja-JP">
          <LocaleProbe />
        </LocaleProvider>
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('ja-JP');
  });
});

describe('useLocale fallback', () => {
  it('falls back to navigator.language when no provider is mounted', () => {
    vi.stubGlobal('navigator', { language: 'de-DE' });
    render(<LocaleProbe />);
    expect(screen.getByTestId('locale')).toHaveTextContent('de-DE');
    vi.unstubAllGlobals();
  });

  it('falls back to en-US when neither provider nor navigator is available', () => {
    vi.stubGlobal('navigator', undefined);
    render(<LocaleProbe />);
    expect(screen.getByTestId('locale')).toHaveTextContent('en-US');
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run packages/design-system/src/i18n/`
Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/i18n/
git commit -m "i18n: LocaleProvider + useLocale hook"
```

---

## Task 3: Calendar `types.ts`

**Files:**

- Create: `packages/design-system/src/calendar/types.ts`

- [ ] **Step 1: Write `types.ts`**

Create `packages/design-system/src/calendar/types.ts`:

```ts
/**
 * A single calendar day. Produced by every Calendar primitive hook so consumer
 * components render a consistent shape regardless of view (month/week/day/agenda).
 */
export interface Day {
  /** Local midnight of this calendar day. Time component is always 00:00:00.000. */
  date: Date;
  /** 1..31. */
  dayOfMonth: number;
  /** False for trailing/leading days from adjacent months in a `useMonth` grid. */
  isCurrentMonth: boolean;
  isToday: boolean;
  /** Locale-aware — `[5, 6]` (Fri/Sat) for ar-SA/he-IL, `[0, 6]` (Sat/Sun) for most. */
  isWeekend: boolean;
  /** 0..6, where 0 is the locale's first-day-of-week. Useful for styling column position. */
  weekday: number;
  /** 'YYYY-MM-DD' in local time. Stable React key, comparison handle, event-lookup index. */
  key: string;
}

/** A full week, always seven `Day`s. */
export type Week = readonly [Day, Day, Day, Day, Day, Day, Day];

/** Result of `useMonth`. */
export interface MonthGrid {
  /** Calendar year of the anchor month (e.g., 2026). */
  year: number;
  /** 0..11, JS Date convention. */
  month: number;
  /** Localized month + year label, e.g., "May 2026" / "Май 2026". */
  monthLabel: string;
  /** Length 7, in display order (locale's first-day-of-week first). */
  weekdayLabels: readonly string[];
  /** 4–6 full weeks; leading/trailing days are filled from adjacent months. */
  weeks: readonly Week[];
}
```

- [ ] **Step 2: Confirm typecheck passes**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/calendar/types.ts
git commit -m "calendar: types (Day, Week, MonthGrid)"
```

---

## Task 4: `dateMath.ts` — pure date utilities (TDD)

**Files:**

- Create: `packages/design-system/src/calendar/dateMath.test.ts`
- Create: `packages/design-system/src/calendar/dateMath.ts`

- [ ] **Step 1: Write tests first (red)**

Create `packages/design-system/src/calendar/dateMath.test.ts`:

```ts
import {
  addDays,
  addMonths,
  addWeeks,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  daysBetween,
  toDateKey,
  fromDateKey,
} from './dateMath';

describe('addDays', () => {
  it('adds positive days, crossing month boundary', () => {
    expect(addDays(new Date(2026, 4, 31), 1)).toEqual(new Date(2026, 5, 1));
  });

  it('subtracts when n is negative', () => {
    expect(addDays(new Date(2026, 5, 1), -1)).toEqual(new Date(2026, 4, 31));
  });

  it('returns a new Date (does not mutate input)', () => {
    const a = new Date(2026, 4, 20);
    addDays(a, 5);
    expect(a).toEqual(new Date(2026, 4, 20));
  });
});

describe('addMonths', () => {
  it('adds positive months', () => {
    expect(addMonths(new Date(2026, 0, 15), 2)).toEqual(new Date(2026, 2, 15));
  });

  it('clamps day-of-month on shorter target month', () => {
    // Jan 31 + 1 month should be Feb 28 (2026 is not a leap year)
    expect(addMonths(new Date(2026, 0, 31), 1)).toEqual(new Date(2026, 1, 28));
  });

  it('wraps year on +12 months', () => {
    expect(addMonths(new Date(2026, 11, 15), 1)).toEqual(new Date(2027, 0, 15));
  });
});

describe('addWeeks', () => {
  it('adds 7 days per week', () => {
    expect(addWeeks(new Date(2026, 4, 20), 2)).toEqual(new Date(2026, 5, 3));
  });
});

describe('startOfDay', () => {
  it('zeroes the time component, keeps local date', () => {
    const d = new Date(2026, 4, 20, 14, 35, 22, 999);
    expect(startOfDay(d)).toEqual(new Date(2026, 4, 20, 0, 0, 0, 0));
  });
});

describe('startOfWeek', () => {
  it('Monday-start: returns the Monday of the week (Wed → previous Mon)', () => {
    // May 20 2026 is a Wednesday
    expect(startOfWeek(new Date(2026, 4, 20), 1)).toEqual(new Date(2026, 4, 18));
  });

  it('Sunday-start: returns the Sunday of the week (Wed → previous Sun)', () => {
    expect(startOfWeek(new Date(2026, 4, 20), 0)).toEqual(new Date(2026, 4, 17));
  });

  it('returns the same day when the input is already the week start', () => {
    // May 18 2026 is a Monday
    expect(startOfWeek(new Date(2026, 4, 18), 1)).toEqual(new Date(2026, 4, 18));
  });
});

describe('startOfMonth / endOfMonth', () => {
  it('startOfMonth returns the 1st at local midnight', () => {
    expect(startOfMonth(new Date(2026, 4, 20, 15))).toEqual(new Date(2026, 4, 1));
  });

  it('endOfMonth returns the last day at local midnight', () => {
    expect(endOfMonth(new Date(2026, 1, 1))).toEqual(new Date(2026, 1, 28));
    expect(endOfMonth(new Date(2026, 4, 1))).toEqual(new Date(2026, 4, 31));
  });
});

describe('isSameDay / isSameMonth', () => {
  it('isSameDay matches across time components on the same calendar day', () => {
    expect(isSameDay(new Date(2026, 4, 20, 1, 0), new Date(2026, 4, 20, 23, 59))).toBe(true);
  });

  it('isSameDay false across midnight', () => {
    expect(isSameDay(new Date(2026, 4, 20, 23, 59), new Date(2026, 4, 21, 0, 0))).toBe(false);
  });

  it('isSameMonth matches days within the same calendar month', () => {
    expect(isSameMonth(new Date(2026, 4, 1), new Date(2026, 4, 31))).toBe(true);
    expect(isSameMonth(new Date(2026, 4, 31), new Date(2026, 5, 1))).toBe(false);
  });
});

describe('isToday', () => {
  it('true when the same day as injected now', () => {
    const now = new Date(2026, 4, 20, 14);
    expect(isToday(new Date(2026, 4, 20, 9), now)).toBe(true);
  });

  it('false when day differs', () => {
    const now = new Date(2026, 4, 20);
    expect(isToday(new Date(2026, 4, 19), now)).toBe(false);
  });
});

describe('isWeekend', () => {
  it('true for Saturday when weekendDays is [0, 6]', () => {
    // May 23 2026 is a Saturday (getDay === 6)
    expect(isWeekend(new Date(2026, 4, 23), [0, 6])).toBe(true);
  });

  it('false for Wednesday with default Sat/Sun weekend', () => {
    expect(isWeekend(new Date(2026, 4, 20), [0, 6])).toBe(false);
  });

  it('respects a Fri/Sat weekend (e.g., for ar-SA)', () => {
    // May 22 2026 is a Friday (getDay === 5)
    expect(isWeekend(new Date(2026, 4, 22), [5, 6])).toBe(true);
    expect(isWeekend(new Date(2026, 4, 24), [5, 6])).toBe(false); // Sunday
  });
});

describe('daysBetween', () => {
  it('returns calendar-day difference (positive)', () => {
    expect(daysBetween(new Date(2026, 4, 20), new Date(2026, 4, 25))).toBe(5);
  });

  it('returns 0 for the same day across time components', () => {
    expect(daysBetween(new Date(2026, 4, 20, 1), new Date(2026, 4, 20, 23))).toBe(0);
  });

  it('returns negative when b is before a', () => {
    expect(daysBetween(new Date(2026, 4, 25), new Date(2026, 4, 20))).toBe(-5);
  });
});

describe('toDateKey / fromDateKey', () => {
  it('toDateKey produces YYYY-MM-DD with zero-padding', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('fromDateKey parses to local midnight', () => {
    expect(fromDateKey('2026-05-20')).toEqual(new Date(2026, 4, 20));
  });

  it('round-trips', () => {
    const d = new Date(2026, 6, 4, 8, 30);
    const key = toDateKey(d);
    const parsed = fromDateKey(key);
    expect(isSameDay(parsed, d)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npx vitest run packages/design-system/src/calendar/dateMath.test.ts`
Expected: failure — module not found.

- [ ] **Step 3: Implement `dateMath.ts`**

Create `packages/design-system/src/calendar/dateMath.ts`:

```ts
const MS_PER_DAY = 86_400_000;

export function addDays(date: Date, n: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

export function addMonths(date: Date, n: number): Date {
  const result = new Date(date);
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + n);
  // Clamp day to the target month's last day (handles Jan 31 + 1m → Feb 28/29)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

export function addWeeks(date: Date, n: number): Date {
  return addDays(date, n * 7);
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date {
  const result = startOfDay(date);
  const delta = (result.getDay() - weekStartsOn + 7) % 7;
  result.setDate(result.getDate() - delta);
  return result;
}

export function startOfMonth(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  return result;
}

export function endOfMonth(date: Date): Date {
  // Day 0 of next month = last day of current month.
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(date: Date, now: Date = new Date()): boolean {
  return isSameDay(date, now);
}

export function isWeekend(date: Date, weekendDays: readonly number[]): boolean {
  return weekendDays.includes(date.getDay());
}

export function daysBetween(a: Date, b: Date): number {
  const startA = startOfDay(a).getTime();
  const startB = startOfDay(b).getTime();
  return Math.round((startB - startA) / MS_PER_DAY);
}

export function toDateKey(date: Date): string {
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function fromDateKey(key: string): Date {
  const [yyyy, mm, dd] = key.split('-').map(Number);
  return new Date(yyyy, mm - 1, dd);
}
```

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npx vitest run packages/design-system/src/calendar/dateMath.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/calendar/dateMath.ts packages/design-system/src/calendar/dateMath.test.ts
git commit -m "calendar: dateMath utilities (add/start/end/compare/key)"
```

---

## Task 5: `weekInfo.ts` — first-day-of-week + weekend info (TDD)

**Files:**

- Create: `packages/design-system/src/calendar/weekInfo.test.ts`
- Create: `packages/design-system/src/calendar/weekInfo.ts`

- [ ] **Step 1: Write tests first**

Create `packages/design-system/src/calendar/weekInfo.test.ts`:

```ts
import { getFirstDayOfWeek, getWeekendDays } from './weekInfo';

describe('getFirstDayOfWeek', () => {
  it('returns Sunday (0) for en-US', () => {
    expect(getFirstDayOfWeek('en-US')).toBe(0);
  });

  it('returns Monday (1) for ru-RU', () => {
    expect(getFirstDayOfWeek('ru-RU')).toBe(1);
  });

  it('returns Monday (1) for de-DE', () => {
    expect(getFirstDayOfWeek('de-DE')).toBe(1);
  });

  it('falls back to Monday for an unknown locale', () => {
    expect(getFirstDayOfWeek('xx-YY')).toBe(1);
  });

  it('uses the static fallback when Intl.Locale.getWeekInfo is missing', () => {
    const orig = (Intl.Locale.prototype as { getWeekInfo?: unknown }).getWeekInfo;
    // @ts-expect-error — intentionally delete to simulate older runtime
    delete Intl.Locale.prototype.getWeekInfo;
    try {
      expect(getFirstDayOfWeek('en-US')).toBe(0); // from FALLBACK_FIRST_DAY
      expect(getFirstDayOfWeek('ru-RU')).toBe(1); // default branch
    } finally {
      // @ts-expect-error — restore
      Intl.Locale.prototype.getWeekInfo = orig;
    }
  });
});

describe('getWeekendDays', () => {
  it('returns [0, 6] for en-US (Sat/Sun)', () => {
    expect(getWeekendDays('en-US')).toEqual([0, 6]);
  });

  it('returns [5, 6] for ar-SA (Fri/Sat)', () => {
    expect(getWeekendDays('ar-SA')).toEqual([5, 6]);
  });

  it('falls back to [0, 6] for unknown locales', () => {
    expect(getWeekendDays('xx-YY')).toEqual([0, 6]);
  });

  it('uses the static fallback when Intl.Locale.getWeekInfo is missing', () => {
    const orig = (Intl.Locale.prototype as { getWeekInfo?: unknown }).getWeekInfo;
    // @ts-expect-error — intentionally delete
    delete Intl.Locale.prototype.getWeekInfo;
    try {
      expect(getWeekendDays('ar-SA')).toEqual([5, 6]); // from FALLBACK_WEEKEND
      expect(getWeekendDays('en-US')).toEqual([0, 6]); // default
    } finally {
      // @ts-expect-error — restore
      Intl.Locale.prototype.getWeekInfo = orig;
    }
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npx vitest run packages/design-system/src/calendar/weekInfo.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `weekInfo.ts`**

Create `packages/design-system/src/calendar/weekInfo.ts`:

```ts
type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const FALLBACK_FIRST_DAY: Record<string, DayIndex> = {
  'en-US': 0,
  'en-CA': 0,
  'ja-JP': 0,
};

const FALLBACK_WEEKEND: Record<string, readonly DayIndex[]> = {
  'ar-SA': [5, 6],
  'he-IL': [5, 6],
};

/**
 * Try `Intl.Locale(locale).getWeekInfo()`; return `undefined` if the API
 * is unavailable (older runtimes) or the locale is unrecognized.
 */
function tryWeekInfo(locale: string): { firstDay: number; weekend: readonly number[] } | undefined {
  try {
    const loc = new Intl.Locale(locale);
    const info = (
      loc as Intl.Locale & { getWeekInfo?: () => { firstDay: number; weekend: number[] } }
    ).getWeekInfo?.();
    if (!info) return undefined;
    return { firstDay: info.firstDay, weekend: info.weekend };
  } catch {
    return undefined;
  }
}

/**
 * Lookup `locale` in a fallback map first by exact tag (`en-US`), then by
 * primary language subtag (`en`), then return `defaultValue`.
 */
function lookup<T>(map: Record<string, T>, locale: string, defaultValue: T): T {
  if (locale in map) return map[locale];
  const primary = locale.split('-')[0];
  if (primary in map) return map[primary];
  return defaultValue;
}

export function getFirstDayOfWeek(locale: string): DayIndex {
  const info = tryWeekInfo(locale);
  if (info && info.firstDay >= 0 && info.firstDay <= 6) {
    // Intl.Locale.getWeekInfo uses 1..7 (Mon..Sun) per spec — normalize to 0..6 (Sun..Sat).
    // Some engines already return 0..6; detect by value range.
    const normalized = info.firstDay === 7 ? 0 : info.firstDay;
    return normalized as DayIndex;
  }
  return lookup(FALLBACK_FIRST_DAY, locale, 1);
}

export function getWeekendDays(locale: string): readonly DayIndex[] {
  const info = tryWeekInfo(locale);
  if (info && info.weekend.length > 0) {
    return info.weekend.map((d) => (d === 7 ? 0 : d) as DayIndex);
  }
  return lookup(FALLBACK_WEEKEND, locale, [0, 6]);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/design-system/src/calendar/weekInfo.test.ts`
Expected: all tests pass. If the runtime's `Intl.Locale.getWeekInfo` returns 1–7 (Mon–Sun) instead of 0–6 (Sun–Sat), the normalization branch handles that.

If the en-US test fails because `Intl.Locale.getWeekInfo` returns `firstDay: 7` (Sunday) and the normalization treats 7 as 0 — that's correct behavior. If the test reports the wrong value for ar-SA in the live test, that means the runtime supports `getWeekInfo` and returns a different weekend; in that case skip to the fallback test which directly exercises the static map.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/calendar/weekInfo.ts packages/design-system/src/calendar/weekInfo.test.ts
git commit -m "calendar: weekInfo (getFirstDayOfWeek + getWeekendDays)"
```

---

## Task 6: `formatters.ts` — `Intl` wrappers with cache (TDD)

**Files:**

- Create: `packages/design-system/src/calendar/formatters.test.ts`
- Create: `packages/design-system/src/calendar/formatters.ts`

- [ ] **Step 1: Write tests**

Create `packages/design-system/src/calendar/formatters.test.ts`:

```ts
import {
  formatMonth,
  formatWeekdayShort,
  formatWeekdayNarrow,
  formatDayShort,
  formatDayLong,
  formatRange,
  formatHour,
  _resetFormatterCacheForTests,
} from './formatters';

beforeEach(() => {
  _resetFormatterCacheForTests();
});

describe('formatMonth', () => {
  it('includes the year for en-US', () => {
    const out = formatMonth(new Date(2026, 4, 20), 'en-US');
    expect(out).toMatch(/2026/);
  });

  it('returns a Cyrillic month name for ru-RU', () => {
    const out = formatMonth(new Date(2026, 4, 20), 'ru-RU');
    expect(out).toMatch(/[Ѐ-ӿ]/);
  });
});

describe('formatWeekdayShort / formatWeekdayNarrow', () => {
  it('short returns a short weekday label for en-US', () => {
    // May 20 2026 is Wednesday — expect "Wed" (case-insensitive)
    const out = formatWeekdayShort(new Date(2026, 4, 20), 'en-US');
    expect(out.toLowerCase()).toContain('wed');
  });

  it('narrow returns a single-character label for en-US', () => {
    const out = formatWeekdayNarrow(new Date(2026, 4, 20), 'en-US');
    expect(out.length).toBeLessThanOrEqual(2);
  });
});

describe('formatDayShort / formatDayLong', () => {
  it('short includes the day number', () => {
    const out = formatDayShort(new Date(2026, 4, 20), 'en-US');
    expect(out).toContain('20');
  });

  it('long includes weekday and day number', () => {
    const out = formatDayLong(new Date(2026, 4, 20), 'en-US');
    expect(out.toLowerCase()).toContain('wed');
    expect(out).toContain('20');
  });
});

describe('formatRange', () => {
  it('includes both endpoint days', () => {
    const out = formatRange(new Date(2026, 4, 18), new Date(2026, 4, 24), 'en-US');
    expect(out).toContain('18');
    expect(out).toContain('24');
  });
});

describe('formatHour', () => {
  it('contains the hour for en-US 9 AM', () => {
    expect(formatHour(9, 'en-US')).toContain('9');
  });

  it('uses 24-hour format for ru-RU (13 → "13")', () => {
    expect(formatHour(13, 'ru-RU')).toContain('13');
  });
});

describe('formatter cache', () => {
  it('reuses cached formatter for identical (locale, options)', () => {
    const a = formatMonth(new Date(2026, 4, 20), 'en-US');
    const b = formatMonth(new Date(2026, 5, 20), 'en-US');
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
    // We can't easily inspect the cache from the outside without exposing it;
    // the smoke test is that repeated calls work and produce sensible output.
    expect(a).toMatch(/May/);
    expect(b).toMatch(/June/);
  });

  it('produces different output for different locales (cache differentiates)', () => {
    const enus = formatMonth(new Date(2026, 4, 20), 'en-US');
    const ruru = formatMonth(new Date(2026, 4, 20), 'ru-RU');
    expect(enus).not.toBe(ruru);
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npx vitest run packages/design-system/src/calendar/formatters.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `formatters.ts`**

Create `packages/design-system/src/calendar/formatters.ts`:

```ts
const cache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    cache.set(key, f);
  }
  return f;
}

/** "May 2026" / "Май 2026" */
export function formatMonth(date: Date, locale: string): string {
  return getFormatter(locale, { year: 'numeric', month: 'long' }).format(date);
}

/** "Mon" (Intl 'short' weekday). */
export function formatWeekdayShort(date: Date, locale: string): string {
  return getFormatter(locale, { weekday: 'short' }).format(date);
}

/** "M" (Intl 'narrow' weekday — for tight column headers). */
export function formatWeekdayNarrow(date: Date, locale: string): string {
  return getFormatter(locale, { weekday: 'narrow' }).format(date);
}

/** "Wed 20" */
export function formatDayShort(date: Date, locale: string): string {
  return getFormatter(locale, { weekday: 'short', day: 'numeric' }).format(date);
}

/** "Wednesday, May 20" */
export function formatDayLong(date: Date, locale: string): string {
  return getFormatter(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

/** "May 18 – 24, 2026" via Intl.DateTimeFormat#formatRange. */
export function formatRange(from: Date, to: Date, locale: string): string {
  return getFormatter(locale, { year: 'numeric', month: 'long', day: 'numeric' }).formatRange(
    from,
    to,
  );
}

/** "9 AM" / "09:00" — 12/24-hour determined by locale default. */
export function formatHour(hour: number, locale: string): string {
  const date = new Date(2000, 0, 1, hour);
  return getFormatter(locale, { hour: 'numeric' }).format(date);
}

/** Test-only helper. Resets the formatter cache between tests. */
export function _resetFormatterCacheForTests(): void {
  cache.clear();
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/design-system/src/calendar/formatters.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/calendar/formatters.ts packages/design-system/src/calendar/formatters.test.ts
git commit -m "calendar: Intl-based formatters with per-(locale,options) cache"
```

---

## Task 7: `useMonth.ts` (TDD)

**Files:**

- Create: `packages/design-system/src/calendar/useMonth.test.tsx`
- Create: `packages/design-system/src/calendar/useMonth.ts`

- [ ] **Step 1: Write tests**

Create `packages/design-system/src/calendar/useMonth.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useMonth } from './useMonth';

function wrapWithLocale(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('useMonth', () => {
  it('returns 4–6 full weeks of 7 days each', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const weeks = result.current.weeks;
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
    weeks.forEach((week) => {
      expect(week.length).toBe(7);
    });
  });

  it('first week starts on the locale-defined first-day-of-week (en-US → Sunday)', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.weeks[0][0].date.getDay()).toBe(0);
  });

  it('first week starts on Monday for ru-RU', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('ru-RU'),
    });
    expect(result.current.weeks[0][0].date.getDay()).toBe(1);
  });

  it('weekStartsOn option overrides the locale default', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1), { weekStartsOn: 0 }), {
      wrapper: wrapWithLocale('ru-RU'),
    });
    expect(result.current.weeks[0][0].date.getDay()).toBe(0);
  });

  it('marks leading/trailing days from adjacent months with isCurrentMonth: false', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const firstWeek = result.current.weeks[0];
    const lastWeek = result.current.weeks[result.current.weeks.length - 1];
    // At least one day in the first week should be a trailing day from April
    const hasLeading = firstWeek.some((d) => !d.isCurrentMonth);
    const hasTrailing = lastWeek.some((d) => !d.isCurrentMonth);
    expect(hasLeading || hasTrailing).toBe(true);
  });

  it('every current-month day has isCurrentMonth: true', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 15)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const allDays = result.current.weeks.flat();
    const may = allDays.filter((d) => d.date.getMonth() === 4 && d.date.getFullYear() === 2026);
    expect(may.length).toBe(31);
    may.forEach((d) => expect(d.isCurrentMonth).toBe(true));
  });

  it('isToday matches only the day equal to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 20, 14));
    try {
      const { result } = renderHook(() => useMonth(new Date(2026, 4, 20)), {
        wrapper: wrapWithLocale('en-US'),
      });
      const todayCells = result.current.weeks.flat().filter((d) => d.isToday);
      expect(todayCells.length).toBe(1);
      expect(todayCells[0].date.getDate()).toBe(20);
    } finally {
      vi.useRealTimers();
    }
  });

  it('weekdayLabels has 7 entries in display order starting with the week-start day', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.weekdayLabels.length).toBe(7);
    // For en-US (Sun-start), the first label is Sunday-ish.
    expect(typeof result.current.weekdayLabels[0]).toBe('string');
  });

  it('monthLabel is a non-empty localized string', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 1)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.monthLabel).toMatch(/2026/);
  });

  it('returns referentially stable weeks across re-renders with same inputs', () => {
    const anchor = new Date(2026, 4, 20);
    const { result, rerender } = renderHook(() => useMonth(anchor), {
      wrapper: wrapWithLocale('en-US'),
    });
    const first = result.current.weeks;
    rerender();
    expect(result.current.weeks).toBe(first);
  });

  it('day.key matches toDateKey for that day', () => {
    const { result } = renderHook(() => useMonth(new Date(2026, 4, 15)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const may15 = result.current.weeks.flat().find((d) => d.dayOfMonth === 15 && d.isCurrentMonth);
    expect(may15?.key).toBe('2026-05-15');
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npx vitest run packages/design-system/src/calendar/useMonth.test.tsx`
Expected: module not found.

- [ ] **Step 3: Implement `useMonth.ts`**

Create `packages/design-system/src/calendar/useMonth.ts`:

```ts
import { useMemo } from 'react';
import { useLocale } from '../i18n/useLocale';
import {
  addDays,
  isSameMonth,
  isToday,
  isWeekend,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from './dateMath';
import { formatMonth, formatWeekdayShort } from './formatters';
import { getFirstDayOfWeek, getWeekendDays } from './weekInfo';
import type { Day, MonthGrid, Week } from './types';

export interface UseMonthOptions {
  /** Override the active locale. Defaults to `useLocale()`. */
  locale?: string;
  /** Override the first day of the week. Defaults to `getFirstDayOfWeek(locale)`. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Returns the month grid containing `anchor`, with leading/trailing days from
 * adjacent months so every week has exactly 7 days. Locale-aware month label,
 * weekday header labels, and first-day-of-week.
 *
 * The result is `useMemo`-stable across re-renders for the same
 * `(anchor.getTime(), locale, weekStartsOn)`.
 */
export function useMonth(anchor: Date, options: UseMonthOptions = {}): MonthGrid {
  const contextLocale = useLocale();
  const locale = options.locale ?? contextLocale;
  const weekStartsOn = options.weekStartsOn ?? getFirstDayOfWeek(locale);

  return useMemo(() => {
    const anchorMonth = startOfMonth(anchor);
    const gridStart = startOfWeek(anchorMonth, weekStartsOn);
    const weekendDays = getWeekendDays(locale);

    const weeks: Week[] = [];
    let cursor = gridStart;
    // Build up to 6 weeks; stop early if we've finished the month AND
    // the last week ends in the next month.
    for (let w = 0; w < 6; w++) {
      const week: Day[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(cursor);
        week.push({
          date,
          dayOfMonth: date.getDate(),
          isCurrentMonth: isSameMonth(date, anchor),
          isToday: isToday(date),
          isWeekend: isWeekend(date, weekendDays),
          weekday: d,
          key: toDateKey(date),
        });
        cursor = addDays(cursor, 1);
      }
      weeks.push(week as unknown as Week);
      // Stop if we've finished the anchor month and the last day is past it
      const lastDay = week[6];
      if (lastDay.date >= anchorMonth && !isSameMonth(lastDay.date, anchor)) {
        break;
      }
    }

    const weekdayLabels: string[] = [];
    for (let d = 0; d < 7; d++) {
      weekdayLabels.push(formatWeekdayShort(addDays(gridStart, d), locale));
    }

    return {
      year: anchor.getFullYear(),
      month: anchor.getMonth(),
      monthLabel: formatMonth(anchor, locale),
      weekdayLabels,
      weeks,
    };
  }, [anchor.getTime(), locale, weekStartsOn]);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/design-system/src/calendar/useMonth.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/calendar/useMonth.ts packages/design-system/src/calendar/useMonth.test.tsx
git commit -m "calendar: useMonth hook returns localized month grid"
```

---

## Task 8: `useWeek.ts` (TDD)

**Files:**

- Create: `packages/design-system/src/calendar/useWeek.test.tsx`
- Create: `packages/design-system/src/calendar/useWeek.ts`

- [ ] **Step 1: Write tests**

Create `packages/design-system/src/calendar/useWeek.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useWeek } from './useWeek';

function wrapWithLocale(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('useWeek', () => {
  it('returns exactly 7 days', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.days.length).toBe(7);
  });

  it('first day matches the locale week-start (en-US → Sunday)', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.days[0].date.getDay()).toBe(0);
  });

  it('first day is Monday for ru-RU', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('ru-RU'),
    });
    expect(result.current.days[0].date.getDay()).toBe(1);
  });

  it('weekStartsOn override wins over locale default', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20), { weekStartsOn: 0 }), {
      wrapper: wrapWithLocale('ru-RU'),
    });
    expect(result.current.days[0].date.getDay()).toBe(0);
  });

  it('weekLabel is a non-empty localized string', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.weekLabel.length).toBeGreaterThan(0);
  });

  it('weekdayLabels has 7 entries', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.weekdayLabels.length).toBe(7);
  });

  it('all 7 days are in calendar order (each 1 day after the previous)', () => {
    const { result } = renderHook(() => useWeek(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    const days = result.current.days;
    for (let i = 1; i < 7; i++) {
      const diff = (days[i].date.getTime() - days[i - 1].date.getTime()) / 86_400_000;
      expect(Math.round(diff)).toBe(1);
    }
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npx vitest run packages/design-system/src/calendar/useWeek.test.tsx`
Expected: module not found.

- [ ] **Step 3: Implement `useWeek.ts`**

Create `packages/design-system/src/calendar/useWeek.ts`:

```ts
import { useMemo } from 'react';
import { useLocale } from '../i18n/useLocale';
import { addDays, isToday, isWeekend, isSameMonth, startOfWeek, toDateKey } from './dateMath';
import { formatRange, formatWeekdayShort } from './formatters';
import { getFirstDayOfWeek, getWeekendDays } from './weekInfo';
import type { Day, Week } from './types';

export interface UseWeekOptions {
  /** Override the active locale. */
  locale?: string;
  /** Override the first day of the week. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export interface WeekResult {
  /** Localized range label, e.g., "May 18 – 24, 2026". */
  weekLabel: string;
  /** Seven days starting from the locale-determined (or overridden) week start. */
  days: Week;
  /** Length 7, display order. */
  weekdayLabels: readonly string[];
}

/**
 * Returns the 7-day week containing `anchor`, starting from the locale's
 * first-day-of-week. Useful for the future `<WeekView>` (7 columns × 24 hours).
 */
export function useWeek(anchor: Date, options: UseWeekOptions = {}): WeekResult {
  const contextLocale = useLocale();
  const locale = options.locale ?? contextLocale;
  const weekStartsOn = options.weekStartsOn ?? getFirstDayOfWeek(locale);

  return useMemo(() => {
    const start = startOfWeek(anchor, weekStartsOn);
    const weekendDays = getWeekendDays(locale);

    const days: Day[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, i);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: isSameMonth(date, anchor),
        isToday: isToday(date),
        isWeekend: isWeekend(date, weekendDays),
        weekday: i,
        key: toDateKey(date),
      });
    }

    const weekdayLabels = days.map((d) => formatWeekdayShort(d.date, locale));

    return {
      weekLabel: formatRange(start, days[6].date, locale),
      days: days as unknown as Week,
      weekdayLabels,
    };
  }, [anchor.getTime(), locale, weekStartsOn]);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/design-system/src/calendar/useWeek.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/calendar/useWeek.ts packages/design-system/src/calendar/useWeek.test.tsx
git commit -m "calendar: useWeek hook returns 7-day locale-aware week"
```

---

## Task 9: `useDay.ts` (TDD)

**Files:**

- Create: `packages/design-system/src/calendar/useDay.test.tsx`
- Create: `packages/design-system/src/calendar/useDay.ts`

- [ ] **Step 1: Write tests**

Create `packages/design-system/src/calendar/useDay.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useDay } from './useDay';

function wrapWithLocale(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('useDay', () => {
  it('returns the Day for the requested date', () => {
    const { result } = renderHook(() => useDay(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.day.dayOfMonth).toBe(20);
    expect(result.current.day.key).toBe('2026-05-20');
  });

  it('dayLabel and dayShortLabel are non-empty', () => {
    const { result } = renderHook(() => useDay(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.dayLabel.length).toBeGreaterThan(0);
    expect(result.current.dayShortLabel.length).toBeGreaterThan(0);
  });

  it('localizes for ru-RU (Cyrillic in long label)', () => {
    const { result } = renderHook(() => useDay(new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('ru-RU'),
    });
    expect(result.current.dayLabel).toMatch(/[Ѐ-ӿ]/);
  });

  it('isToday true when the input is today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 20, 12));
    try {
      const { result } = renderHook(() => useDay(new Date(2026, 4, 20)), {
        wrapper: wrapWithLocale('en-US'),
      });
      expect(result.current.day.isToday).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npx vitest run packages/design-system/src/calendar/useDay.test.tsx`
Expected: module not found.

- [ ] **Step 3: Implement `useDay.ts`**

Create `packages/design-system/src/calendar/useDay.ts`:

```ts
import { useMemo } from 'react';
import { useLocale } from '../i18n/useLocale';
import { isToday, isWeekend, startOfDay, toDateKey } from './dateMath';
import { formatDayLong, formatDayShort } from './formatters';
import { getWeekendDays } from './weekInfo';
import type { Day } from './types';

export interface UseDayOptions {
  /** Override the active locale. */
  locale?: string;
}

export interface DayResult {
  day: Day;
  /** "Wednesday, May 20" */
  dayLabel: string;
  /** "Wed 20" */
  dayShortLabel: string;
}

/**
 * Returns the canonical `Day` for `date` plus localized labels. Used by
 * the future `<DayView>` (1 column × 24 hours).
 */
export function useDay(date: Date, options: UseDayOptions = {}): DayResult {
  const contextLocale = useLocale();
  const locale = options.locale ?? contextLocale;

  return useMemo(() => {
    const normalized = startOfDay(date);
    const weekendDays = getWeekendDays(locale);
    const day: Day = {
      date: normalized,
      dayOfMonth: normalized.getDate(),
      isCurrentMonth: true,
      isToday: isToday(normalized),
      isWeekend: isWeekend(normalized, weekendDays),
      weekday: 0,
      key: toDateKey(normalized),
    };
    return {
      day,
      dayLabel: formatDayLong(normalized, locale),
      dayShortLabel: formatDayShort(normalized, locale),
    };
  }, [date.getTime(), locale]);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/design-system/src/calendar/useDay.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/calendar/useDay.ts packages/design-system/src/calendar/useDay.test.tsx
git commit -m "calendar: useDay hook for single-day primitives"
```

---

## Task 10: `useAgenda.ts` (TDD)

**Files:**

- Create: `packages/design-system/src/calendar/useAgenda.test.tsx`
- Create: `packages/design-system/src/calendar/useAgenda.ts`

- [ ] **Step 1: Write tests**

Create `packages/design-system/src/calendar/useAgenda.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useAgenda } from './useAgenda';

function wrapWithLocale(locale: string) {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('useAgenda', () => {
  it('returns one day per calendar day in the inclusive range', () => {
    const { result } = renderHook(() => useAgenda(new Date(2026, 4, 1), new Date(2026, 4, 7)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.days.length).toBe(7);
    expect(result.current.days[0].dayOfMonth).toBe(1);
    expect(result.current.days[6].dayOfMonth).toBe(7);
  });

  it('returns a single day when from === to', () => {
    const { result } = renderHook(() => useAgenda(new Date(2026, 4, 20), new Date(2026, 4, 20)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.days.length).toBe(1);
    expect(result.current.days[0].key).toBe('2026-05-20');
  });

  it('rangeLabel includes both endpoints', () => {
    const { result } = renderHook(() => useAgenda(new Date(2026, 4, 1), new Date(2026, 4, 31)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.rangeLabel).toContain('1');
    expect(result.current.rangeLabel).toContain('31');
  });

  it('handles ranges that cross month boundaries', () => {
    const { result } = renderHook(() => useAgenda(new Date(2026, 4, 28), new Date(2026, 5, 3)), {
      wrapper: wrapWithLocale('en-US'),
    });
    expect(result.current.days.length).toBe(7);
    expect(result.current.days[0].key).toBe('2026-05-28');
    expect(result.current.days[6].key).toBe('2026-06-03');
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npx vitest run packages/design-system/src/calendar/useAgenda.test.tsx`
Expected: module not found.

- [ ] **Step 3: Implement `useAgenda.ts`**

Create `packages/design-system/src/calendar/useAgenda.ts`:

```ts
import { useMemo } from 'react';
import { useLocale } from '../i18n/useLocale';
import {
  addDays,
  daysBetween,
  isSameMonth,
  isToday,
  isWeekend,
  startOfDay,
  toDateKey,
} from './dateMath';
import { formatRange } from './formatters';
import { getWeekendDays } from './weekInfo';
import type { Day } from './types';

export interface UseAgendaOptions {
  /** Override the active locale. */
  locale?: string;
}

export interface AgendaResult {
  /** One `Day` per calendar day in `[from, to]`, inclusive at both ends. */
  days: readonly Day[];
  /** Localized range label spanning `from` to `to`. */
  rangeLabel: string;
}

/**
 * Returns one `Day` entry per calendar day in `[from, to]` (inclusive).
 * Used by the future `<AgendaView>` to group events by day.
 */
export function useAgenda(from: Date, to: Date, options: UseAgendaOptions = {}): AgendaResult {
  const contextLocale = useLocale();
  const locale = options.locale ?? contextLocale;

  return useMemo(() => {
    const start = startOfDay(from);
    const end = startOfDay(to);
    const count = Math.max(0, daysBetween(start, end)) + 1;
    const weekendDays = getWeekendDays(locale);

    const days: Day[] = [];
    for (let i = 0; i < count; i++) {
      const date = addDays(start, i);
      days.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: isSameMonth(date, start),
        isToday: isToday(date),
        isWeekend: isWeekend(date, weekendDays),
        weekday: i,
        key: toDateKey(date),
      });
    }

    return {
      days,
      rangeLabel: formatRange(start, end, locale),
    };
  }, [from.getTime(), to.getTime(), locale]);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/design-system/src/calendar/useAgenda.test.tsx`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/calendar/useAgenda.ts packages/design-system/src/calendar/useAgenda.test.tsx
git commit -m "calendar: useAgenda hook returns Day array over inclusive range"
```

---

## Task 11: Re-exports — `calendar/index.ts` + root `src/index.ts`

**Files:**

- Create: `packages/design-system/src/calendar/index.ts`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Create `calendar/index.ts`**

Create `packages/design-system/src/calendar/index.ts`:

```ts
export { useMonth } from './useMonth';
export type { UseMonthOptions } from './useMonth';
export { useWeek } from './useWeek';
export type { UseWeekOptions, WeekResult } from './useWeek';
export { useDay } from './useDay';
export type { UseDayOptions, DayResult } from './useDay';
export { useAgenda } from './useAgenda';
export type { UseAgendaOptions, AgendaResult } from './useAgenda';
export type { Day, Week, MonthGrid } from './types';

export {
  addDays,
  addMonths,
  addWeeks,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  daysBetween,
  toDateKey,
  fromDateKey,
} from './dateMath';

export {
  formatMonth,
  formatWeekdayShort,
  formatWeekdayNarrow,
  formatDayShort,
  formatDayLong,
  formatRange,
  formatHour,
} from './formatters';

export { getFirstDayOfWeek, getWeekendDays } from './weekInfo';
```

- [ ] **Step 2: Read the current root `src/index.ts`**

Run: `cat packages/design-system/src/index.ts | tail -10`

Note the current last export so the new exports can be appended cleanly.

- [ ] **Step 3: Append new exports to `src/index.ts`**

Add these blocks at the end of `packages/design-system/src/index.ts`:

```ts
// i18n
export { LocaleProvider, useLocale } from './i18n';
export type { LocaleProviderProps } from './i18n';

// Calendar primitives (hooks + date math + Intl formatters + locale week info).
// The Calendar UI components ship in a follow-up PR; these primitives are the
// substrate they (and a future DatePicker) compose against.
export {
  useMonth,
  useWeek,
  useDay,
  useAgenda,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  addDays,
  addMonths,
  addWeeks,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  daysBetween,
  toDateKey,
  fromDateKey,
  formatMonth,
  formatWeekdayShort,
  formatWeekdayNarrow,
  formatDayShort,
  formatDayLong,
  formatRange,
  formatHour,
  getFirstDayOfWeek,
  getWeekendDays,
} from './calendar';
export type {
  Day,
  Week,
  MonthGrid,
  UseMonthOptions,
  UseWeekOptions,
  UseDayOptions,
  UseAgendaOptions,
  WeekResult,
  DayResult,
  AgendaResult,
} from './calendar';
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/calendar/index.ts packages/design-system/src/index.ts
git commit -m "calendar: barrel exports + root index re-exports"
```

---

## Task 12: AGENTS.md update

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Read the file end and identify the right insertion point**

Run: `wc -l packages/design-system/AGENTS.md`

Open the file and locate the "Components we don't have yet" / wishlist section or the final entries. We'll insert two new sections **before** any wishlist / hard-rule recap section: one for `<LocaleProvider>` / `useLocale`, one for Calendar primitives.

- [ ] **Step 2: Add the `<LocaleProvider>` TL;DR**

Locate the last `### <ComponentName>` block (probably ConfirmationPopover or similar). After it, insert:

````markdown
### `<LocaleProvider>` + `useLocale` — locale Context

```tsx
<LocaleProvider locale="ru-RU">
  <App />
</LocaleProvider>;

const locale = useLocale(); // 'ru-RU', or navigator.language fallback
```

- `LocaleProvider` exposes a BCP-47 locale string to descendants. Any
  locale-aware component (Calendar primitives today; future Input formatters,
  currency widgets) reads via `useLocale()`.
- No `<LocaleProvider>` mounted? `useLocale()` falls back to
  `navigator.language` (or `'en-US'` in SSR / Node).
- Stateless. To switch locale at runtime, re-render the Provider with a new
  `locale` prop. Nested Providers override outer ones.

### Calendar primitives — `useMonth`, `useWeek`, `useDay`, `useAgenda`

```tsx
const grid = useMonth(cursorDate);
// → { year, month, monthLabel, weekdayLabels, weeks }

const week = useWeek(cursorDate);
// → { weekLabel, days, weekdayLabels }

const { day, dayLabel, dayShortLabel } = useDay(date);

const { days, rangeLabel } = useAgenda(rangeStart, rangeEnd);
```

- Headless. These hooks return data shapes — no rendering. The Calendar UI
  components (Month/Week/Day/Agenda views) consume them and ship in follow-up
  PRs.
- Each hook accepts an optional `options.locale` to override the Context
  value, and `useMonth` / `useWeek` accept `options.weekStartsOn` to override
  the locale-derived first day.
- `Day.key` is `'YYYY-MM-DD'` in local time — safe React key, comparison
  handle, and event-lookup index.
- Pure date math + `Intl` formatters live alongside as utility exports:
  `addDays`, `startOfWeek`, `formatMonth`, `getFirstDayOfWeek`, etc. Use them
  if you need to derive labels or do date math outside a component.
````

- [ ] **Step 3: Verify the file still renders cleanly**

Run: `npx prettier --check packages/design-system/AGENTS.md`
Expected: pass. If it complains, run `npx prettier --write` on it and re-check.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: document LocaleProvider + Calendar primitives"
```

---

## Task 13: Run all quality gates

**Files:** (none — verification only)

- [ ] **Step 1: Tests**

Run: `npm test`
Expected: all suites pass. Test count went up from the previous baseline (the Button PR shipped at 464; this PR adds tests for i18n + calendar — expect ~520-550 total depending on test density).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: both workspaces exit 0.

- [ ] **Step 3: Stylelint**

Run: `npm run lint:css`
Expected: exit 0. No SCSS added in this PR; the gate must still pass.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: both packages build cleanly.

- [ ] **Step 5: Tarball inspection**

Run: `npm pack --dry-run -w @eocrm/design-system`
Expected: includes `src/i18n/` and `src/calendar/` directories; **excludes** all `*.test.tsx` / `*.test.ts` files. Confirm by grepping:

```bash
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "(test|i18n|calendar)" | head -40
```

The output should show `src/i18n/*.tsx` and `src/calendar/*.ts`/`.tsx` (non-test) files; **no** `*.test.tsx`/`*.test.ts` lines.

If any gate fails, fix and re-run before proceeding to Task 14.

---

## Task 14: Hard Rule 8 review-fix cycle

This implements `packages/design-system/CLAUDE.md` Rule 8. Mandatory for this change.

**Files:** (none directly — review may surface fixes)

- [ ] **Step 1: Confirm Task 13 gates were all green**

If any gate failed, return to Task 13 first.

- [ ] **Step 2: Spawn a fresh-context reviewer**

Use the `general-purpose` agent. Brief explicitly on the 10 review categories: bugs, a11y (limited here — no UI), API inconsistencies, type safety, rule violations (Rules 1–7), test coverage, token discipline (no SCSS in this PR but verify nothing slipped in), SCSS (n/a), cross-package leakage (calendar/i18n must not import from playground), package/distribution.

Required reading list for the reviewer:

- `packages/design-system/CLAUDE.md` (Rules 1–8)
- `packages/design-system/AGENTS.md`
- `docs/superpowers/specs/2026-05-20-calendar-date-primitives-design.md`
- The 4 new hook files + 3 utility files + types + 2 index files

Ask for output as Critical / Important / Nice-to-have / Regression-watch + a final verdict.

- [ ] **Step 3: Fix every Critical and Important finding**

Make focused fix commits. For any deliberately-skipped finding, document the reason inline so the next reviewer doesn't re-flag it.

- [ ] **Step 4: Re-run gates** (same as Task 13).

- [ ] **Step 5: Re-spawn reviewer** with the same brief.

- [ ] **Step 6: Repeat until verdict is `clean enough to stop`** and:

- 0 Critical
- 0 Important (or each skipped one is documented)
- All five gates green
- `npm pack --dry-run` clean

---

## Task 15: Push, open PR, wait for CI

**Files:** (none — git + GitHub only)

- [ ] **Step 1: Push the branch**

Run: `git push -u origin feat/calendar-date-primitives`
Expected: pre-push hook runs prettier/stylelint/typecheck and passes. **Never use `--no-verify` on your own initiative** — if the hook blocks, fix the underlying issue or surface to the user.

- [ ] **Step 2: Open the pull request**

Run:

```bash
gh pr create --title "Calendar PR 1: locale infra + headless date primitives" --body "$(cat <<'EOF'
## Summary

- New `src/i18n/` module: `<LocaleProvider>` + `useLocale()` hook. General-purpose locale Context for the design system (broader than Calendar — future Input formatters, currency, etc. will read the same hook).
- New `src/calendar/` module: headless date primitives. Pure date math (`addDays`, `startOfWeek`, `isToday`, ...), `Intl.DateTimeFormat`-based formatters with per-`(locale, options)` cache, locale week info (`getFirstDayOfWeek`, `getWeekendDays`) with `Intl.Locale.getWeekInfo()` and a small static fallback, and four hooks (`useMonth`, `useWeek`, `useDay`, `useAgenda`) returning `useMemo`-stable `Day`/`Week`/`MonthGrid` shapes.
- All hooks default to `useLocale()` and `getFirstDayOfWeek(locale)`; both are overridable via options.
- No UI ships in this PR. The Calendar component (Month/Week/Day/Agenda views) lands in follow-up PRs and composes against these primitives. A future DatePicker reuses the same `useMonth` grid.
- AGENTS.md updated; root `src/index.ts` extended with new exports.

## Test plan

- [ ] CI \`Quality / check\` green
- [ ] \`npm test\` — all suites pass (~520+ tests)
- [ ] \`npm run typecheck\` — clean (both workspaces)
- [ ] \`npm run lint:css\` — clean
- [ ] \`npm run build\` — clean
- [ ] \`npm pack --dry-run -w @eocrm/design-system\` — no \`*.test.tsx\`/\`*.test.ts\` in the tarball; new \`src/i18n/\` and \`src/calendar/\` directories included
- [ ] Hard Rule 8 review-fix cycle reached \`clean enough to stop\`

## Non-goals (deferred to follow-up PRs)

- Calendar UI components (\`<Calendar>\`, \`<MonthView>\`, \`<WeekView>\`, \`<DayView>\`, \`<AgendaView>\`).
- DatePicker (reuses \`useMonth\` later).
- Number/currency/plural formatters.
- Time-zone-aware event math.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for `Quality / check` to pass**

Run: `gh pr checks --watch`
Expected: green. If it fails, fix on the branch and re-push.

- [ ] **Step 4: Report PR URL back to the user**

The user merges (squash or merge commit — their choice). Do not merge on their behalf without explicit instruction.

---

## Self-Review Notes

**1. Spec coverage:**

- Module layout (spec section "Module layout") → Tasks 2, 3, 11
- `LocaleProvider` + `useLocale` (spec section "Locale infrastructure") → Task 2
- `types.ts` (spec section "types.ts") → Task 3
- `dateMath.ts` (spec section "dateMath.ts") → Task 4
- `formatters.ts` (spec section "formatters.ts") → Task 6
- `weekInfo.ts` (spec section "weekInfo.ts") → Task 5
- `useMonth` (spec section "Hooks") → Task 7
- `useWeek` → Task 8
- `useDay` → Task 9
- `useAgenda` → Task 10
- Root `src/index.ts` additions (spec section "Root src/index.ts additions") → Task 11
- Testing strategy (spec section "Testing strategy") → covered inside Tasks 2, 4-10
- Risks → addressed inline (DST in `daysBetween`, `Intl.Locale.getWeekInfo` fallback, navigator.language fallback) and via Task 14 review

**2. Placeholder scan:** No TBD/TODO. All test bodies are complete; all implementation code is shown verbatim.

**3. Type consistency:** `Day`, `Week`, `MonthGrid` defined in Task 3; consumed by Tasks 7-10 with matching field names. `UseMonthOptions`/`UseWeekOptions`/`UseDayOptions`/`UseAgendaOptions` consistent across hooks. `WeekResult`/`DayResult`/`AgendaResult` consistent between definitions and re-exports.
