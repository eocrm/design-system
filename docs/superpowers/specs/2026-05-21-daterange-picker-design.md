# DateRangePicker design

**Status:** approved · 2026-05-21
**Scope:** `packages/design-system/src/components/DateRangePicker/` + refactor `packages/design-system/src/components/DatePicker/DatePickerGrid.tsx` (add range mode) + playground demo + AGENTS.md entry
**PR target branch:** `feat/daterange-picker`

## Goal

Add `<DateRangePicker>` to `@eocrm/design-system` — a single-field date-range input that opens a Floating-UI popover showing **two months side-by-side**. The user picks `start` then `end` (with hover preview between clicks). Reuses the `DatePickerGrid` from PR #23 by extending it with a range mode, so both pickers share one month-rendering implementation.

## Why now

The CRM has several forms that want "from / to" date entry (filters on reports, billing-period selectors, vacation requests). Today they're either two separate `DatePicker`s — which doesn't enforce `end >= start` or show a hover preview — or two plain `<Input>`s with brittle client-side parsing. A first-class range picker closes that gap with the same parsing + a11y posture as `DatePicker`.

## Out of scope (deliberately)

- Preset ranges ("Today", "Last 7 days", "This month"). Easy follow-up via a new prop slot.
- Datetime ranges (time selection per end).
- 3+ month preview / vertical month stack.
- Touch drag-to-select.
- `restrictRangeContents` (forbid ranges that contain disabled cells in their middle).
- Range selection in `<DatePicker>` itself — that component stays single-date only.

Each gets a follow-up spec if the CRM demands it.

## Architecture

### Files

```
packages/design-system/src/components/DateRangePicker/
  DateRangePicker.tsx              — public component, forwardRef, owns popover + selection state
  DateRangePicker.module.scss
  DateRangePicker.test.tsx
  utils.ts                         — parseDateRange / formatDateRange / autoSwapRange / sortDates
  utils.test.ts
  index.ts                         — barrel
```

Plus modifications to existing files:

- `packages/design-system/src/components/DatePicker/DatePickerGrid.tsx` — add range-mode props + cell classes
- `packages/design-system/src/components/DatePicker/DatePickerGrid.module.scss` — `.rangeStart`, `.rangeEnd`, `.inRange`
- `packages/design-system/src/components/DatePicker/DatePickerGrid.test.tsx` — 3-4 new tests for range mode
- `packages/design-system/src/index.ts` — re-export `DateRangePicker` + types
- `packages/design-system/AGENTS.md` — new `<DateRangePicker>` section after `<DatePicker>`
- `packages/playground/src/pages/components/DateRangePickerDemo.tsx` (new)
- `packages/playground/src/App.tsx`, `AppShell.tsx`, `ComponentsIndex.tsx`, `mockups/registry.ts`

### Composition

`DateRangePicker` is structurally similar to `DatePicker`:

- **Outer wrapper** styled like `<Input>` (border, focus-within ring). Holds the visible `<input type="text">` + ✕ clear + 📅 open buttons + two hidden form mirrors.
- **Popover** positioned via `useFloating` from `@floating-ui/react-dom`. Portaled to `document.body`. Carries `role="dialog" aria-modal="false" aria-label={labels.dialogLabel}`. Wider than `DatePicker`'s popover (~36rem) to fit two months side-by-side.
- **Two `<DatePickerGrid>` instances** rendered inside the popover with `chevrons={false}`. Both share the same `rangeStart` / `rangeEnd` / `hoverDate` / `selectionMode='range'` props.
- **External prev / next chevrons** rendered inside the popover but outside the two grids. They shift the cursor by ±1 month (both grids shift together).

### Why not have DatePicker handle range natively?

Mixing `value: Date | null` and `value: DateRange | null` on one component muddles the API (consumers have to typeguard). Two surface components is clearer and matches the rest of the industry (Atlassian, Carbon, Mantine, react-day-picker all split single vs range).

## DatePickerGrid refactor

Add the following props to `DatePickerGridProps` (existing props unchanged). All are optional with safe single-mode defaults.

