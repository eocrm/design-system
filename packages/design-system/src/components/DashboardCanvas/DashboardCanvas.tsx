import { Fragment, forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import type { HTMLAttributes, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { useFloatingSurface } from '../_internal/overlay';
import { mergeRefs } from '../_internal/refs';
import {
  DASHBOARD_COLUMNS,
  applyMove,
  applyResize,
  cellFromPoint,
  reorderSection,
  toggleSection,
} from './engine';
import type {
  ContainerRef,
  DashboardCanvasValue,
  DashboardItemConstraints,
  DashboardPlacement,
} from './engine';
import { DashboardCanvasItem, sortByPosition } from './DashboardCanvasItem';
import type { CanvasGestures, ResizeEdge } from './DashboardCanvasItem';
import { DashboardCanvasSection } from './DashboardCanvasSection';
import styles from './DashboardCanvas.module.scss';

/**
 * Per-item size constraints lookup passed to {@link DashboardCanvas}. Either a
 * plain record keyed by item id, or a function for computed/dynamic limits.
 * An item with no entry (and no matching key) gets `minW: 1`, `minH: 1`, no
 * `maxH`.
 */
export type DashboardCanvasConstraintsProp =
  | Record<string, DashboardItemConstraints>
  | ((id: string | number) => DashboardItemConstraints | undefined);

export interface DashboardCanvasProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * The controlled layout: top-level items plus an ordered array of
   * collapsible sections. `DashboardCanvas` never mutates this value — every
   * change flows out through `onChange`.
   */
  value: DashboardCanvasValue;
  /**
   * Fires once per completed gesture — a drop, a resize end, a collapse
   * toggle, a section reorder, or a cross-container move — with the whole
   * next `value`. Omit for a read-only or fully static canvas; without it,
   * drags preview live but nothing persists on drop.
   */
  onChange?: (next: DashboardCanvasValue) => void;
  /**
   * Renders the body of an item by id. Called for every visible item on
   * every render — and once more for the dragged item mid-gesture (the
   * cursor-following ghost) — so keep it pure.
   */
  renderItem: (id: string | number) => ReactNode;
  /**
   * Optional extra controls in a section's header (a title editor, a
   * `DropdownMenu` trigger) rendered by section id, to the right of the
   * title. Keep it small — the header row is not a general-purpose toolbar.
   * Pointer presses inside the slot never start a band-reorder drag.
   */
  renderSectionHeader?: (id: string | number) => ReactNode;
  /** Per-item size constraints, consulted when clamping resize gestures. */
  constraints?: DashboardCanvasConstraintsProp;
  /**
   * View-only mode: identical geometry, but no drag/resize wiring, no resize
   * handles, and no keyboard editing (Task 4) — the canvas renders `value`
   * and lets section collapse toggles keep working. @default false
   */
  readOnly?: boolean;
}

const TOP_CONTAINER: ContainerRef = { kind: 'top' };

/** Stable registry key for a container (object identity is per-render). */
function containerKey(cref: ContainerRef): string {
  return cref.kind === 'top' ? 'top' : `s:${String(cref.id)}`;
}

/**
 * Screen-px a pointer must travel before a press arms as a drag (Sortable's
 * activation-distance precedent) — presses and clicks inside item bodies and
 * section headers pass through untouched below it.
 */
const DRAG_ACTIVATION_PX = 5;

/**
 * Mirrors the `--dashboard-canvas-row` default (`--space-12`, 48px). Used only
 * when `grid-auto-rows` doesn't resolve to a px length (jsdom).
 */
const FALLBACK_ROW_PX = 48;

/** Live px geometry of one container grid, re-measured per pointermove. */
function measureGrid(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const gap = Number.parseFloat(style.columnGap) || 0;
  const rowHeight = Number.parseFloat(style.gridAutoRows) || FALLBACK_ROW_PX;
  const colWidth = (rect.width - gap * (DASHBOARD_COLUMNS - 1)) / DASHBOARD_COLUMNS;
  return { rect, colWidth, rowHeight, gap };
}

/**
 * Capture always targets the ROOT: item elements REMOUNT when a preview moves
 * them across containers, and a remount implicitly releases their capture —
 * the pointerup would then never arrive and the drag would stick (FlowCanvas
 * root-capture precedent). jsdom throws on inactive pointers, hence the guard.
 */
function capturePointer(el: Element | null, pointerId: number) {
  try {
    el?.setPointerCapture(pointerId);
  } catch {
    /* jsdom */
  }
}

// In-flight gesture bookkeeping lives in a ref (FlowCanvas precedent): the
// pointer stream mutates it without re-render churn; `live` state below is
// the render-facing projection, discarded wholesale on cancel.
interface MoveDrag {
  kind: 'move';
  pointerId: number;
  id: string | number;
  from: ContainerRef;
  homeX: number;
  homeY: number;
  startX: number;
  startY: number;
  /** Pointer offset inside the item at pointerdown — keeps the ghost under the grab point. */
  grabDX: number;
  grabDY: number;
  ghostW: number;
  ghostH: number;
  moved: boolean;
  target: ContainerRef;
  targetKey: string;
  cell: { x: number; y: number } | null;
  previewKey: string | null;
  preview: DashboardCanvasValue | null;
}
interface ResizeDrag {
  kind: 'resize';
  pointerId: number;
  id: string | number;
  container: ContainerRef;
  containerKey: string;
  edge: ResizeEdge;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
  lastW: number;
  lastH: number;
  preview: DashboardCanvasValue | null;
}
interface SectionDrag {
  kind: 'section';
  pointerId: number;
  id: string | number;
  fromIndex: number;
  startX: number;
  startY: number;
  moved: boolean;
  /** Insertion slot among ALL bands (0..N), indicator position. */
  slot: number;
}
type DragState = MoveDrag | ResizeDrag | SectionDrag;

/** Render-facing gesture projection: the engine preview IS the rendered layout. */
type LiveState =
  | {
      kind: 'move';
      id: string | number;
      value: DashboardCanvasValue;
      /** Canvas-relative px box for the cursor-following ghost. */
      ghost: { left: number; top: number; width: number; height: number };
    }
  | { kind: 'resize'; id: string | number; value: DashboardCanvasValue }
  | { kind: 'section'; id: string | number; slot: number };

/**
 * Datadog-style 2D snap-grid dashboard: items placed on a 12-column grid with
 * a fixed row unit, full-width collapsible sections with their own sub-grids,
 * drag-to-move with push-down collision + live compaction preview, E/S/SE
 * resize handles, cross-container drags (top level ↔ any expanded section),
 * and vertical band reorder by dragging a section header. Always controlled —
 * there is no uncontrolled mode; every completed gesture fires `onChange`
 * exactly once with the engine-computed next value.
 *
 * @remarks
 * A collapsed section's band is NOT a drop target — expand it first (v1; no
 * hover-to-expand). Escape or a pointer cancel mid-gesture restores the
 * current `value` without firing `onChange`.
 *
 * @example
 * // Static/read-only layout — no onChange, geometry only.
 * <DashboardCanvas
 *   value={{ items: [{ id: 'kpi', x: 0, y: 0, w: 4, h: 2 }], sections: [] }}
 *   renderItem={(id) => <Card>{id}</Card>}
 *   readOnly
 * />
 *
 * @example
 * // Controlled layout with a section; onChange persists drags, resizes,
 * // band reorders, and collapse toggles.
 * const [value, setValue] = useState<DashboardCanvasValue>(initialLayout);
 * <DashboardCanvas
 *   value={value}
 *   onChange={setValue}
 *   renderItem={(id) => <Card>{widgets[id].title}</Card>}
 *   constraints={{ kpi: { minW: 2, maxH: 4 } }}
 * />
 */
export const DashboardCanvas = forwardRef<HTMLDivElement, DashboardCanvasProps>(
  function DashboardCanvas(
    {
      value,
      onChange,
      renderItem,
      renderSectionHeader,
      constraints,
      readOnly = false,
      className,
      onPointerMove: onPointerMoveProp,
      onPointerUp: onPointerUpProp,
      onPointerCancel: onPointerCancelProp,
      onLostPointerCapture: onLostPointerCaptureProp,
      ...rest
    },
    ref,
  ) {
    const t = useTranslation();

    const rootRef = useRef<HTMLDivElement | null>(null);
    const containersRef = useRef(new Map<string, { el: HTMLElement; cref: ContainerRef }>());
    const bandsRef = useRef(new Map<string | number, HTMLElement>());
    const dragRef = useRef<DragState | null>(null);
    const [live, setLive] = useState<LiveState | null>(null);

    const setContainerEl = useCallback((cref: ContainerRef, el: HTMLElement | null) => {
      const key = containerKey(cref);
      if (el) containersRef.current.set(key, { el, cref });
      else containersRef.current.delete(key);
    }, []);
    const setBandEl = useCallback((id: string | number, el: HTMLElement | null) => {
      if (el) bandsRef.current.set(id, el);
      else bandsRef.current.delete(id);
    }, []);

    const constraintsFor = (id: string | number): DashboardItemConstraints | undefined =>
      typeof constraints === 'function' ? constraints(id) : constraints?.[String(id)];

    // Single choke point for EVERY gesture commit: the engine ops return
    // `value` by reference when the gesture resolves to the current layout
    // (clamped resize, unmoved band, vanished id), so one identity check
    // kills every no-op onChange.
    const commit = (next: DashboardCanvasValue) => {
      if (next !== value) onChange?.(next);
    };

    const handleToggleSection = (sectionId: string | number) => {
      // Collapse stays active in readOnly — it's navigation, not editing.
      commit(toggleSection(value, sectionId));
    };

    // --- gesture starts (single readOnly choke point; Task 5 adds the narrow gate here) ---
    const onMovePointerDown = (
      event: ReactPointerEvent<HTMLDivElement>,
      placement: DashboardPlacement,
      container: ContainerRef,
    ) => {
      // One gesture at a time: a second pointer going down mid-drag must not
      // overwrite the state (FlowCanvas discipline). No preventDefault —
      // clicks inside item bodies pass through until the drag arms.
      if (readOnly || event.button !== 0 || dragRef.current) return;
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      dragRef.current = {
        kind: 'move',
        pointerId: event.pointerId,
        id: placement.id,
        from: container,
        homeX: placement.x,
        homeY: placement.y,
        startX: event.clientX,
        startY: event.clientY,
        grabDX: event.clientX - rect.left,
        grabDY: event.clientY - rect.top,
        ghostW: rect.width,
        ghostH: rect.height,
        moved: false,
        target: container,
        targetKey: containerKey(container),
        cell: null,
        previewKey: null,
        preview: null,
      };
      // No capture yet — capture retargets the eventual click to the root,
      // so it must wait until the drag arms (clicks pass through until then).
    };

    const onResizePointerDown = (
      event: ReactPointerEvent<HTMLDivElement>,
      placement: DashboardPlacement,
      container: ContainerRef,
      edge: ResizeEdge,
    ) => {
      if (readOnly || event.button !== 0 || dragRef.current) return;
      // The handle sits inside the move-drag surface — never arm both.
      event.stopPropagation();
      dragRef.current = {
        kind: 'resize',
        pointerId: event.pointerId,
        id: placement.id,
        container,
        containerKey: containerKey(container),
        edge,
        startX: event.clientX,
        startY: event.clientY,
        startW: placement.w,
        startH: placement.h,
        lastW: placement.w,
        lastH: placement.h,
        preview: null,
      };
      // Handles have no click semantics — capture immediately (on the root).
      capturePointer(rootRef.current, event.pointerId);
    };

    const onHeaderPointerDown = (
      event: ReactPointerEvent<HTMLDivElement>,
      sectionId: string | number,
    ) => {
      if (readOnly || event.button !== 0 || dragRef.current) return;
      // The drag zone is the header row MINUS the collapse button and the
      // renderSectionHeader extras — those keep their own interactions.
      if ((event.target as HTMLElement).closest('button, [data-dc-section-actions]')) return;
      const fromIndex = value.sections.findIndex((section) => section.id === sectionId);
      if (fromIndex === -1) return;
      dragRef.current = {
        kind: 'section',
        pointerId: event.pointerId,
        id: sectionId,
        fromIndex,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        slot: fromIndex,
      };
    };

    // --- pointer stream (root-level; capture retargeting still bubbles here) ---
    const handleRootPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerMoveProp?.(event);
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      if (drag.kind === 'move') {
        if (!drag.moved) {
          if (
            Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) <
            DRAG_ACTIVATION_PX
          ) {
            return;
          }
          drag.moved = true;
          capturePointer(rootRef.current, event.pointerId);
        }
        // Drop target = the registered container grid under the pointer.
        // Collapsed section bodies are unmounted hence unregistered, so their
        // bands can't be targets; in dead zones (headers, gaps, outside) the
        // last hovered container keeps the drop.
        for (const entry of containersRef.current.values()) {
          const r = entry.el.getBoundingClientRect();
          if (
            event.clientX >= r.left &&
            event.clientX <= r.right &&
            event.clientY >= r.top &&
            event.clientY <= r.bottom
          ) {
            drag.target = entry.cref;
            drag.targetKey = containerKey(entry.cref);
            break;
          }
        }
        const entry = containersRef.current.get(drag.targetKey);
        if (!entry) return;
        const { rect, colWidth, rowHeight, gap } = measureGrid(entry.el);
        // Snap by the ghost's origin (pointer minus grab offset), not the
        // pointer itself — grabbing a wide item mid-body must not yank its
        // left edge to the cursor column.
        const originX = event.clientX - drag.grabDX;
        const originY = event.clientY - drag.grabDY;
        const cell = cellFromPoint(originX, originY, rect, colWidth, rowHeight, gap);
        if (
          !drag.preview ||
          drag.previewKey !== drag.targetKey ||
          drag.cell?.x !== cell.x ||
          drag.cell?.y !== cell.y
        ) {
          // The preview IS the engine result of the hypothetical drop — the
          // exact value a pointerup right now would commit.
          drag.preview = applyMove(value, drag.from, drag.target, drag.id, cell.x, cell.y);
          drag.previewKey = drag.targetKey;
          drag.cell = cell;
        }
        const rootRect = rootRef.current?.getBoundingClientRect();
        setLive({
          kind: 'move',
          id: drag.id,
          value: drag.preview,
          ghost: {
            left: originX - (rootRect?.left ?? 0),
            top: originY - (rootRect?.top ?? 0),
            width: drag.ghostW,
            height: drag.ghostH,
          },
        });
        return;
      }

      if (drag.kind === 'resize') {
        const entry = containersRef.current.get(drag.containerKey);
        if (!entry) return;
        const { colWidth, rowHeight, gap } = measureGrid(entry.el);
        const dw =
          drag.edge === 's' ? 0 : Math.round((event.clientX - drag.startX) / (colWidth + gap));
        const dh =
          drag.edge === 'e' ? 0 : Math.round((event.clientY - drag.startY) / (rowHeight + gap));
        const w = drag.startW + dw;
        const h = drag.startH + dh;
        if (!drag.preview || w !== drag.lastW || h !== drag.lastH) {
          drag.lastW = w;
          drag.lastH = h;
          drag.preview = applyResize(value, drag.container, drag.id, w, h, constraintsFor(drag.id));
        }
        setLive({ kind: 'resize', id: drag.id, value: drag.preview });
        return;
      }

      // Section band reorder — vertical only.
      if (!drag.moved) {
        if (
          Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) <
          DRAG_ACTIVATION_PX
        ) {
          return;
        }
        drag.moved = true;
        capturePointer(rootRef.current, event.pointerId);
      }
      // Insertion slot = how many band midpoints the pointer has passed.
      let slot = 0;
      for (const section of value.sections) {
        const el = bandsRef.current.get(section.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (event.clientY > r.top + r.height / 2) slot += 1;
      }
      drag.slot = slot;
      setLive({ kind: 'section', id: drag.id, slot });
    };

    const handleRootPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerUpProp?.(event);
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      // End-of-gesture cleanup ALWAYS runs (FlowCanvas precedent) so a drag
      // can never get stuck; the commit below is the conditional part.
      dragRef.current = null;
      setLive(null);
      // Commits recompute from the CURRENT `value` closure, never the cached
      // preview — a controlled update mid-gesture must not be reverted.
      if (drag.kind === 'move') {
        if (!drag.moved || !drag.cell) return;
        // No-op drop: same container, same cell → the gesture changed
        // nothing, even if committing would compact an uncompacted value.
        if (
          containerKey(drag.from) === drag.targetKey &&
          drag.cell.x === drag.homeX &&
          drag.cell.y === drag.homeY
        ) {
          return;
        }
        commit(applyMove(value, drag.from, drag.target, drag.id, drag.cell.x, drag.cell.y));
        return;
      }
      if (drag.kind === 'resize') {
        if (drag.lastW === drag.startW && drag.lastH === drag.startH) return;
        commit(
          applyResize(
            value,
            drag.container,
            drag.id,
            drag.lastW,
            drag.lastH,
            constraintsFor(drag.id),
          ),
        );
        return;
      }
      if (!drag.moved) return;
      // Slot counts ALL bands including the dragged one, so slots past it
      // shift down by one when it's spliced out.
      const toIndex = drag.slot > drag.fromIndex ? drag.slot - 1 : drag.slot;
      commit(reorderSection(value, drag.id, toIndex));
    };

    const handleRootPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
      onPointerCancelProp?.(event);
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      // The system aborted the gesture — restore `value`, commit nothing.
      dragRef.current = null;
      setLive(null);
    };

    const handleLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
      onLostPointerCaptureProp?.(event);
      // Safety net: a normal release fires this AFTER pointerup already
      // cleared the state; still holding a drag here means the capture died
      // unexpectedly — abandon the gesture instead of leaving it stuck.
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragRef.current = null;
      setLive(null);
    };

    // Escape cancels an armed gesture and restores the current value. An
    // armed drag is an Escape-consuming mode — registering it as a floating
    // surface makes a host Modal/Drawer yield that Escape (FlowCanvas #282).
    const dragging = live != null;
    useFloatingSurface(dragging);
    useEffect(() => {
      if (!dragging) return undefined;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        dragRef.current = null;
        setLive(null);
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }, [dragging]);

    // readOnly flipping on mid-gesture aborts it — same restore as Escape.
    useEffect(() => {
      if (!readOnly) return;
      dragRef.current = null;
      setLive(null);
    }, [readOnly]);

    // Render EXACTLY what the engine returned for the in-flight gesture —
    // never parallel geometry. Section band order only changes on commit.
    const shown = live != null && live.kind !== 'section' ? live.value : value;
    const gestures: CanvasGestures = {
      readOnly,
      movingId: live?.kind === 'move' ? live.id : null,
      resizingId: live?.kind === 'resize' ? live.id : null,
      onMovePointerDown,
      onResizePointerDown,
    };

    // Band insertion indicator position (slot among N+1 gaps), suppressed
    // when dropping there would be a no-op.
    let bandSlot: number | null = null;
    if (live?.kind === 'section') {
      const fromIndex = value.sections.findIndex((section) => section.id === live.id);
      const toIndex = live.slot > fromIndex ? live.slot - 1 : live.slot;
      if (toIndex !== fromIndex) bandSlot = live.slot;
    }
    const bandIndicator = (
      <div className={styles.bandIndicator} data-dc-band-indicator aria-hidden="true" />
    );

    return (
      // {...rest} last so consumer overrides win (Pattern A); the pointer
      // handlers are extracted above and re-invoked inside ours.
      <div
        ref={mergeRefs(ref, rootRef)}
        role="group"
        aria-label={t('dashboardCanvas.canvas')}
        className={clsx(styles.canvas, className)}
        data-readonly={readOnly ? '' : undefined}
        data-dragging={dragging ? '' : undefined}
        onPointerMove={handleRootPointerMove}
        onPointerUp={handleRootPointerUp}
        onPointerCancel={handleRootPointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        {...rest}
      >
        <div
          className={styles.container}
          data-dc-container="top"
          ref={(el) => setContainerEl(TOP_CONTAINER, el)}
        >
          {sortByPosition(shown.items).map((item) => (
            <DashboardCanvasItem
              key={item.id}
              placement={item}
              container={TOP_CONTAINER}
              gestures={gestures}
            >
              {renderItem(item.id)}
            </DashboardCanvasItem>
          ))}
        </div>
        {shown.sections.map((section, index) => (
          <Fragment key={section.id}>
            {bandSlot === index && bandIndicator}
            <DashboardCanvasSection
              section={section}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              onToggle={() => handleToggleSection(section.id)}
              gestures={gestures}
              dragging={live?.kind === 'section' && live.id === section.id}
              onHeaderPointerDown={onHeaderPointerDown}
              setContainerEl={setContainerEl}
              setBandEl={setBandEl}
            />
          </Fragment>
        ))}
        {bandSlot === shown.sections.length && bandIndicator}
        {live?.kind === 'move' && (
          <div
            className={styles.ghost}
            data-dc-ghost
            aria-hidden="true"
            style={{
              width: live.ghost.width,
              height: live.ghost.height,
              transform: `translate(${live.ghost.left}px, ${live.ghost.top}px)`,
            }}
          >
            {renderItem(live.id)}
          </div>
        )}
      </div>
    );
  },
);
