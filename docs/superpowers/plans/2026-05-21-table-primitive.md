# Table primitive — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<Table>` compound primitive — `Table`, `Table.Caption`, `Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.HeaderCell`, `Table.Cell`. Visual modifiers (density, hover, striped, sticky header, scroll wrapper). Sortable header is visual hook only — consumer wires onClick.

**Architecture:** Single-file component family at `packages/design-system/src/components/Table/Table.tsx`. Native HTML elements throughout (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`, `<tfoot>`, `<caption>`). `Object.assign(Root, { Caption, Header, … })` for compound API — matches existing `DropdownMenu` pattern.

**Tech Stack:** React, SCSS modules, Vitest + RTL.

**Branch:** `feat/table-primitive` (already created, off fresh main).

**Spec:** `docs/superpowers/specs/2026-05-21-table-primitive-design.md`.

---

## Task 1: Verify branch + hooks

- [ ] **Step 1: Verify**

```bash
git rev-parse --abbrev-ref HEAD   # → feat/table-primitive
git config --get core.hooksPath   # → .husky/_
test -x .husky/pre-push           # exit 0
```

---

## Task 2: `Table.tsx` + `Table.module.scss`

**Files:**

- Create: `packages/design-system/src/components/Table/Table.tsx`
- Create: `packages/design-system/src/components/Table/Table.module.scss`

- [ ] **Step 1: Write `Table.tsx`**

Use EXACTLY this content:

```tsx
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import styles from './Table.module.scss';

/** Row height + cell padding scale. */
export type TableDensity = 'comfortable' | 'dense';

/** Header-cell text alignment. */
export type TableCellAlign = 'start' | 'center' | 'end';

/** Sort state for a header cell. */
export type TableSortDirection = 'asc' | 'desc' | 'none';

export interface TableProps extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
  /**
   * Row height + cell padding scale. Defaults to `'comfortable'`.
   * - `'comfortable'` — 32px row, 12px horiz padding, font-size-md.
   * - `'dense'`       — 24px row, 8px horiz padding, font-size-sm.
   */
  density?: TableDensity;
  /** Zebra-striped body rows (even rows tinted). Defaults to `false`. */
  striped?: boolean;
  /** Hover highlight on body rows. Defaults to `true`. */
  hover?: boolean;
  /**
   * `position: sticky` on the header so it stays visible while body
   * scrolls. Requires a scrollable ancestor — the default `scroll`
   * wrapper provides one. Defaults to `false`.
   */
  stickyHeader?: boolean;
  /**
   * When `true` (default), the `<table>` is wrapped in a `<div>` with
   * `overflow-x: auto` so wide tables scroll horizontally inside their
   * container. Set to `false` to render a bare `<table>` — the consumer
   * manages their own scroll context.
   */
  scroll?: boolean;
  /** Compound-subcomponent children. */
  children: ReactNode;
}

export interface TableCaptionProps extends HTMLAttributes<HTMLTableCaptionElement> {
  children: ReactNode;
}

export interface TableSectionProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /**
   * Visual selected state. Pair with the consumer's own selection logic.
   * Adds `aria-selected="true"` and a subtle accent tint that wins over
   * hover/striped.
   */
  selected?: boolean;
  children: ReactNode;
}

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Text alignment. Defaults to `'start'`. */
  align?: TableCellAlign;
  /**
   * When set, the cell renders a sort indicator (up/down/unsorted chevron)
   * and sets `aria-sort`. The consumer drives interactivity via `onClick`;
   * this primitive only paints the indicator.
   * - `'asc'`  → up chevron + `aria-sort="ascending"`.
   * - `'desc'` → down chevron + `aria-sort="descending"`.
   * - `'none'` → muted up/down chevron + `aria-sort="none"`.
   * Omit to render a non-sortable header (no chevron, no `aria-sort`).
   */
  sortDirection?: TableSortDirection;
  children?: ReactNode;
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Text alignment. Defaults to `'start'`. */
  align?: TableCellAlign;
  /**
   * Suppress wrapping and ellipsize on overflow. Requires a constrained
   * cell width (column-level CSS or `style={{ maxWidth: … }}`).
   */
  truncate?: boolean;
  children?: ReactNode;
}

const sortAriaFor: Record<TableSortDirection, 'ascending' | 'descending' | 'none'> = {
  asc: 'ascending',
  desc: 'descending',
  none: 'none',
};

