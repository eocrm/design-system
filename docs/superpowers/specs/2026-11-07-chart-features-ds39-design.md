# Chart features + MoneyInput dot (DS-12, 16, 17, 18, 23, 24, 39) — design

Status: awaiting approval · 2026-11-07 · eocrm run linked to DS-12 (no epic; all seven tasks move to Done at release)

## Intent

Home Hub's Pet Control redesign (HH-3, HH-6) is blocked or degraded by six Chart gaps, and
MoneyInput can silently store a wrong amount in dot-grouping locales. Ship all seven in **one
branch, one PR, one patch release (0.8.6)** — the user's choice, accepting a longer review loop
over earlier partial value.

Success: Home Hub can drop each interim workaround named in the tickets (footnote totals, hourly
stacked-bar meals, binned bar scatter, 7-series heatmap line, Start/End fields for feedings,
ignored per-scale colour), and no MoneyInput entry is ever silently wrong.

## Goals / non-goals / anti-goals

Goals — the seven pieces below, each meeting the Core invariant where it adds a component
(ScatterChart, Heatmap) and Hard rules everywhere (tokens only, no layout in components,
`forwardRef` + rest spread, i18n via `useTranslation`, a11y parity with `Chart`: keyboard
inspection, live announcement, visually-hidden data table, empty state, 390px phone width,
touch targets from DS-35).

Non-goals — hex/custom series colours; LOESS/smoothed trends; strip (y-less) dot plots;
draggable brush handles; brush or zoom on ScatterChart/Heatmap; dual y-axes; user-defined
heatmap thresholds.

Anti-goals — any path where a displayed or stored value is silently wrong (MoneyInput, zoom
re-slicing, value labels showing a different number than the tooltip); colour as the only
carrier of identity (existing per-slot marker shapes must keep working); a new chart that a
keyboard or screen-reader user can't read.

## 1. Per-series colour (DS-24) — user decided: palette slot only

- `ChartSeries.color?: ChartSeriesColor` where `type ChartSeriesColor = 1|2|3|4|5|6|7|8`
  (exported). Maps to the existing `--chart-series-N` token. No hex.
