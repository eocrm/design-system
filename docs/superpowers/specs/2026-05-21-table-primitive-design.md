# Table primitive — design spec

**Date:** 2026-05-21
**Branch:** `feat/table-primitive`
**Scope:** New `<Table>` compound component. Purely visual primitive — no data behavior. DataTable (sort / filter / pagination / selection) is a separate future PR composing this primitive + TanStack Table headless.

## Goal

Ship the building blocks every CRM screen needs to render tabular data: a token-correct, accessible, native-HTML-based `<table>` with controlled density, opt-in hover/striped/sticky-header visuals, and a sort-indicator hook on header cells. Consumers wire their own data; this primitive just paints.

## Why a primitive first

- Lots of CRM screens render fixed-row tables (settings panels, summary lists, form-embedded data) that don't need column-defs / sort state. Forcing those through a heavyweight DataTable would be wrong.
- DataTable (the next PR) will compose this primitive — so the styling work has to happen here first or DataTable will end up rebuilding it.
- Aligns with established design-system convention: Mantine, Chakra, MUI all ship a primitive Table + an opinionated data wrapper.

## Architecture

Compound component using `Object.assign`-attached subcomponents (matches existing `DropdownMenu` pattern in this repo):

```tsx
<Table>
  <Table.Caption>Recent activity</Table.Caption>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Name</Table.HeaderCell>
      <Table.HeaderCell>Status</Table.HeaderCell>
      <Table.HeaderCell align="end">Amount</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {rows.map((row) => (
      <Table.Row key={row.id}>
        <Table.Cell>{row.name}</Table.Cell>
        <Table.Cell>{row.status}</Table.Cell>
        <Table.Cell align="end">{row.amount}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

Native HTML elements throughout (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`, `<tfoot>`, `<caption>`). No ARIA-roles-on-divs — native semantics are AT-friendly out of the box.

### Subcomponents

| Subcomponent          | Renders          | Purpose                                                 |
| --------------------- | ---------------- | ------------------------------------------------------- |
| `<Table>`             | `<table>`        | Root. Owns density + visual variants.                   |
| `<Table.Caption>`     | `<caption>`      | Accessible title for the table.                         |
| `<Table.Header>`      | `<thead>`        | Header row(s).                                          |
| `<Table.Body>`        | `<tbody>`        | Data rows.                                              |
| `<Table.Footer>`      | `<tfoot>`        | Footer row(s) — totals, summary, etc.                   |
| `<Table.Row>`         | `<tr>`           | A row. Carries hover/striped/selected visual.           |
| `<Table.HeaderCell>`  | `<th>`           | Column header. `scope="col"` by default.                |
| `<Table.Cell>`        | `<td>`           | Body / footer cell.                                     |

### Root `<Table>` props

```ts
export type TableDensity = 'comfortable' | 'dense';

export interface TableProps extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
  /**
   * Row height + cell padding scale. Defaults to `'comfortable'`.
   * - `'comfortable'` — 32px row, --space-3 cell padding, --font-size-md.
   * - `'dense'`       — 24px row, --space-2 cell padding, --font-size-sm.
   */
  density?: TableDensity;
  /** Zebra-striped body rows. Defaults to `false`. */
  striped?: boolean;
  /** Hover highlight on body rows. Defaults to `true`. */
  hover?: boolean;
  /**
   * `position: sticky` on the header so it stays visible while body scrolls.
   * Requires a scrollable ancestor (the default `scroll` wrapper provides
   * one). Defaults to `false`.
   */
  stickyHeader?: boolean;
  /**
   * When `true` (default), the `<table>` is wrapped in a `<div>` with
   * `overflow-x: auto` so wide tables scroll horizontally inside their
   * container. Set to `false` to render a bare `<table>` (the consumer
   * manages their own scroll context).
   */
  scroll?: boolean;
  children: ReactNode;
}
```

### `<Table.Row>` props

```ts
export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /**
   * Visual selected state. Pair with a checkbox cell + the consumer's own
   * selection state. Adds `aria-selected="true"` and a subtle accent tint.
   */
  selected?: boolean;
}
```

No `hover` / `striped` per-row — those are table-wide visual modifiers.

### `<Table.HeaderCell>` props

