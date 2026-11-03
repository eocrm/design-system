# `<FunnelChart>` — stage funnel for pipeline and campaign conversion

Ordered stages (e.g. Leads → Qualified → Proposal → Won) drawn as one connected silhouette in a one-hue ramp: the height of each stage shows how much of the funnel is left, a pill in each later stage shows the step conversion, and the first stage carries its value and label inside its band. Fills a `DashboardWidget variant="chart"` body or sits inline on a page, and ships its own tooltip, keyboard inspection, data table and empty state. The app owns data, formatting, loading and errors.

```tsx
import { useState } from 'react';
import {
  FunnelChart,
  DashboardWidget,
  ErrorState,
  Stack,
  type FunnelStage,
} from '@eocrm/design-system';

const stages = [
  { key: 'leads', label: 'Leads', value: 1200 },
  { key: 'qualified', label: 'Qualified', value: 640 },
  { key: 'proposal', label: 'Proposal', value: 210 },
  { key: 'won', label: 'Won', value: 64 },
]; // keep the array and `formatValue` referentially stable (module level or useMemo / useCallback)

<DashboardWidget variant="chart" title="Sales pipeline" loading={isLoading}>
  {error ? (
    <ErrorState title="Could not load" headingLevel={4} />
  ) : (
    <FunnelChart label="Sales pipeline" stages={stages} formatValue={formatCount} />
  )}
</DashboardWidget>;

// Inline on a page: a definite-height parent is filled; an auto-height one gets the default height
<div style={{ height: 280 }}>
  <FunnelChart label="Campaign funnel" stages={stages} formatValue={formatCount} shape="sharp" />
</div>;

// Drill-through plus an external headline that follows the hovered / focused stage
const [active, setActive] = useState<FunnelStage | null>(null);

<Stack gap="sm">
  <strong>{active ? `${active.label}: ${formatCount(active.value)}` : 'Hover a stage'}</strong>
  <FunnelChart
    label="Sales pipeline"
    stages={stages}
    formatValue={formatCount}
    onStageClick={(stage) => navigate(`/deals?stage=${stage.key}`)}
    onActiveStageChange={setActive}
    footnote="Closed deals only"
  />
</Stack>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | yes | Accessible name of the figure and caption of its data table, e.g. "Sales pipeline". Required. |
| `stages` | `FunnelStage[]` | yes | Stages, top of the funnel first. Heights are relative to the largest value. Colour is a one-hue ramp from `--chart-series-1` (first stage) toward the surface (paler toward the foreground in dark); a stage's `color` slot overrides it. |
| `formatValue` | `(n: number) => string` | yes | Formats a stage value for the footer, tooltip and data table (the app owns i18n and currency). Required. |
| `shape` | `'taper' \| 'sharp'` | no | Silhouette between stages, in both layouts (vertical slices follow the same geometry turned on its side). Default `'taper'`. - `'taper'` — each stage holds its height for most of its column, then a short straight diagonal leads into the next one's height. - `'sharp'` — full-column trapezoids from one stage's height to the next. |
| `onStageClick` | `((stage: FunnelStage, index: number) => void)` | no | Makes every stage a button that calls this with the consumer's original stage object and its index, e.g. to drill through to the deals in that stage. Omit for a read-only funnel. |
| `onActiveStageChange` | `((stage: FunnelStage \| null) => void)` | no | Called with the hovered or focused stage (the consumer's original object), or `null` when none is active, e.g. so a surrounding headline can follow along. |
| `emptyMessage` | `ReactNode` | no | EmptyState title when there are no stages or every value is 0. Default: translated "No data for this period". |
| `footnote` | `ReactNode` | no | Short note under the funnel, e.g. "Closed deals only". Takes its own row (wraps, never truncates); also describes the plot for screen readers. Shown in the empty state too. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- **Percent semantics.** The pill between two stages is the _step conversion_ (next value ÷ this value). The tooltip and data table add the _share of the first stage_. Both are computed by the component; pass raw counts.
- **Heights** are relative to the largest value; stages are drawn top of funnel first, in the order given.
- **Colour** is a one-hue ramp, because stages are ordered: the first stage is `--chart-series-1` at full strength, each later stage a lighter tint mixed toward `--funnel-chart-ramp-target` (the surface in light, 48% max; `--color-fg` in dark, 65% max, so later stages get paler and stay crisp on the dark surface; also `--funnel-chart-ramp-color`, `--funnel-chart-ramp-max-mix`). The lightest stage stays clearly visible against the surface in both themes. With 5+ stages adjacent tints get close; the labels, table and tooltip carry identity. To highlight a stage (e.g. Won in green), give it `color` (a palette slot 1–8); it then uses `--chart-series-N` at full strength. There is no stage limit.
- **Hero first stage** (horizontal): the first stage's value (large) and label sit inside its band, and its footer cell stays empty. When the band is too short or narrow for that text, the first stage falls back to the normal footer, so nothing is hidden. Later stages show the conversion pill in the band and value + label underneath, with dashed rules between footer columns.
- **Shape** (both layouts): `'taper'` (default) holds each stage's size for most of its column, then a short straight diagonal leads into the next; `'sharp'` draws full-column trapezoids. The last stage has no neck.
- **Layout.** Horizontal while every stage gets at least 96px of width. Narrower, it switches to vertical: one funnel slice per row (the same `shape`, turned on its side, thin gaps between slices) beside a table-like grid with a header (Stage, Value, vs previous) and per row a colour swatch, the label (wrapping, never truncated), the value and the step pill (the first row shows "—"). The visible header is hidden from screen readers; the hidden data table is their source. As a last resort the rows scroll inside the plot. Unmeasured (first paint, SSR) it assumes horizontal.
- **Clickable stages.** `onStageClick(stage, index)` makes every stage cell a button (Tab, Enter / Space) and receives your original stage object. Omit it for a read-only funnel. Escape dismisses the active stage.
- **`onActiveStageChange(stage | null)`** fires with the hovered or focused stage (your original object) and `null` when none is active. Use it for a headline outside the chart; do not put that headline in the widget body next to the chart.
- **Tooltip** follows hover, focus and tap, and tracks scroll and resize. **Screen readers** get a visually hidden data table (caption = `label`) with the exact values, conversion and share.
- **Empty** (no stages, or every value 0) renders `EmptyState` with `emptyMessage` (default "No data for this period"). `footnote` stays visible there.
- **Footnote** is a short muted note in its own row under the funnel (wraps, never truncates) and is the plot's accessible description.
- **Sizing.** Fills its parent (`width/height: 100%`). A definite-height parent (a `DashboardWidget` chart body, a `height` style) is filled; in an auto-height parent the shapes take an intrinsic default height (`--funnel-chart-min-height`).

#### When NOT to use

- ❌ Values over time → `Chart`.
- ❌ A single conversion ratio → `StatGroup` / `DashboardWidget variant="kpi"`.
- ❌ Unordered categories, or stages that don't narrow → `Chart type="bar"`.
- ❌ Many stages (beyond about 8) → fold the tail into an "Other" stage in the app; the ramp steps become hard to tell apart.

#### Anti-patterns

- ❌ Passing an inline `stages` array or `formatValue` on every render of a busy parent; geometry is recomputed when their identity changes.
- ❌ Wrapping `FunnelChart` in a fixed-height or scrolling div inside the widget body. The cell is the size.
- ❌ Rendering a note next to the chart in the widget body (it steals height). Use `footnote`.
- ❌ Passing `loading` / error UI into `FunnelChart`. Use `DashboardWidget loading` and an `ErrorState` child.
- ❌ Pre-computing percentages into `value`. Pass counts; the component derives conversion and share.
