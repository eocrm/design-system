import { useId, useMemo, useRef, type KeyboardEvent } from 'react';
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
import { useTranslation } from '../../i18n/useTranslation';
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
  /** Enables responsive-only header hooks and the dedicated keyboard resize handle. */
  responsiveEnabled?: boolean;
}

/**
 * Sortable header cell with a hover-revealed drag grip and a resize handle.
 *
 * - **Label area** is the sort click-target when `column.sortable === true`.
 * - **Grip** appears on hover or keyboard focus; it's the drag handle wired
 *   to `@dnd-kit/sortable`'s `useSortable`. The grip is the ONLY draggable
 *   target — listeners are not attached to the cell or label, so clicking
 *   the label never starts a drag.
 * - **Resize handle** is a 24px hit-zone on the right edge. Disabled when
 *   `column.enableResize === false`. By default, the sortable label keeps the
 *   legacy Arrow-key resize behavior and the pointer handle is not focusable.
 *   Responsive tables move Arrow-key resizing to the dedicated handle so CSS
 *   can remove that focus stop together with the handle when rows stack.
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
  responsiveEnabled,
}: HeaderCellProps<T>) {
  // Pinned columns are LOCKED in position — no drag-to-reorder grip, can't
  // be moved within or across pin groups. Sort and resize remain available
  // since they don't change column position. Within-pin-group drag is also a
  // low-value interaction (consumers typically pin once and leave it).
  const isPinned =
    instance.columnPinning.left.includes(column.id) ||
    instance.columnPinning.right.includes(column.id);
  const sortable = column.sortable === true;
  // TWO separate questions, kept separate. `plainHeader` is a LAYOUT input —
  // it drives `retainedResponsiveHeader` below and `data-responsive-plain-label`
  // on the cell, which decide whether the compact strip hides the header or
  // renders it as a padded block. Narrowing it for the naming fix flipped both
  // for `header: ''`, so the playground's three row-actions columns rendered an
  // empty padded block in the stacked strip instead of being hidden.
  const plainHeader = typeof column.header === 'string';
  // Whether the header actually renders TEXT, which is the naming question.
  // `header: ''` is a string, so treating it as self-naming silently ignored
  // the `visibilityLabel` beside it and pointed `aria-labelledby` at an empty
  // span — an unnamed column header.
  const rendersText = typeof column.header === 'string' && column.header.trim() !== '';
  const retainedResponsiveHeader = sortable || !plainHeader;
  const t = useTranslation();
  // NO `column.id` fallback. It used to end here, so a column with neither a
  // string header nor a `visibilityLabel` gave its grip the name "Drag to
  // reorder starred_col" and its resize handle "Resize starred_col column" —
  // a raw developer identifier read aloud to a keyboard user. Whether the
  // `<th>` itself then inherits that through name-from-content is disputed
  // (two reviewers measured Chromium and disagreed), but the CONTROLS speak it
  // either way, so the identifier is removed at the source and the question
  // stops mattering for the harmful part.
  const columnLabel =
    column.visibilityLabel ?? (typeof column.header === 'string' ? column.header : undefined);
  // The handle's own name has to describe the ACTION. It used to be the column
  // label verbatim, so a keyboard user heard "Name, separator".
  const resizeLabel = columnLabel
    ? t('dataTable.resizeColumn', { name: columnLabel })
    : t('dataTable.resizeColumnUnnamed');
  // The header's name comes from this id, not from its content. The resize
  // handle is a named, focusable descendant of the <th>, so with
  // name-from-content the header computed as "Name Name" at every width the
  // moment `collapseBelow` was set (#500). Pointing at the label span excludes
  // the handle and the drag grip without hiding either from AT.
  const labelId = `${useId()}-label`;
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

  // No DOM measurement. Seven versions of one tried to answer "will this span
  // produce an accessible name?" without computing the accessible name, and
  // each was wrong in a new way — the last three inside the commit meant to
  // close the class. The mechanism existed to rescue ICON-ONLY headers.
  //
  // Precisely, because the first version of this note overstated it: before
  // #500 the `<th>` carried no `aria-labelledby` and no `aria-label`, so it was
  // named from CONTENT — which swept in the resize handle. An icon-only header
  // therefore announced the handle's label, which was the bare `column.id`
  // when the column had nothing better; the "Resize … column" wrapper came
  // with #500 itself. A plain header announced its label twice. That second
  // one IS #500. So the old
  // name was not absent, it was the bug; and the only sources available for
  // an icon-only header are `visibilityLabel`, `column.id`, or nothing.
  // `column.id` is indefensible to speak, which leaves the author's label —
  // and nothing when they have not given one.
  //
  // Scope note: the RESIZE HANDLE still falls back to `column.id` for a
  // column with neither a string header nor a `visibilityLabel`. That is
  // pre-existing on main, is the same authoring bug the warning below names,
  // and is left alone rather than quietly widened into #500's scope.
  //
  // The rule is now static, and `column.id` is gone as a name source
  // everywhere a user can hear it: the header, the grip and the resize
  // handle. Whether an unnamed header then falls through to name-from-content
  // is engine-dependent and deliberately not claimed either way here — a raw
  // developer identifier was never a defensible thing to speak.
  //
  // Two residuals, stated precisely because the first draft of this note
  // overstated one and omitted the worse one:
  //
  //   1. A ReactNode header that renders visible text AND sets
  //      `visibilityLabel` announces the label rather than the text. This is
  //      a WCAG 2.5.3 concern ONLY when `sortable` makes the label span a
  //      button — 2.5.3 is scoped to user interface components, and a
  //      non-sortable `<th>` is not one. It also only VIOLATES 2.5.3 when the
  //      label does not contain the visible text: "Revenue (USD)" over
  //      `<strong>Revenue</strong>` passes, `'Status'` over
  //      `<Badge>Active</Badge>` does not.
  //   2. The harder one: sortable + a header that names nothing + no
  //      `visibilityLabel` leaves an unnamed focusable `role="button"` — WCAG
  //      4.1.2, axe `button-name`. Not a regression (main's span had no name
  //      either), and not fixable here: the only remaining name source is
  //      `column.id`. Set `visibilityLabel` on non-text headers.
  const namedByLabel = !rendersText && Boolean(column.visibilityLabel);
  // No dev warning here, deliberately. One was added and removed within the
  // hour: having deleted the measurement, nothing static can distinguish a
  // ReactNode header that names itself (`<strong>Revenue</strong>`) from one
  // that names nothing (an icon), so it fired on the commonest VALID shape.
  // A warning on correct code is the same defect as a gate that false-alarms,
  // and this file's own history is the argument — noise gets ignored, and then
  // the real case is ignored with it. The contract is documented in AGENTS.md
  // instead, which is where a rule only the author can satisfy belongs.

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
    if (!responsiveEnabled && column.enableResize !== false) onResizeKeyDown(e);
  };

  const onResizeKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    // Keyboard resize: ← / → for ±8px; Shift+← / Shift+→ for ±32px.
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
      data-responsive-sortable={responsiveEnabled && sortable ? true : undefined}
      data-responsive-control={responsiveEnabled && sortable ? true : undefined}
      data-responsive-plain-label={responsiveEnabled && plainHeader ? true : undefined}
      data-responsive-retained-header={
        responsiveEnabled && retainedResponsiveHeader && !sortable ? true : undefined
      }
      data-responsive-pinned={responsiveEnabled && isPinned ? true : undefined}
      aria-sort={sortDir != null ? sortAriaMap[sortDir] : undefined}
      // #500's actual fix, and the only part of it that was ever in question:
      // point at the label span so the resize handle is not concatenated into
      // the name. `visibilityLabel` overrides it only for a ReactNode header,
      // where the author has explicitly supplied the text they want spoken.
      aria-labelledby={namedByLabel ? undefined : labelId}
      aria-label={namedByLabel ? column.visibilityLabel : undefined}
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
          data-responsive-drag-grip={responsiveEnabled || undefined}
          // Spread BOTH attributes (aria/role) and listeners (pointerdown etc.)
          {...attributes}
          {...listeners}
          aria-label={
            columnLabel
              ? t('dataTable.dragReorder', { name: columnLabel })
              : t('dataTable.dragReorderUnnamed')
          }
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
        data-responsive-header-content={responsiveEnabled || undefined}
        className={clsx(
          styles.inner,
          column.enableResize !== false && styles.innerWithResize,
          column.align === 'end' && styles.innerAlignEnd,
          column.align === 'center' && styles.innerAlignCenter,
        )}
      >
        <span
          ref={labelRef}
          id={labelId}
          className={clsx(styles.label, sortable && styles.sortable)}
          tabIndex={sortable ? 0 : undefined}
          role={sortable ? 'button' : undefined}
          // The span is a focusable button when sortable, so it needs a name of
          // its own on the one path where its content supplies none. Mirrors
          // the plain-text case, where the <th> and this button both take the
          // header text.
          aria-label={sortable && namedByLabel ? column.visibilityLabel : undefined}
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
          data-responsive-resize-handle={responsiveEnabled || undefined}
          onPointerDown={resize.onPointerDown}
          onKeyDown={responsiveEnabled ? onResizeKeyDown : undefined}
          // Stop sort click when interacting with resize.
          onClick={(e) => e.stopPropagation()}
          role={responsiveEnabled ? 'separator' : undefined}
          aria-label={responsiveEnabled ? resizeLabel : undefined}
          aria-hidden={responsiveEnabled ? undefined : true}
          aria-orientation={responsiveEnabled ? 'vertical' : undefined}
          aria-valuemin={responsiveEnabled ? (column.minSize ?? 40) : undefined}
          aria-valuemax={
            responsiveEnabled ? (column.maxSize ?? Number.MAX_SAFE_INTEGER) : undefined
          }
          aria-valuenow={responsiveEnabled ? width : undefined}
          aria-valuetext={responsiveEnabled ? `${width}px` : undefined}
          tabIndex={responsiveEnabled ? 0 : undefined}
        >
          <ChevronLeft className={styles.resizeChevron} aria-hidden="true" />
          <span className={clsx(styles.resizeBar, resize.isResizing && styles.active)} />
          <ChevronRight className={styles.resizeChevron} aria-hidden="true" />
        </span>
      )}
    </Table.HeaderCell>
  );
}
