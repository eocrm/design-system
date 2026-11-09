# Charts batch (DS-58) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the marker icon gap and marker label colour (DS-56), add reference line `emphasis` (DS-57), and ship a
new `DonutChart` component (DS-55).

**Architecture:**

- DS-56 and DS-57 are small changes to `Chart` and `ScatterChart`.
- `DonutChart` is a new component modelled on `FunnelChart`: a single series, a click-to-drill callback, and a share
  column. The pure geometry lives in `donutModel.ts`, which is tested in Node. The rendering, keyboard, tooltip,
  live region and table live in `DonutChart.tsx`, which is tested in jsdom.

**Tech Stack:** React 18 + TypeScript, SCSS modules + component tokens, `d3-shape` `arc`/`pie` (already a dependency),
Vitest.

**Spec:** `docs/superpowers/specs/2026-11-09-charts-batch-ds58-design.md`. It is binding, including "My calls" and
"Builder-check answers".

## Global Constraints

- Library Hard rules (`packages/design-system/CLAUDE.md`):
  - SCSS uses tokens only, and components own no layout.
  - `forwardRef` + spread.
  - JSDoc on every exported prop, type and field.
  - i18n in en + ru for any new string.
  - Hard rule 10 (transient state reaches screen readers).
- The Core invariant (root `CLAUDE.md`) applies to `DonutChart`: tests, a demo, the four playground wiring files plus
  the `ComponentName` union, the `src/index.ts` export, `docs/components/DonutChart.md`, the AI-PRIMER line, and the
  CLUSTERS entry in **both** `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`, followed by
  `npm run build:manifest`.
- Charts and ScatterCharts that use none of the new inputs must not change: same layout and DOM. This means a marker
  with no icon, a marker with no colour, and a reference with no emphasis.
- Every new prop goes in its docs page (then `npm run build:docs` in `packages/design-system`) and in the playground
  demo. Use a unique chart `label` per demo: Playwright locates charts by name.
- Run tests from `packages/design-system` with `npx vitest run src/components/<Dir>`.
- Before each commit, from the repo root, run `make test` (read the exit code), `make lint` and
  `npm run format:check`.
- Plain commit messages: no Co-Authored-By and no session trailers.

## Review Focus

1. **A one-segment donut (100%)** draws a full ring. A d3 arc from 0 to 2π, with padding, must not vanish or draw a
   sliver. Task 2 test.
2. **Tiny segments with the minimum angle:** with `[1000, 1, 1]` the arcs still sum to exactly 2π. Small segments
   are inflated, large ones shrink proportionally, and the percentages stay real (0.1%). Task 2 test.
3. **Every segment at 0, or negative, or NaN** shows the empty state, with no NaN in any path `d`. Task 2 + Task 3
   tests.
4. **Keyboard roving with zero segments in the middle:** ArrowRight skips them and wraps at the end. Enter on a
   focused segment calls `onSegmentClick` with the original segment object. Task 3 test.
5. **A marker with `icon` and `placement: 'top'`** (2 gutter rows) plus the gap: the icon and the top label don't
   overlap, and the label stays above the plot. Task 1 test.

---

### Task 1: DS-56 marker icon gap + label colour, DS-57 reference emphasis

**Files:**

- `Chart/chartModel.ts`: `markerGutterRows` callers, `ChartReferenceLine`, and the reference geometry.
- `Chart/Chart.tsx`: the gutter height (around line 563), `gutterBaseline` (around 269), the marker label `<text>`
  (around 1360-1390), and the reference render.
- `Chart/Chart.module.scss` and `Chart/Chart.tokens.scss`.
- `Chart/ChartLegend.tsx`: the dash swatch width.
- `ScatterChart/scatterModel.ts` (`ScatterReference`), `ScatterChart.tsx`, `ScatterChart.module.scss` and
  `ScatterChart.tokens.scss`.
