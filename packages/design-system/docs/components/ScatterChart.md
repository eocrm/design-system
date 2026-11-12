# `<ScatterChart>` — scatter plot of two measures, optionally sized and on a time axis

Points on an x/y plane, one dot per observation, grouped in series. Use it to see how two measures relate (bowl contents vs grams eaten, with a trend line) or to plot events on a time axis, sized by magnitude (today's meals, dot area = grams). Fills a `DashboardWidget variant="chart"` body, reflows to any cell size, and ships its own legend, tooltip, keyboard inspection, data table and empty state. The app owns data, formatting, loading and errors.

```tsx
import { useMemo } from 'react';
import { ScatterChart, DashboardWidget, type ScatterSeries } from '@eocrm/design-system';

const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const formatGrams = (n: number) => `${n} g`;
const formatTime = (ms: number) => timeFormat.format(ms);

// Two measures, with a least-squares trend line
function BowlVsEaten({ meals }: { meals: Meal[] }) {
  const series = useMemo(
    () => [
      { key: 'meals', label: 'Meals', points: meals.map((m) => ({ x: m.bowlG, y: m.eatenG })) },
    ],
    [meals],
  );
  return (
    <DashboardWidget variant="chart" title="Bowl vs eaten">
      <ScatterChart
        label="Bowl contents at meal start vs grams eaten"
        series={series}
        xLabel="Bowl at start"
        yLabel="Eaten"
        formatX={formatGrams}
        formatY={formatGrams}
        trendLine
      />
    </DashboardWidget>
  );
}

// Time axis, dot area = grams, a pinned colour per bowl and an app-computed reference
function MealsToday({ bowlA, bowlB, usualPace }: MealsTodayProps) {
  const series = useMemo<ScatterSeries[]>(
    () => [
      { key: 'a', label: 'Bowl A', color: 1, points: bowlA }, // { x: Date, y: cumulativeG, size: mealG }
      { key: 'b', label: 'Bowl B', color: 2, points: bowlB },
    ],
    [bowlA, bowlB],
  );
  const reference = useMemo(() => ({ label: 'Usual pace', points: usualPace }), [usualPace]);
  return (
    <ScatterChart
      label="Meals today"
      xScale="time"
      series={series}
      reference={reference}
      xLabel="Time"
      yLabel="Eaten so far"
      sizeLabel="Meal"
      formatX={formatTime}
      formatY={formatGrams}
      formatSize={formatGrams}
    />
  );
}
```

## Syncing with other charts (`sync`)

Inside a [`ChartSync`](./ChartSync.md), inspecting a point shows a crosshair and tooltip at the same x in the other charts. `sync={false}` opts this chart out. A scatter chart syncs by x value, so it lines up with category charts that pass `categoryValues`; category charts without it are skipped.

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | yes | Accessible name of the figure and caption of its data table, e.g. "Bowl vs meal size". Required. |
| `series` | `ScatterSeries[]` | yes | Point groups to plot, in a stable order. Colour: `color` pins a palette slot (1–8); series without it fill the remaining free slots in order. Each slot also has its own marker shape, so identity never relies on colour alone. |
| `xScale` | `'number' \| 'time'` | no | X-axis kind. `'number'` (default): linear. `'time'`: `x` is a `Date` or epoch ms; `formatX` then receives epoch ms. |
| `xDomain` | `[number \| Date, number \| Date]` | no | Fixed x range. Default: the data extent (nice-rounded on a `'number'` axis). Points outside are clipped. |
| `yDomain` | `[number, number]` | no | Fixed y range. Default: the data extent, including 0 when every y ≥ 0, nice-rounded. Points outside are clipped. |
| `xLabel` | `string` | yes | Name of the x quantity, e.g. "Bowl weight"; drawn as the x-axis title under the ticks at the plot's end, heads the data-table column and names x in the announcement. Required. |
| `yLabel` | `string` | yes | Name of the y quantity, e.g. "Meal size"; drawn as the y-axis title above the plot, heads the data-table column and names y in the announcement. Required. |
| `formatX` | `(x: number) => string` | yes | Formats x for ticks, tooltip, announcement and table (epoch ms on a `'time'` axis). Required. |
| `formatY` | `(y: number) => string` | yes | Formats y for ticks, tooltip, announcement and table. Required. |
| `formatSize` | `((size: number) => string)` | no | Formats `size` for tooltip, announcement and table. Required when any point has `size` (dev warning otherwise). |
| `sizeLabel` | `string` | no | Name of `size` in the tooltip, announcement and table header, e.g. "Calories". Default: translated "Size". |
| `reference` | `ScatterReference \| ScatterReference[]` | no | App-computed reference line(s) (e.g. a recommended ratio), drawn dashed (a different pattern per line) and each listed in the legend. |
| `trendLine` | `boolean` | no | Draw a dashed least-squares line per visible series over its own x-extent (series with ≥2 distinct x only). Decorative. Default `false`. |
| `emptyMessage` | `ReactNode` | no | EmptyState title when no series has a point. Default: translated "No data for this period". |
| `hiddenSeries` | `string[]` | no | Controlled list of hidden series keys (legend toggles). Omit for uncontrolled. Unknown keys are ignored; the last visible series with points can't be hidden (a set hiding all of them is ignored for those). |
| `onHiddenSeriesChange` | `((keys: string[]) => void)` | no | Called with the next hidden keys when the user toggles a legend item. |
| `footnote` | `ReactNode` | no | Short note under the plot; takes its own row, also describes the plot for screen readers and stays in the empty state. |
| `sync` | `boolean` | no | Inside a `ChartSync`, `true` (default) joins the group: inspecting a point here shows a crosshair and tooltip at its x in the other charts (category charts need `categoryValues`), and theirs show here as a crosshair, the points in that x range highlighted and a tooltip for the nearest one. `false` opts this chart out. No effect outside a `ChartSync`. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- **Series** are point groups in a stable order. Colour and marker shape come from the same 8-slot palette as [Chart](Chart.md); `color` pins a slot, series without it fill the free slots in order. Identity never relies on colour alone. **`shape`** (`'circle' | 'square' | 'triangle'`) overrides the slot's marker for the series, in the plot and the legend swatch, so a second kind of event (a square "poo" among circle meals) reads without colour. **`emphasis: 'strong'`** draws a series' unsized points larger (`--scatter-dot-strong`) with a thicker surface-coloured ring (`--scatter-dot-strong-ring-width`) so they read over other dots and reference lines; sized points keep their size scale and get the ring.
- **Axes.** `xScale="number"` (default) is linear; `"time"` takes `Date` or epoch ms for `x` and passes epoch ms to `formatX`. Domains default to the data extent (y includes 0 when every y ≥ 0); points outside a fixed `xDomain` / `yDomain` are clipped. `xLabel` / `yLabel` are drawn as axis titles and head the data-table columns.
- **Size.** Dot area is proportional to `point.size`, scaled from 0 (20 and 22 look nearly alike; tiny, zero or negative sizes get the smallest dot). Needs `formatSize`; name it with `sizeLabel`. `--scatter-dot-max` is an upper bound: the largest dot's radius is also capped at 1/25 of the chart width, so a phone-width chart (~250px) draws a 10px radius instead of 16px and the dots don't swallow their neighbours (height never caps it). Raising the token only takes effect on wide charts; lowering it always does. The plot is inset so the largest dot and its hover ring are not clipped at the plot edge (the inset assumes the default 2px `--scatter-dot-ring-width`).
- **`connect`** on a series draws a solid line in its colour through its visible points sorted by `x`, under the dots (`true`, or `{ maxGap }` to break the line between neighbours further apart than `maxGap` in x units, ms on a time axis; single points get no line). Decorative: the legend, tooltip, keyboard and table stay per point, and hiding the series hides its line. It replaces the second dashed `reference` line some apps drew only to join a series' points.
- **`trendLine`** draws a dashed least-squares line per visible series (decorative; series with fewer than 2 distinct x get none). **`reference`** is one app-computed dashed line, or an array of them (e.g. usual pace + today's pace), each listed in the legend as a plain entry (not a toggle); the component does not fit them. Each line gets its own dash pattern (cycling after three) so lines differ without colour; `color` pins a palette slot, default is neutral ink; `emphasis: 'strong'` draws one line thicker (`--chart-reference-width-strong`) so it stands out, e.g. today's pace over the usual; `key` is the line's identity (default: index).
- **Legend** toggles series (`hiddenSeries` / `onHiddenSeriesChange` to control). The last visible series with points can't be hidden.
- **Keyboard.** Focus the plot; ←/→ walk all points by x, Home / End jump to the first / last, Esc dismisses. **Screen readers** get a visually hidden data table (caption = `label`) with every point of the visible series; the SVG is hidden from them.
- **Empty** (no series has a point) renders `EmptyState` with `emptyMessage`.
- **Sizing.** Fills its parent; the parent needs a definite height.

#### When NOT to use

- ❌ A value over evenly bucketed time → `Chart`.
- ❌ Two grid dimensions with one value per cell (weekday × hour) → `Heatmap`.
- ❌ More than a few hundred points: dots overlap and the data table grows; aggregate in the app first.
- ❌ More than 8 series → fold the tail into an "Other" series.

#### Anti-patterns

- ❌ Wrapping `ScatterChart` in a fixed-height or scrolling div inside the widget body. The cell is the size.
- ❌ Passing `loading` / error UI into `ScatterChart`. Use `DashboardWidget loading` and an `ErrorState` child.
- ❌ Computing the trend or reference line yourself to fake `trendLine`. Use `trendLine`; use `reference` only for a line the app owns.
- ❌ Inline `series` / `formatX` on every render of a busy parent; layout is recomputed on identity change.
