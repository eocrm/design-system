# `<ChartSync>` — synced hover across charts on a page

Wrap the charts of a dashboard in one `<ChartSync>` and inspecting a moment in any of them shows the same moment in the others, like a GCP dashboard: a crosshair at that x, highlighted marks, and the chart's own tooltip. It renders no DOM and takes no `ref` or HTML attributes. Works with `Chart`, `LaneChart` and `ScatterChart`.

**TL;DR:** wrap the charts, give each category chart `categoryValues`. Zoom and selection are not synced.

```tsx
import { ChartSync, Chart, ScatterChart, DashboardWidget } from '@eocrm/design-system';

<ChartSync>
  <DashboardWidget variant="chart" title="Calls">
    <Chart
      type="line"
      label="Calls per day"
      categories={dayLabels}
      categoryValues={dayStarts} // Date | epoch ms, strictly ascending, same length as categories
      series={calls}
      formatValue={formatCount}
    />
  </DashboardWidget>
  <DashboardWidget variant="chart" title="Revenue">
    <Chart
      type="bar"
      label="Revenue per day"
      categories={dayLabels}
      categoryValues={dayStarts}
      series={revenue}
      formatValue={formatCurrency}
    />
  </DashboardWidget>
  <DashboardWidget variant="chart" title="Escalations">
    <ScatterChart label="Escalations" xScale="time" series={escalations} /* ... */ />
  </DashboardWidget>
</ChartSync>;
```

## How matching works

- **By value** (`categoryValues` set): a category covers `[value_i, value_i+1)` (the last reuses the previous step). Charts with different labels or bucket sizes line up, and `ScatterChart` (which is always positioned by x) joins in. Values must be strictly ascending and the same length as `categories`. A length mismatch is ignored (the chart falls back to label matching); non-ascending values are still used but match wrongly. Both log a dev warning.
- **By label** (no `categoryValues`): a category chart syncs only with other category charts that have a category with exactly the same label. `ScatterChart` is skipped.

Each chart can opt out with `sync={false}`. Groups are independent: charts in two separate `<ChartSync>` do not affect each other, and with nested ones the nearest wins. Outside a `ChartSync` the props have no effect.

## When NOT to use

- ❌ A single chart: nothing to sync with. `LaneChart` already shares one tooltip across its lanes.
- ❌ Charts over unrelated x ranges (a daily trend next to a funnel or a heatmap): there is no moment to share.
- ❌ Synced zoom or selection: only hover is synced. Zoom and selection stay per chart.

## Accessibility

The echo is visual only: the synced crosshair, highlights and tooltip in the other charts are `aria-hidden`. Keyboard and screen-reader inspection of a chart is unchanged and reports only that chart.

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | no | The charts to sync (at any depth), plus anything else on the dashboard. |

<!-- props:end -->
