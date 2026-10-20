# `<Table>` — tabular data primitive

```tsx
<Table>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Name</Table.HeaderCell>
      <Table.HeaderCell align="end">Amount</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {rows.map((r) => (
      <Table.Row key={r.id}>
        <Table.Cell>{r.name}</Table.Cell>
        <Table.Cell align="end">{r.amount}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

<!-- props:start -->

## Props

### `TableProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `density` | `'comfortable' \| 'dense'` | no | Row height + cell padding scale. Defaults to `'comfortable'`. - `'comfortable'` — 32px row, 12px horiz padding, font-size-md. - `'dense'` — 24px row, 8px horiz padding, font-size-sm. |
| `striped` | `boolean` | no | Zebra-striped body rows (even rows tinted). Defaults to `false`. |
| `bordered` | `boolean` | no | Full-grid borders — outer border + vertical borders between every cell on top of the existing horizontal row dividers. Defaults to `false` (Atlassian-style minimal: header underline + row dividers only). |
| `hover` | `boolean` | no | Hover highlight on body rows. Defaults to `false` — turn on when the table represents a list of clickable / selectable items (a row a user is likely to act on). Leave off for read-only data displays where the hover affordance would suggest interactivity that isn't there. |
| `stickyHeader` | `boolean` | no | `position: sticky` on the header so it stays visible while body scrolls. Requires a scrollable ancestor — the default `scroll` wrapper provides one. Defaults to `false`. |
| `scroll` | `boolean` | no | When `true` (default), the `<table>` is wrapped in a `<div>` with `overflow-x: auto` so wide tables scroll horizontally inside their container. Set to `false` to render a bare `<table>` — the consumer manages their own scroll context. |
| `layout` | `'auto' \| 'fixed'` | no | Column-layout algorithm. Defaults to `'auto'`. - `'auto'` — columns size to their content (native default). - `'fixed'` — `table-layout: fixed`: widths come from a native `<colgroup><col style={{ width }} /></colgroup>` (or the first row), and unsized columns split the rest equally. Use for grids of equal-width number columns. |
| `children` | `ReactNode` | no | Compound-subcomponent children. |
| …native | | | plus native `<table>` attributes |

### `TableCaptionProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes |  |
| …native | | | plus native `<caption>` attributes |

### `TableCellLinkProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | no |  |
| `as` | `ElementType` | no | Element or component to render. Defaults to `'a'`; use for router links. |
| …native | | | plus native attributes of the `as` element (default `<a>`) |

### `TableCellProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `align` | `'start' \| 'center' \| 'end'` | no | Text alignment. Defaults to `'start'`. |
| `truncate` | `boolean` | no | Suppress wrapping and ellipsize on overflow. Requires a constrained cell width (column-level CSS or `style={{ maxWidth: … }}`). |
| `tone` | `'danger' \| 'accent'` | no | Tints the cell background and colours its text. Exposed as `data-tone`. Default: none. Set it on every cell of the column (header included). - `'danger'` — overdue / at-risk column. - `'accent'` — the current / highlighted column (e.g. "Today"). |
| `children` | `ReactNode` | no |  |
| …native | | | plus native `<td>` attributes |

### `TableHeaderCellProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `align` | `'start' \| 'center' \| 'end'` | no | Text alignment. Defaults to `'start'`. |
| `scope` | `'row' \| 'rowgroup' \| 'col' \| 'colgroup'` | no | Native HTML `<th scope>` attribute. Defaults to `'col'` (the cell labels its column). Use `'row'` for the leftmost cell that labels its row when rendering row-headers inside `<Table.Body>`. `'colgroup'` / `'rowgroup'` are valid HTML but rarely needed in practice. |
| `sortDirection` | `'asc' \| 'desc' \| 'none'` | no | When set, the cell renders a sort indicator (up/down/unsorted chevron) and sets `aria-sort`. The consumer drives interactivity via `onClick`; this primitive only paints the indicator. Sortable headers also become keyboard-reachable (`tabIndex={0}` + Enter/Space → `onClick`). - `'asc'` → up chevron + `aria-sort="ascending"`. - `'desc'` → down chevron + `aria-sort="descending"`. - `'none'` → muted up/down chevron + `aria-sort="none"`. Omit to render a non-sortable header (no chevron, no `aria-sort`). |
| `tone` | `'danger' \| 'accent'` | no | Tints the header cell (top corners rounded) so a toned column reads as one band with its toned body cells. Exposed as `data-tone`. Default: none. - `'danger'` — overdue / at-risk column. - `'accent'` — the current / highlighted column (e.g. "Today"). |
| `children` | `ReactNode` | no |  |
| …native | | | plus native `<th>` attributes |

### `TableRowProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `selected` | `boolean` | no | Visual selected state. Pair with the consumer's own selection logic. Adds `aria-selected="true"` and a subtle accent tint that wins over hover/striped. |
| `children` | `ReactNode` | yes |  |
| …native | | | plus native `<tr>` attributes |

### `TableSectionProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | yes |  |
| …native | | | plus native `<tbody>` attributes |

<!-- props:end -->

