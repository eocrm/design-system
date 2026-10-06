# `<StatGroup>` — responsive grid of KPI tiles

```tsx
<DashboardWidget title="Key metrics">
  <StatGroup aria-label="Key metrics" loading={isLoading}>
    <StatTile
      label="Pipeline value"
      value={formatCurrency(pipeline)}
      trend={{ label: '12.4% vs previous period', direction: 'up' }}
      footnote="2 deals in other currencies not included"
      icon={<IconTile icon={<Euro size={14} />} color="blue" size="sm" />}
    />
    <StatTile label="Win rate" value={winRate ?? null} />
    <StatTile
      label="Overdue tasks"
      value="17"
      trend={{ label: '4 vs previous period', direction: 'up', sentiment: 'negative' }}
    />
  </StatGroup>
</DashboardWidget>
```

TL;DR: a `<ul>` grid of 1–8 [`StatTile`](StatTile.md)s for a dashboard widget that shows several numbers at once. Tiles reflow by available width (`minColumnWidth`, auto-fit). In a cell narrower than one column a single tile shrinks instead of overflowing, and very narrow tiles drop the icon and shrink the value. Put it in `DashboardWidget` `variant="standard"`: its body scrolls if the tiles overflow the cell.

**Loading:** `loading` keeps labels and icons and replaces each value and trend with a skeleton, so the placeholder has the real layout. Each tile's value slot carries visually hidden "Loading…" (read when browsing the tiles); no `aria-busy`: the per-tile hidden text already carries the state. There is deliberately no live region: a dashboard loads many widgets at once, and per-widget announcements would flood screen readers. Announce "dashboard loaded" once at page level if needed. Footnotes hide while loading (they describe data that is not there yet).

**Accessibility:** give the group a name (`aria-label`, or `aria-labelledby` pointing at the widget title). Screen readers read each tile in DOM order: label, value, trend ("Increase 12.4% vs previous period"), footnote.

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `minColumnWidth` | `string` | no | Minimum tile width before the grid drops a column (auto-fit). Any CSS length. Clamped to the group's width, so in a cell narrower than one column a single tile shrinks instead of overflowing. Default `'11rem'`. |
| `gap` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | no | Gap between tiles. `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32). |
| `loading` | `boolean` | no | Loading state for every tile: labels and icons stay; each value and trend becomes a skeleton with visually hidden "Loading…" in the value slot, and footnotes hide. Deliberately NO live region: a dashboard loads many widgets at once, so announcements would flood screen readers. No `aria-busy`: the per-tile hidden text already carries the state. Default `false`. |
| `children` | `ReactNode` | no | `StatTile` elements. |
| …native | | | plus native `<ul>` attributes |

<!-- props:end -->

**When NOT to use:**

- One number per card: use `DashboardWidget variant="kpi"`.
- Key/value facts that are not metrics (owner, stage, created date): use `DefinitionList`.
- A chart or a list of records: use `DashboardWidget variant="chart"` / `"list"`.

#### Anti-patterns

- ❌ Hand-composing `Grid` + `IconTile` + `Text` tiles. You lose the trend semantics, the "no data" text and the loading state.
- ❌ `<StatTile>` outside a `StatGroup`. It renders an `<li>` and reads `loading` from the group.
- ❌ `value="—"` for missing data. Pass `value={null}` so screen readers hear "No data" instead of silence or "em dash".
- ❌ Unformatted values (`value={1240000}`). Format before passing, using compact notation for large amounts: `Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumSignificantDigits: 3 })` gives `€1.24M`, not `€1,240,000`.
- ❌ Colouring a "bad" increase with `direction: 'down'`. Keep `direction` truthful and set `sentiment: 'negative'`.
- ❌ More than about 8 tiles in one widget. Split into two widgets.
- ❌ Putting a `StatGroup` in a parent that sizes to its content (a `Cluster` item, `width: max-content`, an `auto` `Split` aside). Each tile is a size container, so it contributes no intrinsic width and the tiles collapse. Give the parent a concrete width; a `DashboardWidget` cell already has one.
