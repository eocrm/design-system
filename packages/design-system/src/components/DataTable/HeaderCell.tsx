import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
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

/**
 * Descendants that can actually BE NAMED by the attribute they carry.
 *
 * Narrower than "carries the attribute", and that difference has now unnamed a
 * column header twice. `alt` names only `img`, `area` and `input[type=image]`;
 * anywhere else it is an unknown attribute. `aria-label` is prohibited on
 * `role="generic"` — ARIA 1.2 — so a bare `<span aria-label="Revenue">` names
 * nothing in a browser, and counting it pointed `aria-labelledby` at a span
 * computing to no name at all.
 *
 * The second is invisible to this suite: jsdom's dom-accessibility-api honours
 * `aria-label` on a bare span, so a test asserting the accessible name would
 * have PASSED while real users got an unnamed column. Reason from the spec
 * here, never from `computeAccessibleName`.
 */
const NAMEABLE = [
  // An explicit role that permits naming.
  '[role]:not([role="generic"]):not([role="presentation"]):not([role="none"])',
  // Native elements whose implicit role permits it.
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'img',
  'area',
  'iframe',
]
  .map((selector) => `${selector}[aria-label]:not([aria-label=""])`)
  .concat([
    'img[alt]:not([alt=""])',
    'area[alt]:not([alt=""])',
    'input[type="image"][alt]:not([alt=""])',
  ])
  .join(', ');

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
  const plainHeader = typeof column.header === 'string';
  const retainedResponsiveHeader = sortable || !plainHeader;
  const t = useTranslation();
  const columnLabel =
    column.visibilityLabel ?? (typeof column.header === 'string' ? column.header : column.id);
  // The handle's own name has to describe the ACTION. It used to be the column
  // label verbatim, so a keyboard user heard "Name, separator".
  const resizeLabel = t('dataTable.resizeColumn', { name: columnLabel });
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

  // Whether the label span actually contributes text, MEASURED rather than
  // derived. It cannot be derived: `header` may be a ReactNode rendering
  // visible text — named fine by content — or one that is purely aria-hidden
  // icons, which names nothing. #500 pointed `aria-labelledby` at this span
  // unconditionally and unnamed the icon-only case; switching to `aria-label`
  // on `plainHeader` fixed that and renamed every JSX header to its column id,
  // so `header: <strong>Revenue</strong>` announced as "revenue" at all widths.
  // Runs after every commit, like ButtonGroup's roving fallback, so it tracks
  // whatever actually rendered. Starts `true` so the first paint prefers the
  // span over a column id.
  const [labelHasText, setLabelHasText] = useState(true);
  const warnedNoName = useRef(false);
  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;

    const measure = () => {
      // aria-hidden subtrees are stripped first: `textContent` counts them,
      // but the accessible name does not, and an icon-only header is written
      // exactly that way — `<span aria-hidden="true">★</span>` reads as text to
      // the DOM and as nothing to a screen reader.
      const probe = el.cloneNode(true) as HTMLElement;
      // `[hidden]` as well as aria-hidden: both count in textContent and
      // neither counts in the accessible name, so a `<span hidden>Revenue</span>`
      // header measured as named and then computed to nothing — the unnamed
      // columnheader this whole mechanism exists to prevent, reached from the
      // other side. The CSS forms (`display:none`, `visibility:hidden`) are NOT
      // detectable here and remain a stated limit.
      for (const hidden of probe.querySelectorAll('[aria-hidden="true"], [hidden]'))
        hidden.remove();
      // Text is not the only source of a name. A select-all checkbox — the
      // commonest ReactNode header in a table — contributes its `aria-label`
      // and no text at all, so measuring textContent alone renamed the column
      // to its raw id while the correct name sat in the DOM unused. Same for an
      // `<img alt>` logo header.
      // What can actually NAME something, which is narrower than what can
      // carry the attribute.
      //
      // `alt` names only `img`, `area` and `input[type=image]`; on anything
      // else it is an unknown attribute. A bare `<div alt="Vendor">` counted
      // as named, so `aria-labelledby` was pointed at a span computing to
      // nothing — the unnamed columnheader this fallback exists to prevent,
      // reached from yet another side.
      //
      // `title` is excluded, but NOT because it names nothing: per accname it
      // is a valid last-resort source and browsers do expose it. jsdom's
      // `computeAccessibleName` returns "" for it only because
      // dom-accessibility-api omits that step. The real reason is that
      // last-resort means its presence does not tell you a name will be
      // computed HERE — anything else in the subtree outranks it — so it is
      // not evidence for this decision. Recording the distinction because the
      // convenient wrong reason ("title never names") would license a bad
      // change later.
      const next =
        (probe.textContent ?? '').trim().length > 0 || probe.querySelector(NAMEABLE) !== null;
      setLabelHasText((prev) => (prev === next ? prev : next));

      // An icon-only header with no `visibilityLabel` falls back to
      // `column.id`, so a raw developer identifier gets read aloud — an
      // authoring bug with no visible symptom, since the column looks correct
      // on screen. The latch RESETS when text appears, so a header that
      // resolves its label asynchronously is not permanently accused of being
      // unnamed on the strength of its first frame.
      if (next) warnedNoName.current = false;
      else if (
        process.env.NODE_ENV !== 'production' &&
        !column.visibilityLabel &&
        !warnedNoName.current
      ) {
        warnedNoName.current = true;
        console.warn(
          `[DataTable] column "${column.id}" renders no header text and has no visibilityLabel, ` +
            `so its column header announces as the column id. Add visibilityLabel.`,
        );
      }
    };

    measure();
    // OBSERVED, not measured once per commit. A `header` ReactNode that owns
    // its own state — a fetch, a lazily-loaded translation, an icon swapped
    // after mount — updates its subtree WITHOUT re-rendering HeaderCell. A
    // per-commit measurement therefore read it once as empty and never looked
    // again: the header displayed "Revenue" and announced "revenue_id"
    // forever, which is precisely the bug this mechanism exists to remove,
    // resurrected for a narrower input. Observing also takes the steady-state
    // cost to zero — the per-commit version ran on every pointermove of a
    // column drag.
    const observer = new MutationObserver(measure);
    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
      // EVERY attribute `measure` reads, not just aria-hidden. It also consults
      // `hidden` and the descendant name sources, so an `alt` filled in after a
      // fetch, or a `hidden` lifted at a breakpoint, changed the answer without
      // notifying — leaving the header named by its column id exactly as the
      // per-commit version did.
      attributeFilter: ['aria-hidden', 'hidden', 'alt', 'aria-label'],
    });
    return () => observer.disconnect();
  }, [column.id, column.visibilityLabel]);

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
      // Only when the label span will actually have text. An icon-only header
      // leaves that span empty, and pointing at an empty element gives the
      // columnheader NO name at all — trading a wrong name for an unnamed
      // header, which is a worse axe violation than the one this fixes. Only
      // then does `columnLabel` step in, and it is the last resort precisely
      // because it degrades to `column.id`.
      aria-labelledby={labelHasText ? labelId : undefined}
      aria-label={labelHasText ? undefined : columnLabel}
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
          aria-label={t('dataTable.dragReorder', { name: columnLabel })}
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
