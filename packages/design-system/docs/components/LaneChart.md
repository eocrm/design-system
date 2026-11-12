# `<LaneChart>` — several measures on one shared time axis

Stacks several measures with different units (food in grams, weight in kg, cleanings as a count, poo as presence) in lanes, each with its own y scale, on one shared x axis. One tooltip, one selection band, one zoom and one set of markers run through every lane. Fills a `DashboardWidget variant="chart"` body and ships its own tooltip, keyboard inspection, data table and empty state. The app owns data, formatting, loading and errors.

```tsx
import { useMemo } from 'react';
import { LaneChart, DashboardWidget, type Lane } from '@eocrm/design-system';

function Effects({
  days,
  food,
  poo,
  weight,
}: {
  days: string[];
  food: (number | null)[];
  poo: (number | null)[];
  weight: (number | null)[];
}) {
  const lanes = useMemo<Lane[]>(
    () => [
      { key: 'food', label: 'Food', type: 'bar', values: food, formatValue: (n) => `${n} g` },
      { key: 'poo', label: 'Poo', type: 'dots', values: poo, formatValue: (n) => `${n}×` },
      {
        key: 'weight',
        label: 'Weight',
        type: 'line',
        values: weight,
        includeZero: false,
        formatValue: (n) => `${n.toFixed(1)} kg`,
      },
    ],
    [food, poo, weight],
  );
  return (
    <DashboardWidget variant="chart" title="Effects">
      <LaneChart label="Effects, last 90 days" categories={days} lanes={lanes} selectOn="tap" />
    </DashboardWidget>
  );
}
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | yes | Accessible name of the figure and plot, and caption of its data table, e.g. "Effects, last 90 days". Required. |
| `categories` | `string[]` | yes | X-axis buckets shared by every lane, already formatted by the app ("12 Jan"). `lanes[].values[i]` belongs to `categories[i]`. |
| `lanes` | `Lane[]` | yes | The measures, top to bottom (3–6 is the sweet spot). Each lane has its own y scale, unit (`formatValue`) and type: `'bar'` / `'line'` split the height equally; `'dots'` lanes get a short fixed row (`--lane-chart-dots-height`) and mark presence only (a dot where the value is > 0; the magnitude is in the tooltip and table). Every lane shares the left edge, the category x positions and one x axis under the bottom lane. |
| `markers` | `ChartMarker[]` | no | Category markers (`Chart`'s `markers`) drawn through every lane: lines and bands span all lanes, each label is drawn once in a gutter above the top lane (`labelPlacement` is always treated as `'top'`). Labelled markers are listed in the tooltip, the announcement and the data table. A marker naming an unknown category is ignored with a dev warning. |
| `emptyMessage` | `ReactNode` | no | EmptyState title when there are no categories or every value is null/zero. Default: translated "No data for this period". |
| `footnote` | `ReactNode` | no | Short note under the plot on its own row; also describes the plot for screen readers. Shown in the empty state too. |
| `details` | `((categoryIndex: number) => string[])` | no | Extra plain-text lines for a category (`categoryIndex` indexes `categories`), e.g. `['235 kcal']`: muted rows in the tooltip, appended to the announcement, and a "Details" column in the data table. Return `[]` for none. |
| `selectedRange` | `ChartRange \| null` | no | Controlled selected category range (`null` = none), as `Chart`: one band across every lane. Passing this, `defaultSelectedRange` or `onSelectedRangeChange` turns selection on (drag / long-press, Shift+←/→, Space, Escape). |
| `defaultSelectedRange` | `ChartRange \| null` | no | Initial selection when uncontrolled. Default `null`. Also turns selection on. |
| `onSelectedRangeChange` | `((range: ChartRange \| null) => void)` | no | Called with the next selection (or `null` when cleared) on every user change. Also turns selection on. |
| `selectOn` | `'drag' \| 'tap'` | no | What a plain click or tap does while selection is on. `'drag'` (default): inspects, outside the band clears. `'tap'`: selects that one category (tapping it again clears), the phone flow. Drag and long-press still select a range. |
| `zoomRange` | `ChartRange \| null` | no | Controlled zoomed category range (`null` = all), as `Chart`: every lane is sliced and rescaled. Header buttons "Zoom to selection" / "Reset zoom". |
| `defaultZoomRange` | `ChartRange \| null` | no | Initial zoomed range when uncontrolled. Default `null`. |
| `onZoomRangeChange` | `((range: ChartRange \| null) => void)` | no | Called with the next zoomed range (or `null` on reset) when the user clicks a zoom button. |
| `viewport` | `ChartViewport \| null` | no | Controlled render window inside the current domain, as `Chart`'s `viewport`; one window moves every lane. Omit for uncontrolled. |
| `defaultViewport` | `ChartViewport \| null` | no | Initial render window when uncontrolled. Default `null`. Resets to `null` when `categories` change content. |
| `onViewportChange` | `((next: ChartViewport \| null, info: { end: boolean; }) => void)` | no | Called with the next window when the user zooms or pans; `end: true` once the change settles. |
| `zoomGestures` | `boolean` | no | Turns on interactive zooming of the `viewport` (wheel, pinch, pan, `+` / `-`), as `Chart`. Default `false`. |
| `onPlotDoubleClick` | `((e: ChartPlotPointerEvent) => void)` | no | Called on a double-click, double-tap or Enter on the plot, as `Chart`; `value` is always `null` (no single y scale). |
| `categoryValues` | `(number \| Date)[]` | no | The x each category stands for (e.g. each day's start, as a `Date` or epoch ms), same length and order as `categories`, ascending. Inside a `ChartSync` it syncs by value: a category covers `[value_i, value_i+1)` (the last reuses the previous step), so charts with different labels or bucket sizes, and scatter charts, line up. Without it the chart syncs only with other category charts, by exact category label. A wrong length is ignored (label matching) with a dev warning. |
| `sync` | `boolean` | no | Inside a `ChartSync`, `true` (default) joins the group: inspecting a category here shows a crosshair and tooltip at the matching x in the other charts, and theirs show here across every lane. `false` opts this chart out. No effect outside a `ChartSync`. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- **Lanes** are drawn top to bottom. `'bar'` and `'line'` lanes split the height equally; a `'dots'` lane is a short fixed row (`--lane-chart-dots-height`) with a dot wherever the value is > 0 (the magnitude is in the tooltip and table). Each lane has its own y scale and `formatValue`; `includeZero={false}` fits a `line` lane to its data, `integerValues` gives whole-number ticks for counts, `referenceLines` and `annotations` work as in [Chart](Chart.md). Aim for 3–6 lanes.
- **Shared axis.** Every lane shares the left edge, the category x positions and one x axis under the bottom lane. `values[i]` belongs to `categories[i]`; `null` is a gap and short arrays are padded.
- **Markers** (`markers`) are [Chart](Chart.md)'s: lines and bands span all lanes, labels are drawn once above the top lane.
- **Selection and zoom** behave as in Chart: one selected range across all lanes (`selectOn="tap"` selects a single category on tap), `zoomRange` / `viewport` slice and rescale every lane, `zoomGestures` turns on wheel / pinch / pan.
- **Keyboard and screen readers.** Focus the plot; ←/→ walk the categories, Home / End jump, Esc dismisses. A visually hidden data table (caption = `label`) has one column per lane.
- **Empty** (no categories, or every value null/zero) renders `EmptyState` with `emptyMessage`.
- **Sizing.** Fills its parent; the parent needs a definite height.

#### When NOT to use

- ❌ One measure → `Chart`.
- ❌ Several series with the same unit (compare, stack) → `Chart` with several series.
- ❌ Two measures against each other (x–y correlation), or events sized by magnitude → `ScatterChart`.
- ❌ More than ~6 measures: lanes get too short to read; split into two charts.

#### Anti-patterns

- ❌ Wrapping `LaneChart` in a fixed-height or scrolling div inside the widget body. The cell is the size.
- ❌ Passing `loading` / error UI into `LaneChart`. Use `DashboardWidget loading` and an `ErrorState` child.
- ❌ Inline `lanes` / `markers` / `formatValue` on every render of a busy parent; layout is recomputed on identity change.