- Tests in `Chart.test.tsx`, `chartModel.test.ts` and `ScatterChart.test.tsx`.
- Docs: `docs/components/Chart.md` and `ScatterChart.md`.
- Demo: `ChartDemo.tsx` and `ScatterChartDemo.tsx` (set `emphasis: 'strong'` on one reference, and use an icon marker
  with `color`).

**Interfaces (produces):**

- New tokens:
  - `--chart-marker-icon-gap: var(--space-1)`
  - `--chart-reference-width-strong: var(--border-width-strong)`
  - `--scatter-reference-width-strong: var(--chart-reference-width-strong)`
- An exported constant `MARKER_ICON_GAP = 4` in `chartModel.ts`, which mirrors `--space-1` for layout math. Add a
  comment saying the two must stay in sync, as `MARKER_LABEL_BASELINE` does.
- Gutter height becomes `gutterRows * MARKER_LABEL_BASELINE + (anyIcon ? MARKER_ICON_GAP : 0)`.
  - The icon baseline is lifted by the gap: it sits at `gutterBaseline(1)` in a gutter that is now `MARKER_ICON_GAP`
    taller. With 2 rows, the top label stays the row just above the plot.
  - The implementer derives the exact y values; the test pins the result.
- A marker label with `color` gets `data-slot` / `style` `--chart-series-color` (the existing `seriesStyle(slot)`).
  A `.markerLabelColored` class sets `fill: var(--chart-series-color)` and keeps the halo stroke.
- `emphasis?: 'default' | 'strong'` on `ChartReferenceLine` and `ScatterReference`, with JSDoc: "`'strong'` draws
  the line at `--chart-reference-width-strong` so one line stands out, e.g. today's pace over the usual. Default
  `'default'`."
  - It is rendered as `data-emphasis="strong"` on the line and on the legend swatch `<svg>`.
  - The CSS picks the width from that attribute.
  - Add `emphasis?: 'strong'` to the legend item type.

- [ ] **Step 1: Failing tests.**
  - Chart, a marker with `icon` and no top label:
    - the gutter (`plot.y`) is `MARKER_LABEL_BASELINE + MARKER_ICON_GAP` past the padding;
    - the icon's `y` + the gap ≤ `plot.y`.
  - Chart, a marker with `icon` + `placement: 'top'` label: the icon's y < the label's y − `MARKER_LABEL_BASELINE`
    - 1, and the label's y < `plot.y`. This is Review Focus 5.
  - Chart, markers without icons: `plot.y` is identical to the value on main. Assert against a layout computed
    without markers + `topGutter: MARKER_LABEL_BASELINE` for a top-label-only marker.
  - Chart, a marker `{ color: 2, label: 'x' }`: the label `<text>` carries the slot-2 colour (class + style), and a
    marker without `color` doesn't.
  - Chart `referenceLines=[{value:1,label:'a'},{value:2,label:'b',emphasis:'strong'}]`: exactly one line and one
    legend swatch have `data-emphasis="strong"`.
  - ScatterChart: the same emphasis check on `reference`.
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement per the Interfaces block. Update both docs pages (the prop text + a sentence on the icon
      gap) and run `npm run build:docs`. Update both demos.
- [ ] **Step 4:** Run the tests and confirm they PASS. Run the gates, then commit
      `fix(chart): marker icon gap and label colour, reference line emphasis (DS-56/57)`.

### Task 2: `donutModel.ts` (DS-55 geometry)

**Files:**

- Create `src/components/DonutChart/donutModel.ts` and `donutModel.test.ts` (Node).

**Interfaces (produces):**

- `DonutSegment = { key: string; label: string; value: number; color?: ChartSeriesColor }`, exported with JSDoc. It
  imports `ChartSeriesColor` from `../Chart/chartModel`.
