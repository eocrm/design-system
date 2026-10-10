# Chart — design

Issue: eocrm/design-system#632. Status: approved 2026-10-10.

## Problem

eocrm's dashboard gets a generic **Metric chart** widget (eocrm/eocrm#1225, item
15): one time series per instance inside a `DashboardWidget`, with settings for
metric, period/interval (day/week/month buckets, ~7–90 points), group-by (1–~10
series), visualization (line / bar / stacked bar / area) and a previous-period
comparison. The DS has no chart primitive, and composing one from layout
primitives would be decorative, not honest.

## Decisions

- **Engine: d3-scale + d3-shape, own SVG rendering.** Not Recharts. The API is
  narrow (pre-bucketed categorical x, ≤ ~90 points, no zoom/time axis/dual axis),
  so a general engine's breadth goes unused, while the hard requirements (token
  theming, DS tooltip, keyboard, data table, states, preview) would be built or
  overridden on top of it anyway. d3 covers the error-prone math (nice ticks, band
  scale, stacking, `defined()` gaps). Revisit if pie/scatter/combo/brush arrive.
- **One `Chart` with `type`**, not sibling components — the four types share
  axes, legend, tooltip, table and states; the widget's visualization setting maps
  1:1.
- **`area` is always stacked.** Overlapping non-stacked areas occlude each other.
- **States: Chart owns only empty.** Loading stays `DashboardWidget loading`
  (existing chart skeleton); error stays the app's `ErrorState` as children. Chart
  detects "all null/zero" itself and renders `EmptyState`.
- **8 categorical colours, max.** Validated with the dataviz validator, light and
  dark. The app folds the tail into "Other" (the DS can't know if a metric is
  additive). Series 9+ still render: palette reused, dashed stroke, dev-only
  `console.warn`. A 24-colour palette was considered and rejected — not
  perceptually distinguishable, and 24 lines/segments are unreadable regardless.
- **Legend: hover/focus highlights, click toggles.** Hover or focus a legend item
  → that series emphasised, others dimmed. Click → toggle visibility
  (`aria-pressed`), y rescales to visible series. Uncontrolled by default;
  optional `hiddenSeries` / `onHiddenSeriesChange`. The last visible series cannot
  be hidden.
- **Comparison: `comparisonOf: key | 'total'`.** Inherits the parent's hue, drawn
  dashed (line/area) or outlined with a lighter fill (bar). Never stacked.
  Grouped under its parent in legend and tooltip; hiding the parent hides it.
  In `stacked-bar` / `area`, a comparison uses `comparisonOf: 'total'` and draws
  as a dashed line of the previous period's stack total (per-segment ghosts are
  unreadable). Docs recommend comparison only ungrouped or with ≤ 4 groups.
  Mismatches are dropped with a dev-only `console.warn` (not rendered, not in
  legend/tooltip/table): a key comparison in a stacked type, `'total'` in `line` /
  `bar`, or a `comparisonOf` naming no series.
- **Data table always present, visually hidden, no toggle.** The issue allows
  either; a toggle needs space small cells don't have.

## API

```tsx
<DashboardWidget variant="chart" title="Deals won" loading={isLoading}>
  {error ? (
    <ErrorState title="Could not load" headingLevel={4} />
  ) : (
    <Chart
      type="line"
      label="Deals won per week"
      categories={['W1', 'W2', 'W3', 'W4']}
      series={[
        { key: 'won', label: 'Deals won', values: [3, 5, null, 8] },
        { key: 'won-prev', label: 'Previous period', values: [2, 4, 6, 5], comparisonOf: 'won' },
      ]}
      formatValue={(n) => fmt.number(n)}
    />
  )}
</DashboardWidget>
```

```ts
type ChartType = 'line' | 'bar' | 'stacked-bar' | 'area';

interface ChartSeries {
  key: string; // stable identity; colour follows index in `series`
  label: string; // app-translated
  values: (number | null)[]; // same length as categories; null = gap
  comparisonOf?: string; // parent series key, or 'total' (stacked types only)
}

interface ChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  type: ChartType;
  label: string; // accessible name + table caption
  categories: string[]; // app-formatted x labels
  series: ChartSeries[];
  formatValue: (n: number) => string; // ticks, tooltip, table
  emptyMessage?: ReactNode; // default: i18n "No data for this period"
  hiddenSeries?: string[]; // controlled legend visibility
  onHiddenSeriesChange?: (keys: string[]) => void;
}
```

