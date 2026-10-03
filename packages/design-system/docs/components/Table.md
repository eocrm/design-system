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

- Compound subcomponents: `Table`, `Table.Caption`, `Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.HeaderCell`, `Table.Cell`. Renders native `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>` / `<tfoot>` / `<caption>` — no ARIA-on-divs.
- Visual modifiers on root: `density` (`'comfortable'` (default, 32px row) / `'dense'` (24px)), `hover` (default off — opt in for clickable / selectable row lists), `striped`, `bordered` (full-grid borders; default off — Atlassian-minimal style is just row dividers + header underline), `stickyHeader`, `scroll` (default `true` — wraps in `overflow-x: auto`).
- `<Table.Row selected>` paints a tinted bg + `aria-selected="true"`. Selection state itself is the consumer's job.
- `<Table.HeaderCell sortDirection>` is a visual hook: renders an up / down / unsorted chevron + sets `aria-sort`. Wire `onClick` to your own sort state. `<DataTable>` (not yet shipped) will compose this seam.
- `<Table.Cell align>` / `<Table.HeaderCell align>`: `'start' | 'center' | 'end'` (CSS logical, RTL-friendly). Right-aligned headers auto-flip the sort chevron to the start side.
- `<Table.Cell truncate>` ellipses overflow text on one line. Requires a constrained cell width (`style={{ maxWidth }}` or `<col>`).
- **`colSpan` / `rowSpan`** flow through to the native `<th>` / `<td>` via spread. Use for multi-row grouped headers (`rowSpan` on a corner cell + `colSpan` on group cells over a second `<Table.Row>`), category-grouped body rows (`rowSpan` on a leftmost cell), and footer total rows (`<Table.Cell colSpan={n}>Total</Table.Cell>`). Use `<Table.HeaderCell scope="row">` (instead of `<Table.Cell>`) for the leftmost cell when it labels its row to AT.
- The native HTML `align` attribute on `<th>` / `<td>` is shadowed by the component-level `align` prop (logical) — `Omit<…, 'align'>` on both `*Props`.
- **Use `<DataTable>` instead** when you need sorting / filtering / pagination state. Table is the paint primitive; DataTable will be the opinionated wrapper.
