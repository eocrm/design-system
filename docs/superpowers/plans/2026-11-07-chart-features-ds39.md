# Chart features + MoneyInput dot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship per-series colour, tooltip detail rows, bar value labels, range selection + zoom on `Chart`; new `ScatterChart` and `Heatmap` components; and block the hand-typed `.` in MoneyInput for dot-grouping locales — one branch, patch 0.8.6.

**Architecture:** Pure geometry/data logic lives in Node-tested model files (`chartModel.ts`, new `chartRange.ts`, `scatterModel.ts`, `heatmapModel.ts`); components wire them in jsdom-tested `.tsx`. ScatterChart and Heatmap reuse `ChartLegend` / `ChartTooltip` / `ChartTable` and `markerShape` from `components/Chart/` by direct relative import (no extraction refactor). Touch/geometry behaviour that jsdom can't prove gets Playwright specs in `tests/`.

**Tech Stack:** React 18 + TS, SCSS modules + component token files, `d3-scale` (`scaleLinear`, `scaleTime`, `scaleSqrt`), `d3-shape`, Vitest (`unit` Node / `dom` jsdom), Playwright (`chromium` + `touch` projects), `node --test` in design-tokens.

**Spec:** `docs/superpowers/specs/2026-11-07-chart-features-ds39-design.md`

## Global Constraints

- Branch `feat/chart-features-ds39`; one PR; patch release 0.8.6 (do not edit `BUMP`).
- No new dependencies. Use `d3-scale` / `d3-shape` only.
- Hard rules in `packages/design-system/CLAUDE.md` apply to every task: tokens only (Rule 3), no layout props (Rule 4), `forwardRef` + rest spread (Rule 6), JSDoc on every exported prop/type (Rule 7), every user-visible string via i18n in `messages.ts` + `en.ts` + `ru.ts` (Rule 9), live region rendered unconditionally (Rule 10).
- Vitest globals: tests don't import `describe/it/expect/vi`. Pure logic → `*.test.ts` (Node); DOM → `*.test.tsx`.
- No exact counts on extensible collections in tests.
- Component token files use the `:root,\n:where(:root [data-theme='light'], :root [data-theme='dark'])` selector (structure test enforces it).
- New shared token primitives only in `packages/design-tokens/src/tokens.json` → `npm run tokens:generate` → `npm run tokens:check`; generated files committed, never hand-edited; Kotlin contract fixture gains only additions.
- Long-press constants: import `LONG_PRESS_MS` (300) and `LONG_PRESS_SLOP_PX` (8) from `components/DashboardCanvas/DashboardCanvas.tsx`; don't redefine.
- `ChartSeriesColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8`, mapping to `--chart-series-N`. No hex.
- The value shown on a value label, tooltip, announcement and table for the same datum must be the same `formatValue` string.
- Gates before PR: `make test` (read its exit code), `make build-lib`, `make lint`, `npm run format:check`, `npm pack -w @eocrm/design-system --dry-run` with no test files.

## Review Focus

1. **Zoomed index mapping** — after zoom, `details(i)` and markers must refer to the original category, not the zoomed position. Pinned in Task 5 (`sliceForZoom` keeps `originalIndex`) and Task 6 (details test while zoomed).
2. **Long-press vs scroll on a phone** — a vertical swipe over a selectable chart must scroll the page and must not start a selection. Pinned in Task 7 (Playwright `touch-chart-range.spec.ts`).
3. **Integer heatmap legends** — data 0..3 with `formatValue = String` must never show "1–1" or overlapping ranges. Pinned in Task 10 (`heatmapBuckets` integer test + legend-text uniqueness test).
4. **Explicit colour collisions** — series B with `color: 1` and unset series A: A must not also get slot 1. Pinned in Task 1.
5. **MoneyInput mobile path** — a `.` arriving through `onChange`/`beforeinput` with `inputType === 'insertText'` (no keydown, Android) must also be ignored in de. Pinned in Task 2.

---

### Task 1: Per-series colour (DS-24)

**Files:**
- Modify: `packages/design-system/src/components/Chart/chartModel.ts` (`ChartSeries`, `resolveSeries`)
- Modify: `packages/design-system/src/components/Chart/index.ts`, `packages/design-system/src/index.ts` (export `ChartSeriesColor`)
- Test: `packages/design-system/src/components/Chart/chartModel.test.ts`

