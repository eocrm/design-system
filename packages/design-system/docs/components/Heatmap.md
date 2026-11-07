# `<Heatmap>` — grid of cells coloured by value (weekday × hour)

Rows by columns, each cell coloured by its value in up to five sequential steps with a legend; `null` is "no data" and renders as a neutral outlined cell, never the lowest step. Use it for patterns across two categorical dimensions (average grams eaten by weekday and hour, meals per hour). Ships its own legend, tooltip, keyboard inspection, data table and empty state. The app owns data, formatting, loading and errors.

```tsx
import { Heatmap, DashboardWidget } from '@eocrm/design-system';

<DashboardWidget variant="chart" title="Average eaten">
  <Heatmap
    label="Average grams eaten by weekday and hour"
    rows={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
    columns={hours} // ['00', '01', ... '23']
    values={grams} // grams[row][col], null = no data
    formatValue={(n) => `${n} g`}
  />
</DashboardWidget>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | yes | Accessible name of the figure and caption of its data table, e.g. "Meals by hour". Required. |
| `rows` | `string[]` | yes | Row labels, top to bottom, e.g. weekdays. Drawn left of the grid and heading the data-table rows. Required. |
| `columns` | `string[]` | yes | Column labels, left to right, e.g. hours. Drawn under the grid (thinned to fit) and heading the data-table columns. Required. |
| `values` | `(number \| null)[][]` | yes | Cell values as `values[row][col]`. `null` (or a missing / non-finite value) is "no data": a neutral outlined cell, never the lowest colour step. Values fall into up to five colour buckets with nice boundaries; integer data spanning five or fewer integers gets one bucket per integer. |
| `formatValue` | `(n: number) => string` | yes | Formats a value for the legend, tooltip, announcement and data table, e.g. `n => \`${n} g\``. Required. |
| `emptyMessage` | `ReactNode` | no | EmptyState title when no cell has a value. Default: translated "No data for this period". |
| `footnote` | `ReactNode` | no | Short note under the grid; takes its own row, also describes the grid for screen readers and stays in the empty state. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- **Buckets.** Values fall into up to five colour steps with nice boundaries clamped to the data. Integer data spanning five or fewer integers (e.g. meals per hour, 0..3) gets one step per integer. **Legend:** integer data lists disjoint ranges ("0–1", "2–3"); continuous data shows a stepped bar with each boundary value printed once between the swatches it separates. A formatter too coarse to keep integer ranges apart (e.g. rounding to hundreds) falls back to the stepped bar.
- **No data.** `null`, a missing or a non-finite value is "no data": outlined, announced as "No data", never confused with zero.
- **Colour** is one sequential ramp (`--heatmap-*` tokens), not the categorical palette: lighter to darker means low to high. Value is also printed in the tooltip, announcement and data table, so colour is never the only channel.
- **Keyboard.** Focus the grid; arrow keys move between cells, Home / End jump to the row start / end (with Ctrl or Cmd, the grid corners), Esc dismisses. **Screen readers** get a visually hidden data table (caption = `label`).
- **Column labels** are thinned to fit the width.
- **Empty** (no cell has a value) renders `EmptyState` with `emptyMessage`.
- **Sizing.** Cells are always square, as large as fit: the side is the smaller of (width − row labels) / columns and, when the parent gives a definite height (a `DashboardWidget variant="chart"` body does), (height − column labels) / rows. Without a definite height only the width counts and the figure takes the height it needs. The grid sits at the top-left; leftover width or height stays empty. There is no maximum, so a few columns in a wide box without a height get large cells; give it a height to bound them. The side never goes below 12 px: a smaller box makes the figure overflow its own box (a clipping parent such as the widget body cuts it off) rather than shrink cells further.

#### When NOT to use

- ❌ Values over a continuous time axis → `Chart`.
- ❌ Two continuous measures → `ScatterChart`.
- ❌ Reading or comparing exact values: colour shades are read only roughly → `Chart type="bar"`.

#### Anti-patterns

- ❌ Passing `0` for missing data. Pass `null`.
- ❌ Passing `loading` / error UI into `Heatmap`. Use `DashboardWidget loading` and an `ErrorState` child.
- ❌ Inline `values` / `formatValue` on every render of a busy parent; layout is recomputed on identity change.