- `MIN_SEGMENT_ANGLE = 0.06` (radians, about 3.4°), exported.
- `resolveDonut(segments: readonly DonutSegment[]): ResolvedDonut`, where
  `ResolvedDonut = { total: number; segments: ResolvedSegment[]; overflow: boolean; invalid: string[] }` and
  `ResolvedSegment = { segment: DonutSegment; value: number; share: number; slot: number; start: number; end: number; drawn: boolean }`.
  - `value` is the clamped value. Non-finite and negative values become 0, and their keys go into `invalid` so the
    component can dev-warn.
  - `share` is `value / total` (0 when the total is 0).
  - `slot` comes from `assignSlots` (Chart). `overflow` is true if any slot overflowed, which means more than 8
    segments without enough free slots.
  - Angles are in radians, clockwise from 0 (12 o'clock).
  - `drawn` is `value > 0`.
  - Every drawn segment spans at least `MIN_SEGMENT_ANGLE`. The others shrink proportionally, so the drawn spans
    sum to exactly 2π.
  - A segment that isn't drawn has `start === end`.
- `donutArcPath(start: number, end: number, outer: number, inner: number, padAngle: number): string`. It uses
  d3-shape `arc()`.
  - A single drawn segment covering 2π gets padAngle 0, so it is a full ring.
- `donutRadii(size: number, thickness: number): { outer: number; inner: number }`, where `outer = size / 2` and
  `inner = max(0, outer - thickness)`.

- [ ] **Step 1: Failing tests:**
  - shares `[12,5,30]` → `12/47` and so on;
  - drawn spans sum to 2π within 1e-9;
  - `[1000,1,1]` → each small span ≥ `MIN_SEGMENT_ANGLE`, the sum is still 2π, and the shares stay real
    (`1/1002`). Review Focus 2.
  - `[5]` → one segment from 0 to 2π, and `donutArcPath` returns a non-empty path with no `NaN`. Review Focus 1.
  - `[0, 5, -3, NaN]`:
    - total 5;
    - the `value` 0 entries have `drawn` false and share 0;
    - `invalid` holds the keys of −3 and NaN.
  - all zero → total 0, nothing drawn, and every share is 0 with no NaN. Review Focus 3.
  - 9 segments with no colours → `overflow` true.
  - `color: 3` on the second segment → slot 3, and the others skip 3.
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests and confirm they PASS. Commit `feat(donut-chart): geometry model (DS-55)`.

### Task 3: `DonutChart` component (DS-55)

**Files:**

- Create in `src/components/DonutChart/`: `DonutChart.tsx`, `DonutChart.module.scss`, `DonutChart.tokens.scss`,
  `DonutChart.test.tsx` and `index.ts`.
- Modify `src/index.ts`, `src/i18n/messages.ts`, `en.ts`, `ru.ts`, and the tokens aggregation file where the other
  `*.tokens.scss` are imported (follow `FunnelChart`).

**Reference implementation:** `src/components/FunnelChart/FunnelChart.tsx` gives the pattern for: the figure root
and props spread; the roving plot with keyboard, tooltip, live region and the data-table toggle; the stage-click
drill-through as a button-like segment; empty state; footnote; and responsive sizing. Copy its patterns, not its
geometry. Reuse `ChartTooltip` and `ChartLegend` from `../Chart` where their props fit.

**Interfaces:**

- **Consumes:** Task 2 (`resolveDonut`, `donutArcPath`, `donutRadii` and `DonutSegment`).
- **`DonutChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'>`:**
  - `label: string`
  - `segments: DonutSegment[]`
  - `formatValue: (n: number) => string`
  - `centerLabel?: string`
  - `showTotal?: boolean` (default `true`)
  - `onSegmentClick?: (segment: DonutSegment) => void`
  - `emptyMessage?: ReactNode`
  - `footnote?: ReactNode`
  - JSDoc on each, per the spec. The component JSDoc is one line + `@see docs/components/DonutChart.md`.
- **Exports:** `export { DonutChart }` and `export type { DonutChartProps, DonutSegment }`, from `index.ts` and
  `src/index.ts`.
- **i18n keys under `donutChart`:**
  - `keyboardHint` ("Use arrow keys to inspect segments. The data table lists every value." / ru)
  - `total` ("Total" / "Всего")
  - `segment` ("Segment" / "Сегмент")
  - `value` ("Value" / "Значение")
  - `share` ("Share" / "Доля")
  - `empty` ("No data" / "Нет данных")
- **Tokens** (`--donut-*`): ring thickness (`--space-6`-ish, the builder picks), segment gap (as a stroke of
  `--color-bg`, or padAngle derived from a token), centre value size `--font-size-2xl`, centre label size and fg
  muted, dim opacity for the non-active segments, focus ring = `--chart-ring`.
- **DOM contract** (for tests and Playwright):
  - The root is `<figure>`, and the ref points to it.
  - The plot `<svg>` (or a wrapper) has `role="group"`, an accessible name of `label`, a description of
    `keyboardHint`, and `tabIndex=0`.
  - Each drawn arc is a `<path data-segment={key} data-slot={slot}>`, and the active one gets `data-active`.
  - The centre is two `<text>` elements or an HTML overlay: value and caption.
  - The live region is always rendered (Hard rule 10 pattern, as in FunnelChart).
  - The legend is a list. With `onSegmentClick`, each drawn segment's entry is a `<button type="button">` labelled
    "{label}: {value}, {pct}". Zero segments are plain text.
  - The visually hidden `<table>` has the caption `label` and the columns segment / value / share.
- **Percent format:** `Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 })`, where `locale`
  comes from `useLocale`.
- **Dev warnings, once each:**
  - `invalid` keys: "[DonutChart] Ignored non-finite or negative value for segment(s) …: counted as 0."
  - `overflow`: "[DonutChart] More than 8 segments: colours repeat. Group the smallest into "Other"."

- [ ] **Step 1: Failing tests** (jsdom):
  - The figure renders with `label` as the name. `ref` reaches the `<figure>`, and `className` is merged.
  - It draws three `[data-segment]` paths for `[12,5,30]`. The centre shows `formatValue(47)` and `centerLabel`, and
    shows the "Total" default when `centerLabel` is omitted. `showTotal={false}` renders no centre.
  - Focus the plot, then press ArrowRight: the centre shows "12", the share "25.5%" and "To do". The live region
    has the "To do: 12, 25.5%" text. The first segment is `data-active`.
  - With `[{a:5},{b:0},{c:3}]`, ArrowRight twice goes a→c, and a third press wraps to a. Enter calls
    `onSegmentClick` with the original `c` object. Escape clears the centre back to the total. This is Review
    Focus 4.
  - Clicking a legend button calls `onSegmentClick`. A zero segment's legend entry is not a button. Without
    `onSegmentClick` there are no buttons.
  - The table has a caption, three header columns, one row per segment (including zero), and the shares are
    formatted.
  - All values 0 → the `emptyMessage` (or the default "No data") shows, with no `[data-segment]`. Review Focus 3.
  - Dev warnings fire for a negative value and for 9 segments, using `vi.spyOn(console, 'warn')`.
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement. Hover on a path does the same as keyboard inspection (dim the others, swap the centre,
      show the tooltip). Hover and click on the arcs apply only to drawn segments.
- [ ] **Step 4:** Run the tests and confirm they PASS. Run `make test`, which includes `publicApi.test.ts`. Commit
      `feat(donut-chart): DonutChart component (DS-55)`.

### Task 4: DonutChart docs, demo, wiring, manifest

**Files:**

- In `packages/design-system/`:
  - `docs/components/DonutChart.md`: the H1 ``# `DonutChart` — part-of-whole donut with a centre total and drill-through segments``,
    then a TL;DR, a canonical snippet (the Status overview example from the spec), "When NOT to use", the props
    table via `npm run build:docs`, and the >8 → "Other" guidance.
    - For "When NOT to use": comparing many categories means `Chart type="bar"`; a single value means
      `CircularProgress`; change over time means `Chart`.
  - `AI-PRIMER.md`: the index line next to FunnelChart.
  - `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs`: `DonutChart: 'Display'` (the same cluster as
    FunnelChart). Then run `npm run build:manifest`.
- In `packages/playground/src/`:
  - `pages/components/DonutChartDemo.tsx` (import only from `@eocrm/design-system`), with these demos:
    - Status overview with a click toast;
    - small segments;
    - empty;
    - inside a `DashboardWidget variant="chart"`.
  - Wiring: `App.tsx` (route), `layout/AppShell/navItems.ts`, `pages/components/ComponentsIndex.tsx`,
    `pages/components/overviewSchematics.tsx`, and the `ComponentName` union in `pages/mockups/registry.ts`.
    Follow how FunnelChart is wired.

- [ ] **Step 1:** Write the docs and the AI-PRIMER line. Run `npm run build:docs` and `npm run build:manifest`.
- [ ] **Step 2:** Write the demo and the wiring.
- [ ] **Step 3:** From the repo root, run `make test && make build-lib && make lint && npm run format:check`, and
      `npm run test:focus-geometry` (Playwright; it must stay green).
- [ ] **Step 4:** Commit `docs(donut-chart): docs, playground demo and manifest (DS-55)`.

### Task 5: DS-59 linkable `StatTile`

**Files:**

- In `packages/design-system/src/components/StatGroup/`: `StatTile.tsx`, `StatTile.module.scss`,
  `StatTile.tokens.scss` and `StatGroup.test.tsx`. Also `docs/components/StatTile.md` (then `npm run build:docs`)
  and the StatGroup line in `AI-PRIMER.md` if it says tiles are read-only.
- Demo: `packages/playground/src/pages/components/StatGroupDemo.tsx`. Add a "Linked tiles" example using `<a href>`
  plus a footnote `Link`.

**Interfaces (produces):**

- `link?: ReactElement` on `StatTileProps`, with JSDoc: "An empty link element (`<a href>`, a router `Link`, the DS
  `Link`) that makes the tile body one click target. StatTile clones it, merges its class and sets the body as its
  children. The footnote stays outside, so it can hold a secondary `Link`."
