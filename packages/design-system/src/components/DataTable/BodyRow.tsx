import { type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { Table } from '../Table';
import { Checkbox } from '../Checkbox';
import { getPinStyle } from './pinStyle';
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
 *  - row click (when `instance.onRowClick`) — ignored if click target is an
 *    interactive child so checkbox/button clicks don't bubble.
 *  - row Enter keypress fires onRowClick when row is focusable.
 *  - data cells rendered in pin order: [left-pinned, unpinned, right-pinned].
 *    Pinned cells receive `position: sticky` with cumulative offsets via
 *    `getPinStyle`.
 *  - `isPinnedRow` paints the row with `--color-bg-row-pinned` tint (used by
 *    the pinned-rows section above the main body).
 */
export function BodyRow<T>({ row, instance, isPinnedRow }: BodyRowProps<T>) {
  const rowId = instance.getRowId(row);
  const selected = instance.rowSelection[rowId] === true;

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

  return (
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
  );
}
