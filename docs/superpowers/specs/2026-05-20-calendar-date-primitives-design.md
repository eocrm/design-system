# Calendar — PR 1: Locale infra + date primitives

**Date:** 2026-05-20
**Status:** Spec — proceeding to plan
**Scope:** Headless infrastructure only. Calendar UI components (Month/Week/Day/Agenda views) ship in subsequent PRs.

## Goal

Land the headless substrate the future Calendar component (and later DatePicker) will compose against:

1. A general-purpose locale-string Context (`LocaleProvider` + `useLocale`) for the design system. This is broader than Calendar — future Input formatters, currency, and any other locale-aware component will read the same hook.
2. Date-math utilities, `Intl`-based formatters, and React hooks (`useMonth`, `useWeek`, `useDay`, `useAgenda`) that produce the data shapes the Calendar UI views will render.

No UI ships in PR 1. No demo. Hard rule 2 (every component has a demo) applies to components — these are hooks + pure utilities. JSDoc + AGENTS.md + unit tests carry the documentation load until PR 2.

## Non-goals

- The Calendar UI component itself (`<Calendar>`, `<MonthView>`, etc.) — separate PRs (2-4).
- Number / currency / plural formatters. Locale is exposed; consumers wire their own `Intl.NumberFormat` etc. as needed.
- Time-zone handling. All math is local-time anchored. If the CRM later needs explicit-TZ events, that's a new API layer, not a refactor of these primitives.
- Recurring-event expansion logic. Out of scope for the substrate.
- A separate Russian/English translation table for UI strings — `Intl` provides month/weekday names; UI strings are the consumer's concern.
- Drag-and-drop, event editing, view switching chrome.

## Module layout

Two new top-level directories under `packages/design-system/src/`:

```
src/
  i18n/                              # NEW — broad locale infrastructure
    LocaleProvider.tsx
    useLocale.ts
    index.ts
    LocaleProvider.test.tsx
  calendar/                          # NEW — date primitives (NOT under components/)
    types.ts
    dateMath.ts
    dateMath.test.ts
    formatters.ts
    formatters.test.ts
    weekInfo.ts
    weekInfo.test.ts
    useMonth.ts
    useMonth.test.tsx
    useWeek.ts
    useWeek.test.tsx
    useDay.ts
    useDay.test.tsx
    useAgenda.ts
    useAgenda.test.tsx
    index.ts
  components/                        # unchanged in PR 1
  styles/                            # unchanged in PR 1
  index.ts                           # extended with new exports
  structure.test.ts                  # unchanged (only scans components/, so new dirs are invisible)
```

`src/calendar/` lives as a sibling of `components/` rather than inside it because (a) `structure.test.ts` enforces the four-file component rule on every `components/<Name>/` directory and PR 1 has no rendering component to satisfy that, and (b) the primitives are headless — date math + hooks — not a component in the design-system's sense. When the Calendar UI component lands in PR 2 it goes in `src/components/Calendar/` and imports from `../../calendar/`.

## Locale infrastructure (`src/i18n/`)

### `LocaleProvider.tsx`

```tsx
import { createContext, type ReactNode } from 'react';

export const LocaleContext = createContext<string | null>(null);

export interface LocaleProviderProps {
  /** BCP-47 locale string, e.g. 'en-US', 'ru-RU', 'de-DE'. */
  locale: string;
  children: ReactNode;
}

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
```

### `useLocale.ts`

```ts
import { useContext } from 'react';
import { LocaleContext } from './LocaleProvider';

/**
 * Read the active locale. Falls back to `navigator.language` when no
 * `<LocaleProvider>` is mounted above. Returns 'en-US' if neither is
 * available (SSR / Node test environments without a stubbed navigator).
 */
export function useLocale(): string {
  const ctx = useContext(LocaleContext);
  if (ctx !== null) return ctx;
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}
```

### `index.ts`

```ts
export { LocaleProvider, LocaleContext } from './LocaleProvider';
export type { LocaleProviderProps } from './LocaleProvider';
export { useLocale } from './useLocale';
```

### Design notes

- **BCP-47 string only.** No object-shaped value, no derived properties bundled in. Each consumer constructs `new Intl.DateTimeFormat(locale, ...)` from the string when it needs to.
- **`navigator.language` fallback.** Consumers don't have to wrap in a Provider for `useLocale` to work; explicit `<LocaleProvider locale="ru-RU">` is an opt-in override.
- **No `setLocale`.** Provider is stateless; consumers re-render with a new `locale` prop to change.
- **Nested overrides** work by stacking Providers — standard React Context behavior, no custom merge logic.