- Compound subcomponents: `Table`, `Table.Caption`, `Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.HeaderCell`, `Table.Cell`, `Table.CellLink`. Renders native `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>` / `<tfoot>` / `<caption>` — no ARIA-on-divs.
- Visual modifiers on root: `density` (`'comfortable'` (default, 32px row) / `'dense'` (24px)), `hover` (default off — opt in for clickable / selectable row lists), `striped`, `bordered` (full-grid borders; default off — Atlassian-minimal style is just row dividers + header underline), `stickyHeader`, `scroll` (default `true` — wraps in `overflow-x: auto`).
- `<Table.Row selected>` paints a tinted bg + `aria-selected="true"`. Selection state itself is the consumer's job.
- `<Table.HeaderCell sortDirection>` is a visual hook: renders an up / down / unsorted chevron + sets `aria-sort`. Wire `onClick` to your own sort state. (`<DataTable>` does not use this prop: it sets `aria-sort` and draws its own chevron.)
- `<Table.Cell align>` / `<Table.HeaderCell align>`: `'start' | 'center' | 'end'` (CSS logical, RTL-friendly). Right-aligned headers auto-flip the sort chevron to the start side.
- `<Table.Cell truncate>` ellipses overflow text on one line. Requires a constrained cell width (`style={{ maxWidth }}` or `<col>`).
- **`colSpan` / `rowSpan`** flow through to the native `<th>` / `<td>` via spread. Use for multi-row grouped headers (`rowSpan` on a corner cell + `colSpan` on group cells over a second `<Table.Row>`), category-grouped body rows (`rowSpan` on a leftmost cell), and footer total rows (`<Table.Cell colSpan={n}>Total</Table.Cell>`). Use `<Table.HeaderCell scope="row">` (instead of `<Table.Cell>`) for the leftmost cell when it labels its row to AT.
- The native HTML `align` attribute on `<th>` / `<td>` is shadowed by the component-level `align` prop (logical) — `Omit<…, 'align'>` on both `*Props`.
- `layout="fixed"` sets `table-layout: fixed` (default `'auto'`). Column widths come from a native `<colgroup><col style={{ width }} /></colgroup>`; unsized columns split the remainder equally. Use it for grids of equal-width number columns.
- `tone="danger" | "accent"` on `<Table.Cell>` / `<Table.HeaderCell>` tints the cell and colours its text (exposed as `data-tone`). Set it on every cell of the column, header included: a toned header gets rounded top corners so the column reads as one band. There is no column-level tone prop.
  - A toned cell's tint and colour win over the row's hover / selected tint, so the column stays one band across every row.
- `<Table.CellLink>` is a full-bleed link placed as the direct child of `<Table.Cell>` (not `<Table.HeaderCell>`, which wraps its children). The cell drops its padding and the link takes it over (respecting `density`), so the whole cell is the hit area. It inherits the cell's alignment and colour and renders semibold (`--table-cell-link-font-weight`) so link cells read as actionable; hover darkens the cell (no underline — the cell-wide overlay is the hover signal), keyboard focus draws an inset ring. On hover, `tone="muted"` (and deprecated `tone="subtle"`) `<Text>` inside the link takes the link's own colour, because muted text on the hover overlay falls under AA; on a toned cell that colour is the tone's hover colour. Polymorphic `as` (default `'a'`) for router links, like `<Link>`. You supply the accessible name: when the visible text is just a number, give it an `aria-label` that says what it counts (`"Deals, overdue: 3"`). A zero shown as a dash is labelled `"…: none"` because a dash has no spoken meaning — `"Deals, today: none"`.
- **Use `<DataTable>` instead** when you need sorting / filtering / pagination state. Table is the paint primitive; `DataTable` is the opinionated wrapper.

```tsx
// Caption and a sortable column — you own the sort state; the primitive paints the indicator and sets aria-sort:
<Table>
  <Table.Caption>Recent activity</Table.Caption>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell
        sortDirection={sortKey === 'amount' ? sortDir : 'none'}
        onClick={() => toggleSort('amount')}
      >
        Amount
      </Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  ...
</Table>
```

```tsx
// Count grid: fixed equal-width columns, toned columns, every cell a link.
<Table layout="fixed">
  <colgroup>
    <col style={{ width: '23%' }} />
    <col />
    <col />
  </colgroup>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Type</Table.HeaderCell>
      <Table.HeaderCell tone="danger" align="end">
        Overdue
      </Table.HeaderCell>
      <Table.HeaderCell tone="accent" align="end">
        Today
      </Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row>
      <Table.HeaderCell scope="row">Deals</Table.HeaderCell>
      <Table.Cell tone="danger" align="end">
        <Table.CellLink href="/deals?due=overdue" aria-label="Deals, overdue: 3">
          3
        </Table.CellLink>
      </Table.Cell>
      <Table.Cell tone="accent" align="end">
        <Table.CellLink href="/deals?due=today" aria-label="Deals, today: none">
          <Text as="span" size="inherit" tone="muted">
            –
          </Text>
        </Table.CellLink>
      </Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

**Sizing:** the `<table>` is `min-width: 100%` (not `width: 100%`), so it fills the wrap for narrow content but grows past it when cell content or explicit `<col>` widths sum wider; the default `scroll` wrapper then scrolls horizontally.

**When NOT to use**

- Non-tabular content (cards, lists): use `<Stack>` / `<Cluster>` / `<Card>`.
- Editable cells: no inline editing ships; add inputs inside cells yourself.

**Anti-patterns**

- `<Table>` without `<Table.Body>` for data rows: native semantics require `<tbody>`.
- A `<Link>` inside a cell when the whole cell should be clickable: only the text is the hit area and the hover/focus treatment doesn't fill the cell. Use `<Table.CellLink>`.
- Wrapping `<Table.CellLink>` in another element inside the cell: it must be the cell's direct child, or the cell keeps its padding and the link stops being full-bleed.
- A `<Table.CellLink>` whose only content is a number with no `aria-label`: a screen reader hears "3, link" with no row or column context.
- `scope` on `<Table.Cell>`: it renders a `<td>`, where `scope="row"` is invalid. Use `<Table.HeaderCell scope="row">` for a row-header column.