**Interfaces:**
- Produces: `export type ChartSeriesColor = 1|2|3|4|5|6|7|8` (in `chartModel.ts`, JSDoc'd); `ChartSeries.color?: ChartSeriesColor`; `resolveSeries` assigns `slot` honouring `color`. Later tasks (ScatterChart) import `ChartSeriesColor` and a new helper `assignSlots(colors: (ChartSeriesColor | undefined)[]): { slot: number; overflow: boolean }[]` exported from `chartModel.ts`.

- [ ] **Step 1: Write failing tests** in `chartModel.test.ts`:
  - `assignSlots([undefined, 1])` → slots `[2, 1]` (unset skips claimed slot 1).
  - `assignSlots([3, 3])` → `[3, 3]` (explicit sharing allowed).
  - `assignSlots(Array(9).fill(undefined))` → slot of index 8 is 1 and `overflow: true`; indices 0–7 are 1–8, `overflow: false`.
  - `assignSlots([1,2,3,4,5,6,7,8, undefined])` → last slot wraps to 1 with `overflow: true`.
  - `resolveSeries('line', [{key:'a',…},{key:'b',color:1,…},{key:'b-prev', comparisonOf:'b', color:5,…}], n)` → a.slot 2, b.slot 1, b-prev.slot 1 (comparison ignores its own `color`).
  - Existing positional tests still pass unchanged.
- [ ] **Step 2: Run** `cd packages/design-system && npx vitest run src/components/Chart/chartModel.test.ts` → new tests FAIL.
- [ ] **Step 3: Implement** `assignSlots` (explicit first, then fill free slots in order 1..8; once free slots exhausted, wrap positionally `(i % 8) + 1` with `overflow: true`) and use it in `resolveSeries` for primaries. `overflowCount` = number of overflow primaries. JSDoc on `color` states: palette slot, overrides position, ignored on comparison series.
- [ ] **Step 4: Run** the test file → PASS. Run `npx vitest run src/components/Chart` → PASS.
- [ ] **Step 5: Commit** `feat(chart): per-series palette colour (DS-24)`.

### Task 2: MoneyInput ignores a typed `.` in dot-grouping locales (DS-39)

**Files:**
- Modify: `packages/design-system/src/components/_internal/currency.ts` (add helper)
- Modify: `packages/design-system/src/components/MoneyInput/MoneyInput.tsx` (keydown rule ~line 307, and the change/beforeinput path)
- Modify: `packages/design-system/src/components/NumberField/NumberField.tsx:242` (use the helper)
- Modify: `packages/design-system/docs/components/MoneyInput.md` (same note NumberField.md has about the typed `.`)
- Test: `packages/design-system/src/components/MoneyInput/MoneyInput.test.tsx`, `packages/design-system/src/components/_internal/currency.test.ts` (create if absent)

**Interfaces:**
- Produces: `export function typedDotIsAmbiguous(sep: { group: string; decimal: string }): boolean` — `sep.decimal !== '.' && sep.group === '.'`.

- [ ] **Step 1: Failing tests.**
  - `currency.test.ts`: `typedDotIsAmbiguous(localeSeparators('de-DE'))` true; same for `'es-ES'`, `'it-IT'`; false for `'ru-RU'`, `'fr-FR'`, `'en-US'`.
  - `MoneyInput.test.tsx` under `<LocaleProvider locale="de-DE">`, `currency="EUR"`: `userEvent.type(input, '1.234,5')` → `onChange` last called with `amount: "1234.5"` and input displays `1.234,5`.
  - de: typing `1.5` → amount `"15"` (dot ignored).
  - de, mobile path: fire `input` with `inputType: 'insertText', data: '.'` (no keydown, as NumberField's test does) → value unchanged.
  - de paste `1.234,5` → amount `"1234.5"` (unchanged behaviour).
  - ru-RU: typing `12.5` → amount `"12.5"` (numpad dot still becomes decimal).
- [ ] **Step 2: Run** `npx vitest run src/components/MoneyInput src/components/_internal` → new de tests FAIL.
- [ ] **Step 3: Implement.** Keydown: when `typedDotIsAmbiguous`, `preventDefault()` on `.` and do nothing; otherwise keep the existing dot→decimal rule. Mirror NumberField's onChange guard for `inputType === 'insertText' && data === '.' && !isComposing` (undo the inserted dot, restore caret). NumberField uses the helper instead of its inline expression (no behaviour change).
- [ ] **Step 4: Run** MoneyInput, NumberField and `_internal` tests → PASS.
- [ ] **Step 5: Commit** `fix(money-input): ignore a typed dot where it groups thousands (DS-39)`.

### Task 3: Tooltip detail rows (DS-12a)

**Files:**
- Modify: `Chart/Chart.tsx` (prop, tooltip rows, announcement, table column), `Chart/ChartTooltip.tsx`, `Chart/ChartTable.tsx`, `Chart/Chart.module.scss`
- Modify: `src/i18n/messages.ts`, `en.ts` (`'Details'`), `ru.ts` (`'Подробности'`): key `chart.details` (JSDoc: header of the data table's details column)
- Test: `Chart/Chart.test.tsx`

**Interfaces:**
- Produces: `ChartProps.details?: (categoryIndex: number) => string[]` — index is always the index into the `categories` prop as passed (Task 6 relies on this).

- [ ] **Step 1: Failing tests** in `Chart.test.tsx`:
  - With `details={(i) => i === 0 ? ['235 kcal', '5 times'] : []}`, ArrowRight to category 0 → tooltip contains `235 kcal` and `5 times`; the live region text ends with `235 kcal, 5 times`.
  - Data table has a column header `Details`; row 0 cell is `235 kcal; 5 times`, row 1 cell is empty.
  - Without `details`, no `Details` column exists.
  - Hiding every non-primary series via `hiddenSeries` leaves the detail rows intact.
- [ ] **Step 2: Run** `npx vitest run src/components/Chart/Chart.test.tsx` → FAIL.
- [ ] **Step 3: Implement.** Detail rows render after series rows in `ChartTooltip` as muted text without a swatch (`--chart-detail-fg` token = `var(--color-fg-muted)` in `Chart.tokens.scss`). JSDoc on `details` explains strings-only and where they appear.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(chart): per-category tooltip detail rows (DS-12)`.

### Task 4: Bar value labels (DS-12b)

**Files:**
- Modify: `Chart/chartModel.ts` (`LayoutInput.valueLabels?: boolean`, `ChartLayout.valueLabels: ValueLabel[]`, y-domain headroom), `Chart/Chart.tsx` (prop + render), `Chart/Chart.module.scss`, `Chart/Chart.tokens.scss` (`--chart-value-label-fg: var(--color-fg-muted)`, `--chart-value-label-size: var(--font-size-xs)` or nearest existing small size token)
- Test: `Chart/chartModel.test.ts`, `Chart/Chart.test.tsx`

**Interfaces:**
- Produces: `export interface ValueLabel { x: number; y: number; text: string; anchor: 'above' | 'below' }`; `ChartProps.valueLabels?: boolean`.

- [ ] **Step 1: Failing tests** (`chartModel.test.ts`, via `computeLayout`):
  - `bar`, one series `[52, 48]`, `formatValue: n => `${n} g``, width 400 → two labels `52 g`, `48 g`, each `x` equals its bar centre, `y` above bar top.
  - Negative value → `anchor: 'below'`, `y` below the bar end.
  - `null` value → no label for it.
  - Narrow: width such that band < `estimateTextWidth('52 g')` → `valueLabels` empty for those bars.
  - `stacked-bar` two series `[10, 20]` + `[5, 5]` → labels `15` and `25` at stack tops; hiding a series (visible series only passed) changes totals.
  - `line` with `valueLabels: true` → empty.
  - Headroom: tallest label's `y - textHeight ≥ plot.y`.
  - `Chart.test.tsx`: labels rendered `aria-hidden="true"`; text equals tooltip value for the same bar.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** in `computeLayout`; when `valueLabels` and type is `bar`/`stacked-bar`, reserve top headroom of one label line (constant `VALUE_LABEL_HEIGHT = 14`, alongside existing layout constants) before computing the y-scale.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(chart): optional bar value labels (DS-12)`.

### Task 5: Range + zoom model (DS-23, pure)

**Files:**
- Create: `packages/design-system/src/components/Chart/chartRange.ts`
- Test: `packages/design-system/src/components/Chart/chartRange.test.ts`

**Interfaces:**
- Produces:
  - `export interface ChartRange { from: string; to: string }` (JSDoc; re-exported publicly in Task 6)
  - `resolveRange(range: ChartRange | null | undefined, categories: readonly string[]): { from: number; to: number } | null` — first-match `indexOf`; unknown → `null`; swaps so `from ≤ to`.
  - `rangeFromIndices(a: number, b: number, categories: readonly string[]): ChartRange` — ordered.
  - `sliceForZoom(categories, series: readonly ChartSeries[], markers: readonly ChartMarker[], zoom: {from:number;to:number}): { categories: string[]; series: ChartSeries[]; markers: ChartMarker[]; originalIndex: (i: number) => number }` — markers fully outside dropped; spanning markers clipped to `from`/`to` category values; point markers outside dropped.

- [ ] **Step 1: Failing tests:**
  - `resolveRange({from:'Wed',to:'Mon'}, ['Mon','Tue','Wed'])` → `{from:0,to:2}`.
  - unknown category → `null`; `null` → `null`.
  - duplicates `['a','b','a']`, `{from:'a',to:'b'}` → `{from:0,to:1}`.
  - `sliceForZoom` over 5 categories, zoom `{from:1,to:3}` → 3 categories, every series' values sliced, `originalIndex(0) === 1`.
  - marker spanning categories 0..2 → clipped to `{from: cat1, to: cat2}`; point marker at 4 dropped.
- [ ] **Step 2: Run** `npx vitest run src/components/Chart/chartRange.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(chart): range + zoom model (DS-23)`.

### Task 6: Range selection + zoom wiring — mouse, keyboard, zoom UI (DS-23)

**Files:**
- Modify: `Chart/Chart.tsx`, `Chart/Chart.module.scss`, `Chart/Chart.tokens.scss` (`--chart-selection-fill: var(--color-accent)`, `--chart-selection-opacity: 0.16`, `--chart-selection-edge: var(--color-accent)`), `Chart/index.ts`, `src/index.ts` (export type `ChartRange`)
- Modify: i18n `messages.ts`/`en.ts`/`ru.ts` keys under `chart`: `zoomToSelection` ("Zoom to selection" / "Увеличить выделенное"), `resetZoom` ("Reset zoom" / "Сбросить масштаб"), `selected` ("Selected {from} to {to}" / "Выделено: {from} — {to}"; single category: `selectedOne` "Selected {category}" / "Выделено: {category}"), `selectionCleared` ("Selection cleared" / "Выделение снято"), and extend `keyboardHint` handling with `rangeHint` ("Shift+arrows select a range." / "Shift+стрелки выделяют диапазон.") appended to the description only when selection is enabled. Use the existing interpolation style in `messages.ts`.
- Test: `Chart/Chart.test.tsx`

**Interfaces:**
- Consumes: Task 5 functions; Task 3 `details` index contract.
- Produces: `ChartProps.selectedRange?`, `defaultSelectedRange?`, `onSelectedRangeChange?`, `zoomRange?`, `defaultZoomRange?`, `onZoomRangeChange?` (all `ChartRange | null`). Selection is enabled iff `onSelectedRangeChange` or `selectedRange` or `defaultSelectedRange` is passed. Use `useControllableState` like `hiddenSeries`.

- [ ] **Step 1: Failing tests** (jsdom; mock `getBoundingClientRect`/`useSize` the way existing pointer tests do):
  - Mouse: `pointerdown` on category 1, `pointermove` to category 3 (past 8px), `pointerup` → `onSelectedRangeChange({from: c1, to: c3})`; band element rendered.
  - Mouse click without movement → no selection change; tooltip shown (existing behaviour).
  - Click on a category outside the band → `onSelectedRangeChange(null)`; click inside → no call.
  - Keyboard: ArrowRight ×2 (to index 1), Shift+ArrowRight ×2 → range `{c1, c3}`; Shift+ArrowLeft shrinks; Escape clears selection first (call with `null`), second Escape clears inspection.
  - Live region announces `Selected c1 to c3`, then `Selection cleared`.
  - Zoom button `Zoom to selection` appears only with a selection; click → 3 categories rendered in table, selection cleared, `Reset zoom` appears; click → full categories back.
  - Controlled `zoomRange` with unknown category → full range rendered, dev warning once.
  - While zoomed to `{c2..c4}`, `details` receives original indices: inspecting first zoomed category calls `details(2)`.
  - Without selection props: drag does nothing, no zoom buttons, hint lacks range text.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Pointer state machine on the plot element for `pointerType === 'mouse' | 'pen'`: press records category + x; move past `LONG_PRESS_SLOP_PX` → dragging (set pointer capture, update provisional band); up → commit if dragging, else existing inspect behaviour (+ clear if outside band). Zoom buttons are `<Button size="xs" variant="ghost">` in the chart header row next to the legend (layout via existing header container / `Cluster`). Zoomed state feeds `sliceForZoom` before `resolveSeries`/`resolveMarkers`; y-domain therefore rescales naturally. Band uses the marker band geometry (`layoutMarkers`-style x span from `categoryX`/`step`).
- [ ] **Step 4: Run** Chart tests → PASS.
- [ ] **Step 5: Commit** `feat(chart): range selection and zoom (DS-23)`.

### Task 7: Range selection on touch — long-press (DS-23)

**Files:**
- Modify: `Chart/Chart.tsx`, `Chart/Chart.module.scss` (`-webkit-touch-callout: none; user-select: none;` on the plot only when selection enabled; `touch-action` stays `pan-y` until a long-press lifts, then the handler calls `preventDefault` on `touchmove` for that touch only)
- Modify: `packages/playground/src/pages/components/ChartDemo.tsx` (add a "Range selection" example: bowl weight per minute, `onSelectedRangeChange` showing the chosen range in a `Text` below) — needed by the spec.
- Test: `Chart/Chart.test.tsx` (fake timers), Create: `tests/touch-chart-range.spec.ts`

**Interfaces:**
- Consumes: `LONG_PRESS_MS`, `LONG_PRESS_SLOP_PX` from DashboardCanvas.

- [ ] **Step 1: Failing tests.**
  - jsdom, `pointerType: 'touch'`: `pointerdown` at c1, advance 300ms, `pointermove` to c3, `pointerup` → range `{c1,c3}`.
  - touch: `pointerdown`, advance 300ms, `pointerup` without moving → `{c1,c1}`.
  - touch: `pointerdown`, move 20px before 300ms → no selection; timer cancelled (advance further, still none).
  - touch: quick tap → tooltip shown, no selection.
  - touch: with a selection `{c1,c2}`, quick tap on c4 → `onSelectedRangeChange(null)`; quick tap on c1 → no call.
  - Playwright `touch-chart-range.spec.ts` (touch project, Pixel 7) on the ChartDemo range example: (a) vertical swipe over the plot scrolls the page (`window.scrollY` increases) and leaves the readout empty; (b) long-press 400ms then horizontal move then release → readout shows a range.
- [ ] **Step 2: Run** `npx vitest run src/components/Chart/Chart.test.tsx` and `npx playwright test tests/touch-chart-range.spec.ts --project=touch` (dev server per existing config, port 8090+) → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** both → PASS.
- [ ] **Step 5: Commit** `feat(chart): long-press range selection on touch (DS-23)`.

### Task 8: ScatterChart model (DS-16, DS-17)

**Files:**
- Create: `packages/design-system/src/components/ScatterChart/scatterModel.ts`, `scatterModel.test.ts`

**Interfaces:**
- Consumes: `assignSlots`, `ChartSeriesColor`, `estimateTextWidth`, `markerShape` from `../Chart/chartModel`.
- Produces (types also re-exported publicly in Task 9):
  - `ScatterPoint { x: number | Date; y: number; size?: number; label?: string }`, `ScatterSeries { key; label; points: ScatterPoint[]; color?: ChartSeriesColor }`, `ScatterReference { label: string; points: { x: number | Date; y: number }[] }`, `ScatterXScale = 'number' | 'time'`.
  - `computeScatterLayout(input: { series: ResolvedScatterSeries[]; xScale; xDomain?; yDomain?; width; height; formatX; formatY; reference?; trendLine?: boolean; sizeRange: [number, number] }): ScatterLayout` with `plot: Rect`, `xTicks/yTicks: {value; pos; label}[]`, `dots: { seriesKey; slot; index; cx; cy; r; datum }[]` (sorted by r descending for paint order), `referencePath?: string`, `trends: { seriesKey; slot; path: string }[]`.
  - `resolveScatterSeries(series: ScatterSeries[]): ResolvedScatterSeries[]` (slot via `assignSlots`; drops non-finite x/y; x normalized to epoch ms number).
  - `linearFit(points: {x:number;y:number}[]): { slope: number; intercept: number } | null` — null when < 2 distinct x.
  - `inspectionOrder(series visible): { seriesKey; index }[]` — sorted by x, ties by series order then point index.
  - `nearestDot(layout, px, py, maxDistance): dot | null`.

- [ ] **Step 1: Failing tests:**
  - `linearFit([{x:0,y:1},{x:1,y:3},{x:2,y:5}])` → slope 2, intercept 1; all same x → null; one point → null.
  - Domain default: all y ≥ 0 → y domain starts at 0 and is nice-rounded; negative y → includes min.
  - `xScale: 'time'` with `Date` x → ticks use `scaleTime().ticks()`, labels via `formatX(epochMs)`; at width 390 tick labels don't overlap (`estimateTextWidth` + gap).
  - Size: points with sizes 1 and 100, `sizeRange [3, 12]` → r 3 and 12 (sqrt scale, area-proportional: size 25 → r between, equal to `sqrt` interpolation); no `size` → `DOT_RADIUS`.
  - Paint order: larger r first.
  - `inspectionOrder` ties ordered by series order.
  - Trend for a series with 1 point → no trend entry; trend spans the series' own x extent.
  - Non-finite x or y dropped.
- [ ] **Step 2: Run** `npx vitest run src/components/ScatterChart/scatterModel.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(scatter-chart): layout model (DS-16, DS-17)`.

### Task 9: ScatterChart component (DS-16, DS-17)

**Files:**
- Create: `src/components/ScatterChart/ScatterChart.tsx`, `ScatterChart.module.scss`, `ScatterChart.tokens.scss` (`--scatter-dot-min`, `--scatter-dot-max` as px tokens defaulting to existing size primitives; `--scatter-trend-dash`, `--scatter-reference-color: var(--color-fg-muted)`), `ScatterChart.test.tsx`, `index.ts`
- Modify: `src/index.ts` (component + all public types), styles index if component token files are registered centrally (follow how `Chart.tokens.scss` is wired)
- Modify: i18n — `scatterChart.keyboardHint`, reuse `chart.empty`/`chart.noData`
- Test: `ScatterChart.test.tsx`

**Interfaces:**
- Consumes: Task 8 model; `ChartLegend`, `ChartTooltip`, `ChartTable` from `../Chart/…`; `useSize`, `useControllableState`, `useTranslation` as Chart does.
- Produces: `ScatterChart` (forwardRef to the `figure`), `ScatterChartProps` exactly as in spec §4.

- [ ] **Step 1: Failing tests:** renders dots per visible point with `aria-hidden` SVG and a figure labelled by `label`; ref forwarded; className merged; legend toggle hides a series (controlled `hiddenSeries` round-trip); ArrowRight walks `inspectionOrder`, announcement contains series label, `formatX`, `formatY`, `formatSize` + `sizeLabel` when size present, and point `label`; Home/End; Escape clears; data table one row per point with headers `xLabel`, `yLabel`, `sizeLabel`; empty state when no points (`emptyMessage` override); `trendLine` renders one trend path per series with ≥2 distinct x; `reference` renders a dashed path and appears in the legend with its label; dev warning when a point has `size` but `formatSize` is missing.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Pointer: nearest dot within 24px → tooltip (tap leaves it open; dismiss on outside press like Chart). JSDoc per Rule 7, component JSDoc one line + `@see docs/components/ScatterChart.md`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(scatter-chart): ScatterChart component (DS-16, DS-17)`.

### Task 10: Heatmap tokens + model + component (DS-18)

**Files:**
- Modify: `packages/design-tokens/src/tokens.json` (`heatmap.1`…`heatmap.5`, light + dark, web `--color-heatmap-1..5`, Compose outputs following `chart.series.*`), generated outputs, contract fixture (additions only)
- Create: `packages/design-tokens/test/heatmap-ramp.test.mjs`
- Create: `src/components/Heatmap/heatmapModel.ts`, `heatmapModel.test.ts`, `Heatmap.tsx`, `Heatmap.module.scss`, `Heatmap.tokens.scss` (`--heatmap-step-1..5` → `--color-heatmap-1..5`, `--heatmap-empty: var(--color-bg-muted)`, `--heatmap-empty-outline: var(--color-border)`, `--heatmap-gap: 2px`→ use an existing space/border token), `Heatmap.test.tsx`, `index.ts`
- Modify: `src/index.ts`; i18n `heatmap.keyboardHint`, `heatmap.noData` ("No data" / "Нет данных"), `heatmap.row`/`heatmap.column` only if the table needs a corner header (else reuse `chart.category`)

**Interfaces:**
- Produces:
  - `heatmapBuckets(values: readonly (number|null)[][]): { thresholds: number[]; steps: (1|2|3|4|5)[]; integer: boolean } | null` (null when no finite values).
  - `bucketOf(value: number, b): number` (index into `steps`).
  - `legendEntries(b, formatValue): { step; text }[]`.
  - `Heatmap` + `HeatmapProps` as spec §5.

- [ ] **Step 1: Failing tests.**
  - `heatmap-ramp.test.mjs` per theme: OKLab L strictly monotonic 1→5 (light: decreasing; dark: increasing); adjacent ΔE_ok ≥ 0.06; step 1 ΔE_ok ≥ 0.04 from `--color-bg` value; step 5 WCAG contrast ≥ 3 vs `--color-bg`. Reuse colour-math helpers from `chart-palette.test.mjs` (import or copy into a shared `test/tooling` module if they're local).
  - `heatmapBuckets` integer data `[[0,1],[2,3]]` → 4 buckets, steps `[1,2,4,5]`, `legendEntries(…, String)` texts `['0','1','2','3']`.
  - All equal `[[5,5]]` → 1 bucket, step `[3]`.
  - Continuous `[[0, 0.37], [12.5, 99.9]]` → ≤ 5 buckets, thresholds nice (each a d3 tick), every value maps to exactly one bucket, min → first, max → last.
  - Legend texts unique and non-overlapping for integer data 0..7 and for 0..3 with `formatValue = n => `${n} g``.
  - Only nulls → `null`.
  - `Heatmap.test.tsx`: renders rows × columns cells; ref/className; null cell has the empty class and is announced "No data"; arrows move by cell, Home/End within row, Ctrl+Home/End corners, Escape clears; announcement `Mon, 07: 12 g`; data table rows × columns with formatted values; legend shows "No data" only when a null exists; empty state when no finite values.
- [ ] **Step 2: Run** `npm test -w @eocrm/design-tokens` and `npx vitest run src/components/Heatmap` → FAIL.
- [ ] **Step 3: Implement.** Pick ramp values (single blue hue near `chart.series.1`) that pass the validator; `npm run tokens:generate && npm run tokens:check`. Bucketing: if all finite values are integers and `max - min + 1 ≤ 5`, one bucket per integer; else `scaleLinear().domain([min,max]).nice().ticks(5)` thresholds. Step spread table: 1 → [3], 2 → [1,5], 3 → [1,3,5], 4 → [1,2,4,5], 5 → [1..5]. SVG cells fill width, column labels thinned with `thinLabels`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(heatmap): Heatmap component + sequential tokens (DS-18)`.

### Task 11: Docs, manifest, playground wiring

**Files:**
- Create: `packages/design-system/docs/components/ScatterChart.md`, `Heatmap.md` (H1 `` # `ScatterChart` — <summary> ``, TL;DR, canonical snippet, "When NOT to use", generated props table)
- Modify: `docs/components/Chart.md` (sections for `color`, `details`, `valueLabels`, range selection + zoom incl. gestures table; remove "zoom unsupported" note; point scatter/heatmap "not supported" lines to the new components), `AI-PRIMER.md` (index lines), `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` (`ScatterChart: 'Display'`, `Heatmap: 'Display'`), run `npm run build:manifest` and `npm run build:docs`
- Create: `packages/playground/src/pages/components/ScatterChartDemo.tsx`, `HeatmapDemo.tsx` (Home Hub-like data: meals today on a time axis sized by grams with a usual-pace reference; bowl size vs eaten with trend; weekday × hour grams with some nulls)
- Modify: `ChartDemo.tsx` (examples for `color`, `details` + `valueLabels`; the range example from Task 7 gets a zoom note), `packages/playground/src/App.tsx`, `src/layout/AppShell/navItems.ts`, `src/pages/components/ComponentsIndex.tsx`, `src/pages/components/overviewSchematics.tsx`, `src/pages/mockups/registry.ts` (`ComponentName` union)
- Test: existing manifest drift / docs / publicApi tests

- [ ] **Step 1:** Write docs + demos + wiring.
- [ ] **Step 2: Run** `cd packages/design-system && npm run build:docs && npm run build:manifest`, then `make test` (exit code 0), `make build-lib`, `make lint`, `npm run format:check`.
- [ ] **Step 3: Commit** `docs: ScatterChart, Heatmap, Chart range/colour/details docs + playground demos`.
