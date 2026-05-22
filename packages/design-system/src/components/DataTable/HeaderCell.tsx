import { type KeyboardEvent } from 'react';
import clsx from 'clsx';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Table } from '../Table';
import type { TableSortDirection } from '../Table';
import { useResizeHandle } from './useResizeHandle';
import type { ColumnDef, DataTableInstance } from './types';
import { getPinStyle } from './pinStyle';
import styles from './HeaderCell.module.scss';

export interface HeaderCellProps<T> {
  column: ColumnDef<T>;
  instance: DataTableInstance<T>;
}

/**
 * Sortable header cell with a hover-revealed drag grip and a resize handle.
 *
 * - **Label area** is the sort click-target when `column.sortable === true`.
 * - **Grip** appears on hover or keyboard focus; it's the drag handle wired
 *   to `@dnd-kit/sortable`'s `useSortable`. The grip is the ONLY draggable
 *   target — listeners are not attached to the cell or label, so clicking
 *   the label never starts a drag.
 * - **Resize handle** is a 6px hit-zone on the right edge. Disabled when
 *   `column.enableResize === false`. Also supports keyboard resize: arrow
 *   keys ±8px; Shift+arrow keys ±32px (when the label is focused).
 */
const sortAriaMap: Record<TableSortDirection, 'ascending' | 'descending' | 'none'> = {
  asc: 'ascending',
  desc: 'descending',
  none: 'none',
};

export function HeaderCell<T>({ column, instance }: HeaderCellProps<T>) {
  // Pinned columns are LOCKED in position — no drag-to-reorder grip, can't
  // be moved within or across pin groups. Sort and resize remain available
  // since they don't change column position. Within-pin-group drag is also a
  // low-value interaction (consumers typically pin once and leave it).
  const isPinned =
    instance.columnPinning.left.includes(column.id) ||
    instance.columnPinning.right.includes(column.id);
  const sortable = column.sortable === true;
  const sortDir: TableSortDirection | undefined =
    instance.sort?.columnId === column.id ? instance.sort.direction : sortable ? 'none' : undefined;

  // Derive the visual sort icon to render in our own .inner layout (approach
  // a): we do NOT pass sortDirection to Table.HeaderCell (to suppress its
  // built-in inline icon). Instead we pass aria-sort directly and render the
  // chevron ourselves at the end of the label area, just before the resize
  // handle.
  const SortIcon =
    sortDir === 'asc' ? ChevronUp : sortDir === 'desc' ? ChevronDown : ChevronsUpDown;

  // dnd-kit sortable — column is its own sortable item. Pinned columns are
  // locked in place (see the isPinned comment above).
  const reorderable = column.enableReorder !== false && !isPinned;
  const sortableResult = useSortable({ id: column.id, disabled: !reorderable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortableResult;

  const width = instance.columnSizesPx[column.id] ?? 120;
  const resize = useResizeHandle({
    initialWidth: width,
    minWidth: column.minSize ?? 40,
    maxWidth: column.maxSize,
    onResize: (next) => {
      instance.setColumnSizing((prev) => ({ ...prev, [column.id]: next }));
    },
  });

  const onLabelKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    // Sort cycle on Enter / Space (when sortable)
    if (sortable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      instance.toggleSort(column.id);
      return;
    }
    // Keyboard resize: ← / → for ±8px; Shift+← / Shift+→ for ±32px.
    if (column.enableResize === false) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const step = (e.shiftKey ? 32 : 8) * (e.key === 'ArrowRight' ? 1 : -1);
      const current = instance.columnSizesPx[column.id] ?? 120;
      const minW = column.minSize ?? 40;
      const maxW = column.maxSize;
      let next = current + step;
      if (next < minW) next = minW;
      if (maxW != null && next > maxW) next = maxW;
      instance.setColumnSizing((prev) => ({ ...prev, [column.id]: next }));
    }
  };

  const headerContent =
    typeof column.header === 'function' ? column.header({ column, instance }) : column.header;

  const pinStyle = getPinStyle(column.id, instance);
  const stickyStyle = pinStyle.position
    ? { position: pinStyle.position, left: pinStyle.left, right: pinStyle.right }
    : undefined;
  const cellStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...stickyStyle,
  };

  return (
    // sortDirection is intentionally NOT passed to Table.HeaderCell — we suppress
    // its built-in inline chevron and render our own at the end of .inner (between
    // label and resize handle). aria-sort is set directly so the ARIA contract is
    // preserved without the visual side-effect.
    <Table.HeaderCell
      align={column.align ?? 'start'}
      aria-sort={sortDir != null ? sortAriaMap[sortDir] : undefined}
      onClick={sortable ? () => instance.toggleSort(column.id) : undefined}
      className={clsx(
        styles.headerCell,
        isDragging && styles.dragging,
        pinStyle.pinSide === 'left' && styles.pinnedLeft,
        pinStyle.pinSide === 'right' && styles.pinnedRight,
      )}
      // HTMLTableCellElement extends HTMLElement; dnd-kit only reads DOM geometry from the ref.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={setNodeRef as any}
      style={cellStyle}
    >
      {/* Grip pinned to absolute left of the cell regardless of column.align.
          Kept outside .inner so it doesn't shift the content area. Only
          rendered when reorderable. */}
      {reorderable && (
        <span
          className={styles.grip}
          // Spread BOTH attributes (aria/role) and listeners (pointerdown etc.)
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${typeof column.header === 'string' ? column.header : column.id}`}
          // tabIndex so keyboard users can focus to reveal grip + activate drag
          tabIndex={0}
          // Stop sort click from misfiring when the user clicks the grip without moving.
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} aria-hidden="true" />
        </span>
      )}

      {/* Content area: label (flex:1) + sort icon pinned to end of content.
          Padding is conditional: only reserve grip space (left) when reorderable
          and only reserve resize space (right) when resizable, so the header
          label aligns with the body cell content when the surrounding chrome
          isn't there. Flex justification mirrors `column.align` so end-aligned
          and center-aligned columns position their label + sort indicator the
          same way the body cells render. */}
      <div
        className={clsx(
          styles.inner,
          reorderable && styles.innerWithGrip,
          column.enableResize !== false && styles.innerWithResize,
          column.align === 'end' && styles.innerAlignEnd,
          column.align === 'center' && styles.innerAlignCenter,
        )}
      >
        <span
          className={clsx(styles.label, sortable && styles.sortable)}
          tabIndex={sortable ? 0 : undefined}
          role={sortable ? 'button' : undefined}
          onKeyDown={onLabelKeyDown}
        >
          {headerContent}
        </span>
        {/* Sort chevron always at end of content area — aria-hidden because
            aria-sort on the <th> carries the semantic signal. */}
        {sortDir != null && (
          <SortIcon
            size={12}
            aria-hidden="true"
            className={clsx(styles.sortIcon, sortDir !== 'none' && styles.sortIconActive)}
          />
        )}
      </div>

      {/* Resize handle pinned to absolute right — outside .inner so it
          doesn't consume flex space and stays at the exact cell edge. */}
      {column.enableResize !== false && (
        <span
          className={styles.resizeHandle}
          onPointerDown={resize.onPointerDown}
          // Stop sort click when interacting with resize.
          onClick={(e) => e.stopPropagation()}
          aria-hidden="true"
        >
          <ChevronLeft className={styles.resizeChevron} aria-hidden="true" />
          <span className={clsx(styles.resizeBar, resize.isResizing && styles.active)} />
          <ChevronRight className={styles.resizeChevron} aria-hidden="true" />
        </span>
      )}
    </Table.HeaderCell>
  );
}
