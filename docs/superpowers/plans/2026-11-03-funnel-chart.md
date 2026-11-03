# FunnelChart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<FunnelChart>` in `@eocrm/design-system`: a stage funnel (eased or sharp taper) with step-conversion pills, a tooltip, keyboard and screen-reader access, clickable stages, and a measured switch to a vertical layout. Ship it with every repo-invariant artefact.

**Architecture:** A pure model (`funnelModel.ts`, tested in Node) resolves stages (slot, ratios, empty) and computes horizontal SVG geometry. The component measures its plot with the shared `useSize` hook (extracted from `Chart`) and picks an orientation from the width per stage.

- **Horizontal:** one SVG strip holds the shapes and pills, with an HTML footer grid underneath, one cell per stage.
- **Vertical:** one HTML row per stage, each a band plus text.

Stage cells are `<button>`s when `onStageClick` is set. Otherwise the plot is a single focusable group with arrow-key inspection, as in `Chart`. The tooltip is `Chart`'s internal `ChartTooltip`.

**Tech Stack:** React 19, TypeScript, SCSS modules plus component tokens, Vitest (projects `unit` and `dom`), `@floating-ui/react-dom` (via `ChartTooltip`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-03-funnel-chart-design.md`

## Global Constraints

- Root `CLAUDE.md` component invariant: tests, playground demo plus its 4–5 wiring files, the `src/index.ts` export, `docs/components/FunnelChart.md` plus the AI-PRIMER line, and `CLUSTERS` in **both** `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs` (cluster `'Display'`, like `Chart`), then `npm run build:manifest`.
- design-system `CLAUDE.md` hard rules 1–10 apply. Specifically:
  - tokens only in SCSS;
  - no layout props in the component's SCSS;
  - `forwardRef` with `{...rest}` FIRST (Pattern B, as in `Chart`), so the figure's role and name win;
  - JSDoc on every exported member, with the component JSDoc a one-liner plus `@see docs/components/FunnelChart.md`;
  - every visible or ARIA string goes through i18n in `messages.ts`, `en.ts` and `ru.ts`.
- No new dependencies. `d3-shape` is allowed but not required.
- Tests are globals (`describe`, `it`, `expect`, `vi` aren't imported). Pure logic goes in `*.test.ts`; DOM behaviour goes in `*.test.tsx`.
- Run vitest from `packages/design-system` (see the memory note on the vitest working directory).
- Playground imports come only from `@eocrm/design-system`.
- After the demo is wired: **pause and give the user a live playground link** (dev server on port 8090 or higher, never the default port) before the PR. Then run `pre-push-review` (variant A, Standard tier).

## Review Focus

1. **Bad numbers:** negative, `NaN` or `Infinity` values are treated as 0. No path string ever contains `NaN`, and the chart still renders. Owner: Task 1.
2. **Inline `stages` arrays:** a consumer passing a fresh array each render, with the same data, must not re-fire `onActiveStageChange` or loop. Owner: Task 3.
3. **Data shrinks under an active stage:** with stage 4 active, `stages` drops to 3 entries. The tooltip clears and `onActiveStageChange(null)` fires. Owner: Task 3.
4. **Pointer users click the shapes, not just the footer:** in clickable mode, a pointer click on a column's shape calls `onStageClick` for that stage. Owner: Task 3.
5. **A single stage:** it renders full height with no pill and no neck. Width per stage = full width, so it stays horizontal. Owner: Tasks 1 and 2.

---

### Task 1: Funnel model (pure)

**Files:**
- Create: `packages/design-system/src/components/FunnelChart/funnelModel.ts`
- Test: `packages/design-system/src/components/FunnelChart/funnelModel.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type FunnelSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  export type FunnelShape = 'eased' | 'sharp';
  export interface FunnelStage { key: string; label: string; value: number; color?: FunnelSlot }
  export interface ResolvedStage {
    key: string; label: string;
    value: number;            // sanitised: non-finite or negative → 0
    slot: FunnelSlot;         // color ?? ((index % 8) + 1)
    overflow: boolean;        // index >= 8 and no explicit color
    heightRatio: number;      // value / max(values); 0 when max is 0
    stepRatio: number | null; // value / previous value; null for the first stage or when previous <= 0
    shareRatio: number | null;// value / first value; null when first <= 0
  }
  export const MIN_STAGE_WIDTH = 96;   // px per stage below which the layout goes vertical
  export const MIN_THICKNESS = 6;      // px, minimum drawn height of a stage (zero values stay hoverable)
  export const EASE_FLAT = 0.55;       // eased shape: fraction of the column held flat before the curve
  export function resolveStages(stages: readonly FunnelStage[]): ResolvedStage[];
  export function isFunnelEmpty(stages: readonly FunnelStage[]): boolean; // [] or every sanitised value is 0
  export function orientationFor(width: number, count: number): 'horizontal' | 'vertical';
  export interface StageGeometry { d: string; cx: number; cy: number; x0: number; x1: number }
  export function stageGeometry(args: { stages: readonly ResolvedStage[]; width: number; height: number; shape: FunnelShape }): StageGeometry[];
  export function stageIndexAt(width: number, count: number, x: number): number | null; // null outside [0,width)
  export function formatPercent(ratio: number, locale: string): string;
  ```

- [ ] **Step 1: Write the failing tests** (`funnelModel.test.ts`). Use the data `L=[{key:'l',label:'Leads',value:1240},{key:'q',label:'Qualified',value:620},{key:'p',label:'Proposal',value:248},{key:'n',label:'Negotiation',value:124},{key:'w',label:'Won',value:50}]`.
  - `resolveStages(L)`:
    - slots are `[1,2,3,4,5]`;
    - `stepRatio` is `[null, 0.5, 0.4, 0.5, 50/124]`;
    - `shareRatio[4]` is `50/1240`;
    - `heightRatio[0]` is `1`.
  - Explicit `color: 7` on stage 2 gives slot 7. The other stages keep their positional slots.
  - With 9 stages, `slot[8] === 1` and `overflow[8] === true`. `overflow[7] === false`.
  - Bad numbers (Review Focus 1): `[{…value:-5},{…value:NaN},{…value:Infinity},{…value:10}]` sanitises to values `[0,0,0,10]`. `stepRatio[1]` is `null` (previous is 0). `shareRatio` is all `null` (first is 0). `heightRatio[3]` is `1`.
  - Out of order: `[{value:10},{value:20}]` gives `heightRatio [0.5, 1]` and `stepRatio[1] === 2`.
  - `isFunnelEmpty([])` and `isFunnelEmpty([{…value:0},{…value:0}])` are `true`. `isFunnelEmpty(L)` is `false`.
  - `orientationFor(5*96, 5)` is `'horizontal'`, `orientationFor(5*96-1, 5)` is `'vertical'`, and `orientationFor(200, 1)` is `'horizontal'`.
  - `stageGeometry({stages: resolveStages(L), width: 500, height: 200, shape})`, for both shapes:
    - returns 5 entries with `x0 = i*100` and `x1 = (i+1)*100`;
    - `cx = x0 + 50` and `cy = 100`;
    - no `d` contains `'NaN'`;
    - `'sharp'` paths contain no `'C'`, and `'eased'` paths contain `'C'` except the last stage (no neck).
  - Single stage (Review Focus 5): geometry for `[{value:3}]` at 200×100 gives one path spanning y 0..100 with no `'C'`.
  - Zero-value stage: its path's vertical extent is `>= MIN_THICKNESS`. Parse the y numbers out of `d`, or expose the half-thickness. Your choice, but assert it.
  - `stageIndexAt(500, 5, 0) === 0`, `stageIndexAt(500, 5, 499) === 4`, `stageIndexAt(500, 5, 500) === null`, and `stageIndexAt(500, 5, -1) === null`.
  - `formatPercent(0.5,'en-GB') === '50%'`, `formatPercent(50/1240,'en-GB') === '4%'`, `formatPercent(0.004,'en-GB') === '0.4%'`, and `formatPercent(2,'en-GB') === '200%'`.

- [ ] **Step 2: Run them to make sure they fail**

  Run: `cd packages/design-system && npx vitest run src/components/FunnelChart/funnelModel.test.ts`
  Expected: FAIL, module not found.

- [ ] **Step 3: Implement `funnelModel.ts`.** Geometry, vertically centred on `mid = height/2`:
  - half-thickness `a_i = max(MIN_THICKNESS/2, heightRatio_i * height/2)`;
  - **sharp:** `M x0,mid-a_i L x1,mid-a_next L x1,mid+a_next L x0,mid+a_i Z`;
  - **eased:** flat to `xf = x0 + colW*EASE_FLAT`, then a cubic to `x1` with both control points at `xm = (xf+x1)/2`: `C xm,mid-a_i xm,mid-a_next x1,mid-a_next`, mirrored on the bottom edge;
  - the last stage uses `a_next = a_i` (straight end, no `C`).

  `formatPercent` uses `Intl.NumberFormat(locale, {style:'percent', maximumFractionDigits: ratio > 0 && ratio < 0.01 ? 1 : 0})`.

- [ ] **Step 4: Run the tests again.** Expected: PASS.

- [ ] **Step 5: Commit** with `git add src/components/FunnelChart/funnelModel*.ts && git commit -m "feat(FunnelChart): pure funnel model"`.

---

### Task 2: FunnelChart, horizontal, read-only (figure, keyboard inspection, tooltip, table, empty state)

**Files:**
- Create: `src/components/_internal/useSize.ts` (move `useSize` out of `Chart.tsx` verbatim, export it)
- Modify: `src/components/Chart/Chart.tsx` (delete the local `useSize`, import from `../_internal/useSize`)
- Create: `src/components/FunnelChart/FunnelChart.tsx`, `FunnelChart.module.scss`, `FunnelChart.tokens.scss`, `index.ts`
- Modify: `src/i18n/messages.ts`, `src/i18n/en.ts`, `src/i18n/ru.ts` (new `funnelChart` namespace)
- Test: `src/components/FunnelChart/FunnelChart.test.tsx`

**Interfaces:**
- Consumes (Task 1): `resolveStages`, `isFunnelEmpty`, `orientationFor`, `stageGeometry`, `stageIndexAt`, `formatPercent`, `FunnelStage`, `FunnelShape`, `FunnelSlot`, `MIN_STAGE_WIDTH`.
- Consumes (existing): `ChartTooltip` from `../Chart/ChartTooltip`, called as `anchor={plotEl}`, `point={{x: cx, y: top-of-shape}}` (memoised on `x`/`y`), `title={stage.label}`, `rows=[{key:'value', label:t('funnelChart.value'), slot, comparison:false, value: formatValue(v)}]` and `notes=[stepText, shareText]` (the first stage gets only `shareText`). Also `LiveRegion`, `VisuallyHidden`, `EmptyState`, `useTranslation`, `useLocale`, `mergeRefs`.
- Produces:
  ```ts
  export interface FunnelChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
    label: string; stages: FunnelStage[]; formatValue: (n: number) => string;
    shape?: FunnelShape;                       // default 'eased'
    onStageClick?: (stage: FunnelStage, index: number) => void;      // Task 3
    onActiveStageChange?: (stage: FunnelStage | null) => void;       // Task 3
    emptyMessage?: ReactNode; footnote?: ReactNode;
  }
  export const FunnelChart: ForwardRefExoticComponent<FunnelChartProps & RefAttributes<HTMLElement>>;
  ```
  The callbacks hand back the **consumer's original** `FunnelStage` object (`stages[index]`), not the resolved one.
- i18n keys (`funnelChart.*`):
  - `keyboardHint`: "Use arrow keys to inspect stages. All values are also in the data table."
  - `stage`: "Stage"
  - `value`: "Value"
  - `stepConversion`: "Conversion from previous stage"
  - `shareOfFirst`: "Share of first stage"
  - `ofStage: ({percent, stage}) => string` gives "40% of Proposal"
  - `noData`: "—"

  The empty title reuses `t('chart.empty')`. Provide Russian translations in `ru.ts`.

DOM contract (the tests rely on it):
- `<figure role="figure" aria-label={label}>` with `data-orientation="horizontal"|"vertical"`, `data-shape`, `data-footnote`, `data-empty`.
- The plot is `role="group"`, `aria-label={label}`, `aria-describedby` set to the hint id (plus the footnote id), and `tabIndex={0}`, *only when not clickable*.
- Horizontal: a measured `shapes` div containing an `aria-hidden` SVG, with one `<g data-stage={key} data-dimmed>` per stage holding a path, plus a pill (`rect` + `text`) except on the first stage. Under it, a footer grid with one cell per stage (`data-stage-cell={key}`) holding the value and then the label.
- Stage colour: an inline `--chart-series-color: var(--chart-series-{slot})` on each stage `g` and cell (same pattern as `Chart`'s `seriesStyle`).
- Data table: `VisuallyHidden` `<table>` with caption = `label`, columns Stage / Value / Conversion from previous stage / Share of first stage, and one row per stage. Undefined ratios show `t('funnelChart.noData')`.
- Dev warning (once per change) when any stage has `overflow`, following `Chart`'s `useDevWarnings` style.

- [ ] **Step 1: Move `useSize`**, then run `npx vitest run src/components/Chart`. Expected: PASS (refactor only).
- [ ] **Step 2: Write the failing tests** in `FunnelChart.test.tsx`. Copy `stubLayout()` from `Chart.test.tsx` and stub at 500×240.
  - It renders `getByRole('figure', {name: 'Pipeline'})`, the forwarded `ref` points to the `figure`, and `className` is merged.
  - `data-orientation="horizontal"` and `data-shape="eased"` are the defaults. `shape="sharp"` sets `data-shape="sharp"`.
  - The table has 5 body rows. The Won row reads `Won | 50 | 40% | 4%`, with `formatValue = n => n.toLocaleString('en-GB')` and `LocaleProvider locale="en-GB"`.
  - The first stage has no pill. Stage `q` shows the pill text `50%`.
  - Keyboard: focus the plot, then `{ArrowRight}`. The live region (after `PAST_ANNOUNCE_DELAY_MS`) contains `Leads` and `1,240`. Every other stage `g` has `data-dimmed`. `{End}` moves to Won. `{Escape}` clears `data-dimmed`.
  - Pointer move over the shapes at x=250 activates stage `p` (the tooltip `[data-chart-tooltip]` shows `Proposal`, `40% of Qualified` and `20% of Leads`). Pointer leave clears it.
  - Empty: `stages={[]}` renders an `EmptyState` with the text "No data for this period" and `data-empty`. `emptyMessage="Nothing yet"` overrides it. The `footnote` renders in both states.
  - With 9 stages, `console.warn` is called once, mentioning "FunnelChart".
- [ ] **Step 3: Run them to make sure they fail.** Run `npx vitest run src/components/FunnelChart/FunnelChart.test.tsx`. Expected: FAIL.
- [ ] **Step 4: Implement the component.**
  - **Tokens** in `FunnelChart.tokens.scss`, all defaulting to existing primitives or chart tokens:
    - `--funnel-chart-gap`
    - `--funnel-chart-pill-bg: var(--color-bg)` and `--funnel-chart-pill-fg: var(--color-fg)`
    - `--funnel-chart-value-size` and `--funnel-chart-value-weight`
    - `--funnel-chart-label-fg: var(--color-fg-muted)` and `--funnel-chart-label-size`
    - `--funnel-chart-dim-opacity: var(--chart-dim-opacity)`
    - `--funnel-chart-ring: var(--chart-ring)`
    - `--funnel-chart-transition`
  - **SCSS:** the root is a grid like `Chart`'s `.root`. Footer cells use `overflow-wrap: anywhere` (labels wrap and are never ellipsised). Path `transition: d var(--funnel-chart-transition), opacity …` is disabled under `prefers-reduced-motion`.
    - `ponytail:` CSS `d` transitions don't animate in Safari (it snaps). Use a JS tween only if Safari users notice.
  - **Orientation** comes from `orientationFor(rootSize.width, stages.length)`. Only horizontal is rendered in this task; Task 4 adds vertical.
- [ ] **Step 5: Run the tests again.** Run the FunnelChart tests and `src/components/Chart`. Expected: PASS.
- [ ] **Step 6: Commit** with `git commit -m "feat(FunnelChart): horizontal read-only funnel"`.

---

### Task 3: Clickable stages and `onActiveStageChange`

**Files:**
- Modify: `src/components/FunnelChart/FunnelChart.tsx`, `FunnelChart.module.scss`
- Test: `src/components/FunnelChart/FunnelChart.test.tsx`

**Interfaces:**
- Consumes: Task 2's DOM contract and props.
- Produces:
  - When `onStageClick` is set, each footer cell is `<button type="button" data-stage-cell>`. Its accessible name is `"{label}: {value}. {ofStage(step, prev)}. {ofStage(share, first)}."`. The first stage omits the step part, and undefined ratios are omitted.
  - The plot then has **no** `tabIndex` and no hint. Buttons are the tab stops (one per stage).
  - Hover or focus on a button activates its stage.
  - A pointer click on the shapes strip calls `onStageClick(stages[i], i)` for `i = stageIndexAt(...)`.

- [ ] **Step 1: Write the failing tests.**
  - With `onStageClick`, there are 5 buttons. The `Won` button's name matches `/^Won: 50\. 40% of Negotiation\. 4% of Leads\.$/`. Clicking it calls `onStageClick` with `(stages[4], 4)`, the original object (check with `toBe`). The plot has no `tabindex`.
  - `{Tab}` focuses the first button, its stage becomes active (others get `data-dimmed`) and the tooltip shows. `{Enter}` and `{Space}` each call `onStageClick`.
  - Review Focus 4: `fireEvent.click` on the shapes strip at `clientX: 450` calls `onStageClick(stages[4], 4)`.
  - Without `onStageClick`, there are no buttons, and stage cells are plain elements.
  - `onActiveStageChange`:
    - fires `(stages[1])` on pointer move at x=150;
    - fires `(null)` on pointer leave;
    - fires once per change, so moving within the same stage doesn't fire again;
    - keyboard inspection (read-only mode) and button focus (clickable mode) fire it too.
  - Review Focus 2: with stage 1 active, `rerender` with a **new array** holding the same data does not call `onActiveStageChange` again.
  - Review Focus 3: with stage 4 active via the keyboard, `rerender` with 3 stages calls `onActiveStageChange(null)`, the tooltip is gone and nothing is dimmed.
- [ ] **Step 2: Run them to make sure they fail.**
- [ ] **Step 3: Implement.**
  - Fire the callback from an effect keyed on the active stage's `key` (or `null`). Keep the callback in a ref so a new identity doesn't re-fire it.
  - When the index falls out of range, treat it as `null`.
  - Buttons use `:focus-visible` with `--funnel-chart-ring` (Hard rule 3a).
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit** with `git commit -m "feat(FunnelChart): clickable stages and active-stage callback"`.

---

### Task 4: Vertical layout for narrow containers

**Files:**
- Modify: `src/components/FunnelChart/FunnelChart.tsx`, `FunnelChart.module.scss`, `FunnelChart.tokens.scss`
- Test: `src/components/FunnelChart/FunnelChart.test.tsx`

**Interfaces:**
- Consumes: `orientationFor`; Tasks 2 and 3 cells, callbacks and table.
- Produces: with `data-orientation="vertical"`, the plot is a scrollable list of rows, one per stage. Each row is the same stage cell element as horizontal (button when clickable, `data-stage-cell`, `data-dimmed`). It contains:
  - a band: a `div` centred within a band track, with inline `inline-size: {heightRatio*100}%` (a data value, not a token) and a minimum of `MIN_THICKNESS` px through a token;
  - one text line: label, value and pill (the pill is omitted on the first stage).
  - Rows are compact: the band height is the `--funnel-chart-row-band-height` token (default `var(--space-2)`), and the row gap is the `--funnel-chart-row-gap` token.
  - The plot has `overflow-y: auto` (the last-resort scroll the user decided on). `DashboardWidget` is untouched.
  - `shape` has no effect in vertical: bands are rounded bars. This is my call, because tapers at row height read as noise.
  - In read-only mode, keyboard inspection uses `ArrowDown`/`ArrowUp` in addition to Right/Left. Pointer activation is per row (`onPointerEnter` on the row), not `stageIndexAt`.

- [ ] **Step 1: Write the failing tests.**
  - With `stubLayout(5*96 - 1, 300)` and 5 stages, `data-orientation="vertical"` is set and no shapes SVG is rendered. There are 5 `[data-stage-cell]` rows, and the Won row contains `Won`, `50` and `40%`.
  - With `stubLayout(5*96, 300)` and 5 stages, it is horizontal. With `stubLayout(5*96, 300)` and 6 stages, it is vertical (the switch follows the stage count).
  - In vertical read-only mode, focusing the plot and pressing `{ArrowDown}` activates Leads (the tooltip and live region show Leads).
  - In vertical clickable mode, clicking the Proposal row calls `onStageClick(stages[2], 2)`.
  - The band `inline-size` style for `q` is `50%`.
- [ ] **Step 2: Run them to make sure they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests again.** Expected: PASS. Also run `npx stylelint "src/components/FunnelChart/**/*.scss"` and expect it to be clean.
- [ ] **Step 5: Commit** with `git commit -m "feat(FunnelChart): vertical layout below min width per stage"`.

---

### Task 5: Export, docs, manifest, playground demo

**Files:**
- Modify: `src/index.ts` (export `FunnelChart`; types `FunnelChartProps`, `FunnelStage`, `FunnelShape`, `FunnelSlot`)
- Create: `docs/components/FunnelChart.md`
- Modify: `AI-PRIMER.md` (an index line next to `Chart`)
- Modify: `docs/components/Chart.md`, adding one "When NOT to use" line: "stage conversion (pipeline/campaign) → `FunnelChart`"
- Modify: `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs` (`FunnelChart: 'Display'` in both `CLUSTERS`)
- Create: `packages/playground/src/pages/components/FunnelChartDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (route `/components/funnel-chart`), `src/layout/AppShell/navItems.ts` (next to Chart, using the `Filter` or `ChartColumnDecreasing` lucide icon, whichever exists), `src/pages/components/ComponentsIndex.tsx`, `src/pages/components/overviewSchematics.tsx` (a small 4-stage eased schematic) and `src/pages/mockups/registry.ts` (`'FunnelChart'` in `ComponentName`)

