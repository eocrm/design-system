# DatePicker design

**Status:** approved · 2026-05-21
**Scope:** `packages/design-system/src/components/DatePicker/` + playground demo + AGENTS.md entry
**PR target branch:** `feat/datepicker-input`

## Goal

Add a `<DatePicker>` to `@eocrm/design-system`: a single-date input that looks like the existing `<Input>` (border + focus ring), accepts typed input (locale-aware parsing), and opens a Floating-UI popover containing a month grid. Sized for typical CRM form usage — single date, no time, no range. Range / time / date-range pickers can land as follow-up PRs without re-shaping this one.

## Why now

The CRM has multiple in-progress forms that currently fake date entry with a plain `<Input type="text">` plus client-side parsing. Inconsistent across pages, no popover, no constraint enforcement, no a11y. The Calendar primitives (`useMonth`, `dateMath`, formatters) shipped in PRs 19-22 give us everything we need to compose this in one PR.

## Out of scope (deliberately)

- Range selection (start → end with hover preview).
- Datetime selection (date + hours + minutes in one popover).
- Year / decade pickers (clicking the month label to fast-navigate years).
- Week-number column.
- Drag-to-select multiple dates.
- Native `<input type="date">` UI — we hand-roll because that browser control is inconsistent across Chrome / Firefox / Safari and can't theme to match our tokens.

Each of these gets a separate spec if the CRM needs it later.

## Architecture

### Files

```
packages/design-system/src/components/DatePicker/
  DatePicker.tsx              — public component, forwardRef, owns popover state
  DatePicker.module.scss
  DatePicker.test.tsx
  DatePickerGrid.tsx          — internal month grid (popover content)
  DatePickerGrid.module.scss
  DatePickerGrid.test.tsx
  utils.ts                    — format / parse / range helpers
  utils.test.ts
  index.ts                    — `export { DatePicker } from './DatePicker'; export type { DatePickerProps } from './DatePicker';`
```

### Composition

- **Outer wrapper** (`<div>` with `position: relative` for the popover anchor): styled to mimic `<Input>` (border, focus-within ring, padding, error state). Holds:
  - the visible `<input type="text">` (typed input)
  - the clear ✕ button (when `clearable && value`)
  - the open-calendar 📅 button (the always-visible trigger)
  - the hidden `<input type="hidden">` form mirror (when `name` is set)
- **Popover**: positioned via `useFloating` from `@floating-ui/react-dom` (same pattern as `Select.Listbox`). Portaled into `document.body` so it escapes any `overflow: hidden` ancestors. Mounted only while `open` is true (no exit animation, matching Select / DropdownMenu).
- **Grid**: `<DatePickerGrid>` inside the popover. Composes `useMonth(cursor, { locale })` and renders a 6×7 button grid with prev / next month chevrons in a header row.

### Why not `<Popover>` (the compound)

`<Popover>` is built around a click-trigger that wraps one child. DatePicker has three triggers (input focus, input down-arrow, calendar button) and needs to keep focus inside the typed input while the popover is open. `useFloating` directly gives us positioning without taking over focus management.

## Public API

```tsx
export interface DatePickerProps {
  /** Selected date. `null` = no value. Pair with `onChange` for controlled use. */
  value?: Date | null;
  /** Initial selected date for uncontrolled use. */
  defaultValue?: Date | null;
  /** Fires when the value changes (typed-and-committed, grid click, or clear). */
  onChange?: (date: Date | null) => void;

  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;

  /** Earliest selectable date (inclusive). Typed input outside the range reverts. */
  min?: Date;
  /** Latest selectable date (inclusive). Typed input outside the range reverts. */
  max?: Date;
  /** Per-date disable callback. Disabled dates are non-clickable in the grid and rejected from typed input. */
  isDateDisabled?: (date: Date) => boolean;

  /** Show the ✕ clear button when a value is set. Defaults to `true`. */
  clearable?: boolean;

  /** Placeholder shown when no value is set. Defaults to the locale-formatted date pattern (e.g., "MM/DD/YYYY"). */
  placeholder?: string;

  /** Disables the typed input AND the calendar trigger. Defaults to `false`. */
  disabled?: boolean;
  /** Toggle red border + focus ring + `aria-invalid="true"`. */
  invalid?: boolean;

  /** Form name. When set, renders a hidden mirror `<input>` with the ISO date so native form submission works. */
  name?: string;

  /** Localized strings. Each key has an English default. */
  labels?: {
    previousMonth?: string; // default: "Previous month"
    nextMonth?: string; // default: "Next month"
    openCalendar?: string; // default: "Open calendar"
    clear?: string; // default: "Clear date"
  };

  /** Standard HTML attribute pass-throughs on the typed input. */
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
}

export const DatePicker: React.ForwardRefExoticComponent<
  DatePickerProps & React.RefAttributes<HTMLInputElement>
>;
```

