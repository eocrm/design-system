# `<StatTile>` — one KPI tile inside a StatGroup

```tsx
<StatGroup aria-label="Sales performance">
  <StatTile
    label="Revenue"
    value="€86,400"
    trend={{ label: '3.1% vs previous period', direction: 'down' }}
  />
</StatGroup>
```

TL;DR: label, large value, optional trend, footnote and icon, on a filled tile. Only valid as a child of [`StatGroup`](StatGroup.md), which owns the grid, the `<ul>` and the loading state. See `StatGroup.md` for loading and accessibility.

- `value={null}` / `undefined` shows "—" with visually hidden "No data". `0` is data and renders as `0`.
- `trend` is the same shape as `DashboardWidgetTrend`. `sentiment` defaults from `direction` (up → positive, down → negative, flat → neutral); override it when up is bad.
- `icon` is decorative and rendered as-is before the label; pass an `IconTile` (`size="sm"`). It hides in very narrow tiles.
- Format large values compactly (`€1.24M`, not `€1,240,000`): the value is `3xl` in a tile at least 11rem wide by default (`minColumnWidth`), and long numbers wrap. Use `Intl.NumberFormat(locale, { notation: 'compact' })`.
- The hidden trend words ("Increase / Decrease / No change") come from the `dashboardWidget.trendUp` / `trendDown` / `trendFlat` i18n keys, shared with `DashboardWidget`; override with `<I18nProvider overrides={{ dashboardWidget: { trendUp: '…' } }}>`, which also changes `DashboardWidget`'s KPI trend.

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `label` | `ReactNode` | yes | What the number is, e.g. "Pipeline value". Read first by screen readers. |
| `value` | `ReactNode` | yes | The pre-formatted value: an integer, currency or percentage (`"€1.24M"`, `"38%"`). Required so "no data" is explicit: pass `null` (or `undefined`) and the tile shows "—" with visually hidden "No data". `0` is data and renders as `0`. |
| `trend` | `DashboardWidgetTrend` | no | Delta under the value, e.g. `{ label: '12.4% vs previous period', direction: 'up' }`. Arrow + hidden "Increase / Decrease / No change"; colour from `sentiment`, which defaults from `direction` (up → positive). Override when up is bad (overdue tasks). |
| `footnote` | `ReactNode` | no | Small muted note under the trend, e.g. "2 deals in other currencies not included". Hidden while loading. |
| `icon` | `ReactNode` | no | Decorative icon before the label, typically `<IconTile size="sm" … />`. Hidden in very narrow tiles. |
| …native | | | plus native `<li>` attributes |

<!-- props:end -->

**When NOT to use:** a single KPI card (`DashboardWidget variant="kpi"`), or a standalone tile outside a group.

#### Anti-patterns

- ❌ Wrapping `StatTile` in another element inside `StatGroup`: the `<li>` must be a direct child of the `<ul>`.
- ❌ Putting interactive controls in a tile. Tiles are read-only; link out from the widget's actions instead.