```ts
/** Selection model. Defaults to 'single'. */
selectionMode?: 'single' | 'range';

/** Range start (when mode='range'). The "left" boundary of the committed range. */
rangeStart?: Date | null;
/** Range end (when mode='range'). The "right" boundary. */
rangeEnd?: Date | null;
/** In-flight hover preview (when mode='range' and only rangeStart is set). */
hoverDate?: Date | null;
/** Fires on cell mouseenter (the date) and on grid mouseleave (null). */
onHoverDate?: (date: Date | null) => void;

/** Show the prev / next month chevrons + month label header. Defaults to true. */
chevrons?: boolean;
```

In `selectionMode='range'`:

- A cell whose date is strictly between `rangeStart` and `rangeEnd` (or `hoverDate` when no `rangeEnd`) gets the `.inRange` class.
- `rangeStart` cell gets `.rangeStart` + `aria-selected="true"`.
- `rangeEnd` cell gets `.rangeEnd` + `aria-selected="true"`.
- When only `rangeStart` is set + `hoverDate` exists, the `hoverDate` cell gets `.rangeEnd` (visual end-of-preview).
- Disabled cells (`min` / `max` / `isDateDisabled`) inside the range keep their muted color but also receive `.inRange` so the band reads as contiguous.
- Mouseenter on any cell calls `onHoverDate(cell.date)`. Mouseleave on the grid container calls `onHoverDate(null)`. Disabled cells suppress `onHoverDate` (no hover preview through a hole).

`chevrons={false}` removes the prev / next chevron buttons but **keeps the month-label line** (centered) so users still know which month they're looking at. DateRangePicker renders its own chevrons outside the two grids.

`tabIndex` roving in range mode: the focusable cell is `rangeStart` if set, else `rangeEnd`, else today (existing fallback).

The existing single-mode behavior is preserved — `value`, `onSelect`, `onCursorChange`, `min`, `max`, `isDateDisabled` work identically when `selectionMode` is omitted or `'single'`.

## Public API — DateRangePicker

```ts
export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangePickerLabels {
  previousMonth?: string;     // default: "Previous month"
  nextMonth?: string;         // default: "Next month"
  openCalendar?: string;      // default: "Open calendar"
  clear?: string;             // default: "Clear range"
  dialogLabel?: string;       // default: "Choose date range"
}

export interface DateRangePickerProps {
  /** Selected range. `null` = no range. Pair with `onChange` for controlled use. */
  value?: DateRange | null;
  /** Initial range for uncontrolled use. */
  defaultValue?: DateRange | null;
  /** Fires when a complete range commits (after the second click in the grid, or after a successful typed-parse on blur). Never fires mid-selection. */
  onChange?: (range: DateRange | null) => void;

  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable predicate. Applies to both halves and to typed-input parse. */
  isDateDisabled?: (date: Date) => boolean;

  /** Show the ✕ clear button when a range is set. Defaults to `true`. */
  clearable?: boolean;
  /** Placeholder. Defaults to locale-formatted "MM/DD/YYYY — MM/DD/YYYY". */
  placeholder?: string;
  /** Disables the input AND the calendar trigger. Defaults to `false`. */
  disabled?: boolean;
  /** Toggle red border + focus ring + `aria-invalid="true"`. */
  invalid?: boolean;

  /** Form name for the START half (hidden `<input>` mirror). */
  nameStart?: string;
  /** Form name for the END half. */
  nameEnd?: string;

  /** Localized strings. Each key has an English default. */
  labels?: DateRangePickerLabels;

  /** Standard HTML attribute pass-throughs on the typed input. */
  id?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
}

export const DateRangePicker: React.ForwardRefExoticComponent<
  DateRangePickerProps & React.RefAttributes<HTMLInputElement>
>;
```

The forwarded `ref` points at the typed `<input>`. `value === null` means "no range selected"; partial states (only-start) live in internal `selectionStart` state and never surface via `onChange`.

## Behavior

### Opening the popover

