# Card subtle header + RelativeDateInput Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Card.Header` `surface="subtle"` + `controls` (#701) and a new `RelativeDateInput` (#700) on one branch.

**Architecture:** Card gets two header props and one component token. `RelativeDateInput` keeps all grammar logic in a pure, Node-tested `relativeDate.ts` (parse ⇄ format). The component composes `Select`/`Input`/`Switch`/`DatePicker`/`Button`, and only ever emits strings that went through `formatRelativeDate`.

**Tech Stack:** React 19, TypeScript, SCSS modules + CSS custom properties, Vitest (`unit` = Node `*.test.ts`, `dom` = jsdom `*.test.tsx`).

**Spec:** `docs/superpowers/specs/2026-10-26-card-subtle-header-relative-date-design.md`

## Global Constraints

- `Card.Header`: `surface?: 'default' | 'subtle'` (default `'default'`), plus `controls?: ReactNode`, rendered after the heading element and outside it. Order: title · controls … meta · action.
- Grammar is exactly as in spec Part 2:
  - anchors `today`, `now` (allowNow only), and `start|end:this|last|next:week|month|quarter|year`
  - offset `{+|-}{N}{d|w|mo|y|h|min}`, N 0..1000, with `h`/`min` only on `now`
  - ranges `last|next:{N}{d|w|mo|y}` (N 1..1000), `this|last|next:{period}` and `this:{period}:to_date`
  - absolute values `YYYY-MM-DD`, and `YYYY-MM-DDTHH:mm:ssZ` when allowNow (point mode only)
- Offset 0 is never emitted (`today+0d` formats as `today`).
- Only valid expressions are emitted. Invalid numbers show an inline i18n error and don't emit.
- Every built-in string goes through i18n (en + ru). No `formatLabel` prop.
- Library hard rules apply: forwardRef + spread attrs, JSDoc, tests, tokens only, no layout props, `:focus-visible`, SSR-safe.
- Run vitest with cwd `packages/design-system`. Check `make test`'s exit code, not grep output. Plain commit messages: no Co-Authored-By, no session links.

## Review Focus

1. **Round-trip stability:** for every canonical example in the spec, `formatRelativeDate(parseRelativeDate(s)) === s`. A value from the server must not be rewritten just by being displayed. Tested in Task 2.
2. **Mode mismatch:** a range expression passed to a point control (or the reverse), or `now`/`h`/`min` without `allowNow`, parses to `null`, so the UI shows "Unrecognised value". Tested in Task 2 and Task 3.
3. **Typing a number:** the intermediate states `''`, `'-'`, `'1e3'` and `'1001'` show the error, don't emit, and don't crash. Typing back to a valid number emits once. Tested in Task 3.
4. **Toggling "Exact date" off and on:** the relative choice is restored instead of reset, and toggling on with no date picked emits nothing until a date is picked. Tested in Task 3.
5. **Controlled value changes from outside** (e.g. a preset, or a parent reset to `null`): the controls follow `value` and don't keep stale local state. Tested in Task 3.

---

### Task 1: `Card.Header` `surface` + `controls` (#701)

**Files:**

- Modify: `packages/design-system/src/components/Card/` (the header component + its `.module.scss` + `Card.tokens.scss`)
- Test: the Card test file(s) in that folder
- Modify: `packages/design-system/src/styles/contrast.test.ts`: header title fg and `meta` fg ≥ 4.5 on the new subtle header bg, for every theme × accent
- Modify: `packages/design-system/docs/components/Card.md`: the new props (`npm run build:docs`), and the nesting rule rewritten as "Never nest Card in Card — except a nested editable sub-section inside a `Card.Body`, which must use `Card.Header surface="subtle"`", with a condition-group example (label "Group", a `ButtonGroup` "Match all | any" in `controls`, and a delete `Button iconOnly` in `action`)
- Modify: the playground `packages/playground/src/pages/components/CardDemo.tsx` (or the existing Card demo file): add a "Nested condition group" example

**Interfaces:**