## Calendar primitives (`src/calendar/`)

### `types.ts`

```ts
export interface Day {
  /** Local midnight of this calendar day. */
  date: Date;
  /** 1..31. */
  dayOfMonth: number;
  /** False for trailing days from the previous month or leading days from the next month in a `useMonth` grid. */
  isCurrentMonth: boolean;
  isToday: boolean;
  /** True when this day is in the locale's weekend (e.g., Sat/Sun for most; Fri/Sat for ar-SA, he-IL). */
  isWeekend: boolean;
  /** 0..6, where 0 is the locale's first-day-of-week. Useful for styling column position. */
  weekday: number;
  /** 'YYYY-MM-DD' in local time. Stable React key, comparison handle, event-lookup index. */
  key: string;
}

/** A full week, always seven days. */
export type Week = readonly [Day, Day, Day, Day, Day, Day, Day];

export interface MonthGrid {
  /** Calendar year of the anchor month (e.g., 2026). */
  year: number;
  /** 0..11, JS Date convention. */
  month: number;
  /** Localized month + year label, e.g., "May 2026" / "Май 2026". */
  monthLabel: string;
  /** Length 7, in display order (locale's first-day-of-week first). E.g., ["Mon", "Tue", ...]. */
  weekdayLabels: readonly string[];
  /** 4–6 full weeks. Leading/trailing days are filled from adjacent months so every week has exactly 7 days. */
  weeks: readonly Week[];
}
```

### `dateMath.ts`

Pure functions, no React, no `Intl` — date arithmetic only:

```ts
export function addDays(date: Date, n: number): Date;
export function addMonths(date: Date, n: number): Date;
export function addWeeks(date: Date, n: number): Date;
export function startOfDay(date: Date): Date;           // local midnight
export function startOfWeek(date: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6): Date;
export function startOfMonth(date: Date): Date;
export function endOfMonth(date: Date): Date;
export function isSameDay(a: Date, b: Date): boolean;
export function isSameMonth(a: Date, b: Date): boolean;
export function isToday(date: Date, now?: Date): boolean;  // `now` is for testability
export function isWeekend(date: Date, weekendDays: readonly number[]): boolean;
export function daysBetween(a: Date, b: Date): number;     // calendar-day diff, DST-safe
export function toDateKey(date: Date): string;             // 'YYYY-MM-DD' in local time
export function fromDateKey(key: string): Date;            // parses to local midnight
```

DST-safety: `daysBetween` uses `Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)` — the round absorbs the ±1 hour DST drift across the boundary.

### `formatters.ts`

Thin wrappers over `Intl.DateTimeFormat`, with a per-`(locale, options)` cache so we don't recreate formatters on every render. The month grid alone calls `formatWeekdayShort` 7× per month — caching keeps that cheap.

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

export function formatMonth(date: Date, locale: string): string;          // "May 2026"
export function formatWeekdayShort(date: Date, locale: string): string;   // "Mon" (Intl 'short' weekday)
export function formatWeekdayNarrow(date: Date, locale: string): string;  // "M" (for tight column headers)
export function formatDayShort(date: Date, locale: string): string;       // "Wed 20"
export function formatDayLong(date: Date, locale: string): string;        // "Wednesday, May 20"
export function formatRange(from: Date, to: Date, locale: string): string; // "May 18 – 24, 2026"
export function formatHour(hour: number, locale: string): string;          // "9 AM" / "09:00" (12/24-hr from locale)

/** Test helper — exported so tests can assert cache reuse. */
export function _resetFormatterCacheForTests(): void;
```

`formatRange` uses `Intl.DateTimeFormat.prototype.formatRange`. `formatHour` constructs a throwaway `Date(0, 0, 0, hour)` to leverage `Intl.DateTimeFormat` with `hour: 'numeric'`.

### `weekInfo.ts`

```ts
export function getFirstDayOfWeek(locale: string): 0 | 1 | 2 | 3 | 4 | 5 | 6;
export function getWeekendDays(locale: string): readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
```

Implementation: try `new Intl.Locale(locale).getWeekInfo()` (Chrome 99+, Safari 17+, Firefox 130+). On `TypeError` (method missing) or unknown locale, fall back to:

```ts
const FALLBACK_FIRST_DAY: Record<string, 0 | 1> = {
  'en-US': 0, 'en-CA': 0, 'ja-JP': 0,
  // default → 1 (Monday)
};

