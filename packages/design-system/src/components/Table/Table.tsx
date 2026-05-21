import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
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
  children?: ReactNode;
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

export interface TableHeaderCellProps
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'align' | 'scope'> {
  /** Text alignment. Defaults to `'start'`. */
  align?: TableCellAlign;
  /**
   * Native HTML `<th scope>` attribute. Defaults to `'col'` (the cell labels
   * its column). Use `'row'` for the leftmost cell that labels its row when
   * rendering row-headers inside `<Table.Body>`. `'colgroup'` / `'rowgroup'`
   * are valid HTML but rarely needed in practice.
   */
  scope?: 'col' | 'row' | 'colgroup' | 'rowgroup';
  /**
   * When set, the cell renders a sort indicator (up/down/unsorted chevron)
   * and sets `aria-sort`. The consumer drives interactivity via `onClick`;
   * this primitive only paints the indicator. Sortable headers also become
   * keyboard-reachable (`tabIndex={0}` + Enter/Space → `onClick`).
   * - `'asc'`  → up chevron + `aria-sort="ascending"`.
   * - `'desc'` → down chevron + `aria-sort="descending"`.
   * - `'none'` → muted up/down chevron + `aria-sort="none"`.
   * Omit to render a non-sortable header (no chevron, no `aria-sort`).
   */
  sortDirection?: TableSortDirection;
  children?: ReactNode;
}

export interface TableCellProps extends Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
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
  {
    density = 'comfortable',
    striped,
    hover = true,
    stickyHeader,
    scroll = true,
    className,
    children,
    ...props
  },
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

const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell(
    {
      align = 'start',
      sortDirection,
      scope = 'col',
      className,
      children,
      onKeyDown,
      tabIndex,
      ...props
    },
    ref,
  ) {
    const sortable = sortDirection != null;
    const SortIcon =
      sortDirection === 'asc' ? ChevronUp : sortDirection === 'desc' ? ChevronDown : ChevronsUpDown;

    // Sortable headers are keyboard-reachable: `<th>` is not natively
    // focusable, so we add `tabIndex={0}` when sortable and forward
    // Enter/Space to a synthetic click so the consumer's `onClick`
    // handler fires. Consumer-supplied tabIndex/onKeyDown still win.
    const handleKeyDown = (e: KeyboardEvent<HTMLTableCellElement>) => {
      onKeyDown?.(e);
      if (!sortable || e.defaultPrevented) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.currentTarget.click();
      }
    };

    return (
      <th
        ref={ref}
        scope={scope}
        aria-sort={sortable ? sortAriaFor[sortDirection] : undefined}
        tabIndex={sortable ? (tabIndex ?? 0) : tabIndex}
        onKeyDown={sortable ? handleKeyDown : onKeyDown}
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
          {children != null && <span>{children}</span>}
          {sortable && <SortIcon size={12} aria-hidden="true" className={styles.sortIcon} />}
        </span>
      </th>
    );
  },
);

const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { align = 'start', truncate, className, children, ...props },
  ref,
) {
  return (
    <td
      ref={ref}
      className={clsx(styles.td, styles[`align-${align}`], truncate && styles.truncate, className)}
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
