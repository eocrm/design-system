import { type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { Table } from '../Table';
import { Checkbox } from '../Checkbox';
import type { DataTableInstance } from './types';
import styles from './DataTable.module.scss';

export interface BodyRowProps<T> {
  row: T;
  instance: DataTableInstance<T>;
}

/**
 * One row of the body. Handles:
 *  - selection auto-cell (when `instance.enableRowSelection`)
 *  - row click (when `instance.onRowClick`) — ignored if the click target
 *    was an interactive child (button, input, a) so checkbox/button clicks
 *    don't bubble into a navigation.
 *  - row Enter keypress fires onRowClick when row is focusable.
 *  - data cells from `instance.visibleColumns` (pinning rendering is in
 *    Phase 2 — this phase renders unpinned order only).
 */
export function BodyRow<T>({ row, instance }: BodyRowProps<T>) {
  const rowId = instance.getRowId(row);
  const selected = instance.rowSelection[rowId] === true;

  const onRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    // Ignore clicks that originated on an interactive child.
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"], [role="checkbox"]')) {
      return;
    }
    instance.onRowClick(row, e);
  };

  const onRowKeyDown = (e: ReactKeyboardEvent<HTMLTableRowElement>) => {
    if (!instance.onRowClick) return;
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    // Ignore Enter coming from an interactive child (it should drive that child).
    if (target !== e.currentTarget && target.closest('button, input, a, [role="button"], [role="checkbox"]')) {
      return;
    }
    e.preventDefault();
    instance.onRowClick(row, e as unknown as MouseEvent<HTMLTableRowElement>);
  };

  return (
    <Table.Row
      selected={selected || undefined}
      onClick={instance.onRowClick ? onRowClick : undefined}
      onKeyDown={instance.onRowClick ? onRowKeyDown : undefined}
      tabIndex={instance.onRowClick ? 0 : undefined}
      className={clsx(instance.onRowClick && styles.clickableRow)}
    >
      {instance.enableRowSelection && (
        <Table.Cell
          className={styles.autoCell}
          align="center"
          // Stop clicks anywhere in the selection cell from bubbling to the row's
          // onRowClick handler. The closest('input,...') filter in onRowClick catches
          // the input element itself but misses the styled visual-checkbox span sibling.
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onChange={() => instance.toggleRowSelection(rowId)}
            aria-label={`Select row ${rowId}`}
          />
        </Table.Cell>
      )}
      {instance.visibleColumns.map((col) => (
        <Table.Cell key={col.id} align={col.align ?? 'start'}>
          {col.cell(row, { row, rowId, column: col, instance })}
        </Table.Cell>
      ))}
    </Table.Row>
  );
}