The forwarded `ref` points at the typed `<input>`. Consumers usually want this for `inputRef.current?.focus()`.

## Behavior

### Opening the popover

- Click the typed input → opens popover; keyboard focus stays on the typed input (typing remains possible).
- Click the calendar trigger button → toggles popover; if opening, DOM focus moves to the selected cell (or today / first selectable cell).
- `ArrowDown` while focused in the typed input → opens popover and moves DOM focus to the selected cell (or today / first selectable cell).
- Focusing the typed input via Tab does NOT open the popover automatically — tabbing through a form shouldn't pop a calendar everywhere. Clicking the input (mouse / tap) does.
- Clicking the ✕ clear button does NOT open the popover.

### Closing the popover

- `Escape` while popover is open → close, restore focus to typed input, no value change.
- Click outside the picker → close. Field's normal blur-parse runs.
- Selecting a date in the grid → commit value, close, return focus to typed input.

### Typed input + commit

- The typed `<input>` is fully editable while open or closed.
- On `blur` of the entire picker (focus leaves both the input and the popover), parse the input:
  - Empty string → commit `null`.
  - Parseable + in `[min, max]` + not disabled → commit the parsed date.
  - Anything else → revert to the last committed value (the input snaps back to the formatted value).
- `Enter` in the typed input → run the same parse-and-commit cycle, then close the popover. Does NOT submit a parent `<form>` (we call `e.preventDefault()` to keep the parent form quiet; consumers add their own submit button).

### Date parsing (locale-aware)

`parseDate(raw, locale)` in `utils.ts`:

- Empty / whitespace → `null`.
- ISO `YYYY-MM-DD` regardless of locale (paste-friendly).
- Otherwise: split `raw` on any run of non-digits, expect exactly 3 chunks, assign them to year / month / day based on the locale's preferred order (derived once from `Intl.DateTimeFormat.formatToParts`).
- 2-digit year → pivot at 2000 + n.
- Invalid month, day, or impossible date (Feb 30) → `null` (do NOT silently roll over the way `new Date(2024, 1, 30)` does).
- Wrong number of chunks (`5/21` or `5/21/2026/extra`) → `null`.

Examples:

- `"5/21/2026"` in en-US → May 21, 2026
- `"21.5.2026"` in ru-RU → May 21, 2026
- `"2026-05-21"` in ja-JP → May 21, 2026
- `"5/21/26"` in en-US → May 21, 2026 (year pivot)
- `"2/30/2026"` in en-US → `null` (impossible)
- `"hello"` → `null`

### Clear

- ✕ button visible whenever `clearable && value != null && !disabled`.
- Click → `onChange(null)`, focus stays on input, popover does NOT open.

### Disabled state

- `disabled` → typed input is `disabled`, calendar trigger button is `disabled`, popover never opens, ✕ is not rendered, wrapper carries a `disabled` visual class.

### Invalid state

- `invalid` → wrapper carries `invalid` class (red border + red focus ring), typed input has `aria-invalid="true"`. Consumer is expected to render a visible error message and pass `aria-describedby` pointing at it.

## DatePickerGrid internals

### Structure