- Rendering:
  - Without `link`, the DOM is unchanged.
  - With `link`, the `<li>` contains the cloned element, which wraps the existing body. The footnote is a sibling
    after it.
  - While the group is loading, the tile renders as if there were no `link`.
- New tokens: `--stat-tile-link-hover-bg` (the builder maps it to the existing surface-hover primitive, in keeping
  with LinkCard) and a focus ring that reuses the ring tokens LinkCard uses.
- A dev warning, once per tile: "[StatTile] `link` must be an empty element; its children are replaced."

- [ ] **Step 1: Failing tests** in `StatGroup.test.tsx`:
  - `link={<a href="/x" />}`: the tile has one link with `href` "/x". Its accessible name contains the label and the
    value. The footnote text is not inside the link. The `<li>` is still the ref target and keeps the `data-*` from
    the props.
  - A custom component `link={<Fake to="/y" />}` (a test component rendering `<a href={to}>`): its `className`
    receives StatTile's class merged with its own `className="mine"`.
  - A footnote containing a `Link`: two links in the tile, not nested.
  - `StatGroup loading`: no link is rendered.
  - A `link` with children: a dev warning fires, and the body replaces them.
  - Without `link`: no link, and the markup is otherwise the same as before (assert there's no `a` and the body
    class is present).
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement. Update the docs: replace the read-only anti-pattern, add the footnote-link pattern and
      the "link with children" anti-pattern. Update the demo.
- [ ] **Step 4:** Run the tests and confirm they PASS. Run the gates, then commit
      `feat(stat-tile): linkable tile via link element slot (DS-59)`.
