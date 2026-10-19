import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ElementType,
  type ForwardedRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
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

/** Column-layout algorithm for the `<table>`. */
export type TableLayout = 'auto' | 'fixed';

/** Background tint + text colour for a cell or header cell. */
export type TableCellTone = 'danger' | 'accent';

export interface TableProps extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
  /**
   * Row height + cell padding scale. Defaults to `'comfortable'`.
   * - `'comfortable'` — 32px row, 12px horiz padding, font-size-md.
   * - `'dense'`       — 24px row, 8px horiz padding, font-size-sm.
   */
  density?: TableDensity;
  /** Zebra-striped body rows (even rows tinted). Defaults to `false`. */
  striped?: boolean;
  /**
   * Full-grid borders — outer border + vertical borders between every cell
   * on top of the existing horizontal row dividers. Defaults to `false`
   * (Atlassian-style minimal: header underline + row dividers only).
   */
  bordered?: boolean;
  /**
   * Hover highlight on body rows. Defaults to `false` — turn on when the
   * table represents a list of clickable / selectable items (a row a user
   * is likely to act on). Leave off for read-only data displays where the
   * hover affordance would suggest interactivity that isn't there.
   */
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
  /**
   * Column-layout algorithm. Defaults to `'auto'`.
   * - `'auto'`  — columns size to their content (native default).
   * - `'fixed'` — `table-layout: fixed`: widths come from a native
   *   `<colgroup><col style={{ width }} /></colgroup>` (or the first row), and
   *   unsized columns split the rest equally. Use for grids of equal-width
   *   number columns.
   */
  layout?: TableLayout;
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

export interface TableHeaderCellProps extends Omit<
  ThHTMLAttributes<HTMLTableCellElement>,
  'align' | 'scope'
> {
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
  /**
   * Tints the header cell (top corners rounded) so a toned column reads as one
   * band with its toned body cells. Exposed as `data-tone`. Default: none.
   * - `'danger'` — overdue / at-risk column.
   * - `'accent'` — the current / highlighted column (e.g. "Today").
   */
  tone?: TableCellTone;
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
  /**
   * Tints the cell background and colours its text. Exposed as `data-tone`.
   * Default: none. Set it on every cell of the column (header included).
   * - `'danger'` — overdue / at-risk column.
   * - `'accent'` — the current / highlighted column (e.g. "Today").
   */
  tone?: TableCellTone;
  children?: ReactNode;
}

interface TableCellLinkOwnProps {
  children?: ReactNode;
}

/**
 * Public `Table.CellLink` prop type. Generic `C` defaults to `'a'`; pass
 * `as={RouterLink}` to get that component's props (`to`, …) with inference.
 */
export type TableCellLinkProps<C extends ElementType = 'a'> = TableCellLinkOwnProps & {
  /** Element or component to render. Defaults to `'a'`; use for router links. */
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof TableCellLinkOwnProps | 'as'>;

type TableCellLinkComponent = <C extends ElementType = 'a'>(
  props: TableCellLinkProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] },
) => ReactElement | null;

const sortAriaFor: Record<TableSortDirection, 'ascending' | 'descending' | 'none'> = {
  asc: 'ascending',
  desc: 'descending',
  none: 'none',
};

/**
 * Tabular data primitive with a compound API (`Table.Header`, `Table.Body`, `Table.Row`, `Table.Cell`, ...) over native table elements.
 * @see docs/components/Table.md
 */
const TableRoot = forwardRef<HTMLTableElement, TableProps>(function TableRoot(
  {
    density = 'comfortable',
    striped,
    bordered,
    hover = false,
    stickyHeader,
    scroll = true,
    layout = 'auto',
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
        bordered && styles.bordered,
        hover && styles.hover,
        stickyHeader && styles.stickyHeader,
        layout === 'fixed' && styles.layoutFixed,
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
      tone,
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
        data-tone={tone}
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
  { align = 'start', truncate, tone, className, children, ...props },
  ref,
) {
  return (
    <td
      ref={ref}
      data-tone={tone}
      className={clsx(styles.td, styles[`align-${align}`], truncate && styles.truncate, className)}
      {...props}
    >
      {children}
    </td>
  );
});

/**
 * Full-cell link inside `Table.Cell`: takes over the cell's padding so the whole cell is the hit area.
 * @see docs/components/Table.md
 */
const TableCellLink = forwardRef(function TableCellLink<C extends ElementType = 'a'>(
  { as, className, children, ...props }: TableCellLinkProps<C>,
  ref: ForwardedRef<Element>,
) {
  const Component = (as || 'a') as ElementType;
  return (
    // {...props} first so the cellLink class (the cell's padding hook) is always kept.
    <Component ref={ref} {...props} className={clsx(styles.cellLink, className)}>
      {children}
    </Component>
  );
}) as TableCellLinkComponent;

/**
 * Compound `<Table>` family; subcomponents are attached as `Table.Body` etc.
 * @see docs/components/Table.md
 */
export const Table = Object.assign(TableRoot, {
  Caption: TableCaption,
  Header: TableHeader,
  Body: TableBody,
  Footer: TableFooter,
  Row: TableRow,
  HeaderCell: TableHeaderCell,
  Cell: TableCell,
  CellLink: TableCellLink,
});