Same as `DatePicker`:

- Click the typed input → opens; focus stays on the input.
- Click 📅 button → toggles; opens with focus on the input.
- ArrowDown in the input → opens; focus moves into the **left** grid (selected `rangeStart` cell if set, else today, else first selectable).
- Tab into the input does NOT auto-open.
- ✕ click does NOT open.

### Closing the popover

- Escape → close, restore input focus, no value change.
- Click outside → close. Field blur-parse runs (commits typed input if valid, reverts if not).
- Second click in the grid → commit and close. Focus returns to input.

### Selection flow (in popover)

1. **First click** on a cell:
   - Set internal `selectionStart = cell.date`.
   - Clear any committed range from internal display state (`rangeEnd = null` for visual purposes).
   - `onChange` is NOT fired.
2. **Hover or arrow-key focus** another cell:
   - Update `hoverDate` to that cell's date.
   - Cells from `selectionStart` to `hoverDate` get `.inRange` styling (and the boundary gets `.rangeEnd` preview).
3. **Second click** on a cell `clicked`:
   - Compute `[start, end] = autoSwapRange(selectionStart, clicked)` — `[earlier, later]` regardless of click order.
   - If `clicked === selectionStart`, commit a single-day range `{ start: selectionStart, end: selectionStart }`.
   - Call `onChange({ start, end })`.
   - Close the popover. Restore focus to typed input.
4. **Third click** while a range is already committed and the popover is still open:
   - Restart: treat as the new first click. `selectionStart = cell.date`, clear `rangeEnd` from internal state, no `onChange` yet.

### Keyboard inside the grid (range mode)

Same key contract as `DatePicker` single mode (←→↑↓, Home/End, PageUp/PageDown, Enter/Space, Escape). Enter / Space on a focused cell acts like a click — drives the same first-click / second-click / restart logic.

When `selectionStart` is set, the keyboard-focused cell also acts as `hoverDate` so the preview range follows arrow-key navigation.

### Typed input + commit

The typed input is fully editable while open or closed. On blur of the whole picker, parse the input:

- Empty → commit `null`.
- Parseable + both halves in `[min, max]` + neither disabled → commit `autoSwapRange(parsedStart, parsedEnd)`.
- Anything else → revert to last committed value (the input snaps back to the formatted range).

Enter in the input runs the same parse-and-commit cycle, then closes the popover.

### Date-range parsing (`utils.ts`)

`parseDateRange(raw, locale): DateRange | null`:

- Empty / whitespace → `null`.
- Split on the first occurrence of any of these separators (case-insensitive): ` — ` (em dash with spaces), ` – ` (en dash), ` - ` (hyphen with spaces), ` to ` (word, padded).
- If split doesn't yield exactly 2 non-empty halves → `null`.
- Run each half through `parseDate(half, locale)` from `components/DatePicker/utils`.
- If either half fails → `null`.
- Return `autoSwapRange(start, end)`.

`formatDateRange(range, locale): string` — `formatDate(range.start, locale) + ' — ' + formatDate(range.end, locale)`. Single-day ranges still render both halves with the em dash for consistency (`"05/21/2026 — 05/21/2026"`).

`autoSwapRange(a, b): DateRange` — returns `{ start, end }` where `start <= end` (day-granular comparison via `startOfDay`).

`sortDates(a, b): [Date, Date]` — same shape but tuple-typed (private helper).

### Two-month navigation

`DateRangePicker` tracks one `cursor: Date` in state (anchored to the first of the LEFT month). Right grid receives `cursor + 1 month` as its `cursor` prop.

