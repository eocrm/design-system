# Chart annotations + reference lines (DS-54) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `referenceLines` (DS-53) and `annotations` (DS-52) to `Chart` so Home Hub can delete `ChartBarBadge.tsx`.

**Architecture:** Both are pure-model additions in `chartModel.ts` (y-domain and room, geometry) rendered by `Chart.tsx`,
with labels flowing into the existing tooltip, announcement, table and legend paths. Reference lines reuse the DS-50 dash
tokens and legend dash swatch; annotations reuse the value-label room logic.

**Tech Stack:** React 18 + TypeScript, SCSS modules + component tokens, Vitest (Node `*.test.ts`, jsdom `*.test.tsx`).

**Spec:** `docs/superpowers/specs/2026-11-09-chart-annotations-reference-lines-design.md` — binding, including its
"My calls" and "Builder-check answers".

## Global Constraints

- Library Hard rules (`packages/design-system/CLAUDE.md`): tokens only, no layout props, JSDoc on every exported
  prop, type and field, i18n en + ru for any new string, Hard rule 10.
- Charts that use neither prop must not change: identical layout, DOM and table.
- Export new types from `Chart/index.ts` and `src/index.ts` (`src/publicApi.test.ts` checks this).
- Every new prop goes in `docs/components/Chart.md` (then `npm run build:docs` in `packages/design-system`) and in
  `packages/playground/src/pages/components/ChartDemo.tsx`, which imports only from `@eocrm/design-system`.
  Use a unique chart `label` per demo: Playwright locates charts by name.
- Run tests from `packages/design-system` with `npx vitest run src/components/Chart`. Before each commit, from the
  repo root: `make test` (read the exit code), `make lint`, `npm run format:check`.
- Plain commit messages: no Co-Authored-By, no session trailers.

## Review Focus

1. A reference value far outside the data, or negative on a positive chart: the line stays inside the plot, and
   zero is still drawn correctly. Task 1 test.
2. An annotation on a category whose value is `null`, or with every series hidden except a comparison: no NaN, and
   the glyph is skipped or sits at the baseline. Task 2 test.
3. An annotation together with `valueLabels` on a negative bar: the glyph sits below the label, never overlapping
   it. Task 2 test.
4. Under a `zoomRange` or viewport, annotations on off-window categories are not drawn, but their labels stay in
   the table. Task 2 test.
5. The `null`, comparison-only and negative inputs above go into `chartModel.test.ts`.

---

### Task 1: `referenceLines` (DS-53)

**Files:** modify `Chart/chartModel.ts` (`LayoutInput`, `computeLayout` y domain, new geometry),
`Chart.tsx` (prop, render, legend, tooltip, announcement, table), `ChartTable.tsx` (tfoot rows),
`Chart.module.scss` / `Chart.tokens.scss`, `Chart/index.ts`, `src/index.ts`. Tests go in `chartModel.test.ts`
and `Chart.test.tsx`. Update docs and demo: a 7-day stacked bar with a "30-day average" line.

**Interfaces (produces):**

- `ChartReferenceLine = { key?: string; value: number; label: string; color?: ChartSeriesColor }`
  (exported, with JSDoc), and the prop `referenceLines?: ChartReferenceLine[]`.
- `LayoutInput.referenceValues?: readonly number[]`. Finite values join the y domain.
- `ChartLayout.referenceLines: { key: string; y: number; x1: number; x2: number; dash: number; slot: number }[]`.
  `x1` is `plot.x` and `x2` is `plot.x + plot.width`. `dash` is the index mod 3; `slot` is 0 when `color` is unset.

- [ ] **Step 1: Failing tests.**
  - Model:
    - Value 100 on data that peaks at 40 → the top y tick is ≥ 100.
    - The line's x1/x2 equal the plot edges, not the outer categories' centres.
    - A negative value on positive data → the domain includes it, and the zero line is still drawn.
    - A non-finite value is dropped.
    - Without the prop, the layout deep-equals the old layout. Compare against a call without `referenceValues`.
  - DOM:
    - Two lines render two `[data-reference-line]` with different `data-dash`.
    - The legend shows both labels as static entries, with dash swatches.
    - Inspecting a category puts the muted row "30-day average: 35 g" (via `formatValue`) in the tooltip and in the
      live text.
    - The table has a `<tfoot>` row with `<th scope="row">` holding the label and the value cell spanning the
      remaining columns.
    - A dev warning fires for a non-finite value.
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement.
  - Draw the lines over bars and under line/area marks.
  - Reuse `--chart-reference-dash-*` and the `ChartLegend` `dash` swatch from DS-50.
- [ ] **Step 4:** Run the tests and confirm they PASS. Update docs and demo, then commit
      `feat(chart): horizontal reference lines (DS-53)`.

### Task 2: `annotations` (DS-52)

**Files:** modify `chartModel.ts` (room and geometry), `Chart.tsx` (prop, render, notes), `ChartTable.tsx`
(notes column shown when markers or annotations have a label), SCSS and tokens (glyph size; tone colours via
semantic fg tokens), and the exports. Tests go in the same two files. Update docs and demo: "Eaten per day" bars
with a green ▲ on today.

**Interfaces:**

- Consumes Task 1's `computeLayout` changes.
- Produces:
  - `ChartAnnotationGlyph = 'up' | 'down' | 'dot'`
  - `ChartAnnotationTone = 'success' | 'danger' | 'warning' | 'neutral'`
  - `ChartAnnotation = { key?: string; at: string; glyph: ChartAnnotationGlyph; tone: ChartAnnotationTone; label: string }`
  - Prop `annotations?: ChartAnnotation[]`. All types exported, with JSDoc.
  - `LayoutInput.annotated?: readonly number[]`: the category indices that carry an annotation. The scale
    reserves glyph room above (or below, for negatives) those marks only.
  - `ChartLayout.annotations: { key: string; index: number; x: number; y: number; glyph; tone; below: boolean }[]`.
    Glyphs on the same category are offset side by side.

- [ ] **Step 1: Failing tests.**
  - Model:
    - With `valueLabels`, the glyph x sits after the label's right edge and y is on the label's baseline.
    - Without `valueLabels`, the glyph sits above the tallest visible mark on bar and stacked-bar, and above the
      point on line.
    - A negative bar puts the glyph below.
    - The plot reserves room, so the glyph's y is at or below `plot.y`.
    - Two annotations on one category get distinct x values.
    - An annotation on a null category is skipped (Review Focus 2).
    - Without the prop, the layout is unchanged.
  - DOM:
    - The glyph renders with `aria-hidden` and `data-glyph="up"` / `data-tone="success"`.
    - The label appears in the tooltip notes, the keyboard announcement and the table notes column. The column
      exists when only annotations exist.
    - An unknown `at` is ignored with a dev warning.
    - Under a `zoomRange` that excludes the category, no glyph is drawn but the table still lists the label
      (Review Focus 4).
- [ ] **Step 2:** Run the tests and confirm they FAIL.
- [ ] **Step 3:** Implement.
  - Glyph shapes are SVG paths (triangle up or down, circle) sized by `--chart-annotation-size`.
  - Fill with the tone's semantic foreground token: success, danger, warning, or muted for neutral.
- [ ] **Step 4:** Run the tests and confirm they PASS. Update docs and demo, then commit
      `feat(chart): category status annotations (DS-52)`.
