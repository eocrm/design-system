import { Fragment, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Table } from '../Table';
import { Checkbox } from '../Checkbox';
import { AUTO_CELL_WIDTH, getPinStyle } from './pinStyle';
import type { DataTableInstance, ColumnDef } from './types';
import styles from './DataTable.module.scss';

export interface BodyRowProps<T> {
  row: T;
  instance: DataTableInstance<T>;
  /** When true, paint the row with the pinned-row background tint. */
  isPinnedRow?: boolean;
}

/**
 * One row of the body. Handles:
 *  - selection auto-cell (when `instance.enableRowSelection`) — sticky-left
 *  - expand auto-cell (when `instance.hasExpansion`) — sticky-left, after select
 *  - row click (when `instance.onRowClick`) — ignored if click target is an
 *    interactive child so checkbox/button clicks don't bubble.
 *  - row Enter keypress fires onRowClick when row is focusable.
 *  - data cells rendered in pin order: [left-pinned, unpinned, right-pinned].
 *    Pinned cells receive `position: sticky` with cumulative offsets via
 *    `getPinStyle`.
 *  - detail row when `instance.expandedRows[rowId]` is true — rendered as
 *    a sibling row immediately after the main row (Fragment return).
 *  - `isPinnedRow` paints the row with `--color-bg-row-pinned` tint (used by
 *    the pinned-rows section above the main body).
 */
export function BodyRow<T>({ row, instance, isPinnedRow }: BodyRowProps<T>) {
  const rowId = instance.getRowId(row);
  const selected = instance.rowSelection[rowId] === true;
  const expanded = instance.expandedRows[rowId] === true;
  const detailRowId = `${rowId}-detail`;

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"], [role="checkbox"]')) return;
    instance.onRowClick(row, e);
  };

  const onRowKeyDown = (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (
      target !== e.currentTarget &&
      target.closest('button, input, a, [role="button"], [role="checkbox"]')
    ) {
      return;
    }
    e.preventDefault();
    instance.onRowClick(row, e as unknown as MouseEvent<HTMLTableRowElement>);
  };

  // Pin-ordered render list — same composition as DataTable.tsx's renderColumns.
  const renderColumns: ColumnDef<T>[] = [
    ...instance.leftPinnedColumns,
    ...instance.unpinnedColumns,
    ...instance.rightPinnedColumns,
  ];

  // colSpan for the detail row: data columns + auto-cells (select, expand).
  const detailColSpan =
    renderColumns.length + (instance.enableRowSelection ? 1 : 0) + (instance.hasExpansion ? 1 : 0);

  return (
    <Fragment>
      <Table.Row
        selected={selected || undefined}
        onClick={instance.onRowClick ? onRowClick : undefined}
        onKeyDown={instance.onRowClick ? onRowKeyDown : undefined}
        tabIndex={instance.onRowClick ? 0 : undefined}
        className={clsx(
          instance.onRowClick && styles.clickableRow,
          isPinnedRow && styles.pinnedRow,
        )}
      >
        {instance.enableRowSelection && (
          <Table.Cell
            className={clsx(styles.autoCell, styles.autoCellStickyBody)}
            align="center"
            style={{ position: 'sticky', left: 0 }}
            // Stop clicks anywhere in the selection cell from bubbling to the row's
            // onRowClick handler. The closest(...) filter in onRowClick catches the
            // input but not the styled checkbox span sibling.
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={selected}
              onChange={() => instance.toggleRowSelection(rowId)}
              aria-label={`Select row ${rowId}`}
            />
          </Table.Cell>
        )}
        {instance.hasExpansion && (
          <Table.Cell
            className={clsx(styles.autoCell, styles.autoCellStickyBody)}
            align="center"
            style={{ position: 'sticky', left: instance.enableRowSelection ? AUTO_CELL_WIDTH : 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.expandButton}
              aria-expanded={expanded}
              aria-controls={detailRowId}
              aria-label={`Expand row ${rowId}`}
              onClick={() => instance.toggleRowExpanded(rowId)}
            >
              {expanded ? (
                <ChevronDown size={14} aria-hidden="true" />
              ) : (
                <ChevronRight size={14} aria-hidden="true" />
              )}
            </button>
          </Table.Cell>
        )}
        {renderColumns.map((col) => {
          const pin = getPinStyle(col.id, instance);
          const cellStyle = pin.position
            ? { position: pin.position, left: pin.left, right: pin.right }
            : undefined;
          return (
            <Table.Cell
              key={col.id}
              align={col.align ?? 'start'}
              className={clsx(
                pin.pinSide === 'left' && styles.pinnedLeft,
                pin.pinSide === 'right' && styles.pinnedRight,
              )}
              style={cellStyle}
            >
              {col.cell(row, { row, rowId, column: col, instance })}
            </Table.Cell>
          );
        })}
      </Table.Row>
      {expanded && instance.renderExpandedRow && (
        <Table.Row id={detailRowId} className={styles.expandedDetailRow}>
          <Table.Cell colSpan={detailColSpan} className={styles.expandedDetailCell}>
            {instance.renderExpandedRow(row)}
          </Table.Cell>
        </Table.Row>
      )}
    </Fragment>
  );
}
