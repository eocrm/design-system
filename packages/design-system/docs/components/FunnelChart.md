# `<FunnelChart>` — stage funnel for pipeline and campaign conversion

Ordered stages (e.g. Leads → Qualified → Proposal → Won) drawn as one connected silhouette: the height of each stage shows how much of the funnel is left, a pill between stages shows the step conversion. Fills a `DashboardWidget variant="chart"` body or sits inline on a page, and ships its own tooltip, keyboard inspection, data table and empty state. The app owns data, formatting, loading and errors.

```tsx
import { FunnelChart, DashboardWidget, ErrorState } from '@eocrm/design-system';

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

// Inline on a page: the parent must give it a definite height
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
| `stages` | `FunnelStage[]` | yes | Stages, top of the funnel first. Heights are relative to the largest value; colour follows position (palette slots 1–8) unless `color` names a slot. More than 8 stages reuse colours, with a dev warning. |
| `formatValue` | `(n: number) => string` | yes | Formats a stage value for the footer, tooltip and data table (the app owns i18n and currency). Required. |
| `shape` | `'eased' \| 'sharp'` | no | Silhouette between stages. Default `'eased'`. - `'eased'` — each stage holds its height, then curves smoothly into the next one. - `'sharp'` — straight trapezoids from one stage's height to the next. |
| `onStageClick` | `((stage: FunnelStage, index: number) => void)` | no | Makes every stage a button that calls this with the consumer's original stage object and its index, e.g. to drill through to the deals in that stage. Omit for a read-only funnel. |
| `onActiveStageChange` | `((stage: FunnelStage \| null) => void)` | no | Called with the hovered or focused stage (the consumer's original object), or `null` when none is active, e.g. so a surrounding headline can follow along. |
| `emptyMessage` | `ReactNode` | no | EmptyState title when there are no stages or every value is 0. Default: translated "No data for this period". |
| `footnote` | `ReactNode` | no | Short note under the funnel, e.g. "Closed deals only". Takes its own row (wraps, never truncates); also describes the plot for screen readers. Shown in the empty state too. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- **Percent semantics.** The pill between two stages is the _step conversion_ (next value ÷ this value). The tooltip and data table add the _share of the first stage_. Both are computed by the component; pass raw counts.
- **Heights** are relative to the largest value; stages are drawn top of funnel first, in the order given. Colour follows position (palette slots 1–8, light + dark) unless `color` names a slot. Keep the order stable so filtering never repaints survivors. More than 8 stages reuse colours with a dev warning: fold the tail into an "Other" stage or set `color`.
- **Shape** (horizontal layout only): `'eased'` (default) holds each stage's height, then curves smoothly into the next; `'sharp'` draws straight trapezoids.
- **Layout.** Horizontal while every stage gets at least 96px of width. Narrower, it switches to vertical: compact rows with the label and value beside a horizontal band, and as a last resort the rows scroll inside the plot. `shape` has no effect in vertical. Unmeasured (first paint, SSR) it assumes horizontal.
- **Clickable stages.** `onStageClick(stage, index)` makes every stage cell a button (Tab, Enter / Space) and receives your original stage object. Omit it for a read-only funnel. Escape dismisses the active stage.
- **`onActiveStageChange(stage | null)`** fires with the hovered or focused stage (your original object) and `null` when none is active. Use it for a headline outside the chart; do not put that headline in the widget body next to the chart.
- **Tooltip** follows hover, focus and tap, and tracks scroll and resize. **Screen readers** get a visually hidden data table (caption = `label`) with the exact values, conversion and share.
- **Empty** (no stages, or every value 0) renders `EmptyState` with `emptyMessage` (default "No data for this period"). `footnote` stays visible there.
- **Footnote** is a short muted note in its own row under the funnel (wraps, never truncates) and is the plot's accessible description.
- **Sizing.** Fills its parent (`width/height: 100%`). The parent needs a definite height (a `DashboardWidget` chart body); in an auto-height parent the plot measures 0.

#### When NOT to use

- ❌ Values over time → `Chart`.
- ❌ A single conversion ratio → `StatGroup` / `DashboardWidget variant="kpi"`.
- ❌ Unordered categories, or stages that don't narrow → `Chart type="bar"`.
- ❌ More than 8 stages → fold the tail into an "Other" stage in the app.

#### Anti-patterns

- ❌ Passing an inline `stages` array or `formatValue` on every render of a busy parent; geometry is recomputed when their identity changes.
- ❌ Wrapping `FunnelChart` in a fixed-height or scrolling div inside the widget body. The cell is the size.
- ❌ Rendering a note next to the chart in the widget body (it steals height). Use `footnote`.
- ❌ Passing `loading` / error UI into `FunnelChart`. Use `DashboardWidget loading` and an `ErrorState` child.
- ❌ Pre-computing percentages into `value`. Pass counts; the component derives conversion and share.