- `forwardRef` to the root `<figure>`; native attrs spread props-first (the
  figure's role/name contract wins).
- Colour index = position among **non-comparison** series in `series` order.
  Apps keep the order stable so filters don't repaint survivors.
- Y domain always includes 0 (`min(0, dataMin)` … `max(0, dataMax)`), d3
  `nice()` ticks. Stacked domains use stack totals.
- Fills its parent (`width: 100%; height: 100%`); size measured with a
  ResizeObserver; SVG drawn at true pixel size (no `viewBox` stretch).

## Units

1. **`chartModel.ts`** — pure: `(input, width, height) → model` with scales, y
   ticks, kept x-label indices, per-series line/area path segments or bar rects,
   stack layout, empty flag, overflow flags. d3-scale + d3-shape. Node-tested.
2. **`Chart.tsx`** — figure root, ResizeObserver, SVG from the model, keyboard
   handling, live text, empty state.
3. **`ChartLegend.tsx`** — legend buttons (swatch + label in text ink), hover
   focus, click toggle, comparison nested under parent.
4. **`ChartTooltip.tsx`** — positioned via existing `@floating-ui/react-dom`;
   lists visible series at the active category.
5. **`ChartTable.tsx`** — visually hidden `<table>`, caption = `label`, one row per
   category, one column per visible series, `null` → "No data" (the table is screen-reader-only).
6. **Tokens** — `chart.series.1..8` (light/dark) in
   `packages/design-tokens/src/tokens.json`; `Chart.tokens.scss` for component
   tokens (`--chart-series-N`, `--chart-grid`, `--chart-axis-text`,
   `--chart-comparison-opacity`, `--chart-dim-opacity`, `--chart-focus-band`).
7. **`WidgetPreview` `line` variant** — polyline miniature; `chart` stays bars.

## Interaction and accessibility

- Root `<figure role="figure" aria-label={label}>`. Plot SVG is `aria-hidden`;
  screen readers use the table.
- Plot area is one tab stop: `role="group"`, i18n description "Use arrow keys to
  inspect values", `:focus-visible` ring. ←/→ move category, Home/End ends, Esc
  hides tooltip. A visually hidden polite live line inside the figure announces
  "W3: Deals won 8, Previous period 5" — only on user keypress, so no dashboard
  flood.
- Hover: crosshair (line/area) or band highlight (bar) snaps to nearest category;
  tooltip lists every visible series at that x, series order, comparisons under
  parents. Tap shows the tooltip on touch.
- Not colour alone: comparison dashed/outlined; distinct marker shapes per line
  series (circle, square, triangle, diamond, …) at the active point; labels in
  legend, tooltip and table; overflow series dashed.
- Legend only when > 1 series (a comparison counts).

## Visuals and reflow

- Lines 2px, round joins, no markers except at the active category; an isolated
  point (null on both sides) draws a dot.
- Bars: 4px radius on the data end only, 2px surface gap between adjacent bars
  and stacked segments, band ≈ 60–70% of its slot. Areas: fill ~0.85 opacity + 2px
  top line.
- Horizontal grid only, recessive. Y tick labels, no axis line. X labels centred
  under bands. Text muted, caption size, tabular numerals; never series colour.
- Y-axis width from the widest formatted tick label.
- X-label thinning: estimate label width (chars × average glyph width), keep every
  k-th so none overlap, always keep first and last. Never horizontal scroll.
- Height < ~120px: legend collapses to one row with "+N" overflow count.

## Empty and gaps

- Empty when there are no categories, no series, or every value is `null`/`0`:
  render `EmptyState` with `emptyMessage` (i18n default). No axes.
- `null`: lines/areas break (`defined()`), bars absent; in a stack a null segment
  is absent and contributes 0 to segments above it.

## Testing

- `chartModel.test.ts` (Node): domain includes 0 and nice ticks; stack order;
  comparison excluded from stack; `'total'` comparison; null gaps split segments
  and drop bars; isolated-point dot; label thinning keeps first/last and avoids
  overlap; empty detector; hidden series rescale y; overflow dash flag.
- `Chart.test.tsx` (jsdom, ResizeObserver stubbed): ref + className; figure name;
  legend only for > 1 series; `aria-pressed` toggle hides series + its
  comparison; last series not hideable; controlled `hiddenSeries`; keyboard
  ←/→/Home/End/Esc drive tooltip + live text; table values match `formatValue`;
  EmptyState on all-zero.
- Palette validated with the dataviz validator (light and dark) before commit.
- Playwright visual check on port 8090+, both themes, before the PR.

## Deliverables (Core invariant)

Component + tests; playground `ChartDemo` (all 4 types, comparison, grouped 8
series, null gaps, empty, inside resizable `DashboardWidget`) wired into route,
nav, overview grid, schematic and `ComponentName` union; `index.ts` export;
`docs/components/Chart.md` + `AI-PRIMER.md` line; `CLUSTERS` in both manifests +
`build:manifest`. WidgetPreview docs/demo/tests updated for `line`. Dependencies
`d3-scale@^4.0.2`, `d3-shape@^3.2.0` (+ `@types/d3-scale@^4.0.9`,
`@types/d3-shape@^3.2.0` as dependencies, since the shipped typings reference them).

## Out of scope

StatTile sparkline (issue's "later"), animation, zoom/brush, dual axis, visual
table toggle, > 8 distinct colours.