/**
 * Tabular data primitive. Compound API:
 * `Table`, `Table.Caption`, `Table.Header`, `Table.Body`, `Table.Footer`,
 * `Table.Row`, `Table.HeaderCell`, `Table.Cell`.
 *
 * Native HTML elements throughout — no ARIA-on-divs. Density, hover,
 * striped, sticky header, and horizontal-scroll wrapper are visual
 * modifiers on the root. Sortable header is a visual hook — the consumer
 * wires `onClick` on `Table.HeaderCell` to drive their own sort state.
 *
 * @example
 * <Table>
 *   <Table.Caption>Recent activity</Table.Caption>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.HeaderCell>Name</Table.HeaderCell>
 *       <Table.HeaderCell align="end">Amount</Table.HeaderCell>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     {rows.map((r) => (
 *       <Table.Row key={r.id}>
 *         <Table.Cell>{r.name}</Table.Cell>
 *         <Table.Cell align="end">{r.amount}</Table.Cell>
 *       </Table.Row>
 *     ))}
 *   </Table.Body>
 * </Table>
 *
 * @example
 * // Sortable column — consumer owns the state machine; the primitive
 * // only paints the indicator and sets aria-sort.
 * <Table.HeaderCell
 *   sortDirection={sortKey === 'amount' ? sortDir : 'none'}
 *   onClick={() => toggleSort('amount')}
 * >
 *   Amount
 * </Table.HeaderCell>
 *
 * @remarks When NOT to use
 * - For data that needs sorting / filtering / pagination state — wait for
 *   `<DataTable>` (not yet shipped). DataTable composes this primitive +
 *   TanStack Table headless.
 * - For non-tabular content (cards, lists). Use `<Stack>` / `<Cluster>` /
 *   `<Card>` instead.
 * - For dashboards with editable cells. The primitive doesn't ship inline
 *   editing; consumer adds inputs inside cells as needed.
 *
 * @remarks Anti-patterns
 * - ❌ `<Table>` without `<Table.Body>` for non-header rows. Native
 *   semantics require `<tbody>` for data rows.
 * - ❌ Putting `<Table.HeaderCell>` inside `<Table.Body>` for the leftmost
 *   row-header column. Use a `<th scope="row">` instead — pass `scope` via
 *   spread on `<Table.Cell>` is not supported (it would silently render as
 *   `<td scope="row">` which is invalid). If you need row headers, file a
 *   follow-up to add a `rowHeader` prop.
 */
const TableRoot = forwardRef<HTMLTableElement, TableProps>(function TableRoot(
  { density = 'comfortable', striped, hover = true, stickyHeader, scroll = true, className, children, ...props },
  ref,
) {
  const table = (
    <table
      ref={ref}
      className={clsx(
        styles.table,
        styles[`density-${density}`],
        striped && styles.striped,
        hover && styles.hover,
        stickyHeader && styles.stickyHeader,
        className,
      )}
      // {...props} last so consumer overrides win (Pattern A).
      {...props}
    >
      {children}
    </table>
  );

  if (!scroll) return table;
  return <div className={styles.scrollWrap}>{table}</div>;
});

const TableCaption = forwardRef<HTMLTableCaptionElement, TableCaptionProps>(function TableCaption(
  { className, children, ...props },
  ref,
) {
  return (
    <caption ref={ref} className={clsx(styles.caption, className)} {...props}>
      {children}
    </caption>
  );
});

const TableHeader = forwardRef<HTMLTableSectionElement, TableSectionProps>(function TableHeader(
  { className, children, ...props },
  ref,
) {
  return (
    <thead ref={ref} className={clsx(styles.thead, className)} {...props}>
      {children}
    </thead>
  );
});

const TableBody = forwardRef<HTMLTableSectionElement, TableSectionProps>(function TableBody(
  { className, children, ...props },
  ref,
) {
  return (
    <tbody ref={ref} className={clsx(styles.tbody, className)} {...props}>
      {children}
    </tbody>
  );
});

const TableFooter = forwardRef<HTMLTableSectionElement, TableSectionProps>(function TableFooter(
  { className, children, ...props },
  ref,
) {
  return (
    <tfoot ref={ref} className={clsx(styles.tfoot, className)} {...props}>
      {children}
    </tfoot>
  );
});

const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { selected, className, children, ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      aria-selected={selected || undefined}
      className={clsx(styles.tr, selected && styles.selected, className)}
      {...props}
    >
      {children}
    </tr>
  );
});