```html
<div role="dialog" aria-label="Choose date">
  <header>
    <button aria-label="Previous month">‹</button>
    <span aria-live="polite">May 2026</span>
    <button aria-label="Next month">›</button>
  </header>
  <div role="grid">
    <!-- weekday-label row, weekday cells -->
    <!-- 6×7 grid of <button role="gridcell"> cells -->
  </div>
</div>
```

### Keyboard navigation (within grid)

| Key                   | Action                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `←` / `→`             | Move focus 1 day, skipping disabled cells. Crosses month boundary.                              |
| `↑` / `↓`             | Move focus 1 week, skipping disabled cells. Crosses month boundary.                             |
| `Home` / `End`        | First / last day of current week.                                                               |
| `PageUp` / `PageDown` | Previous / next month (focused day-of-month preserved when possible).                           |
| `Enter` / `Space`     | Select focused cell, close popover.                                                             |
| `Escape`              | Close popover, restore focus to typed input.                                                    |
| `Tab`                 | Leave the grid; cycles through prev / next buttons → next focusable element outside the picker. |

### Cell visual states

- **Selected**: tone-accent fill + `aria-selected="true"`.
- **Today**: subtle accent border (same as MonthView's today cell, no fill).
- **Disabled** (out-of-range or `isDateDisabled(date)`): `aria-disabled="true"`, muted color, `cursor: default`, click is a no-op.
- **Outside current month** (leading / trailing days from neighbour months): muted color, still selectable when in-range.
- **Focused**: standard focus ring (`:focus-visible`).

### Header label

- The "May 2026" label uses `formatMonth(date, locale)`. It's `aria-live="polite"` so screen readers announce month changes triggered by the chevron buttons / PgUp / PgDn.

## Form integration

When `name` is set, the component renders a sibling:

```tsx
<input type="hidden" name={name} value={value ? toIsoDate(value) : ''} />
```

- Native `<form>` submission posts `name=YYYY-MM-DD` (or empty string when null).
- React Hook Form / Zod consumers ignore the mirror entirely and drive via `value` + `onChange`.
- `toIsoDate(date)` formats local-time (matches Calendar's `Day.key` convention).

## Hard rules compliance

- **Rule 1** — Three test files (`DatePicker.test.tsx`, `DatePickerGrid.test.tsx`, `utils.test.ts`) cover the surface above. See "Testing" below for the full list.
- **Rule 2** — `packages/playground/src/pages/components/DatePickerDemo.tsx` added; wired into `App.tsx` (route), `AppShell.tsx` (Forms group), `ComponentsIndex.tsx` (card with preview).
- **Rule 3** — All visual values via `var(--token)`. New tokens may include `--size-datepicker-cell` (cell square size) and `--size-datepicker-popover-width` if a fixed width is needed. Add to `tokens.scss` first.
- **Rule 3a** — `:focus-visible` on all buttons (chevrons, cells, clear, open-calendar).
- **Rule 4** — Wrapper is `position: relative` (an internal child anchor for the floating popover ref; the popover itself is portaled and floats free). No margins. Width comes from `width: 100%` of the wrapper; consumer controls outer width.
- **Rule 5** — Re-exported from `packages/design-system/src/index.ts`: `DatePicker` value + `DatePickerProps` type.
- **Rule 6** — `forwardRef` to the typed input. All HTML pass-throughs spread onto the input.
- **Rule 7** — JSDoc on `DatePicker`, `DatePickerProps`, every prop, and a `@remarks` "When NOT to use / anti-patterns" block.
- **Rule 8** — Pre-push review-fix cycle is mandatory before opening the PR.

## Testing

### `utils.test.ts`

- `formatDate` — en-US → `MM/DD/YYYY`; ru-RU → `DD.MM.YYYY`.
- `getLocaleDateOrder` — en-US / ru-RU / ja-JP each return expected order.
- `parseDate`:
  - Empty / whitespace → `null`.
  - ISO `YYYY-MM-DD` regardless of locale.
  - en-US `5/21/2026`, ru-RU `21.5.2026`, ja-JP `2026/5/21` — each parses to May 21, 2026.
  - 2-digit year pivot.
  - Invalid month / day → `null`.
  - Impossible date (Feb 30) → `null` (don't roll over).
  - Wrong chunk count → `null`.
  - Any non-digit separator works.
- `toIsoDate` — zero-pads month + day.
- `isDateOutOfRange` — min / max inclusive, `isDateDisabled` predicate, time-of-day ignored.

### `DatePickerGrid.test.tsx`

- Renders the cursor's month with 6 weeks and the correct header label.
- Selected date receives `aria-selected="true"`; today cell receives a `today` class.
- Prev / Next month buttons step the cursor and update the header.
- Disabled cells (out of `min`/`max`, or via `isDateDisabled`) have `aria-disabled="true"` and don't fire `onSelect` on click.
- Arrow-key navigation moves focus, skipping disabled cells.
- Home / End jump to start / end of week.
- PgUp / PgDn step a month.
- Enter / Space on a focused cell fires `onSelect`.
- Locale headers — ru-RU shows Cyrillic weekday + month labels.

### `DatePicker.test.tsx`

- Uncontrolled — `defaultValue` populates the input; clicking a grid cell updates the input.
- Controlled — `value` + `onChange` round-trip.
- Typed input parses on blur and commits the new value.
- Typed input that's invalid reverts to the last committed value.
- Typed input that's out of `min`/`max` reverts.
- `Enter` in the input commits and closes the popover.
- `Escape` closes the popover and restores focus to the input.
- ✕ clears the value and keeps focus on the input.
- 📅 toggles the popover.
- `ArrowDown` in the input opens the popover and moves focus to the selected (or today / first-selectable) cell.
- `disabled` disables the input and the trigger.
- `invalid` sets `aria-invalid="true"` on the input.
- `name` renders the hidden mirror with the ISO string.
- `ref` forwards to the typed input.
- Locale override (ru-RU) — input formats `DD.MM.YYYY`.
- Click outside closes the popover.

## Playground

`packages/playground/src/pages/components/DatePickerDemo.tsx`:

1. Uncontrolled (default no value).
2. Controlled with state shown next to the picker.
3. Min / max — e.g., `min = today`, `max = today + 90 days`.
4. `isDateDisabled` — weekends disabled, holiday list disabled.
5. Disabled.
6. Invalid + error message + `aria-describedby`.
7. With `name` — submitted inside a small `<form>` so the reader can see the posted body.
8. ru-RU locale.

## AGENTS.md

Add a `### DatePicker` section after the existing Calendar block. Cover: when to use, the API surface, locale parsing notes, form integration, link back to Calendar primitives.

## CLAUDE.md cleanup

`packages/design-system/CLAUDE.md` lists `DatePicker (hand-roll; calendar grid is the bulk of the work)` under "Components we don't have yet". Remove that line after merge.

## Risks / open questions

- **`Intl.DateTimeFormat.formatToParts` locale coverage.** Modern node/browsers all support it for the locales we care about (en-US, ru-RU, ja-JP, fr-FR, de-DE). If a consumer passes a malformed BCP-47 tag, the formatter falls back to the default locale and parsing degrades to "year, month, day" order — acceptable.
- **DST / timezone.** All dates are local-midnight `Date` objects, consistent with the Calendar primitives. No UTC conversion. Consumers that need UTC-stable comparisons should serialize via `toIsoDate`.
- **Mobile.** No virtual-keyboard hint (`inputMode="numeric"`) in v1 because typed dates may include letters in some locales (e.g., German short month abbreviations) — punted to a future PR.
- **Floating UI bundle weight.** Already a dependency for DropdownMenu / Popover / Select / Tooltip. No incremental cost.

## Acceptance criteria

- 9 files added under `components/DatePicker/` (2 component `.tsx`, 2 `.module.scss`, 3 test files, `utils.ts`, `index.ts`); 3 test files green; playground demo wired into the 4 places (route, sidebar, components index, mockups registry if applicable); AGENTS.md updated; CLAUDE.md "missing components" line removed.
- `make test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npx prettier --check`, `npm pack --dry-run -w @eocrm/design-system` all clean.
- Hard Rule 8 review-fix cycle runs to "clean enough to stop" before opening the PR.