**Interfaces:**
- Consumes: the public `FunnelChart` API from Tasks 2–4.

- [ ] **Step 1: Export and docs.**
  - `FunnelChart.md` follows `Chart.md`'s structure: TL;DR, a canonical snippet inside `DashboardWidget variant="chart"`, a snippet inline on a page, `onStageClick` drill-through plus an external headline driven by `onActiveStageChange`, and "When NOT to use".
  - "When NOT to use" covers time series (→ `Chart`), a single conversion ratio (→ `StatGroup`), and unordered categories (→ `Chart` bar).
  - Also note the percent semantics: the pill is the step conversion, and the tooltip also gives the share of the first stage.
  - Then run `npm run build:docs` and `npm run build:manifest`.
- [ ] **Step 2: Demo page** (`DemoLayout componentName="FunnelChart"`, following `ChartDemo.tsx`'s `Example` and `Cell` pattern). Include:
  - a default eased funnel in a resizable `DashboardWidget` cell (resize it narrow and the layout goes vertical);
  - `shape="sharp"`;
  - inline on a page with no widget;
  - clickable stages driving an external headline via `onActiveStageChange`, plus a "last clicked" readout;
  - 8 stages with long labels (wrapping);
  - an empty state with a footnote.
  - Use stable module-level `stages` and `formatValue` references.
- [ ] **Step 3: Verify.** From the repo root, run `npm test` (read the exit code) and `npm run typecheck`, `npm run lint` and `npm run format:check` (or the root equivalents the pre-push hook runs). Expected: all exit 0, including the manifest drift and `publicApi` tests.
- [ ] **Step 4: Commit** with `git commit -m "feat(FunnelChart): export, docs, manifest and playground demo"`.
- [ ] **Step 5: Demo check (user gate).** Start the playground on port 8090 or higher, then give the user `http://localhost:<port>/components/funnel-chart`. Wait for their OK before continuing.
- [ ] **Step 6: Open the PR** via the `pre-push-review` skill (variant A, Standard tier). Link DS-3 in the PR body.