- Prev chevron (rendered by DateRangePicker, on the popover's left edge) → `setCursor(addMonths(cursor, -1))`.
- Next chevron (right edge) → `setCursor(addMonths(cursor, 1))`.
- Both grids receive `chevrons={false}`. Each grid still shows a small centered month label (e.g., "May 2026" / "June 2026") so the user can read which month is which.

When the popover opens, `cursor` resets to `value?.start ?? new Date()`. So reopening always lands on the relevant range.

### Disabled state

`disabled` → typed input is `disabled`, 📅 is `disabled`, popover never opens, ✕ is not rendered. Wrapper carries a `disabled` visual class.

### Invalid state

`invalid` → wrapper carries `invalid` class (red border + red focus ring), typed input has `aria-invalid="true"`. Same shape as `DatePicker`.

### Form integration

- When `nameStart` is set: render `<input type="hidden" name={nameStart} value={value ? toIsoDate(value.start) : ''}>` inside the wrapper.
- When `nameEnd` is set: render `<input type="hidden" name={nameEnd} value={value ? toIsoDate(value.end) : ''}>`.
- Either, both, or neither may be set. Consumer chooses.

## Hard rules compliance

- **Rule 1** — three test files in `DateRangePicker/` cover the surface (renders, props round-trip, click/keyboard, parse + revert, clear, form mirrors, locale, a11y attrs). New `DatePickerGrid.test.tsx` cases for range mode + `chevrons={false}`.
- **Rule 2** — playground demo wired into route + sidebar Forms group + components index + registry.
- **Rule 3** — every CSS value via tokens. New tokens may include `--size-daterange-popover-width` (~36rem). Add to `tokens.scss` first.
- **Rule 3a** — `:focus-visible` on all buttons. Wrapper `:focus-within` is for the container, fine.
- **Rule 4** — wrapper is `position: relative` for the popover anchor. No margin, no top/left/right/bottom on the outer box. `.input { flex: 1; min-width: 0 }` repeats the DatePicker pattern with the same justification comment.
- **Rule 5** — re-exports from `packages/design-system/src/index.ts`: `DateRangePicker` value + `DateRangePickerProps` + `DateRangePickerLabels` + `DateRange` types.
- **Rule 6** — `forwardRef` to the typed input. All HTML pass-throughs spread onto the input.
- **Rule 7** — JSDoc on every exported symbol, with `@example` blocks + `@remarks When NOT to use` + `@remarks Anti-patterns`.
- **Rule 8** — pre-push review-fix cycle is mandatory.

## Testing

### `utils.test.ts`

- `formatDateRange` — en-US: `"05/21/2026 — 06/04/2026"`; ru-RU: `"21.05.2026 — 04.06.2026"`. Single-day range still uses both halves.
- `autoSwapRange` — out-of-order pair returns `{ start: earlier, end: later }`; in-order pair returns same; equal returns `{ start: same, end: same }`. Day-granular (time of day ignored).
- `parseDateRange`:
  - Empty / whitespace → `null`.
  - All 4 separators: ` — `, ` – `, ` - `, ` to ` (with whitespace tolerance).
  - en-US `"5/21/2026 — 6/4/2026"` → `{ start: May 21, end: Jun 4 }`.
  - ru-RU `"4.6.2026 - 21.5.2026"` (out-of-order, hyphen sep) → auto-swapped `{ start: May 21, end: Jun 4 }`.
  - One half unparseable → `null`.
  - Three chunks (`"5/21 — 6/4 — 7/1"`) → `null`.
  - No separator (`"5/21/2026 6/4/2026"`) → `null`.

### `DatePickerGrid.test.tsx` (additions)

- `selectionMode='range'` with `rangeStart` + `rangeEnd` → cells between get `.inRange`, boundaries get `.rangeStart` / `.rangeEnd` and `aria-selected="true"`.
- `selectionMode='range'` with only `rangeStart` + `hoverDate` → cells between get `.inRange`, `hoverDate` cell gets `.rangeEnd` preview.
- `selectionMode='range'` cell mouseenter fires `onHoverDate(date)`; grid mouseleave fires `onHoverDate(null)`.
- Disabled cell in range → still gets `.inRange` but not clickable; `onHoverDate` NOT fired on mouseenter.
- `chevrons={false}` → no chevron buttons, only the month label still renders (centered).

### `DateRangePicker.test.tsx`

- Uncontrolled: `defaultValue` populates input; clicking start then end commits and closes.
- Controlled: `value` + `onChange` round-trip.
- Typed parse — `"5/21/2026 — 6/4/2026"` blurs and commits.
- Invalid typed input reverts.
- Out-of-order typed input (`"6/4 — 5/21"`) commits as `{ start: 5/21, end: 6/4 }` (auto-swap).
- Click start in left grid → click end in right grid → commits.
- Click end-before-start → auto-swap commits as `[earlier, later]`.
- Same-day double-click → single-day range commits.
- Hover preview: click cell A, hover cell B → cells between have `.inRange` class.
- Third click after a committed range → restarts selection (no `onChange` until second click of new selection).
- Escape closes popover; restores input focus; no commit.
- Click outside closes popover and commits typed draft (if valid).
- ✕ clears value; focus stays on input.
- 📅 toggles popover.
- ArrowDown in input opens popover and focuses today/start cell.
- `disabled` disables input and 📅.
- `invalid` sets `aria-invalid="true"`.
- `nameStart` renders hidden mirror with ISO start.
- `nameEnd` renders hidden mirror with ISO end.
- `min` / `max` reject typed range outside the window.
- `isDateDisabled` rejects typed range containing a disabled boundary.
- Locale override (ru-RU) — input formats as `"DD.MM.YYYY — DD.MM.YYYY"`.
- `ref` forwards to typed input.

## Playground

`DateRangePickerDemo.tsx`:

1. Uncontrolled.
2. Controlled with state display next to the picker.
3. Min / max (e.g., `min = today`, `max = today + 90 days`).
4. `isDateDisabled` — disable weekends.
5. Disabled.
6. Invalid + visible error + `aria-describedby`.
7. Form integration — both `nameStart="bookingStart"` + `nameEnd="bookingEnd"` inside a small `<form>`; on submit the user sees both posted values.
8. ru-RU locale with full localized labels.

## AGENTS.md

Add a `### DateRangePicker` section after the existing `### DatePicker` section. Same density / bullet style. Cover: when to use, public API surface, locale parsing notes (including separator list), form integration with two mirrors, the auto-swap behavior, ARIA shape, keyboard contract inside the grid.

## Risks / open questions

- **DatePickerGrid props growing**: adding 6 new props pushes the grid toward "do too much". Mitigation: range-mode props are all optional and group around a single discriminant (`selectionMode`). If we add a third mode (multi-date) in the future the props grow again — at that point a `MonthGrid` lift might be worth it. Today it's premature.
- **Hover preview vs touch**: `onMouseEnter` doesn't fire on touch. On touch devices, the preview just doesn't render — user still picks start, then end, both via tap. Acceptable.
- **`autoSwapRange` and `min`/`max`**: if the user picks a valid start, then an end that's outside `[min, max]`, the second cell is unclickable to begin with. Auto-swap only ever runs on two clickable cells, so both halves are in-range. Safe.
- **Performance**: hover state changes re-render the grid. Two grids × ~42 cells = 84 buttons re-rendered on every hover. Not a real concern for browser perf, but flag if test runs slow.
- **Form mirror with partial state**: while the user has clicked start but not end (popover open), the hidden mirrors show the LAST committed value (or empty). They never expose mid-flight state. That matches `onChange` semantics.

## Acceptance criteria

- 6 files added under `components/DateRangePicker/` (`DateRangePicker.tsx`, `.module.scss`, `.test.tsx`, `utils.ts`, `utils.test.ts`, `index.ts`); 4 files modified in `DatePicker/` (`DatePickerGrid.tsx`, `.module.scss`, `.test.tsx`, no DatePicker.tsx change); 3 test files green; playground demo wired into route + sidebar + components index + registry; AGENTS.md updated; `src/index.ts` re-exports the new public surface.
- `make test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npx prettier --check`, `npm pack --dry-run -w @eocrm/design-system` all clean.
- DatePicker continues to pass its full test suite — the range-mode refactor must not regress single-mode behavior.
- Hard Rule 8 review-fix cycle runs to "clean enough to stop" before opening the PR.
