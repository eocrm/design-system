import { useMemo, useRef, type KeyboardEvent } from 'react';
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
import { shiftVarName } from './columnShift';

import styles from './HeaderCell.module.scss';

export interface HeaderCellProps<T> {
  column: ColumnDef<T>;
  instance: DataTableInstance<T>;
  /** Whole-column drag preview is enabled for this table. */
  dragWholeColumn?: boolean;
  /** A column drag is currently in progress. */
  dragActive?: boolean;
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
/** See the `animateLayoutChanges` comment in HeaderCell. Module scope so the
 * identity is stable across renders. */
const neverAnimateLayoutChanges = () => false;

const sortAriaMap: Record<TableSortDirection, 'ascending' | 'descending' | 'none'> = {
  asc: 'ascending',
  desc: 'descending',
  none: 'none',
};

export function HeaderCell<T>({
  column,
  instance,
  dragWholeColumn,
  dragActive,
}: HeaderCellProps<T>) {
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
  // locked in place (see the isPinned comment above), and so is a LONE unpinned
  // column: with no sibling in its band, `reorderRespectingPins` rejects every
  // drop it could reach, so the drag clamp correctly pins it at zero travel. A
  // grip that visibly does nothing is worse than no grip, so it hides for the
  // same reason a pinned column's does.
  const reorderable =
    column.enableReorder !== false && !isPinned && instance.unpinnedColumns.length > 1;

  const headerContent =
    typeof column.header === 'function' ? column.header({ column, instance }) : column.header;

  // Screen-reader announcements name the column by its RENDERED header text,
  // not by `column.id` (#390). The ref goes on the label span rather than the
  // <th> so the grip and resize chrome — and any menu the header renders —
  // stay out of it. Ref identity is stable, so the memo never re-runs.
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const dragData = useMemo(() => ({ dragNode: labelRef }), []);

  const sortableResult = useSortable({
    id: column.id,
    data: dragData,
    disabled: !reorderable,
    // Whole-column mode only: kill dnd-kit's post-drop FLIP animation. On
    // release `defaultAnimateLayoutChanges` returns true for every column whose
    // index changed, so the headers would glide to their new positions over
    // ~200ms while the body cells — whose shift variable is removed on the same
    // tick — snap instantly. That is the exact header/body disagreement this
    // feature exists to remove, just relocated to the drop. Snapping the header
    // with the body is the only way the two stay glued.
    //
    // `undefined` when the mode is off, so that path keeps dnd-kit's default
    // animation byte-for-byte.
    animateLayoutChanges: dragWholeColumn === true ? neverAnimateLayoutChanges : undefined,
  });
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

  const pinStyle = getPinStyle(column.id, instance);
  const stickyStyle = pinStyle.position
    ? { position: pinStyle.position, left: pinStyle.left, right: pinStyle.right }
    : undefined;
  // In whole-column mode the header rides the SAME custom property as its body
  // cells, so the two cannot desync — that is the entire point of the feature.
  // Pinned cells are excluded: a transform would break their position: sticky.
  const useShiftVar = dragWholeColumn === true && dragActive === true && !isPinned;
  const cellStyle = {
    transform: useShiftVar
      ? `translateX(var(${shiftVarName(column.id)}, 0px))`
      : CSS.Transform.toString(transform),
    transition: useShiftVar ? undefined : transition,
    ...stickyStyle,
  };

  return (
    // sortDirection is intentionally NOT passed to Table.HeaderCell — we suppress
    // its built-in inline chevron and render our own at the end of .inner (between
    // label and resize handle). aria-sort is set directly so the ARIA contract is
    // preserved without the visual side-effect.
    <Table.HeaderCell
      align={column.align ?? 'start'}
      // Addressable by column id so a drag can measure this cell's REAL
      // rendered rect (see `measureDragRangeX`). Declared `<col>` widths are
      // not a substitute — the table stretches past them to fill its wrap.
      data-dt-column-id={column.id}
      data-responsive-sortable={sortable || undefined}
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
          data-responsive-drag-grip
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
        data-responsive-header-content
        className={clsx(
          styles.inner,
          column.enableResize !== false && styles.innerWithResize,
          column.align === 'end' && styles.innerAlignEnd,
          column.align === 'center' && styles.innerAlignCenter,
        )}
      >
        <span
          ref={labelRef}
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
          data-responsive-resize-handle
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
