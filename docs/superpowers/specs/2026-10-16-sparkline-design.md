# Sparkline — compact trend chart for KPI cards (#642)

## Goal

eocrm's console tenant detail → Usage tab shows one card per record type (contacts, deals, tasks, …):
the current count plus its daily history over 90 days. Today the app wraps `<Chart type="area">` in
`<Constrain height="xs">` (200px) — a full chart with axes in a small card. Ship a DS `Sparkline`:
a small, static, axis-free trend graphic with an intrinsic token height, and a `StatTile` slot so the
DS owns the value + sparkline layout.

Success: eocrm deletes its local `StatCard` / `Constrain` + `Chart` workaround.

## Decisions (agreed in brainstorming)

- **Static.** No hover/focus inspection, no tab stop. A dot marks the last value.
- **Own small component on `d3-scale` + `d3-shape`** (existing deps). Not a Chart variant — Chart's
  categories/series/legend/markers/tooltip model doesn't apply. Not a hand-rolled polyline — d3 gives
  monotone curves, area baselines and null gaps for free.
- **Slots:** standalone `<Sparkline>`; `StatTile` gains `sparkline?: ReactNode`; `DashboardWidget
variant="kpi"` gets **no new prop** — its existing `children` render below value/trend and a
  Sparkline brings its own height, so `children={<Sparkline …/>}` fits. Covered by test, demo, docs.
- **No `tone` prop** (the trend arrow already carries sentiment), **no size prop** — add when asked.

## Public API

```ts
/** Sparkline mark type. */
export type SparklineType = 'line' | 'area' | 'bar';

export interface SparklineProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** What the series is, e.g. "Contacts per day". Start of the accessible name. Required. */
  label: string;
  /** Values in order (oldest first). `null` = no data for that slot (a gap / no bar). */
  values: readonly (number | null)[];
  /** Mark type. Default `'line'`. */
  type?: SparklineType;
  /** Formats numbers in the accessible summary. Default: `Intl.NumberFormat` of the i18n locale. */
  formatValue?: (n: number) => string;
}
```

`forwardRef` to the root `<div>`; `{...rest}` first, so `role` / `aria-label` win (Pattern B — the
`role="img"` contract must hold).

## Rendering

- Root: `<div role="img" aria-label={name}>`, `width: 100%`, height `var(--sparkline-height)` →
  new shared token `--size-sparkline` (40px). Contains one `aria-hidden` `<svg>`.
- Width measured with a callback ref + `ResizeObserver` (Chart's pattern); the SVG is drawn in px so
  strokes and the end dot never stretch. Width 0 (unmeasured / jsdom) → no SVG content; the name is
  still complete.
- Geometry lives in a pure `sparklineModel.ts` (Node-tested):
  - x: index → px across the width (inset by the dot radius so the end dot isn't clipped); bars use a
    band scale.
  - y: line → `[min, max]` of non-null values; area/bar → baseline 0 when all values ≥ 0 (else min).
    Flat series → mid-height line. Inset top/bottom by the dot radius.
  - line/area: `curveMonotoneX` (Chart's smoothing), `defined(v != null)` → gaps.
  - bar: one rect per non-null value; nulls skipped.
  - end dot: last non-null value (line/area only).
- Colours: component tokens `--sparkline-color` (→ `--color-accent`), `--sparkline-area-fill`
  (→ an existing subtle accent token), stroke width token aliasing `--border-width-emphasis`.
- No animation at all (reduced-motion requirement trivially met).

## Accessibility

`role="img"` makes children presentational, so a hidden summary inside it would be pruned — the
summary is folded into the **name** (a persistent property, Hard rule 10), via i18n:

- `sparkline.summary`: `"{label}: from {first} to {last}, low {min}, high {max}"`
  (first/last = first/last non-null values).
- `sparkline.noData`: `"{label}: no data"` — empty or all-null `values`; nothing is drawn.

en + ru strings. Numbers go through `formatValue`.

## StatTile slot

`sparkline?: ReactNode` — rendered after `trend`, before `footnote`. While the `StatGroup` is
loading, a `Skeleton` block at `--size-sparkline` height replaces it (only when the prop is given).
JSDoc points at `<Sparkline>`.

## Testing

- `sparklineModel.test.ts` (unit): scales, gaps, flat series, zero baseline, bar layout, end dot,
  summary values (first/last/min/max skipping nulls), empty.
- `Sparkline.test.tsx` (dom): name summary + `formatValue`, no-data name, type renders path vs
  rects (with a stubbed width), ref, className merge, consumer `role`/`aria-label` can't override.
- `StatTile` test: slot renders; skeleton while loading.
- `DashboardWidget` test: a Sparkline child renders inside the kpi body.

## Deliverables (core invariant)

Component + tests, playground `SparklineDemo` (standalone types, gaps, flat, StatTile and
DashboardWidget kpi usage) wired into App route, navItems, ComponentsIndex, overviewSchematics,
`ComponentName` union; `src/index.ts` exports; `docs/components/Sparkline.md` + AI-PRIMER line;
StatTile / DashboardWidget docs updated; `CLUSTERS` in both manifest maps + `build:manifest`;
token added via `tokens.json` → generate → `tokens:check` (+ web-contract fixture).