const FALLBACK_WEEKEND: Record<string, readonly number[]> = {
  'ar-SA': [5, 6], 'he-IL': [5, 6],
  // default → [0, 6] (Sat/Sun)
};
```

Match by exact locale tag first, then by primary language subtag (`en`, `ar`), then the global default.

### Hooks (`useMonth`, `useWeek`, `useDay`, `useAgenda`)

All hooks accept an `anchor` (or range) `Date`, an `options` object with `locale` (defaults to `useLocale()`) and `weekStartsOn` (defaults to `getFirstDayOfWeek(locale)`), and return `useMemo`-stable derived data.

```ts
// useMonth.ts
export interface UseMonthOptions {
  locale?: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function useMonth(anchor: Date, options?: UseMonthOptions): MonthGrid;
```

```ts
// useWeek.ts
export interface UseWeekOptions {
  locale?: string;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export interface WeekResult {
  weekLabel: string;
  days: Week;
  weekdayLabels: readonly string[];
}

export function useWeek(anchor: Date, options?: UseWeekOptions): WeekResult;
```

```ts
// useDay.ts
export interface UseDayOptions {
  locale?: string;
}

export interface DayResult {
  day: Day;
  dayLabel: string;       // "Wednesday, May 20"
  dayShortLabel: string;  // "Wed 20"
}

export function useDay(date: Date, options?: UseDayOptions): DayResult;
```

```ts
// useAgenda.ts
export interface UseAgendaOptions {
  locale?: string;
}

export interface AgendaResult {
  days: readonly Day[];
  rangeLabel: string;     // "May 1 – 31, 2026"
}

export function useAgenda(from: Date, to: Date, options?: UseAgendaOptions): AgendaResult;
```

Notes on hook semantics:

- The `anchor` parameter is the **navigation cursor**, not the selection. For `useMonth`, any date within the month works — the hook normalizes to "the month containing this date." Consumers keep `[cursorDate, setCursorDate]` state and pass it in. Selection (`<Day>` highlighted) is a UI concern handled by future components.
- `useMemo` keys include `anchor.getTime()`, `locale`, and `weekStartsOn`. Identity of the returned arrays is stable across re-renders as long as those inputs don't change.
- `weekStartsOn` always overrides the locale-derived default. Passing `weekStartsOn: 0` for a `ru-RU` locale yields a Sunday-first grid even though `getFirstDayOfWeek('ru-RU')` returns 1.

### `index.ts`

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
  addDays, addMonths, addWeeks,
  startOfDay, startOfWeek, startOfMonth, endOfMonth,
  isSameDay, isSameMonth, isToday, isWeekend,
  daysBetween, toDateKey, fromDateKey,
} from './dateMath';
export {
  formatMonth, formatWeekdayShort, formatWeekdayNarrow,
  formatDayShort, formatDayLong, formatRange, formatHour,
} from './formatters';
export { getFirstDayOfWeek, getWeekendDays } from './weekInfo';
```

## Root `src/index.ts` additions

```ts
// i18n
export { LocaleProvider, useLocale } from './i18n';
export type { LocaleProviderProps } from './i18n';

// Calendar primitives
export {
  useMonth, useWeek, useDay, useAgenda,
  isSameDay, isSameMonth, isToday, isWeekend,
  addDays, addMonths, addWeeks,
  startOfDay, startOfWeek, startOfMonth, endOfMonth,
  daysBetween, toDateKey, fromDateKey,
  formatMonth, formatWeekdayShort, formatWeekdayNarrow,
  formatDayShort, formatDayLong, formatRange, formatHour,
  getFirstDayOfWeek, getWeekendDays,
} from './calendar';
export type {
  Day, Week, MonthGrid,
  UseMonthOptions, UseWeekOptions, UseDayOptions, UseAgendaOptions,
  WeekResult, DayResult, AgendaResult,
} from './calendar';
```

## Testing strategy

### Pure math (`dateMath.test.ts`)

- `addDays(2026-05-31, 1)` → 2026-06-01
- `addMonths(2026-01-31, 1)` → 2026-02-28 (JS Date clamps; document this)
- `startOfWeek(2026-05-20 /* Wed */, 1)` → 2026-05-18 (Mon)
- `startOfWeek(2026-05-20, 0)` → 2026-05-17 (Sun)
- `startOfMonth` / `endOfMonth` round-trip
- `isSameDay`/`isSameMonth` true/false combinations across boundary
- `isToday(now, now)` → true; `isToday(yesterday, now)` → false (injected `now` for determinism)
- `daysBetween` returns calendar-day count, asserted for known DST boundary in `America/New_York` (test file may set `process.env.TZ` if Vitest doesn't already)
- `toDateKey` / `fromDateKey` round-trip — `fromDateKey(toDateKey(d))` is same day
- `toDateKey` zero-pads month/day

### Formatters (`formatters.test.ts`)

- `formatMonth(date, 'en-US')` includes the year and a recognizable month name (`/2026/` match)
- `formatMonth(date, 'ru-RU')` returns a string containing Cyrillic (don't pin to exact strings — `Intl` versions vary)
- `formatWeekdayShort('en-US')` returns a 3-letter weekday
- `formatRange(from, to, 'en-US')` includes both endpoint days
- `formatHour(9, 'en-US')` contains "9"; `formatHour(13, 'ru-RU')` contains "13" (24-hour by locale default)
- Cache reuse: call `formatMonth` twice with same args, then `_resetFormatterCacheForTests()`, then call again — cache hits between resets
- Different locales create different cache entries

### `weekInfo.test.ts`

- `getFirstDayOfWeek('en-US')` → 0
- `getFirstDayOfWeek('ru-RU')` → 1
- `getWeekendDays('en-US')` → `[0, 6]`
- `getWeekendDays('ar-SA')` → `[5, 6]` (when `Intl.Locale.getWeekInfo` is supported or via fallback)
- When `Intl.Locale.prototype.getWeekInfo` is stubbed to throw / undefined, the static fallback kicks in. Test this with `vi.spyOn(Intl.Locale.prototype, 'getWeekInfo').mockImplementation(() => { throw new TypeError(); })`.
- Unknown locale (`'xx-YY'`) → defaults to Monday-start, `[0, 6]` weekend

### Hook behavior (`useMonth.test.tsx`, etc.)

Use React Testing Library's `renderHook`. Wrap with `<LocaleProvider>` when testing context-driven behavior.

- `useMonth(anchor)` returns 4–6 weeks; every week has exactly 7 days
- First day of the first week matches the locale's first-day-of-week
- `isCurrentMonth` correctly false for trailing/leading days
- `isToday` true only on today (use `vi.useFakeTimers` + `vi.setSystemTime` to lock "now")
- Inside `<LocaleProvider locale="ru-RU">`, `weekdayLabels[0]` is a Russian-language Monday label
- Without a Provider, falls back to `navigator.language` (use `vi.stubGlobal('navigator', { language: 'en-US' })`)
- Explicit `options.locale` overrides the Context value
- Same anchor + same options → identical (referentially stable) `weeks` array across re-renders
- `useWeek(anchor)` returns exactly 7 days starting from week start
- `useDay` returns the correct day object + labels
- `useAgenda(from, to)` is inclusive on both ends; length = `daysBetween(from, to) + 1`

### `LocaleProvider.test.tsx`

- Renders children
- `useLocale()` returns the prop value when wrapped
- `useLocale()` returns `navigator.language` when no Provider
- Nested Providers: inner one wins
- Provider re-renders with new prop → consumers see new value

## Risks / open items

- **`Intl.Locale.prototype.getWeekInfo()` runtime support.** Stage 4 but not universal. Static fallback covers gaps. Tested via stub.
- **`AGENTS.md` size.** File already long; new `<LocaleProvider>` section is concise (~25 lines including a snippet and 4 bullets).
- **No demo in PR 1.** Hard rule 2 says "every component has a playground demo." Hooks aren't components; we document via JSDoc + AGENTS.md + tests. PR 2 ships the first demo when the Month view lands. This deviation is called out in the PR description.
- **`vi.stubGlobal('navigator', ...)` in `LocaleProvider.test.tsx`.** Need to confirm Vitest's stubbing semantics for `navigator`. If brittle, fall back to mocking `Object.defineProperty(navigator, 'language', { ... })` in `beforeEach` / `afterEach`.
- **`structure.test.ts` is unaffected** because primitives live outside `components/`. Verified by reading the test (it scans `components/` only).
- **DST corner cases in `daysBetween`.** Tested with one known DST boundary date pair, but the implementation is `Math.round(diff / 86_400_000)` which is robust by design.

## Verification (post-implementation)

This change touches `packages/design-system/**`, so Hard rule 8 (pre-push review-fix cycle) applies. Gates:

- `npm test`
- `npm run typecheck`
- `npm run lint:css` (no SCSS in this PR, but the gate must still pass — and we verify the `lint:css` invocation doesn't touch files outside its glob)
- `npm run build`
- `npm pack --dry-run -w @eocrm/design-system` — verify new `src/i18n/` and `src/calendar/` directories ship in the tarball; no `.test.tsx` / `.test.ts` files in the tarball

Then a fresh-context reviewer pass until verdict is `clean enough to stop`.