const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(function TableHeaderCell(
  { align = 'start', sortDirection, scope = 'col', className, children, ...props },
  ref,
) {
  const sortable = sortDirection != null;
  const SortIcon =
    sortDirection === 'asc' ? ChevronUp : sortDirection === 'desc' ? ChevronDown : ChevronsUpDown;

  return (
    <th
      ref={ref}
      scope={scope}
      aria-sort={sortable ? sortAriaFor[sortDirection] : undefined}
      className={clsx(
        styles.th,
        styles[`align-${align}`],
        sortable && styles.sortable,
        sortable && sortDirection === 'none' && styles.sortableInactive,
        className,
      )}
      {...props}
    >
      <span className={styles.thInner}>
        <span>{children}</span>
        {sortable && <SortIcon size={12} aria-hidden="true" className={styles.sortIcon} />}
      </span>
    </th>
  );
});

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { align = 'start', truncate, className, children, ...props },
  ref,
) {
  return (
    <td
      ref={ref}
      className={clsx(
        styles.td,
        styles[`align-${align}`],
        truncate && styles.truncate,
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
});

/**
 * Compound `<Table>` family. Attach subcomponents via Object.assign so
 * consumers write `<Table.Body>` etc., not separate imports.
 */
export const Table = Object.assign(TableRoot, {
  Caption: TableCaption,
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  HeaderCell: TableHeaderCell,
  Cell: TableCell,
});
```

- [ ] **Step 2: Write `Table.module.scss`**

Use EXACTLY this content:

```scss
// Scroll wrapper — horizontal overflow context for wide tables AND the
// scroll container for sticky headers.
.scrollWrap {
  width: 100%;
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-family: inherit;
  color: var(--color-fg);
}

// ─── Density ───────────────────────────────────────────────────────────────

.density-comfortable .td,
.density-comfortable .th {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-md);
}

.density-comfortable .tr {
  min-height: var(--size-md);
}

.density-dense .td,
.density-dense .th {
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-sm);
}

.density-dense .tr {
  min-height: var(--size-sm);
}

// ─── Sections ──────────────────────────────────────────────────────────────

.caption {
  padding: var(--space-2) var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  text-align: start;
}

.thead .tr {
  background: var(--color-bg-subtle);
}

.tbody .tr {
  background: var(--color-bg);
}

.tfoot .tr {
  background: var(--color-bg-subtle);
}

// ─── Rows ──────────────────────────────────────────────────────────────────

.tr {
  border-bottom: var(--border-width) solid var(--color-border);
}

.hover .tbody .tr:hover {
  background: var(--color-bg-subtle);
}

.striped .tbody .tr:nth-of-type(even) {
  background: var(--color-bg-subtle);
}

// Selected wins over hover + striped (later declaration, equal specificity).
.tbody .tr.selected,
.tbody .tr.selected:hover {
  background: var(--color-accent-bg-subtle);
  color: var(--color-fg);
}

// ─── Cells ─────────────────────────────────────────────────────────────────

.th {
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-semibold);
  text-transform: none;
  vertical-align: middle;
}

.td {
  vertical-align: middle;
}

// Inner flex container for header cells so sort chevron sits beside text.
.thInner {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

// Alignment — applied via CSS logical properties (RTL-friendly).
.align-start {
  text-align: start;
}

.align-center {
  text-align: center;
}

.align-end {
  text-align: end;
}

// Right-aligned headers need the chevron on the start side of the label,
// not the end — flip the inner flex direction.
.align-end .thInner {
  flex-direction: row-reverse;
}

// ─── Sortable header ───────────────────────────────────────────────────────

.sortable {
  cursor: pointer;
  user-select: none;

  &:hover {
    background: var(--color-bg-muted);
  }

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 var(--ring-width) var(--ring-accent);
  }
}

.sortIcon {
  flex-shrink: 0;
  color: var(--color-fg-muted);
}

.sortable:not(.sortableInactive) .sortIcon {
  color: var(--color-fg);
}

// ─── Sticky header ─────────────────────────────────────────────────────────

.stickyHeader .thead .th {
  position: sticky;
  top: 0;
  z-index: 1;
  // Repeat the header bg here — `tr` bg paints below the th's sticky
  // layer in some browsers, leaving body rows visible through it.
  background: var(--color-bg-subtle);
}

// ─── Cell modifiers ────────────────────────────────────────────────────────

.truncate {
  max-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

NOTE on the SCSS: stylelint's `property-disallowed-list` may flag `position: sticky`, `top: 0`, `min-width`, etc. The Table primitive is the public component — its outer box is `<table>`, but the inner `<th>` sticky behavior is internal layout (scrolls inside the scrollWrap). This is the documented Rule 4 escape hatch ("`position` when not `relative` for an internal child anchor" — sticky is for an internal-child anchor too, just to the scroll container). If stylelint complains, wrap the rule in `stylelint-disable property-disallowed-list` with a documented justification matching the AvatarGroup `margin-left` precedent.

Same for `max-width: 0` on `.truncate` — it's a flex-container trick to force ellipsis-respecting widths and is the standard CSS pattern (see CSS-Tricks article on flex-truncate). Document if stylelint flags.

- [ ] **Step 3: Gates**

```bash
cd /home/dpws/projects/design-system
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -10
npm run build 2>&1 | tail -5
```

Fix any stylelint findings inline with `stylelint-disable` + documented justification if the rule is the Rule 4 escape hatch.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/Table/Table.tsx \
        packages/design-system/src/components/Table/Table.module.scss
git commit -m "Table: new compound primitive (density / hover / striped / sticky / sort-indicator)"
```

---

## Task 3: `Table.test.tsx`

**Files:**

- Create: `packages/design-system/src/components/Table/Table.test.tsx`

- [ ] **Step 1: Write the tests**

```tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Table } from './Table';

