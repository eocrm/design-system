# `<Sparkline>` — compact trend graphic for KPI cards

Static, axis-free line / area / bar trend with an intrinsic height (`--size-sparkline`, 40px) and full width. `role="img"` named "{label}: from {first} to {last}, low {min}, high {max}" (numbers through `formatValue`). `null` and non-finite values are gaps; area and bar anchor at zero for non-negative data. With negative data a line spans min..max, an area fills from the bottom (min), and bars hang from a zero line (all-negative series hang from the top). No hover, no tab stop, no animation.

```tsx
import { DashboardWidget, Sparkline, StatGroup, StatTile } from '@eocrm/design-system';

// Standalone
<Sparkline label="Contacts per day" values={dailyCounts} />
<Sparkline label="Deals won per week" type="bar" values={weekly} formatValue={fmt} />

// StatTile slot
<StatGroup aria-label="Usage">
  <StatTile
    label="Contacts"
    value="1,284"
    sparkline={<Sparkline label="Contacts per day" type="area" values={dailyCounts} />}
  />
</StatGroup>

// kpi DashboardWidget: pass it as children
<DashboardWidget variant="kpi" title="Open deals" value="128">
  <Sparkline label="Open deals per day" values={dailyCounts} />
</DashboardWidget>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | yes | What the series is, e.g. "Contacts per day". Starts the accessible name. |
| `values` | `readonly (number \| null)[]` | yes | Values oldest → newest. `null` (or a non-finite number) = no data for that slot: a gap in a line/area, no bar. |
| `type` | `'line' \| 'area' \| 'bar'` | no | Mark type. Default `'line'`. - `'line'` — smoothed line with a dot on the latest value. Trends of a rate or level. - `'area'` — the line over a filled area anchored at zero. Volumes / counts over time. - `'bar'` — one bar per value. Discrete per-period counts (daily signups). |
| `formatValue` | `((n: number) => string)` | no | Formats numbers in the accessible summary. Default: `Intl.NumberFormat` for the current locale. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Name, not a table.** The summary (first, last, low, high) is folded into the accessible name; there is no data table. Empty or all-null `values` render nothing and are named "{label}: no data".
- **Ignored attributes.** `role`, `aria-label` and `aria-labelledby` are ignored; the name is always derived from `label` and `values`.
- **Marks.** `line` and `area` are smoothed and end in a dot on the last value; `bar` draws one bar per non-null value. A flat series is drawn mid-height.

#### When NOT to use

- ❌ Values someone must read or compare exactly, axes or dates, several series, hover / keyboard inspection → `Chart`.
- ❌ Wrapping it in `Constrain` or giving it a height: it brings its own.
- ❌ Passing `role` / `aria-label` / `aria-labelledby` to rename it: they are ignored.
