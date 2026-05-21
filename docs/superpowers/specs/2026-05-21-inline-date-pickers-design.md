# InlineDatePicker + InlineDateRangePicker design

**Status:** approved · 2026-05-21
**Scope:** `packages/design-system/src/components/DatePicker/InlineDatePicker.tsx` + `packages/design-system/src/components/DateRangePicker/InlineDateRangePicker.tsx` (plus SCSS, tests, barrel updates) + playground demos + AGENTS.md entries
**PR target branch:** `feat/inline-date-pickers`

## Goal

Add **inline** variants of `<DatePicker>` and `<DateRangePicker>` — the same calendar grid (and click-1/click-2/restart range flow for the range variant) without the typed input + Floating-UI popover. The user sees a permanent month grid embedded in the page layout instead of a field that opens a popover.

## Why now

The CRM has UI patterns where dates should always be visible — quick-filter side panels, schedule editors, sidebar calendars — and a popover-based field is wrong for those. Today consumers either fake an "always-open" picker by abusing the DatePicker popover, or roll their own grid from `useMonth`. Shipping first-class inline variants closes that gap without duplicating the grid + range-selection logic.

## Out of scope (deliberately)

- Refactoring `<DatePicker>` / `<DateRangePicker>` to wrap the new inline cores. The duplicated state machines (~150 LOC across `InlineDateRangePicker.tsx` + the DRP popover content) are bounded and well-tested. A future cleanup PR can lift them into a shared core if maintenance cost justifies it.
- Preset ranges ("Today" / "Last 7 days"), datetime selection, 3+ month preview, year-picker mode, vertical month stack on narrow widths, drag-to-select. All deferred to follow-ups, same as the popover variants.

## Architecture

### Files

```
packages/design-system/src/components/DatePicker/
  InlineDatePicker.tsx              — new, public
  InlineDatePicker.module.scss      — new
  InlineDatePicker.test.tsx         — new
  index.ts                          — modify to barrel-export the new component + props type

packages/design-system/src/components/DateRangePicker/
  InlineDateRangePicker.tsx         — new, public
  InlineDateRangePicker.module.scss — new
  InlineDateRangePicker.test.tsx    — new
  index.ts                          — modify

packages/design-system/src/components/DatePicker/DatePickerGrid.tsx
                                    — modify (small `disabled?: boolean` prop addition; see below)
packages/design-system/src/components/DatePicker/DatePickerGrid.module.scss
                                    — modify (disabled visual on the whole grid; one new class)
packages/design-system/src/components/DatePicker/DatePicker.tsx
                                    — NO CHANGE
packages/design-system/src/components/DateRangePicker/DateRangePicker.tsx
                                    — NO CHANGE

packages/design-system/src/index.ts             — re-export both new components + props types
packages/design-system/AGENTS.md                — add two short sections
packages/playground/src/pages/components/InlineDatePickerDemo.tsx       — new
packages/playground/src/pages/components/InlineDateRangePickerDemo.tsx  — new
packages/playground/src/App.tsx                                         — modify (routes)
packages/playground/src/layout/AppShell/AppShell.tsx                    — modify (sidebar)
packages/playground/src/pages/components/ComponentsIndex.tsx            — modify (cards)
packages/playground/src/pages/mockups/registry.ts                       — modify (`ComponentName` union)
```

### Composition

`InlineDatePicker` is a thin wrapper around `<DatePickerGrid>`:

