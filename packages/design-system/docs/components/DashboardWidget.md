# `<DashboardWidget>` — card for a DashboardCanvas cell

A widget card that fills its `DashboardCanvas` cell, in four presentations: `standard`, `list`, `kpi` and `chart`. Owns the header (title, actions), the body chrome and a variant-matched loading skeleton. The app keeps data, error state, permissions and the overflow menu.

```tsx
import {
  Card,
  DashboardCanvas,
  DashboardWidget,
  EmptyState,
  ErrorState,
} from '@eocrm/design-system';

<DashboardCanvas
  items={layout}
  onItemsChange={setLayout}
  renderItem={(id) => (
    <DashboardWidget
      variant="kpi"
      title="Open deals"
      actions={menu}
      value="128"
      trend={{ label: '+12% vs last month', direction: 'up' }}
    />
  )}
/>;

// kpi, where "up" is bad
<DashboardWidget
  variant="kpi"
  title="Churned accounts"
  value="14"
  trend={{ label: '+3 vs last month', direction: 'up', sentiment: 'negative' }}
/>;

// list: Card.List bleeds edge to edge
<DashboardWidget variant="list" title="Tasks due" actions={menu} loading={isLoading}>
  <Card.List>{/* rows */}</Card.List>
</DashboardWidget>;

// chart: the plot fills the cell
<DashboardWidget variant="chart" title="Revenue">
  <RevenueChart style={{ height: '100%' }} />
</DashboardWidget>;

// standard (default), with error and empty states as children
<DashboardWidget title="Recent activity" loading={isLoading}>
  {error ? (
    <ErrorState title="Could not load" headingLevel={4} />
  ) : items.length === 0 ? (
    <EmptyState title="Nothing yet" />
  ) : (
    <Feed items={items} />
  )}
</DashboardWidget>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `variant` | `'standard' \| 'list' \| 'kpi' \| 'chart'` | no | Presentation variant. Default `'standard'`. - `'standard'` — header (title + actions) over a padded scrolling body. Today's widget card. - `'list'` — same fixed header as `standard`; flush scrolling body so `Card.List` bleeds edge to edge. - `'kpi'` — compact muted title, a large `value`, optional `trend`; optional `children` below. No scrolling. - `'chart'` — compact header; flush non-scrolling body that fills the cell (give the plot `height: 100%`). |
| `title` | `ReactNode` | yes | Widget title, rendered as the heading at `headerLevel`. Required. |
| `meta` | `ReactNode` | no | Secondary, non-interactive header text such as freshness ("Updated 3 minutes ago") or status. Sits before `actions` and yields first in a narrow cell: it truncates, then hides, before the title shrinks, while `actions` never shrinks. Also describes the body region (`aria-describedby`) for `standard` / `list`. Repeat it in the refresh button's tooltip if it matters when truncated. |
| `actions` | `ReactNode` | no | Header actions, e.g. the edit-mode overflow `DropdownMenu`. Never wraps. |
| `headerLevel` | `'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6'` | no | Heading level of the title. Default `'h3'`. |
| `value` | `ReactNode` | no | KPI value (`variant="kpi"` only), e.g. `"128"` or a formatted currency node. |
| `trend` | `DashboardWidgetTrend` | no | KPI trend (`variant="kpi"` only). |
| `loading` | `boolean` | no | Show a variant-matched loading skeleton instead of the body (and, for kpi, instead of `value`/`trend`); title and actions stay. Adds visually hidden "Loading…" body text and `aria-busy`. Deliberately NO live region: a dashboard loads many widgets at once, so per-widget announcements would flood screen readers — announce "dashboard loaded" once at page level if needed. Default `false`. |
| `children` | `ReactNode` | no | Widget body. Pass `ErrorState` / `EmptyState` here for error and empty states. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Fills its cell.** It is a `<Card fill padding="none">`; `DashboardCanvas` sizes the cell, the widget fills it. The root is a `div` with a heading (no landmark; 20 regions on one dashboard is noise). Heading level is `headerLevel` (default `h3`).
- **Variants.** `standard`: header + padded scrolling body. `list`: same fixed header as `standard`, flush scrolling body so `Card.List` bleeds edge to edge. `kpi`: compact muted title, large `value`, optional `trend`, optional `children` below; does not scroll. `chart`: compact header, flush body that does not scroll and fills the remaining height, so give the plot `height: 100%`.
- **Only `standard` and `list` scroll.** `kpi` and `chart` bodies are non-scrolling (`Card.Body` without `scroll`).
- **`value` / `trend` are kpi only** and ignored on other variants.
- **Trend.** Direction icon plus a visually hidden "Increase / Decrease / No change" before `label`. Colour is by `sentiment`, which defaults from direction (up positive, down negative, flat neutral). Set `sentiment` explicitly when the direction is not the judgement (churn, overdue tasks up = `negative`).
- **`loading`** swaps the body (for kpi, the value and trend) for a skeleton matching the variant (standard: lines, list: rows, kpi: value + trend, chart: bars). Title and actions stay. The skeleton is `aria-hidden`; the body instead contains visually hidden "Loading..." text and the root gets `aria-busy` as a hint.
- **No live region, on purpose.** A dashboard loads 10 to 20 widgets at once; a live region per widget would flood a screen reader. If you want an announcement, make one at page level ("Dashboard loaded") once all widgets settle. That is the app's job.
- **Error and empty states** are the app's `ErrorState` / `EmptyState`, passed as `children` (for kpi, as `value` or `children`).
- **`actions`** (e.g. an edit-mode `DropdownMenu`) sit at the header's end and never wrap.
- **`meta`** is secondary, non-interactive header text (freshness such as "Updated 3 minutes ago", or status). It sits just before `actions`, muted and on one line, and yields first in a narrow cell: it truncates with an ellipsis, then hides once only a sliver is left, before the title gives up any width, while `actions` keeps its width. For `standard` / `list` it also describes the body region (`aria-describedby`). If the text matters when truncated, repeat it in the refresh button's tooltip.

#### When NOT to use

- ❌ A generic content card outside a dashboard → `<Card>`.
- ❌ A standalone stat with no grid cell → `<Card>` with your own layout.
- ❌ A placeholder in a widget catalog → `<WidgetPreview>`.

#### Anti-patterns

- ❌ Wrapping `DashboardWidget` in another `Card`. It already is one.
- ❌ Freshness or status text in `actions`. `actions` never shrinks, so the title gets crushed in a narrow cell; use `meta`.
- ❌ Buttons or links in `meta`. They can be truncated out of reach; controls go in `actions`.
- ❌ Passing `value` / `trend` to `standard`, `list` or `chart`. They are ignored; put content in `children`.
- ❌ Rendering your own `Skeleton` in `children` instead of `loading`. You lose the variant-matched shape, the hidden "Loading..." text and `aria-busy`.
- ❌ Adding a live region (`role="status"`, `aria-live`) to each widget while loading.
- ❌ Relying on direction-derived colour when up is bad. Set `sentiment`.
- ❌ A scrolling or fixed-height wrapper inside a `kpi` / `chart` body. The cell is the size; size the plot at `height: 100%`.