```ts
export type TableSortDirection = 'asc' | 'desc' | 'none';
export type TableCellAlign = 'start' | 'center' | 'end';

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Text alignment inside the header cell. Defaults to `'start'`. */
  align?: TableCellAlign;
  /**
   * When set, the cell renders a sort indicator (up/down chevron) and
   * sets `aria-sort`. The consumer drives interactivity by passing an
   * `onClick` — the primitive only paints the indicator.
   * - `'asc'`  → up chevron + `aria-sort="ascending"`.
   * - `'desc'` → down chevron + `aria-sort="descending"`.
   * - `'none'` → muted "unsorted" chevron + `aria-sort="none"`.
   * Omit to render a non-sortable header (no chevron, no `aria-sort`).
   */
  sortDirection?: TableSortDirection;
}
```

When `sortDirection` is set, the cell becomes a clickable button visually (cursor pointer, hover bg). The consumer wires the onClick — this is the DataTable composition seam.

### `<Table.Cell>` props

```ts
export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Text alignment inside the cell. Defaults to `'start'`. */
  align?: TableCellAlign;
  /**
   * Suppress text-wrapping. When true, the cell content stays on one line
   * and truncates with ellipsis if it overflows. Useful for IDs, dates,
   * status badges.
   */
  truncate?: boolean;
}
```

`truncate` is the one consumer-facing convenience worth bundling because text-wrap behavior is the #1 thing every Table consumer asks for. Sets `white-space: nowrap; text-overflow: ellipsis; overflow: hidden;` on the cell — requires a constrained width from the column (a CSS variable or `<col width>` if the consumer cares).

## Visual reference (tokens used)

All values come from existing tokens. No new tokens added.

| Visual                        | Token                                  |
| ----------------------------- | -------------------------------------- |
| Header bg                     | `--color-bg-subtle`                    |
| Header fg                     | `--color-fg-muted`                     |
| Header underline              | `--color-border` (bottom 1px)          |
| Row divider                   | `--color-border` (bottom 1px)          |
| Row hover bg                  | `--color-bg-subtle`                    |
| Row striped bg (even)         | `--color-bg-subtle`                    |
| Row selected bg               | `--color-accent-bg-subtle`             |
| Row selected fg               | `--color-fg`                           |
| Cell padding (comfortable)    | `--space-3` (12px) horiz, `--space-2` vert |
| Cell padding (dense)          | `--space-2` (8px) horiz, `--space-1` vert  |
| Row height (comfortable)      | `--size-md` (32px) min-height          |
| Row height (dense)            | `--size-sm` (24px) min-height          |
| Font size (comfortable)       | `--font-size-md`                       |
| Font size (dense)             | `--font-size-sm`                       |
| Sort chevron icon size        | 12px (matches existing 14px / 12px lucide convention; tight to header text) |

Sticky-header background must be opaque (`--color-bg-subtle`) so scrolling body rows don't show through.

## Behavior

- **Hover**: when `hover` is true (default), rows in `<Table.Body>` get a subtle bg on `:hover`. Header / footer rows do not hover-highlight.
- **Striped**: when `striped` is true, even-numbered body rows (1-indexed: 2nd, 4th, …) get `--color-bg-subtle`. Combines cleanly with hover (hover wins via CSS specificity).
- **Selected**: a row with `selected` gets a tinted bg + `aria-selected="true"`. Selected ALWAYS wins over hover/striped.
- **Sticky header**: header cells get `position: sticky; top: 0;` + a z-index above body rows. The default `scroll` wrapper provides the scroll context. If `scroll={false}`, the consumer must provide one.
- **Scroll wrapper**: `<div>` with `overflow-x: auto`. Renders an automatic horizontal scrollbar when the table is wider than its container.
- **Sortable header cell**: renders the cell's children + a chevron icon inline-end. Cursor pointer + hover bg signal interactivity. `aria-sort` set correctly.
- **Captions**: `<caption>` defaults to `caption-side: top` in HTML; we keep that.

## Accessibility

- Native HTML semantics throughout. No ARIA spoofing.
- `<th>` with `scope="col"` by default — handled inside `<Table.HeaderCell>`.
- `aria-sort` on sortable header cells.
- `aria-selected` on selected rows.
- Caption read by AT as the table's accessible name.
- Sticky header doesn't break AT (sticky is a paint-only optimization).