- One grid in single-mode.
- Local `cursor` state (anchors to `value ?? new Date()` on mount; the user navigates via the grid's built-in chevrons or PageUp/Down).
- Local uncontrolled `value` (mirrored via `value` prop when controlled).
- Optional hidden `<input type="hidden">` form mirror when `name` is set.

`InlineDateRangePicker` mirrors the DRP popover content:

- Two grids in `selectionMode='range'`, `chevrons={false}`, side-by-side.
- External prev/next chevrons rendered in a header above the grids (DRP popover pattern).
- Per-grid `onCursorChange` callbacks (left = `setCursor`; right = `setCursor(addMonths(c, -1))`) so keyboard cross-grid navigation works in both directions. Same fix as `<DateRangePicker>`.
- Local `cursor`, `selectionStart`, `hoverDate` state.
- Click-1 / click-2 / restart flow with auto-swap. `onChange` fires only on committed pairs.
- Two optional hidden form mirrors (`nameStart` / `nameEnd`).

Neither component needs Floating UI, `<Popover>`, `createPortal`, an input, ARIA dialog attributes, hover-defer / blur-defer tricks, or any of the popover-management plumbing the field variants carry.

### Small additive change to `DatePickerGrid`

To support `disabled` cleanly on both inline pickers (and any future consumer), add one optional prop:

```ts
/** When true: cells render muted, clicks no-op, all cells get tabIndex=-1. */
disabled?: boolean;
```

Defaults to `false`. The existing field-based `<DatePicker>` and `<DateRangePicker>` don't pass it (their `disabled` lives at the wrapper level and prevents the popover from opening — the grid never renders), so no behavior change for those components. SCSS adds one `.disabledGrid` class on the outer container that applies `pointer-events: none; opacity: var(--opacity-disabled)` plus disables the chevron buttons inside. Cells separately get `tabIndex={-1}` via the existing `tabIndexFor` helper extended with a `disabled` short-circuit at the top.

### Why not refactor DatePicker/DateRangePicker to wrap these?

The existing pickers manage substantial popover state (open/close, draft, click-outside, blur-defer, focus-into-grid via `focusGridTick`, ArrowDown-to-grid keyboard plumbing). Their internal `DatePickerGrid` + selection logic happens to overlap with the inline shape — but tearing that out as a "core" mid-flight risks regressions and adds a level of indirection that pays off only if a third variant arrives. YAGNI for now. If the duplication ever hurts, lifting an `<InlineCore>` is a clean follow-up.

## Public API

### `InlineDatePickerProps`

```ts
export interface InlineDatePickerLabels {
  previousMonth?: string; // default: "Previous month"
  nextMonth?: string; // default: "Next month"
}

export interface InlineDatePickerProps {
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

  /** Localized strings. */
  labels?: InlineDatePickerLabels;

  /** Standard HTML attribute pass-throughs on the outer container. */
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
}

export const InlineDatePicker: React.ForwardRefExoticComponent<
  InlineDatePickerProps & React.RefAttributes<HTMLDivElement>
>;
```

The forwarded `ref` points at the outer wrapper `<div>`. There is no input. Consumers wanting to scroll the picker into view or measure its bounds attach the ref to the wrapper.

### `InlineDateRangePickerProps`

```ts
export interface InlineDateRangePickerLabels {
  previousMonth?: string; // default: "Previous month"
  nextMonth?: string; // default: "Next month"
}

export interface InlineDateRangePickerProps {
  /** Selected range. `null` = no range. Pair with `onChange` for controlled use. */
  value?: DateRange | null;
  /** Initial range for uncontrolled use. */
  defaultValue?: DateRange | null;
  /** Fires when a complete range commits (after the second click, with auto-swap on out-of-order). */
  onChange?: (range: DateRange | null) => void;

  /** Override locale. */
  locale?: string;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable predicate. */
  isDateDisabled?: (date: Date) => boolean;

  /** Form name for the START half. */
  nameStart?: string;
  /** Form name for the END half. */
  nameEnd?: string;

  disabled?: boolean;

  labels?: InlineDateRangePickerLabels;

  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
}

export const InlineDateRangePicker: React.ForwardRefExoticComponent<
  InlineDateRangePickerProps & React.RefAttributes<HTMLDivElement>
>;
```

Same forward-ref shape: ref → outer wrapper `<div>`.

`DateRange` is re-exported from `./DateRangePicker` (no new type).

## Behavior

### InlineDatePicker

- On mount: `cursor` = `value ?? new Date()`. Grid renders the cursor's month.
- Click a cell → `setValue(date); onChange?.(date)`. Disabled cells are no-ops.
- Prev/next chevrons (rendered by `DatePickerGrid`) step the cursor by ±1 month.
- Keyboard inside the grid: same as the popover variant — arrows move focus by 1 day, Home/End to start/end of week, PageUp/PageDown step a month, Enter/Space selects. Tab leaves the grid.
- `disabled` → wrapper carries `.disabled`; the grid's `onSelect` no-ops; chevrons are not rendered (or are `disabled`); cells get `tabIndex={-1}` so the picker isn't a tab stop.
- Form mirror (when `name`): renders `<input type="hidden" name={name} value={value ? toIsoDate(value) : ''}>` inside the wrapper.
- No ARIA dialog role — the inline picker is a `<div>` in flow.

### InlineDateRangePicker

- Composes two `<DatePickerGrid selectionMode='range' chevrons={false}>` instances side-by-side.
- External prev/next chevrons rendered in a header above the grids.
- Cursor state: tracks the LEFT grid's month; right grid receives `addMonths(cursor, 1)`.
- Per-grid `onCursorChange` callbacks — left's `(c) => setCursor(c)`, right's `(c) => setCursor(addMonths(c, -1))`. Keyboard cross-grid nav works in both directions; matches the DRP popover's behavior.
- Selection flow:
  1. First click → `selectionStart = clicked`. Range cleared from grid display.
  2. Hover (or keyboard focus) updates `hoverDate`; cells between get `.inRange`.
  3. Second click → `[start, end] = autoSwapRange(selectionStart, clicked)`. `onChange({ start, end })`. Selection state resets.
  4. Subsequent click on a fresh interaction → restart (treat as first click).
- `disabled` → wrapper carries `.disabled`; both grids' `onSelect` no-op; external chevrons disabled; cells get `tabIndex={-1}`.
- Form mirrors: `nameStart` / `nameEnd` each render an independent hidden `<input>`. Both may be set, only one, or neither.

### Initial cursor anchoring

Both inline pickers anchor `cursor` to `value?.start ?? new Date()` on mount (DRP) or `value ?? new Date()` on mount (DP), then leave it alone — user-driven navigation via chevrons / PageUp/Down doesn't reset. Unlike the popover variants, there is no "open" event to re-anchor on; the cursor is sticky after user interaction.

If the consumer changes `value` programmatically (controlled mode), the cursor does NOT re-anchor either. The visible month is whatever the user last navigated to. If the parent wants to scroll the picker to show the new value, they own that via `ref` + manual chevron clicks. This matches Atlassian / Mantine inline pickers and avoids surprise scroll on every external state change.

## Hard rules compliance

- **Rule 1** — both components have test files; coverage minimums (renders, controlled/uncontrolled, ref forward, className merge, disabled, all major behaviors, locale).
- **Rule 2** — both components have playground demos wired into route + sidebar + components index + registry.
- **Rule 3** — every CSS value via `var(--token)`. New SCSS modules borrow the popover-shell styling from the field variants, dropping the floating-popover-only properties (`z-index`, `box-shadow`, fixed width). No new tokens needed.
- **Rule 3a** — `:focus-visible` on chevrons (the grid carries these unchanged).
- **Rule 4** — outer wrappers are `position: relative` only if needed; no margin / position-on-the-outer-box / top/left/right/bottom / `flex: 1` / `width` other than `100%`. Inline pickers are intrinsically-sized; consumers control width by the container.
- **Rule 5** — both components + their `Props` + `Labels` types re-exported from `packages/design-system/src/index.ts`.
- **Rule 6** — `forwardRef` to the outer wrapper `<div>`. Other HTML attributes spread onto the wrapper.
- **Rule 7** — JSDoc on every exported symbol. `@example` + `@remarks When NOT to use` + `@remarks Anti-patterns` on both components.
- **Rule 8** — pre-push review-fix cycle mandatory before opening the PR.

## Testing

### `InlineDatePicker.test.tsx`

- Renders without crashing.
- Controlled — `value` + `onChange` round-trip; `defaultValue` populates initial state.
- Click a cell → `onChange` fires with the date.
- Prev/next chevrons step the cursor (month header label changes).
- Keyboard inside the grid — arrows move focus, Enter selects.
- `min` / `max` disable out-of-range cells; click is a no-op.
- `isDateDisabled` disables specific cells; click no-op; arrow nav skips.
- `name` renders the hidden mirror with the ISO date (and empty string when null).
- `disabled` blocks click and shows the disabled visual.
- `ref` forwards to the wrapper `<div>`.
- `className` merges with internal class.
- Locale override (ru-RU) — Cyrillic weekday + month labels.

### `InlineDateRangePicker.test.tsx`

- Renders without crashing — two grids visible, external chevrons visible.
- Controlled / uncontrolled value round-trip.
- Two grid clicks (start, end) — `onChange` fires with the auto-swapped range.
- Hover preview between clicks adds `.inRange` styling.
- Third click after a commit restarts selection.
- Same-cell double-click commits a single-day range.
- External chevrons step the cursor; both grids' month labels update.
- Keyboard cross-grid navigation — ArrowRight from left's end-of-month and ArrowLeft from right's start-of-month both work (exercises both `handleLeftGridCursorChange` and `handleRightGridCursorChange`).
- `min` / `max` reject out-of-range clicks on either boundary.
- `isDateDisabled` — boundary cells are non-clickable.
- `nameStart` / `nameEnd` render hidden mirrors with ISO dates (empty string when value null).
- `disabled` blocks all interaction.
- `ref` forwards to wrapper.
- `className` merges.
- Locale override (ru-RU).

## Playground

`InlineDatePickerDemo.tsx`:

1. Uncontrolled.
2. Controlled with state display (using `toDateKey` for the debug output, not `toISOString` — same lesson from the popover demo bugfix).
3. Min / max.
4. Disable weekends.
5. Disabled.
6. Form integration with `name="dob"` inside a `<form>`; submit shows the posted ISO date.
7. ru-RU locale.

`InlineDateRangePickerDemo.tsx`:

1. Uncontrolled.
2. Controlled with state display.
3. Min / max.
4. Disable weekends.
5. Disabled.
6. Form integration with `nameStart` + `nameEnd`.
7. ru-RU locale.

Each demo uses the existing `<InputExample>` wrapper for consistent layout — but inline pickers are intrinsically sized (`<InlineDatePicker>` is ~15rem wide, `<InlineDateRangePicker>` is ~32rem). Pass `width="auto"` so the inner column doesn't impose a constraint; `<Cluster justify="center">` inside `<InputExample>` still centers the children. Extend `<InputExample>` to short-circuit the inner `<div style={{ width }}>` when `width === 'auto'` (or document the convention via the JSDoc — implementation may pick either).

## AGENTS.md

Two short sections after the existing `<DatePicker>` / `<DateRangePicker>` sections. Same density and format as those entries. Cover: when to use, public API, behavior summary, anti-patterns (don't use for compact form fields — use the popover variant; don't render multiple inline pickers in the same column without giving them room — they're not a flow-laid-out compact control).

## CLAUDE.md cleanup

No "Components we don't have yet" entry for inline pickers — they're an expected variant of the field-based pickers, not a separately-listed missing primitive. No CLAUDE.md changes.

## Risks / open questions

- **Cursor stickiness on programmatic `value` change** (covered above) — Atlassian / Mantine punt on this; we follow. Document via JSDoc.
- **Inline picker inside a `<form>` with autosubmit on Enter** — Enter on a focused cell selects the date and bubbles to the form. Could trigger an unintended submit. Mitigation: the cell button is `type="button"` (it doesn't submit by default), and `DatePickerGrid`'s cell keydown handler calls `e.preventDefault()` on Enter/Space anyway. Verified.
- **Multiple inline pickers in the same column** — fine; each owns its own state and ref. No `document.querySelector` calls, no shared `id`-based wiring.
- **`forwardRef` to a `<div>` is unusual** for the codebase (Avatar, Stack, Cluster do it; Input, Select, DatePicker, DateRangePicker forward to their input). Justified here because there is no input.

## Acceptance criteria

- 6 new files added (2 `.tsx` + 2 `.module.scss` + 2 `.test.tsx`) and 2 modified barrels.
- `src/index.ts` re-exports both components and their `Props` / `Labels` types.
- Both playground demos wired into route / sidebar / components index / registry.
- AGENTS.md adds two new sections.
- `make test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npx prettier --check`, `npm pack --dry-run -w @eocrm/design-system` all clean.
- Existing DatePicker + DateRangePicker test suites unchanged.
- 5x flake check on both inline-picker test files — deterministic.
- Hard Rule 8 review-fix cycle runs to "clean enough to stop" before opening the PR.
