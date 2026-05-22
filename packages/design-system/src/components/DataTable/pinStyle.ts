import type { DataTableInstance } from './types';

/**
 * Width of the auto-prepended selection cell. Kept here as the single source
 * of truth so DataTable.tsx and pinStyle.ts agree on the offset shift.
 */
export const AUTO_CELL_WIDTH = 44;

export interface PinStyle {
  position?: 'sticky';
  left?: number;
  right?: number;
  pinSide?: 'left' | 'right';
}

/**
 * Compute the sticky-positioning inline style for a column cell.
 *
 * - Unpinned columns return an empty object (no sticky styles).
 * - Left-pinned columns return `{ position: 'sticky', left: <px>, pinSide: 'left' }`.
 *   The `left` value is the column's cumulative offset from the hook
 *   (`instance.leftPinOffsets[columnId]`), shifted by `AUTO_CELL_WIDTH` when
 *   `enableRowSelection` is true (the auto-select cell consumes the leftmost
 *   `AUTO_CELL_WIDTH` of sticky space).
 * - Right-pinned columns return `{ position: 'sticky', right: <px>, pinSide: 'right' }`.
 *   No auto-cell shift on the right (the selection cell is on the left).
 */
export function getPinStyle<T>(columnId: string, instance: DataTableInstance<T>): PinStyle {
  const leftPinned = instance.columnPinning.left.includes(columnId);
  const rightPinned = instance.columnPinning.right.includes(columnId);

  if (leftPinned) {
    const offset = instance.leftPinOffsets[columnId] ?? 0;
    const shift = instance.enableRowSelection ? AUTO_CELL_WIDTH : 0;
    return { position: 'sticky', left: offset + shift, pinSide: 'left' };
  }
  if (rightPinned) {
    const offset = instance.rightPinOffsets[columnId] ?? 0;
    return { position: 'sticky', right: offset, pinSide: 'right' };
  }
  return {};
}
