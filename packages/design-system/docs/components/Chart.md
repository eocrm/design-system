# `<Chart>` — time-series chart for a dashboard widget

Line, bar, stacked bar or area chart over app-bucketed categories. Fills a `DashboardWidget variant="chart"` body, reflows to any cell size, and ships its own legend, tooltip, keyboard inspection, data table and empty state. The app owns data, formatting, loading and errors.

```tsx
import { Chart, DashboardWidget, ErrorState } from '@eocrm/design-system';

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
      formatValue={(n) => numberFormat.format(n)}
    />
  )}
</DashboardWidget>;

// Stacked, with the previous period as a total line
<Chart
  type="stacked-bar"
  label="Deals won by owner"
  categories={weeks}
  series={[
    ...owners.map((o) => ({ key: o.id, label: o.name, values: o.values })),
    { key: 'prev', label: 'Previous period', values: prevTotals, comparisonOf: 'total' },
  ]}
  formatValue={formatCurrency}
/>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `type` | `'line' \| 'bar' \| 'stacked-bar' \| 'area'` | yes | Chart form. Required. - `'line'` — one line per series; trends over time. Comparison series dashed. - `'bar'` — grouped bars per category; compare a few series per bucket. Comparison bars outlined + light fill. - `'stacked-bar'` — bars stacked per category; parts of a total. Comparison only as `comparisonOf: 'total'` (dashed total line). - `'area'` — stacked areas; parts of a total over time. Same comparison rule as `stacked-bar`. |
| `label` | `string` | yes | Accessible name of the figure and caption of its data table, e.g. "Deals won per week". Required. |
| `categories` | `string[]` | yes | X-axis buckets, already formatted by the app ("12 Jan", "W3", "Mar"). `series[].values[i]` belongs to `categories[i]`. |
| `series` | `ChartSeries[]` | yes | Series to plot, in a stable order: colour follows position (non-comparison series 1–8 get palette slots 1–8), so keep the order fixed when filtering. At most 8 primary series — fold the rest into an "Other" series in the app (series 9+ still render, dashed/outlined, with a dev warning). `values` shorter than `categories` are padded with gaps; `null` is a gap (lines break, bars are absent). `comparisonOf` marks a de-emphasised comparison (e.g. previous period): a series key (line / bar) or `'total'` (stacked-bar / area). |
| `formatValue` | `(n: number) => string` | yes | Formats a number for axis ticks, tooltip and data table (the app owns i18n and currency). Required. |
| `emptyMessage` | `ReactNode` | no | EmptyState title when there are no categories or every value is null/zero. Default: translated "No data for this period". |
| `hiddenSeries` | `string[]` | no | Controlled list of hidden series keys (legend toggles). Omit for uncontrolled. Unknown keys are ignored. |
| `onHiddenSeriesChange` | `((keys: string[]) => void)` | no | Called with the next hidden keys when the user toggles a legend item. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- **Pre-bucketed data.** `categories` are x labels the app already formatted; `series[].values[i]` belongs to `categories[i]`. Shorter `values` are padded with gaps, extras ignored. `null` and non-finite values (NaN, Infinity) are gaps: lines and areas break, bars are absent.
- **Types.** `line` (trend), `bar` (grouped per bucket), `stacked-bar` (parts of a total), `area` (always stacked; overlapping areas hide each other).
- **Y axis** always includes 0, with rounded ticks formatted by `formatValue`. In `bar` and `line`, negative values grow down from 0; `stacked-bar` diverges around 0 (positives up, negatives down); `area` stacks without a diverging offset, so negatives accumulate.
- **Colour** follows a series' position among non-comparison series: 1–8 get the 8 validated palette colours (light + dark). Keep the order stable so filtering never repaints survivors.
- **Comparison series** (`comparisonOf`): in `line` / `bar`, name the parent's key — it inherits the parent's colour, dashed (line) or outlined with a light fill (bar), sits after its parent in legend and tooltip, and hides with it. In `stacked-bar` / `area`, use `comparisonOf: 'total'` — a dashed neutral line of the previous period's total. Mismatches are ignored with a dev warning.
- **Legend** appears with more than one series. Hover or focus an item to highlight its series; click to hide/show it (`aria-pressed`). The last visible primary series can't be hidden: its button is `aria-disabled` but stays focusable. A comparison's button is disabled while its parent is hidden. Control with `hiddenSeries` / `onHiddenSeriesChange` to persist per widget. Below 120px height the legend shrinks to one row with a "+N" counter; overflow items are not rendered, so they are not keyboard-reachable (the data table still lists every series).
- **Tooltip** on hover or tap shows every visible series at that bucket. On touch, tapping the plot shows it and it stays until focus leaves the chart (tap elsewhere). **Keyboard:** the plot is one tab stop (named by `label`, with the key hint as its description); ←/→ move, Home/End jump, Esc closes. Values are announced politely only while a keyboard user inspects — never on load, so a dashboard of charts stays quiet.
- **Screen readers** get a visually hidden data table (caption = `label`) with exactly the plotted values (a null cell reads "No data"); the SVG is hidden from them. Identity never relies on colour alone: dashes for comparisons, marker shapes per series, labels everywhere.
- **Empty** (no categories, or every value null/0) renders `EmptyState` with `emptyMessage` (default "No data for this period"; an empty string falls back to the default).
- **Sizing.** Fills its parent (`width/height: 100%`) and redraws on resize. X labels never overlap: end labels are clamped inside the chart and the last label is dropped if it would collide. It never scrolls horizontally.
- **Performance.** Layout is recomputed when the `formatValue`, `categories` or `series` identities change. Memoise them (`useCallback` / `useMemo`) when the parent re-renders often.

#### When NOT to use

- ❌ One headline number → `DashboardWidget variant="kpi"` or `StatGroup`.
- ❌ More than 8 groups at once → fold the tail into an "Other" series in the app (the DS can't know whether your metric is additive).
- ❌ Two measures with different units → two charts. There is no dual axis.
- ❌ Non-time categorical comparisons that need sorting, pies, scatter or zoom — not supported.

#### Anti-patterns

- ❌ Wrapping `Chart` in a fixed-height or scrolling div inside the widget body. The cell is the size.
- ❌ Passing `loading` / error UI into `Chart`. Use `DashboardWidget loading` and an `ErrorState` child.
- ❌ Reordering `series` by value each refresh — colours jump between entities.
- ❌ Formatting inside `categories` with the value (`"W1: 3"`); values go in `series`, labels in `categories`.
- ❌ Comparison series on 8 groups (16 marks): compare only ungrouped or with ≤ 4 groups.