- Produces: `CardHeaderProps.surface?: 'default' | 'subtle'` and `CardHeaderProps.controls?: ReactNode` (JSDoc'd); new token `--card-header-bg-subtle` (alias an existing muted surface primitive)

- [ ] **Step 1: Failing tests:**
  - `surface="subtle"` adds the subtle class / `data-surface="subtle"` on the header root; the default has none
  - `controls` renders after the heading element and outside it: `getByRole('heading', { name: 'Group' })` has accessible name exactly "Group", and the controls are siblings of the heading, not inside it
  - with `controls` + `meta` + `action`, the DOM order is heading, controls, meta, action
- [ ] **Step 2: Run, expect FAIL**: `npx vitest run src/components/Card`
- [ ] **Step 3: Implement**, with no layout props beyond the header's own internal grid/flex (follow how `meta`/`action` are laid out today).
- [ ] **Step 4: Run, expect PASS**, plus `npx vitest run src/styles/contrast.test.ts`. Then `npm run build:docs`, and `make test` / `make build` / `make lint` from the root, each exiting 0.
- [ ] **Step 5: Commit**: `feat(card): Card.Header surface="subtle" + controls slot (#701)`

---

### Task 2: Relative-date grammar module

**Files:**

- Create: `packages/design-system/src/components/RelativeDateInput/relativeDate.ts`
- Test: `packages/design-system/src/components/RelativeDateInput/relativeDate.test.ts`

**Interfaces:**

- Produces:

```ts
export type RelativePeriod = 'week' | 'month' | 'quarter' | 'year';
export type RelativeScope = 'this' | 'last' | 'next';
export type RelativeUnit = 'd' | 'w' | 'mo' | 'y' | 'h' | 'min';
export type RelativeDateValue =
  | {
      kind: 'anchor';
      anchor: 'today' | 'now';
      offset?: { sign: 1 | -1; n: number; unit: RelativeUnit };
    }
  | {
      kind: 'boundary';
      edge: 'start' | 'end';
      scope: RelativeScope;
      period: RelativePeriod;
      offset?: { sign: 1 | -1; n: number; unit: 'd' | 'w' | 'mo' | 'y' };
    }
  | { kind: 'exact'; date: string } // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ssZ'
  | { kind: 'rolling'; dir: 'last' | 'next'; n: number; unit: 'd' | 'w' | 'mo' | 'y' }
  | { kind: 'period'; scope: RelativeScope; period: RelativePeriod }
  | { kind: 'toDate'; period: RelativePeriod };
export interface RelativeDateOptions {
  mode: 'point' | 'range';
  allowNow?: boolean;
}
export function parseRelativeDate(
  expr: string,
  opts: RelativeDateOptions,
): RelativeDateValue | null;
export function formatRelativeDate(v: RelativeDateValue): string;
export const OFFSET_MAX = 1000;
export const ROLLING_MIN = 1;
export const ROLLING_MAX = 1000;
```

- Point mode accepts the anchor, boundary and exact kinds. Range mode accepts the rolling, period and toDate kinds.
- `now` and the `h`/`min` units require `allowNow`. The datetime form of `exact` requires `allowNow`. An offset with `n = 0` formats without the suffix.

- [ ] **Step 1: Failing tests:**
  - **round-trip** (`format(parse(s)) === s`) for each of: `today`, `today+7d`, `today-1w`, `now-30min` (allowNow), `now+2h` (allowNow), `start:this:month`, `end:next:quarter+1d`, `end:last:year-2mo`, `2026-11-03`, `2026-11-03T09:00:00Z` (allowNow), all in point mode; `last:30d`, `next:7d`, `next:12mo`, `this:month`, `last:week`, `next:year`, `this:quarter:to_date` in range mode
  - **rejects (null):**
    - `now` without allowNow
    - `today+3h` (h on today)
    - `today+1001d`
    - `last:0d`
    - `last:1001d`
    - `this:month` in point mode
    - `today` in range mode
    - `2026-11-03` in range mode
    - `2026-11-03T09:00:00Z` without allowNow
    - `2026-13-01`
    - `''`
    - `'garbage'`
    - `today+7`
    - `today+7x`
    - `start:this:decade`
  - `format({ kind: 'anchor', anchor: 'today', offset: { sign: 1, n: 0, unit: 'd' } }) === 'today'`
- [ ] **Step 2: Run, expect FAIL**: `npx vitest run src/components/RelativeDateInput/relativeDate.test.ts`
- [ ] **Step 3: Implement** with anchored regexes per kind, and validate real calendar dates for `exact`.
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit**: `feat(relative-date): grammar parse/format (#700)` (structure/manifest tests fail until Task 4, as expected)

---

### Task 3: `RelativeDateInput` component

**Files:**

- Create: `packages/design-system/src/components/RelativeDateInput/RelativeDateInput.tsx`, `RelativeDateInput.module.scss`, `RelativeDateInput.tokens.scss` (only if needed), `index.ts`
- Test: `packages/design-system/src/components/RelativeDateInput/RelativeDateInput.test.tsx`
- Modify: i18n `messages.ts`/`en.ts`/`ru.ts`: a new `relativeDateInput` group covering anchors (Today, Now, Start of / End of + scope + period phrases), units (days, weeks, months, years, hours, minutes), range kinds (Last, Next, This, Last (period), Next (period), To date), "Exact date", control labels (sign, amount, unit, anchor, kind, period), `errorRange` ("Enter a whole number from {min} to {max}"), and `unrecognised` ("Unrecognised value: {value}"). Use ru translations of the same meaning.

**Interfaces:**

- Consumes: Task 2 (`parseRelativeDate`, `formatRelativeDate`, `RelativeDateValue`, the limits)
- Produces (from `index.ts`): `RelativeDateInput`, `RelativeDateInputProps`, `RelativeDatePreset` (`{ label: string; value: string }`), and re-exports of the `RelativeDateValue` + `parseRelativeDate` / `formatRelativeDate` types/functions (handy for consumers' labels and tests)

```ts
export interface RelativeDateInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  mode: 'point' | 'range';
  allowNow?: boolean;
  value: string | null;
  onChange: (expr: string | null) => void;
  presets?: readonly RelativeDatePreset[];
  disabled?: boolean;
  invalid?: boolean;
}
```

**Behaviour:** per spec Part 2 UI. Specifically:

- The root is `role="group"` (consumers pass `aria-label`).
- Local edit state is derived from `value` whenever `value` changes. The numeric draft text is kept locally so invalid intermediate text survives re-renders.
- `onChange` is called only with `formatRelativeDate(next)`, and only when it differs from `value`.
- `null` value → defaults: point = `today`, range = `this:month`. Nothing is emitted on mount.
- The "Exact date" `Switch` remembers the last relative value in a ref, so it can be restored when toggled off.
- Presets render as `Button size="sm" variant="secondary"` with `aria-pressed`, in a `Cluster` above the controls.

- [ ] **Step 1: Failing tests:**
  - **Point basics:**
    - `value="today+7d"` shows anchor Today, sign +, amount 7, unit days
    - changing the unit to weeks emits `today+7w`
    - changing the amount to `0` emits `today`
    - anchor Now is absent without `allowNow`; with it, choosing Now offers hours and minutes, and choosing minutes + 30 + − emits `now-30min`
    - choosing "End of next quarter" with amount 1 days emits `end:next:quarter+1d`
  - **Exact date:**
    - toggling it on shows the DatePicker and emits nothing until a date is picked; picking 2026-11-03 emits `2026-11-03`
    - toggling it off restores the previous relative value and emits it
    - with `allowNow`, the DatePicker has minute granularity and emits `YYYY-MM-DDTHH:mm:00Z`
  - **Range:**
    - `value="last:30d"` shows kind Last N, 30, days
    - switching to kind This with period quarter emits `this:quarter`
    - kind To date emits `this:{period}:to_date`
  - **Validation:**
    - typing `1001`, `''`, `'-'` or `'1.5'` shows the i18n range error and doesn't call `onChange`
    - for rolling, `0` is an error
    - fixing it to `30` emits once
  - **Unrecognised value:** `value="garbage"` shows "Unrecognised value: garbage" and emits nothing on mount
  - **Presets:** they render as buttons, the matching one has `aria-pressed="true"`, and clicking another emits its value
  - **Controlled value:** a rerender with `value="next:7d"` updates the controls; with `null`, the defaults show and nothing is emitted
  - **Misc:**
    - `disabled` disables every control
    - the ru locale shows translated labels
    - the ref is the root, `className` is merged, and `aria-label` names the group
- [ ] **Step 2: Run, expect FAIL**: `npx vitest run src/components/RelativeDateInput`
- [ ] **Step 3: Implement**, with JSDoc (one-line summary + `@see docs/components/RelativeDateInput.md`).
- [ ] **Step 4: Run, expect PASS.** Then `npm run lint:css` and `npm run typecheck` from the root.
- [ ] **Step 5: Commit**: `feat(relative-date): RelativeDateInput component (#700)`

---

### Task 4: Integration + playground

**Files:**

- Modify: `packages/design-system/src/index.ts` (export the component, types and the parse/format helpers)
- Create: `packages/design-system/docs/components/RelativeDateInput.md` with:
  - a TL;DR covering point, range, `allowNow`, presets, and a `Field` with an error
  - the grammar table
  - the note that units `d w mo y h min` must match the server
  - "When NOT to use" (absolute-only → `DatePicker`/`DateRangePicker`)
  - the generated props table
- Modify: `AI-PRIMER.md` (an index line in the forms section), and `CLUSTERS` in both `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs` (`RelativeDateInput: 'Forms'`). Then run `npm run build:manifest`.
- Create: `packages/playground/src/pages/components/RelativeDateInputDemo.tsx` (`DemoLayout` + `Example`, `componentName="RelativeDateInput"`). Each example shows the current expression in a `Code`:
  - point
  - point with `allowNow`
  - range
  - range with presets (Today / Last 7 days / This month / This quarter to date)
  - invalid inside a `Field`
- Modify: `App.tsx` route `/components/relative-date-input`, `navItems.ts` (Forms), `ComponentsIndex.tsx` + `overviewSchematics.tsx` (schematic: three tinted pill shapes in a row, with exactly one solid-accent element), and `registry.ts` (union)

- [ ] **Step 1:** Make the edits, then run `npm run build:docs && npm run build:manifest` (cwd `packages/design-system`).
- [ ] **Step 2: Verify:** `make test`, `make build` and `make lint` each exit 0, and `npm pack --dry-run -w @eocrm/design-system` lists no `*.test.*`.
- [ ] **Step 3: Visual check:** run the playground on port 8095 in the background (stop it, plus `pkill -f "[m]cp-chrome"`, afterwards). Check `/components/relative-date-input` and the Card demo's nested group, in light and dark.
- [ ] **Step 4: Commit**: `feat(relative-date): export, docs, manifest, playground demo (#700)`

---

## After the tasks

Pause with a live playground link for dpws to check, then run `pre-push-review` (variant A) on one PR. After release, comment the version on #700 and #701 and close them.