## File layout

```
packages/design-system/src/components/Table/
  Table.tsx              ← root + Object.assign-attached subcomponents
  Table.module.scss
  Table.test.tsx
  index.ts               ← re-exports
```

Single file for the entire component family — matches `DropdownMenu`'s pattern. Internal subcomponent functions live in `Table.tsx`; the `Table` export is the `Object.assign(Root, { Caption, Header, Body, Footer, Row, HeaderCell, Cell })` value.

## Tests

Standard Rule 1 coverage:

- Default render — `<Table><Table.Body><Table.Row><Table.Cell>…</Table.Cell></Table.Row></Table.Body></Table>` renders the expected DOM.
- Density modifier applies the right class.
- `hover` / `striped` / `stickyHeader` apply their classes.
- `<Table.Row selected>` carries `aria-selected="true"`.
- `<Table.HeaderCell sortDirection="asc">` renders the up chevron + `aria-sort="ascending"`.
- `<Table.HeaderCell>` without `sortDirection` does NOT render a chevron and does NOT set `aria-sort`.
- `<Table.Cell align="end">` applies the right alignment class.
- `<Table.Cell truncate>` applies the truncate class.
- `scroll={false}` does NOT wrap in the outer `<div>`.
- ForwardRef on `<Table>` reaches the `<table>` element.
- `className` on every subcomponent is merged, not replaced.

## Playground demo

`TableDemo.tsx` with examples:

1. **Default** — small static table (3 rows, 3 columns). Density=comfortable, hover on, no stripes.
2. **Dense** — same data, density=dense.
3. **Striped + hover** — striped rows.
4. **Selected row** — one row with `selected`.
5. **Sortable headers** — clickable header cells that toggle a local sort state and re-render with the right `sortDirection` chevron. Demonstrates the DataTable composition seam without actually shipping DataTable.
6. **Sticky header** — table in a fixed-height container that scrolls; header stays pinned.
7. **Truncated cell** — a column with `<Table.Cell truncate>` containing a long string that ellipses.

## AGENTS.md

Add a `<Table>` section right before `<DropdownMenu>` (or wherever Display alphabetically lands). Document:

- Compound subcomponents list.
- Density + visual modifiers.
- Sortable header is a visual hook — DataTable composes it.
- "Use `<DataTable>` (not yet shipped) when you need sorting / filtering / pagination state."

## Non-goals

- **Selection state machinery**. Visual `selected` prop only; selection logic lives in DataTable / consumer.
- **Empty / loading / error states**. DataTable concern. Consumer renders their own `<Table.Cell colSpan={n}>Empty</Table.Cell>` if needed.
- **Pagination footer**. DataTable concern.
- **Virtualization**. DataTable v2 maybe.
- **Column resizing / reordering**. DataTable v2 maybe.
- **Row expansion / nested rows**. Out of scope; future spec if a CRM screen needs it.
- **Row as link**. Consumer wraps cells in `<Link>`. We don't need an `asChild` pattern here yet.
- **Bordered variant**. Skip in v1; Atlassian-style minimal borders (header underline + row dividers) is the default. Add later if a CRM screen needs full borders.
- **xs / lg density**. Two densities is enough. Extend if a CRM screen demands it.

## Risks / open questions

- **`Object.assign` attached subcomponents + TypeScript ref inference**: each subcomponent uses `forwardRef`, so `Table.Body` etc. should accept refs typed to their respective HTML element. Verify in tests.
- **Sticky header z-index**: needs to sit above selected/hover row backgrounds. Use a small positive z-index (e.g., `z-index: 1`) on the `<th>` — not a global token because this is a table-internal stacking context.
- **Scroll wrapper Rule 4 compliance**: the outer `<div>` introduces a layout-impacting box (`overflow-x: auto`). Rule 4 forbids layout properties on the *component* box; this is on the WRAPPER (a sibling helper) and is the documented scroll-container pattern (matches how Calendar, Select, DatePicker handle their own internal wrappers). Acceptable.
- **`align` prop semantics**: `start | center | end` (CSS logical) vs `left | right | center` (physical). Going with logical — matches RTL future and the existing Cluster/Stack `justify`/`align` props.
- **Caption position**: HTML default is `caption-side: top`. Atlassian uses caption-top. Keep default.
