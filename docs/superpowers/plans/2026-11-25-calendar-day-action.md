# Calendar `dayAction` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a declarative `dayAction` prop to `Calendar` that renders one icon button per day (DS-88).

**Architecture:** One internal `DayActionButton` (an icon-only `xs` ghost `Button` that stops click/keydown propagation) is rendered by MonthView's `DayCell`, the Week/Day `columnHeaders`, and AgendaView's day heading. Visibility per pointer type is pure CSS; MonthView reuses its roving `focusedKey` to make only one month action tabbable.

**Tech Stack:** React 19 + TypeScript, SCSS modules, Vitest + Testing Library, lucide-react (`Plus`).

**Spec:** `docs/superpowers/specs/2026-11-25-calendar-day-action-design.md`

## Global Constraints

- Prop shape, verbatim: `dayAction?: { label: (date: Date) => string; onActivate: (date: Date, ctx: { view: CalendarView }) => void; icon?: ReactNode }`; default icon `Plus` from `lucide-react`.
- Activation never fires `onDayClick` (click or Enter/Space on the button).
- Month + Week hidden on `@media (pointer: coarse)`; Day + Agenda shown there with `@include touch-hit-area` (`src/styles/mixins.scss`).
- No action in resource day view headers.
- Tokens only; no margin/position/align-self in SCSS (stylelint `property-disallowed-list`); `:focus-visible`/`:focus-within` for reveal.
- Every new exported type has JSDoc (package Hard rule 7). The label is consumer-provided (it names their action), so no i18n key.

## Review Focus

- Enter/Space pressed while the month action button has focus: must call `onActivate` once, not `onDayClick` (keydown bubbles to the gridcell's handler today) → Task 1 test.
- Arrow keys on the month grid move the roving cell: the tabbable action must follow the focused cell → Task 1 test.
- Clicking the Week/Day header action must not trigger the column's background `onDayClick` → Task 2 test.
- `dayAction` omitted: no extra buttons anywhere (existing tests and snapshots unchanged) → Task 1 and Task 2 tests.
- Resource day view with `dayAction`: no button in resource headers → Task 2 test.

---

### Task 1: `DayActionButton` + prop threading + Month view

**Files:**

- Create: `packages/design-system/src/components/Calendar/DayActionButton.tsx`, `DayActionButton.module.scss`
- Modify: `types.ts` (add `CalendarDayAction`), `Calendar.tsx` (prop + JSDoc, pass to all four views), `MonthView.tsx`, `DayCell.tsx`, `DayCell.module.scss`, `index.ts`, `src/index.ts` (export type `CalendarDayAction`)
- Test: `MonthView.test.tsx`

**Interfaces:**

- Produces: `export interface CalendarDayAction { label; onActivate; icon? }` in `types.ts`;
  `DayActionButton({ action: CalendarDayAction; date: Date; view: CalendarView; tabbable?: boolean; className?: string })` — `tabbable` defaults to `true`; when `false`, renders `tabIndex={-1}`. Each view gets `dayAction?: CalendarDayAction`.

- [ ] **Step 1: Write failing tests in `MonthView.test.tsx`** (`describe('dayAction (DS-88)')`):
  - `renders one action per day labelled by label(date)` — `getAllByRole('button', { name: /^Add on / })` length equals the gridcell count.
  - `clicking the action calls onActivate(date, { view: 'month' }) and not onDayClick`.
  - `Enter on a focused action calls onActivate once and not onDayClick`.
  - `only the roving cell's action is tabbable` — exactly one action has `tabIndex 0`, and it is inside the cell with `tabIndex 0`; after `ArrowRight` on the grid it moves to the next cell's action.
  - `without dayAction no day buttons render` — no `button` inside any gridcell.
- [ ] **Step 2: Run** `npx vitest run src/components/Calendar/MonthView.test.tsx` (from `packages/design-system`) — expect the new tests to FAIL.
- [ ] **Step 3: Implement.** `DayActionButton` wraps `Button iconOnly size="xs" variant="ghost" aria-label={action.label(date)}`; `onClick` and `onKeyDown` call `stopPropagation()`. `DayCell` takes `dayAction?`, `view`, and renders the button beside the day number (header row of the cell) with `tabbable={isFocused}` and a `monthAction` class. SCSS: on fine pointers, hidden until `.cell:hover` / `.cell:focus-within` (use `opacity` or `visibility`, so it stays focusable); `@media (pointer: coarse) { display: none }`.
- [ ] **Step 4: Run** the same command — PASS, along with the rest of `src/components/Calendar`.
- [ ] **Step 5: Commit** `feat(calendar): dayAction in month view (DS-88)`.

### Task 2: Week/Day headers + Agenda headings

**Files:**

- Modify: `WeekView.tsx`, `DayView.tsx` (header nodes), `AgendaView.tsx` + `AgendaView.module.scss` (heading row), `HourGrid.module.scss` or a new header class for coarse hiding in week
- Test: `WeekView.test.tsx`, `DayView.test.tsx`, `AgendaView.test.tsx`, plus `Calendar.styles.test.ts` (source pin)

**Interfaces:**

- Consumes: `DayActionButton`, `CalendarDayAction` from Task 1.

- [ ] **Step 1: Write failing tests:**
  - Week: `renders a header action per day; click → onActivate(date, { view: 'week' }), onDayClick not called`.
  - Day: `renders one header action; view 'day'`; `resource day view renders no header action`.
  - Agenda: `each day heading has an action; view 'agenda'`; `the heading text stays an h3`.
  - Styles: Week header action hidden under `@media (pointer: coarse)`; Day/Agenda action selectors include `touch-hit-area`.
- [ ] **Step 2: Run** `npx vitest run src/components/Calendar` — expect the new tests to FAIL.
- [ ] **Step 3: Implement.** Week/Day: append `<DayActionButton view=… />` inside each date header node (skip when `resources` is set). Agenda: wrap the `<h3>` and the button in a flex row (`Cluster`, or a class with `display: flex; justify-content: space-between; align-items: center`).
- [ ] **Step 4: Run** the tests — PASS; `npx stylelint "src/components/Calendar/*.scss"` — clean.
- [ ] **Step 5: Commit** `feat(calendar): dayAction in week/day headers and agenda (DS-88)`.

### Task 3: Docs + playground demo

**Files:**

- Modify: `packages/design-system/docs/components/Calendar.md` (usage section: example, per-view/pointer table, anti-pattern "don't reuse onDayClick for create"; note that Agenda lists only days with events), regenerate with `npm run build:docs`; `packages/playground/src/pages/components/CalendarDemo.tsx` (a toggle or example using `dayAction` with `Plus`, logging the date)

- [ ] **Step 1:** Write the docs; run `npm run build:docs` in `packages/design-system`; confirm that `Calendar.md`'s props table lists `dayAction`.
- [ ] **Step 2:** Add the demo; check it in the playground at a desktop width and at 375px with touch emulation (the action shows in Day/Agenda only).
- [ ] **Step 3:** Run `make test && make lint && npm run format:check` from the repo root — all exit 0.
- [ ] **Step 4: Commit** `docs(calendar): dayAction docs and demo (DS-88)`.