- Explicit colours win. Series without `color` take positional slots in order, **skipping slots
  already claimed explicitly** (so "All scales" and a single scale render the same colour when
  the app passes `color`). Two series may explicitly share a slot (app's choice); if more
  unclaimed series exist than free slots, wrap as today (`overflow` flag).
- Marker shape follows the resolved slot (`markerShape(slot)`), so shape and colour stay paired.
- Comparison series (`comparisonOf`) keep inheriting their parent's resolved slot; a `color` on a
  comparison series is ignored (documented).
- Same `color` field exists on ScatterChart series (§4).

## 2. Tooltip detail rows (DS-12a) — builder's call on shape, decided below

- `details?: (categoryIndex: number) => string[]` on `Chart`. Strings only, so the same rows can
  be spoken and tabled. Empty array/undefined = no rows.
- Rendered as extra muted rows under the series values in the tooltip; appended to the keyboard
  announcement (after the series values, joined with ", "); added as one trailing "Details"
  column in the data table (rows joined with "; "). Column header text is i18n.
- Unaffected by `hiddenSeries`.

## 3. Bar value labels (DS-12b) — user decided: bar + stacked-bar total

- `valueLabels?: boolean` (default false). On `bar`: each visible bar (every visible series,
  including comparisons) gets its `formatValue` text above it (below for negatives). On
  `stacked-bar`: the stack total (sum of visible series) above the stack. `line`/`area` ignore it
  (documented, no warning).
- A label is omitted when its measured width (existing `estimateTextWidth`) exceeds the bar/band
  width, or when it would collide with the plot top — never truncated, never overlapping.
  The y-domain gets enough headroom that the tallest label fits when shown.
- `null` values get no label. Labels are `aria-hidden` (values already reach AT via
  announcement/table).
- Tokens: `--chart-value-label-fg`, `--chart-value-label-size` in `Chart.tokens.scss`.

## 4. ScatterChart (DS-16 + DS-17) — user decided: new component, y required, reference + linear trend

New component `ScatterChart` (cluster: same as `Chart`), sharing Chart's legend, tooltip, table,
palette and marker-shape internals (extract to shared modules inside `components/Chart/` or
`_internal/` rather than duplicating).

```ts
interface ScatterPoint { x: number | Date; y: number; size?: number; label?: string }
interface ScatterSeries { key: string; label: string; points: ScatterPoint[]; color?: ChartSeriesColor }
interface ScatterChartProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  label: string;
  series: ScatterSeries[];
  xScale?: 'number' | 'time';            // default 'number'; 'time' expects x as Date or epoch ms
  xDomain?: [number | Date, number | Date]; // default: data extent (nice-rounded for 'number')
  yDomain?: [number, number];            // default: data extent incl. 0 when all ≥ 0, nice-rounded
  xLabel: string; yLabel: string;        // axis titles; also table column headers
  formatX: (x: number) => string;        // receives epoch ms for 'time'
  formatY: (y: number) => string;
  formatSize?: (s: number) => string;    // tooltip/table text for `size`; required when any point has size
  sizeLabel?: string;                    // name for size in tooltip/table
  reference?: { label: string; points: { x: number | Date; y: number }[] }; // dashed line, app-computed
  trendLine?: boolean;                   // least-squares line per visible series, dashed, over the series' x-extent
  emptyMessage?: ReactNode;
  hiddenSeries?: string[]; onHiddenSeriesChange?: (keys: string[]) => void;
  footnote?: ReactNode;
}
```

- `size` maps through a `sqrt` scale (area-proportional) to a radius range from tokens
  (`--scatter-dot-min`, `--scatter-dot-max`); points without `size` use the default dot radius.
  Larger dots draw first so small ones stay visible; dots have the existing `--chart-dot-ring`.
- Time axis: d3 time ticks formatted via `formatX`; tick count adapts to width (≥390px works).
- Keyboard: the plot is one focus stop; ←/→ moves through visible points ordered by x (ties by
  series order), Home/End, Esc clears. Announcement: series, x, y, size (if any), label (if any).
  Tooltip on hover/tap uses nearest point within a token-sized radius.
- Data table: one row per point: series, x, y, size (if any), label (if any).
- Trend: computed per visible series with ≥2 distinct x; omitted otherwise. Its slope is not
  announced (YAGNI); the line is `aria-hidden`.
- Empty state when no visible points.

## 5. Heatmap (DS-18) — user decided: separate component, 5 stepped buckets

```ts
interface HeatmapProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  label: string;
  rows: string[]; columns: string[];
  values: (number | null)[][];          // values[row][col]; null = no data
  formatValue: (n: number) => string;
  emptyMessage?: ReactNode; footnote?: ReactNode;
}
```

- New tokens in `tokens.json`: `heatmap.1`…`heatmap.5` (one hue, light + dark) →
  `--color-heatmap-1..5`, aliased as `--heatmap-step-1..5` in `Heatmap.tokens.scss`. Null cells
  use a neutral token with a distinct outline so "no data" ≠ "lowest bucket".
- Token validation (my call): the categorical palette test does not apply (it requires a
  mid-lightness band). Add a sequential test in `packages/design-tokens/test/`: per theme,
  OKLab lightness strictly monotonic from step 1 → 5 (lighter → darker in light theme, darker →
  lighter in dark), adjacent steps ΔE(OKLab) ≥ 0.06, step 1 ΔE ≥ 0.04 from `--color-bg`, step 5
  ≥ 3:1 contrast against `--color-bg`. Per-cell 3:1 is not required: exact values reach users
  via tooltip, announcement and table; cells are separated by a background-coloured gap.
- Buckets (my call — no misleading legends): thresholds from d3 `ticks`/`nice` over [min, max]
  of non-null values, aiming at 5 buckets; when every value is an integer, boundaries are
  integers and there may be fewer than 5 buckets (e.g. 0–3 → 4 buckets: 0, 1, 2, 3). Fewer
  buckets always include steps 1 and 5 and spread the rest evenly (4 buckets → 1, 2, 4, 5;
  3 → 1, 3, 5; 2 → 1, 5). All-equal values → one bucket, step 3. Legend: one swatch per bucket
  with its range via `formatValue` (single value when the bucket is one integer), plus "No data"
  when any null. Legend ranges must never overlap or repeat after formatting (test it).
- Layout: SVG grid; column labels thinned to fit (like Chart's category ticks); cells stay square-
  ish and fill width; works at 390px with 24 columns.
- Keyboard: one focus stop; arrows move by cell, Home/End within row, Ctrl+Home/End corners,
  Esc clears; announcement "row, column: value" (or "no data"). Tooltip on hover/tap.
- Data table: rows × columns with formatted values.

## 6. Range selection + zoom on Chart (DS-23) — user decided: select + built-in controlled zoom

Applies to `line`, `area`, `bar`, `stacked-bar`. Off unless the selection prop or handler is
passed (`selectable` is implied by `onSelectedRangeChange`).

```ts
type ChartRange = { from: string; to: string };  // category values, from ≤ to in category order
selectedRange?: ChartRange | null; onSelectedRangeChange?: (r: ChartRange | null) => void;
zoomRange?: ChartRange | null;     onZoomRangeChange?: (r: ChartRange | null) => void;
defaultZoomRange?: ChartRange | null;
```

- Selection is controlled-or-uncontrolled like other DS controls. Gestures (user decided:
  long-press on touch):
  - **Mouse:** a click (no movement past the slop) inspects/shows the tooltip exactly as today;
    press + drag past the slop selects from the press category to the pointer category. A click
    on a category **outside** the band clears the selection (and inspects as usual); a click
    inside the band just inspects.
  - **Touch:** a tap shows the tooltip as today (and clears the selection when outside the band,
    as with mouse). A **long-press** (reuse DashboardCanvas constants: `LONG_PRESS_MS = 300`,
    slop 8px; movement past the slop before the timer = scroll, abort) starts a selection at the
    pressed category; dragging extends it; release commits. While a long-press selection is
    active, page scroll is suppressed for that pointer only. Releasing without moving selects a
    single category (`from === to`, allowed for mouse drags that return to start too).
    Suppress the iOS callout/text selection on the plot during the press.
  - **Keyboard:** Shift+←/→ from the current inspection point extends the range (anchor = the
    point where Shift was first pressed). Esc clears the selection first, then the inspection.
  - Drawn as a band using the existing marker band styling with a selected tone token
    (`--chart-selection-*`). Changes announced via the existing live region ("Selected Mon to
    Wed" / "Selection cleared").
  - Duplicate category strings resolve to the first match, same as `markers` (builder's call).
- Zoom: when a selection exists, a small `Button` "Zoom to selection" appears in the chart
  header area; when zoomed, "Reset zoom". Zooming re-slices categories, every series' values,
  markers (clipped to range; markers fully outside dropped), `details` index mapping and value
  labels to the range; clears selection. Index-based callbacks (`details`) always receive the
  **original** category index. Zoom is uncontrolled by default; `zoomRange` controls it.
  When zoomed, the y-domain rescales to the zoomed data (my call).
- Invalid ranges (unknown category values) are ignored with a dev-only warning, never throw.

## 7. MoneyInput typed dot (DS-39) — user decided: block, like NumberField

- In locales whose group separator is `.` (de, es, it, pt-BR, nl, tr…), a single typed `.`
  (keydown `.` / `insertText` of exactly `.`, not composing) is ignored — no conversion to the
  decimal. The current rule at `MoneyInput.tsx` ("Numpad '.' in a comma-decimal locale types the
  decimal") stays only for locales where `.` is not the group separator (ru, fr, pt-PT…).
- Pastes/drops are unchanged: `1.234,5` pasted parses as 1234.5.
- Reuse NumberField's guard logic (extract a shared helper if it isn't already shared); don't
  write a second heuristic.
- MoneyInput docs gain the same note NumberField has. Regression tests for de `1.234,5` typed →
  `1234,5` → amount `"1234.5"`, and ru typed `.` → decimal still works.

## Constraints

- Patch release 0.8.6 (default flow, no `BUMP` edit).
- No new dependencies beyond what exists (`d3-scale`, `d3-shape` already present; time ticks from
  `d3-scale`'s `scaleTime`).
- Token discipline: every colour/size via tokens; new primitives only in `tokens.json`, then
  `npm run tokens:check`; Kotlin contract fixture gains only additions.
- Core invariant for ScatterChart and Heatmap (tests, demo + wiring, index export, docs + primer
  line, CLUSTERS in both maps, manifest rebuild). Demos use Home Hub-like data (meals today,
  bowl vs meal size, weekday × hour heatmap, bowl-weight line with feeding selection).
- Pre-push review loop (Standard tier) on one draft PR; demo check with the user before PR.

## Left to the builder

Internal module split for shared chart internals; exact token values for heatmap steps (must pass
the existing palette validator / contrast tests); exact header placement of zoom buttons within
Chart's existing layout; d3 tick counts.
