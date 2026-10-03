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
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `density` | `TableDensity` | no | — | Row height + cell padding scale. Defaults to `'comfortable'`. - `'comfortable'` — 32px row, 12px horiz padding, font-size-md. - `'dense'` — 24px row, 8px horiz padding, font-size-sm. |
| `striped` | `boolean` | no | — | Zebra-striped body rows (even rows tinted). Defaults to `false`. |
| `bordered` | `boolean` | no | — | Full-grid borders — outer border + vertical borders between every cell on top of the existing horizontal row dividers. Defaults to `false` (Atlassian-style minimal: header underline + row dividers only). |
| `hover` | `boolean` | no | — | Hover highlight on body rows. Defaults to `false` — turn on when the table represents a list of clickable / selectable items (a row a user is likely to act on). Leave off for read-only data displays where the hover affordance would suggest interactivity that isn't there. |
| `stickyHeader` | `boolean` | no | — | `position: sticky` on the header so it stays visible while body scrolls. Requires a scrollable ancestor — the default `scroll` wrapper provides one. Defaults to `false`. |
| `scroll` | `boolean` | no | — | When `true` (default), the `<table>` is wrapped in a `<div>` with `overflow-x: auto` so wide tables scroll horizontally inside their container. Set to `false` to render a bare `<table>` — the consumer manages their own scroll context. |
| `children` | `ReactNode` | no | — | Compound-subcomponent children. |
| …native | | | | plus native `<table>` attributes |

### `TableCaptionProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — |  |
| …native | | | | plus native `<TableCaption>` attributes |

### `TableCellProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `align` | `TableCellAlign` | no | — | Text alignment. Defaults to `'start'`. |
| `truncate` | `boolean` | no | — | Suppress wrapping and ellipsize on overflow. Requires a constrained cell width (column-level CSS or `style={{ maxWidth: … }}`). |
| `children` | `ReactNode` | no | — |  |
| …native | | | | plus native `<TableCell>` attributes |

### `TableHeaderCellProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `align` | `TableCellAlign` | no | — | Text alignment. Defaults to `'start'`. |
| `scope` | `"row" \| "rowgroup" \| "col" \| "colgroup"` | no | — | Native HTML `<th scope>` attribute. Defaults to `'col'` (the cell labels its column). Use `'row'` for the leftmost cell that labels its row when rendering row-headers inside `<Table.Body>`. `'colgroup'` / `'rowgroup'` are valid HTML but rarely needed in practice. |
| `sortDirection` | `TableSortDirection` | no | — | When set, the cell renders a sort indicator (up/down/unsorted chevron) and sets `aria-sort`. The consumer drives interactivity via `onClick`; this primitive only paints the indicator. Sortable headers also become keyboard-reachable (`tabIndex={0}` + Enter/Space → `onClick`). - `'asc'` → up chevron + `aria-sort="ascending"`. - `'desc'` → down chevron + `aria-sort="descending"`. - `'none'` → muted up/down chevron + `aria-sort="none"`. Omit to render a non-sortable header (no chevron, no `aria-sort`). |
| `children` | `ReactNode` | no | — |  |
| …native | | | | plus native `<TableCell>` attributes |

### `TableRowProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `selected` | `boolean` | no | — | Visual selected state. Pair with the consumer's own selection logic. Adds `aria-selected="true"` and a subtle accent tint that wins over hover/striped. |
| `children` | `ReactNode` | yes | — |  |
| …native | | | | plus native `<TableRow>` attributes |

### `TableSectionProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `children` | `ReactNode` | yes | — |  |
| …native | | | | plus native `<TableSection>` attributes |

<!-- props:end -->

- Compound subcomponents: `Table`, `Table.Caption`, `Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.HeaderCell`, `Table.Cell`. Renders native `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>` / `<tfoot>` / `<caption>` — no ARIA-on-divs.
- Visual modifiers on root: `density` (`'comfortable'` (default, 32px row) / `'dense'` (24px)), `hover` (default off — opt in for clickable / selectable row lists), `striped`, `bordered` (full-grid borders; default off — Atlassian-minimal style is just row dividers + header underline), `stickyHeader`, `scroll` (default `true` — wraps in `overflow-x: auto`).
- `<Table.Row selected>` paints a tinted bg + `aria-selected="true"`. Selection state itself is the consumer's job.
- `<Table.HeaderCell sortDirection>` is a visual hook: renders an up / down / unsorted chevron + sets `aria-sort`. Wire `onClick` to your own sort state. `<DataTable>` (not yet shipped) will compose this seam.
- `<Table.Cell align>` / `<Table.HeaderCell align>`: `'start' | 'center' | 'end'` (CSS logical, RTL-friendly). Right-aligned headers auto-flip the sort chevron to the start side.
- `<Table.Cell truncate>` ellipses overflow text on one line. Requires a constrained cell width (`style={{ maxWidth }}` or `<col>`).
- **`colSpan` / `rowSpan`** flow through to the native `<th>` / `<td>` via spread. Use for multi-row grouped headers (`rowSpan` on a corner cell + `colSpan` on group cells over a second `<Table.Row>`), category-grouped body rows (`rowSpan` on a leftmost cell), and footer total rows (`<Table.Cell colSpan={n}>Total</Table.Cell>`). Use `<Table.HeaderCell scope="row">` (instead of `<Table.Cell>`) for the leftmost cell when it labels its row to AT.
- The native HTML `align` attribute on `<th>` / `<td>` is shadowed by the component-level `align` prop (logical) — `Omit<…, 'align'>` on both `*Props`.
- **Use `<DataTable>` instead** when you need sorting / filtering / pagination state. Table is the paint primitive; DataTable will be the opinionated wrapper.

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

**Sizing:** the `<table>` is `min-width: 100%` (not `width: 100%`), so it fills the wrap for narrow content but grows past it when cell content or explicit `<col>` widths sum wider; the default `scroll` wrapper then scrolls horizontally.

**When NOT to use**

- Non-tabular content (cards, lists): use `<Stack>` / `<Cluster>` / `<Card>`.
- Editable cells: no inline editing ships; add inputs inside cells yourself.

**Anti-patterns**

- `<Table>` without `<Table.Body>` for data rows: native semantics require `<tbody>`.
- `scope` on `<Table.Cell>`: it renders a `<td>`, where `scope="row"` is invalid. Use `<Table.HeaderCell scope="row">` for a row-header column.