describe('Table', () => {
  it('renders a native <table> with the default structure', () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Alex</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('thead')).toBeInTheDocument();
    expect(container.querySelector('tbody')).toBeInTheDocument();
    expect(container.querySelector('th')).toHaveAttribute('scope', 'col');
  });

  it('wraps the table in a scroll <div> by default; scroll={false} renders bare', () => {
    const { container, rerender } = render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    // Bydefault, the <table> sits inside an outer <div>.
    expect(container.querySelector('div > table')).not.toBeNull();

    rerender(
      <Table scroll={false}>
        <Table.Body>
          <Table.Row>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    // The first child is now the <table> itself.
    expect(container.firstChild?.nodeName).toBe('TABLE');
  });

  it('applies density / hover / striped / stickyHeader class names', () => {
    const { container, rerender } = render(<Table density="dense" striped hover={false} stickyHeader />);
    const table = container.querySelector('table')!;
    expect(table.className).toMatch(/density-dense/);
    expect(table.className).toMatch(/striped/);
    expect(table.className).not.toMatch(/hover/);
    expect(table.className).toMatch(/stickyHeader/);

    rerender(<Table />);
    const table2 = container.querySelector('table')!;
    expect(table2.className).toMatch(/density-comfortable/);
    expect(table2.className).toMatch(/hover/);
    expect(table2.className).not.toMatch(/striped/);
    expect(table2.className).not.toMatch(/stickyHeader/);
  });

  it('Table.Row selected adds aria-selected and the selected class', () => {
    const { container } = render(
      <Table>
        <Table.Body>
          <Table.Row selected>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    const tr = container.querySelector('tr');
    expect(tr).toHaveAttribute('aria-selected', 'true');
    expect(tr?.className).toMatch(/selected/);
  });

  it('Table.HeaderCell sortDirection renders chevron + aria-sort', () => {
    const { container, rerender } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sortDirection="asc">Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'ascending');
    expect(container.querySelector('th svg')).toBeInTheDocument();

    rerender(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sortDirection="desc">Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'descending');

    rerender(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell sortDirection="none">Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).toHaveAttribute('aria-sort', 'none');
  });

  it('Table.HeaderCell without sortDirection has no chevron and no aria-sort', () => {
    const { container } = render(
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Amount</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
      </Table>,
    );
    expect(container.querySelector('th')).not.toHaveAttribute('aria-sort');
    expect(container.querySelector('th svg')).toBeNull();
  });

  it('Table.Cell align applies the right class', () => {
    const { container } = render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell align="end">42</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(container.querySelector('td')?.className).toMatch(/align-end/);
  });

  it('Table.Cell truncate applies the truncate class', () => {
    const { container } = render(
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell truncate>Long long long</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(container.querySelector('td')?.className).toMatch(/truncate/);
  });

  it('forwards ref on Table to the <table> element', () => {
    const ref = createRef<HTMLTableElement>();
    render(
      <Table ref={ref}>
        <Table.Body>
          <Table.Row>
            <Table.Cell>X</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>,
    );
    expect(ref.current).toBeInstanceOf(HTMLTableElement);
  });

  it('merges className on every subcomponent', () => {
    const { container } = render(
      <Table className="root-cls">
        <Table.Caption className="cap-cls">Cap</Table.Caption>
        <Table.Header className="thead-cls">
          <Table.Row className="tr-cls">
            <Table.HeaderCell className="th-cls">H</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body className="tbody-cls">
          <Table.Row>
            <Table.Cell className="td-cls">X</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Footer className="tfoot-cls">
          <Table.Row>
            <Table.Cell>F</Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table>,
    );
    expect(container.querySelector('table.root-cls')).not.toBeNull();
    expect(container.querySelector('caption.cap-cls')).not.toBeNull();
    expect(container.querySelector('thead.thead-cls')).not.toBeNull();
    expect(container.querySelector('tr.tr-cls')).not.toBeNull();
    expect(container.querySelector('th.th-cls')).not.toBeNull();
    expect(container.querySelector('tbody.tbody-cls')).not.toBeNull();
    expect(container.querySelector('td.td-cls')).not.toBeNull();
    expect(container.querySelector('tfoot.tfoot-cls')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Gates**

```bash
npm test --workspace=@eocrm/design-system --run -- src/components/Table 2>&1 | tail -8
```

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/Table/Table.test.tsx
git commit -m "Table: unit tests for compound subcomponents, modifiers, ref, className merge"
```

---

## Task 4: Barrel + re-export from `src/index.ts`

**Files:**

- Create: `packages/design-system/src/components/Table/index.ts`
- Modify: `packages/design-system/src/index.ts`

- [ ] **Step 1: Write `index.ts`**

```ts
export { Table } from './Table';
export type {
  TableProps,
  TableCaptionProps,
  TableSectionProps,
  TableRowProps,
  TableHeaderCellProps,
  TableCellProps,
  TableDensity,
  TableCellAlign,
  TableSortDirection,
} from './Table';
```

- [ ] **Step 2: Re-export from `src/index.ts`**

Read the file first; locate the alphabetical position (Table should slot after `Select` and before `Tabs`). Add:

```ts
export { Table } from './components/Table';
export type {
  TableProps,
  TableCaptionProps,
  TableSectionProps,
  TableRowProps,
  TableHeaderCellProps,
  TableCellProps,
  TableDensity,
  TableCellAlign,
  TableSortDirection,
} from './components/Table';
```

- [ ] **Step 3: Gates**

```bash
npm run typecheck 2>&1 | tail -3
npm run build 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/Table/index.ts \
        packages/design-system/src/index.ts
git commit -m "Table: re-export from barrel + src/index.ts (Rule 5)"
```

---

## Task 5: Playground demo + wiring

**Files:**

- Create: `packages/playground/src/pages/components/TableDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Write `TableDemo.tsx`**

```tsx
import { useState } from 'react';
import { Table, Badge, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Table/Table.tsx?raw';
import scssSource from '@lib-source/components/Table/Table.module.scss?raw';

interface Row {
  id: string;
  name: string;
  status: 'Active' | 'Pending' | 'Archived';
  amount: number;
}

const ROWS: Row[] = [
  { id: 'a', name: 'Acme Corp', status: 'Active', amount: 12_500 },
  { id: 'b', name: 'Beanstalk Ltd', status: 'Pending', amount: 4_200 },
  { id: 'c', name: 'Cobalt Studios', status: 'Active', amount: 28_400 },
  { id: 'd', name: 'Delta Mfg', status: 'Archived', amount: 800 },
  { id: 'e', name: 'Echo Logistics', status: 'Active', amount: 7_900 },
];

const STATUS_TONE: Record<Row['status'], 'success' | 'warning' | 'neutral'> = {
  Active: 'success',
  Pending: 'warning',
  Archived: 'neutral',
};

function StaticTable() {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Company</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {ROWS.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell>
              <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
            </Table.Cell>
            <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function SortableTable() {
  const [sortKey, setSortKey] = useState<'name' | 'amount'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...ROWS].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'amount') return (a.amount - b.amount) * dir;
    return a.name.localeCompare(b.name) * dir;
  });

  function dirFor(key: 'name' | 'amount') {
    if (sortKey !== key) return 'none' as const;
    return sortDir;
  }

  function toggle(key: 'name' | 'amount') {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell sortDirection={dirFor('name')} onClick={() => toggle('name')}>
            Company
          </Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell
            align="end"
            sortDirection={dirFor('amount')}
            onClick={() => toggle('amount')}
          >
            Amount
          </Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {sorted.map((row) => (
          <Table.Row key={row.id}>
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell>
              <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>
            </Table.Cell>
            <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function SelectableTable() {
  const [selectedId, setSelectedId] = useState<string | null>('c');

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Company</Table.HeaderCell>
          <Table.HeaderCell align="end">Amount</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {ROWS.map((row) => (
          <Table.Row
            key={row.id}
            selected={selectedId === row.id}
            onClick={() => setSelectedId(row.id)}
            style={{ cursor: 'pointer' }}
          >
            <Table.Cell>{row.name}</Table.Cell>
            <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

export function TableDemo() {
  return (
    <DemoLayout
      name="Table"
      componentName="Table"
      description="Tabular data primitive — compound subcomponents (Table.Header, Table.Body, Table.Row, Table.Cell, Table.HeaderCell, Table.Caption, Table.Footer) over native HTML semantics. Density, hover, striped, sticky-header, and sort-indicator visuals; data behavior (sort/filter/pagination) is the consumer's job."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Table.tsx"
      scssFilename="Table.module.scss"
    >
      <Example
        title="Default"
        description="Comfortable density, hover on, no stripes. Native `<table>` semantics throughout."
        code={`<Table>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Company</Table.HeaderCell>
      <Table.HeaderCell>Status</Table.HeaderCell>
      <Table.HeaderCell align="end">Amount</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {rows.map((r) => (
      <Table.Row key={r.id}>
        <Table.Cell>{r.name}</Table.Cell>
        <Table.Cell><Badge tone={...}>{r.status}</Badge></Table.Cell>
        <Table.Cell align="end">\${r.amount.toLocaleString()}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>`}
      >
        <StaticTable />
      </Example>

      <Example
        title="Dense"
        description="24px row, 8px cell padding, `font-size-sm`. Useful for inline tables inside cards or narrow side panels."
        code={`<Table density="dense">{...}</Table>`}
      >
        <Table density="dense">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell align="end">Amount</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {ROWS.slice(0, 3).map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.name}</Table.Cell>
                <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Example>

      <Example
        title="Striped + hover"
        description="Zebra stripes on even body rows. Hover is on by default; pass `hover={false}` to disable."
        code={`<Table striped>{...}</Table>`}
      >
        <Table striped>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell align="end">Amount</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {ROWS.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.name}</Table.Cell>
                <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Example>

      <Example
        title="Sortable headers"
        description="`<Table.HeaderCell sortDirection>` renders a chevron + sets `aria-sort`. The primitive only paints the indicator — wire `onClick` to your own sort state. (DataTable will compose this seam.)"
        code={`<Table.HeaderCell
  sortDirection={sortKey === 'amount' ? sortDir : 'none'}
  onClick={() => toggleSort('amount')}
>
  Amount
</Table.HeaderCell>`}
      >
        <SortableTable />
      </Example>

      <Example
        title="Selected row"
        description="`<Table.Row selected>` paints a tinted bg + sets `aria-selected`. Click any row to select it (consumer-owned state)."
        code={`<Table.Row selected={isSelected(row.id)} onClick={() => select(row.id)}>
  {...}
</Table.Row>`}
      >
        <SelectableTable />
      </Example>

      <Example
        title="Sticky header"
        description="`stickyHeader` keeps the header row visible while body rows scroll. Requires a scrollable ancestor — the default outer wrapper provides one."
        code={`<div style={{ maxHeight: 200, overflow: 'auto' }}>
  <Table stickyHeader scroll={false}>{...}</Table>
</div>`}
      >
        <div style={{ maxHeight: 200, overflow: 'auto', border: 'var(--border-width) solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
          <Table stickyHeader scroll={false}>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Company</Table.HeaderCell>
                <Table.HeaderCell align="end">Amount</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {[...ROWS, ...ROWS, ...ROWS].map((row, i) => (
                <Table.Row key={`${row.id}-${i}`}>
                  <Table.Cell>{row.name}</Table.Cell>
                  <Table.Cell align="end">${row.amount.toLocaleString()}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Example>

      <Example
        title="Truncated cell"
        description="`<Table.Cell truncate>` ellipsizes overflow text. Requires a constrained cell width — set `style={{ maxWidth }}` on the cell or `<col>` width on the column."
        code={`<Table.Cell truncate style={{ maxWidth: 180 }}>{longString}</Table.Cell>`}
      >
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell style={{ width: 180 }}>Subject</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell truncate style={{ maxWidth: 180 }}>
                Q4 strategy: revisit the long-tail growth bets and align with platform launches
              </Table.Cell>
              <Table.Cell>
                <Badge tone="warning">Pending</Badge>
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell truncate style={{ maxWidth: 180 }}>
                Short subject
              </Table.Cell>
              <Table.Cell>
                <Badge tone="success">Active</Badge>
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: Wire `App.tsx`**

Add the import + route in the alphabetical position (after `Select` and before `Tabs` or wherever the existing pattern slots Table).

```tsx
import { TableDemo } from './pages/components/TableDemo';
// …
<Route path="/components/table" element={<TableDemo />} />
```

- [ ] **Step 3: Wire `AppShell.tsx`**

Add a `Table` entry to the Display group (Table is a Display component, not Forms). Match the existing pattern with an icon — use `Table` icon from lucide-react if not already imported:

```tsx
import { Table as TableIcon } from 'lucide-react';
// …
// In the Display group:
{ to: '/components/table', label: 'Table', icon: TableIcon, end: false },
```

Place it alphabetically (between `Calendar` and any next Display item, or wherever it fits).

- [ ] **Step 4: Wire `ComponentsIndex.tsx`**

Add a card for Table:

```tsx
{
  to: '/components/table',
  name: 'Table',
  description: 'Tabular data primitive — compound subcomponents over native HTML semantics with density, hover, striped, and sortable-header visuals.',
  preview: (
    <div style={{ width: 220 }}>
      <Table density="dense" scroll={false}>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell align="end">Total</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Acme</Table.Cell>
            <Table.Cell align="end">12.5K</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Beanstalk</Table.Cell>
            <Table.Cell align="end">4.2K</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </div>
  ),
},
```

Don't forget to extend the import line at the top of `ComponentsIndex.tsx` with `Table`.

- [ ] **Step 5: Wire `registry.ts`**

Add `'Table'` to the `ComponentName` union (alphabetical).

- [ ] **Step 6: Gates**

```bash
cd /home/dpws/projects/design-system
npm run typecheck 2>&1 | tail -5
npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Smoke test in dev server**

```bash
make dev  # or assume already running on :8080
```

Visit `http://localhost:8080/components/table`. Verify:
- All 7 Examples render.
- Sortable headers toggle on click and the chevron flips.
- Selected row tints on click.
- Sticky header stays pinned while the inner content scrolls.
- Truncated cell ellipses long text.

- [ ] **Step 8: Commit**

```bash
git add packages/playground/src/
git commit -m "TableDemo: examples + sidebar + index + registry wiring"
```

---

## Task 6: AGENTS.md section

**Files:**

- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Find the right slot**

```bash
grep -n "^### " packages/design-system/AGENTS.md
```

Table is a Display/Data component. Slot it between `<Select>` (last Forms entry) and `<LocaleProvider>` (i18n), OR right before `<DropdownMenu>` (Overlays). Pick what matches the existing groupings — likely between `<Select>` and `<LocaleProvider>` since Table doesn't fit Forms cleanly and AGENTS.md groups roughly by category.

- [ ] **Step 2: Insert this section**

```markdown
### `<Table>` — tabular data primitive

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

- Compound subcomponents: `Table`, `Table.Caption`, `Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.HeaderCell`, `Table.Cell`. Renders native `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>`/`<tfoot>`/`<caption>` — no ARIA-on-divs.
- Visual modifiers on root: `density` (`'comfortable'` (default, 32px row) / `'dense'` (24px)), `hover` (default `true`), `striped`, `stickyHeader`, `scroll` (default `true` — wraps in `overflow-x: auto`).
- `<Table.Row selected>` paints a tinted bg + `aria-selected="true"`. Selection state itself is the consumer's job.
- `<Table.HeaderCell sortDirection>` is a visual hook: renders a chevron + sets `aria-sort`. Wire `onClick` to your own sort state. `<DataTable>` (not yet shipped) will compose this seam.
- `<Table.Cell align>` / `<Table.HeaderCell align>`: `'start' | 'center' | 'end'` (CSS logical, RTL-friendly). Right-aligned for numbers / amounts; the sort chevron auto-flips to the start side.
- `<Table.Cell truncate>` ellipses overflow text on one line. Requires a constrained cell width.
- **Use `<DataTable>` instead** when you need sorting / filtering / pagination state. Table is the paint primitive; DataTable will be the opinionated wrapper.
```

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/AGENTS.md
git commit -m "AGENTS.md: document new <Table> compound primitive"
```

---

## Task 7: Final gates + Hard Rule 8 + PR

- [ ] **Step 1: Prettier write**

```bash
npx prettier --write "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md"
git add -A packages/ docs/
git diff --cached --stat
git commit -m "Prettier: format Table primitive changes" || echo "no formatting changes"
```

- [ ] **Step 2: Full gates**

```bash
cd /home/dpws/projects/design-system
npm test --workspace=@eocrm/design-system --run 2>&1 | tail -5
npm run typecheck 2>&1 | tail -5
npm run lint:css 2>&1 | tail -5
npm run build 2>&1 | tail -5
npx prettier --check "packages/**/src/**/*.{ts,tsx,scss}" "docs/**/*.md" "packages/design-system/AGENTS.md" 2>&1 | tail -3
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -cE "\\.test\\."
```

All green; npm-pack count = 0.

- [ ] **Step 3: Push**

```bash
git push -u origin feat/table-primitive
```

- [ ] **Step 4: Hard Rule 8 review cycle 1**

Dispatch a fresh `general-purpose` review agent. Brief:

- Required reading: repo `CLAUDE.md`, package `CLAUDE.md`, `AGENTS.md`, the spec `docs/superpowers/specs/2026-05-21-table-primitive-design.md`, full diff `git diff main..HEAD -- packages/`.
- 10-category review (bugs, a11y, API consistency, type safety, Rules 1–7, test coverage, token discipline, SCSS, cross-package leakage, package/distribution).
- Specifics to look at hard:
  - `Object.assign(TableRoot, { ... })` — does TypeScript correctly type the subcomponents on `Table.Header` etc.? `Table.Body` should be a forwardRef component accepting `TableSectionProps`.
  - Native HTML semantics — `<th>` `scope="col"` by default; `<td>` with no scope; verify the sort chevron does NOT consume the cell's click event independently (it's a sibling span inside `.thInner`, click bubbles to `<th>`).
  - Rule 4 escape hatches: `position: sticky` on `<th>` (internal layout for sticky scrolling) — documented? `max-width: 0` on `.truncate` — flex-truncate idiom, documented? The outer `.scrollWrap` `<div>` introduces a width:100% + overflow-x:auto box that's not the Table itself but its wrapper — acceptable internal helper, no Rule 4 violation.
  - Token discipline: no raw hex / px outside `tokens.scss`.
  - `aria-sort` values are `"ascending" | "descending" | "none"` (strings, not booleans).
  - `<Table.Row selected>` `aria-selected="true"` is set on `<tr>` — does AT actually use this attribute on table rows? It's valid HTML but not commonly used. Worth noting in the review but not a blocker.

- [ ] **Step 5: Fix Critical + Important findings; re-push; re-review until verdict is `clean enough to stop`.**

- [ ] **Step 6: Open PR**

```bash
gh pr create --title "Table: compound primitive (density / hover / striped / sticky / sort-indicator)" --body "$(cat <<'EOF'
## Summary

- New `<Table>` compound primitive — `Table`, `Table.Caption`, `Table.Header`, `Table.Body`, `Table.Footer`, `Table.Row`, `Table.HeaderCell`, `Table.Cell`. Native HTML semantics throughout (`<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>`/`<tfoot>`/`<caption>`); no ARIA-on-divs.
- Visual modifiers on root: `density` (`'comfortable' | 'dense'`), `hover` (default on), `striped`, `stickyHeader`, `scroll` (default on — wraps in horizontal-scroll `<div>`).
- `<Table.Row selected>` paints a tinted bg + `aria-selected="true"`.
- `<Table.HeaderCell sortDirection>` renders an up/down/unsorted chevron + sets `aria-sort`. The primitive only paints the indicator — wire `onClick` to your own sort state. This is the seam `<DataTable>` will compose against.
- `<Table.Cell align>` / `<Table.HeaderCell align>` — `'start' | 'center' | 'end'` (CSS logical). Right-aligned headers auto-flip the sort chevron to the start side.
- `<Table.Cell truncate>` ellipses overflow text on a single line.
- No data behavior (sort logic, pagination, filtering, selection state machinery, empty/loading states) — those live in the future `<DataTable>`, not in the primitive.

## Test plan

- [x] `npm test --run` — all green, including new Table tests (subcomponents render, modifiers apply, ref forwards, className merges, sort visuals + aria-sort, truncate / align classes).
- [x] `npm run typecheck` clean
- [x] `npm run lint:css` clean
- [x] `npm run build` clean
- [x] `npx prettier --check` clean
- [x] `npm pack --dry-run -w @eocrm/design-system` — no test files in tarball
- [x] Manual smoke (Playwright) — Default, Dense, Striped, Sortable, Selected, Sticky, Truncated examples all render correctly; sort chevron flips on click.
- [x] Hard Rule 8 review cycle — final verdict: clean enough to stop.

## Design spec / plan

- Spec: \`docs/superpowers/specs/2026-05-21-table-primitive-design.md\`
- Plan: \`docs/superpowers/plans/2026-05-21-table-primitive.md\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

Spec coverage:

- §Compound API + native HTML semantics → Task 2.
- §Visual modifiers (density, hover, striped, sticky, scroll) → Task 2.
- §Sortable header visual hook → Task 2 + Task 5 (SortableTable demo).
- §`selected` row paint → Task 2 + Task 5 (SelectableTable demo).
- §`truncate` cell → Task 2 + Task 5 (Truncated cell demo).
- §Tokens (all existing) → Task 2 SCSS.
- §Tests → Task 3.
- §Re-exports → Task 4.
- §Playground demo → Task 5.
- §AGENTS.md section → Task 6.
- §Hard Rule 8 + PR → Task 7.

Type consistency:

- `TableDensity = 'comfortable' | 'dense'`
- `TableCellAlign = 'start' | 'center' | 'end'`
- `TableSortDirection = 'asc' | 'desc' | 'none'`
- All re-exported from both barrels.

No placeholders. All paths absolute. All commits scoped.
