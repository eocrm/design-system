import { Fragment, forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
  FocusEvent as ReactFocusEvent,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { Accordion } from '../Accordion';
import { useFloatingSurface } from '../_internal/overlay';
import { mergeAriaDescribedby, mergeRefs, sanitizeId } from '../_internal/refs';
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
   * Renders the body of an item by id. Called for every item on every
   * render — including items inside a COLLAPSED section (its body stays
   * mounted and `inert`, not unmounted, so Accordion's own collapse
   * animation has real content to animate) — and once more for the dragged
   * item mid-gesture (the cursor-following ghost). Keep it pure; a widget
   * that fetches on mount pays that cost even while its section is
   * collapsed. The cell itself is a bare positioned box with no
   * background/border/radius/shadow of its own and no minimum height beyond
   * its `h` row-span — that chrome belongs here, in whatever this returns
   * (typically a `<Card>`); size the content to the cell, or accept that a
   * shorter widget in a taller cell shows bare (dotted, in edit mode) space
   * below it.
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
   * handles, and no keyboard editing — the canvas renders `value` and lets
   * section collapse toggles keep working. The canvas also disables editing
   * on its own, without this prop, once its own width drops below 640px
   * (below-md single-column stack) — `readOnly` is for a consumer-chosen
   * view mode, the width gate is automatic. @default false
   */
  readOnly?: boolean;
}

const TOP_CONTAINER: ContainerRef = { kind: 'top' };

/** Stable registry key for a container (object identity is per-render). */
function containerKey(cref: ContainerRef): string {
  return cref.kind === 'top' ? 'top' : `s:${String(cref.id)}`;
}

/** The items of one container within a value (engine's private lookup, re-derived). */
function itemsOf(value: DashboardCanvasValue, cref: ContainerRef): DashboardPlacement[] {
  return (
    (cref.kind === 'top'
      ? value.items
      : value.sections.find((section) => section.id === cref.id)?.items) ?? []
  );
}

/**
 * A collapsed section's body is never a drop target — its `Accordion.Content`
 * stays mounted (CSS height animation, not a DOM unmount) so this must be
 * checked explicitly rather than relying on the container being unregistered.
 */
function isCollapsedSection(value: DashboardCanvasValue, cref: ContainerRef): boolean {
  return cref.kind === 'section' && !!value.sections.find((s) => s.id === cref.id)?.collapsed;
}

/** Last occupied row end (max `y + h`) of a container, `excludeId` left out. */
function bottomOf(
  value: DashboardCanvasValue,
  cref: ContainerRef,
  excludeId?: string | number,
): number {
  return itemsOf(value, cref).reduce(
    (max, p) => (p.id === excludeId ? max : Math.max(max, p.y + p.h)),
    0,
  );
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

/**
 * Editing-gate width threshold (px) — JS mirror of the `@container
 * (max-width: $collapse-md)` rule in DashboardCanvas.module.scss
 * (`_internal/collapse.scss`, 640px). `max-width` is INCLUSIVE, so a width
 * exactly at this value already single-columns — the gate below must match
 * with `<=`, not `<`. SCSS constants aren't readable from TS, so this
 * literal and that one are kept in sync by hand, same as the
 * `FALLBACK_ROW_PX`/`--dashboard-canvas-row` pairing above.
 */
const NARROW_PX = 640;

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

/**
 * Keyboard pick-up state (Enter/Space on a focused item). `x`/`y` track the
 * REQUESTED cell exactly like a pointer drag tracks the cursor cell — the
 * engine's compaction may render the item elsewhere, but requested tracking
 * is what lets repeated ArrowDown presses tunnel past the compaction pull
 * and reach the next container. Committed via the same applyMove call and
 * `commit` choke point as the pointer path.
 */
interface KeyboardPick {
  id: string | number;
  from: ContainerRef;
  homeX: number;
  homeY: number;
  /** Item dims, for clamping the requested x against the 12-column bound. */
  w: number;
  container: ContainerRef;
  x: number;
  y: number;
  /** Engine preview of dropping right now — the rendered layout while picked. */
  preview: DashboardCanvasValue;
}

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
 * When NOT to use:
 * - A single ordered list (priority queue, todo list, simple reordering) —
 *   use `<Sortable>`; no 2D geometry or push-down collision is needed for 1D
 *   reordering.
 * - Fixed kanban-style columns — use `<Kanban>`.
 * - A free-form node/edge graph (workflow builder) — use `<FlowCanvas>`.
 *
 * Anti-patterns:
 * - ❌ Treating `value` as uncontrolled — passing it once with no `onChange`.
 *   Drags and resizes still preview live, but nothing persists past
 *   pointerup: the canvas is always controlled, so the next render snaps the
 *   item back to the stale `value`.
 * - ❌ Nesting a `DashboardCanvas` inside another one's `renderItem`.
 *   Root-level pointer capture and the single in-flight-gesture guard
 *   (`dragRef`/`pick`) assume exactly one canvas owns the pointer stream — a
 *   nested canvas fights its parent for capture and Escape handling.
 * - ❌ Using it for a simple ordered list — see "When NOT to use" above.
 * - ❌ Expecting the grid cell to draw a card-like surface. It's chrome-less
 *   by design (`renderItem` owns background/border/radius/shadow) so widgets
 *   with transparent bodies (charts, images) don't render inside a redundant
 *   box — wrap `renderItem`'s output in `<Card>` for the boxed look.
 * - ❌ The canvas is ALWAYS a size container (`container-type: inline-size`
 *   on the root, unconditionally — the below-md single-column stack depends
 *   on it) — give it a parent with a concrete width. In an intrinsic-width
 *   context (a `Cluster` item, `width: max-content`, a `Split` aside's
 *   default `auto` track) it renders at width 0 (Grid `collapseBelow`
 *   precedent — same caveat, same cause). Below 640px
 *   (`_internal/collapse.scss`'s `$collapse-md`) every container
 *   re-templates to one column and pointer + keyboard editing turns off
 *   (handles hidden, items not editing-focusable) — a `ResizeObserver` on
 *   the root mirrors the CSS breakpoint so a gesture can never half-start
 *   below it; section collapse toggles keep working regardless of width.
 *
 * @example
 * // Edit-mode dashboard: top-level KPIs + a collapsible section, one
 * // constrained item, and a persistence pattern — onChange keeps the canvas
 * // controlled AND fires a save; debounce/fire-and-forget is the caller's job.
 * const [value, setValue] = useState<DashboardCanvasValue>(initialLayout);
 * const handleChange = (next: DashboardCanvasValue) => {
 *   setValue(next);
 *   saveDashboardLayout(dashboardId, next);
 * };
 * <DashboardCanvas
 *   value={value}
 *   onChange={handleChange}
 *   renderItem={(id) => <Card>{widgets[id].title}</Card>}
 *   constraints={{ kpi: { minW: 2, maxH: 4 } }}
 * />
 *
 * @example
 * // Read-only record view — same value shape, no editing affordances.
 * <DashboardCanvas
 *   value={savedLayout}
 *   renderItem={(id) => <Card>{widgets[id].title}</Card>}
 *   readOnly
 * />
 *
 * @example
 * // Constraints as a function — computed from data instead of a static map,
 * // e.g. locking size for widget kinds with a fixed aspect ratio.
 * <DashboardCanvas
 *   value={value}
 *   onChange={setValue}
 *   renderItem={(id) => <Card>{widgets[id].title}</Card>}
 *   constraints={(id) =>
 *     widgets[id]?.kind === 'chart' ? { minW: 4, minH: 3, maxH: 6 } : undefined
 *   }
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
      'aria-describedby': ariaDescribedby,
      onPointerMove: onPointerMoveProp,
      onPointerUp: onPointerUpProp,
      onPointerCancel: onPointerCancelProp,
      onLostPointerCapture: onLostPointerCaptureProp,
      onBlur: onBlurProp,
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
    const [pick, setPick] = useState<KeyboardPick | null>(null);
    // Below-md editing gate. Starts wide: jsdom has no ResizeObserver, and a
    // freshly-mounted (possibly still-hidden) root reports 0 width — both
    // stay wide so existing gesture tests keep exercising the full surface
    // (FlowCanvas's "no RO / zero size -> untrustworthy" precedent).
    const [isNarrow, setIsNarrow] = useState(false);
    const editingEnabled = !readOnly && !isNarrow;
    const uid = sanitizeId(useId());
    const instructionsId = `dashboard-instructions-${uid}`;

    // Nonce-keyed live region (FlowCanvas precedent): the nonce forces a DOM
    // mutation for back-to-back identical messages, and keys a child <span>
    // so the region node itself stays stable across announcements.
    const [announcement, setAnnouncement] = useState({ text: '', nonce: 0 });
    const announce = useCallback(
      (message: string) => setAnnouncement((prev) => ({ text: message, nonce: prev.nonce + 1 })),
      [],
    );

    // A keyboard step can remount or DOM-reorder the focused element (a
    // cross-container move re-parents the item; a band reorder re-orders the
    // section nodes), silently dropping focus to <body> and stranding the
    // keyboard user. Handlers flag what to re-focus; the post-commit effect
    // below restores it (FlowCanvas focus-reclaim precedent).
    const reclaimRef = useRef<{ kind: 'item' | 'section'; id: string | number } | null>(null);

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
      // Collapse stays active in readOnly AND below the narrow-editing
      // threshold — it's navigation, not editing.
      commit(toggleSection(value, sectionId));
    };

    // Sections are composed from a single shared `<Accordion type="multiple">`
    // (one Item per band) — `value` mirrors which bands are OPEN (inverse of
    // `collapsed`). Reads `value`, not the render-facing `shown` (computed
    // below): collapsed never changes mid-gesture, and `value` avoids a
    // declaration-order dependency on `shown`. Accordion always hands back
    // the WHOLE next open-ids array on a click, never which id changed;
    // exactly one differs per click (its own toggle is the only way this
    // fires), so the symmetric difference recovers it.
    const openSectionIds = value.sections
      .filter((section) => !section.collapsed)
      .map((section) => String(section.id));
    const handleSectionOpenChange = (next: string[]) => {
      const toggledId =
        next.find((id) => !openSectionIds.includes(id)) ??
        openSectionIds.find((id) => !next.includes(id));
      const section = value.sections.find((s) => String(s.id) === toggledId);
      if (section) handleToggleSection(section.id);
    };

    // --- gesture starts (single `editingEnabled` choke point: readOnly prop OR narrow width) ---
    const onMovePointerDown = (
      event: ReactPointerEvent<HTMLDivElement>,
      placement: DashboardPlacement,
      container: ContainerRef,
    ) => {
      // One gesture at a time: a second pointer going down mid-drag must not
      // overwrite the state (FlowCanvas discipline), and a keyboard pick owns
      // the canvas until it drops or cancels. No preventDefault — clicks
      // inside item bodies pass through until the drag arms.
      if (!editingEnabled || event.button !== 0 || dragRef.current || pick) return;
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
      if (!editingEnabled || event.button !== 0 || dragRef.current || pick) return;
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
      if (!editingEnabled || event.button !== 0 || dragRef.current || pick) return;
      // Called only from the section's dedicated grip handle (see
      // DashboardCanvasSection's remarks) — no target-based exclusion needed,
      // the toggle button and the renderSectionHeader extras never wire this.
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
        // Collapsed section bodies stay MOUNTED (Accordion.Content animates,
        // never unmounts) and so stay registered — isCollapsedSection skips
        // them explicitly here so their bands still can't be targets; in
        // dead zones (headers, gaps, outside) the last hovered container
        // keeps the drop.
        for (const entry of containersRef.current.values()) {
          if (isCollapsedSection(value, entry.cref)) continue;
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
        // Requested dims unchanged → bail before applyResize, so a no-op
        // gesture can't commit a compaction of an untouched value.
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

    // --- keyboard editing — same engine calls + commit choke point as pointer ---

    const cancelPick = () => {
      setPick(null);
      announce(t('dashboardCanvas.cancelled'));
    };

    /** One arrow step of a picked item; crossing a container edge moves bands. */
    const stepPick = (current: KeyboardPick, key: string) => {
      const dx = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
      const dy = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
      // Keyboard targets = expanded containers in band order; collapsed
      // sections are skipped (pointer drop-target parity).
      const order: ContainerRef[] = [
        TOP_CONTAINER,
        ...value.sections
          .filter((section) => !section.collapsed)
          .map((section): ContainerRef => ({ kind: 'section', id: section.id })),
      ];
      const idx = order.findIndex((cref) => containerKey(cref) === containerKey(current.container));
      let container = current.container;
      let crossed: ContainerRef | null = null;
      const x = Math.min(Math.max(current.x + dx, 0), DASHBOARD_COLUMNS - current.w);
      let y = current.y + dy;
      if (idx !== -1 && dy > 0 && y > bottomOf(current.preview, container, current.id)) {
        // Below the container's last occupied row: enter the next band at its
        // top, or clamp at the bottom when there is none.
        const next = order[idx + 1];
        if (next) {
          container = next;
          crossed = next;
          y = 0;
        } else {
          y = bottomOf(current.preview, container, current.id);
        }
      } else if (idx !== -1 && dy < 0 && y < 0) {
        // Above the top row: enter the previous band at its bottom.
        const prev = order[idx - 1];
        if (prev) {
          container = prev;
          crossed = prev;
          y = bottomOf(current.preview, prev, current.id);
        } else {
          y = 0;
        }
      } else {
        y = Math.max(y, 0);
      }
      const preview = applyMove(value, current.from, container, current.id, x, y);
      reclaimRef.current = { kind: 'item', id: current.id };
      setPick({ ...current, container, x, y, preview });
      if (crossed) {
        announce(
          crossed.kind === 'top'
            ? t('dashboardCanvas.enteredTopLevel')
            : t('dashboardCanvas.enteredSection', {
                title:
                  value.sections.find((section) => section.id === crossed.id)?.title ??
                  String(crossed.id),
              }),
        );
      } else {
        announce(
          t('dashboardCanvas.movedTo', {
            x: x + 1,
            y: y + 1,
            container:
              container.kind === 'section'
                ? value.sections.find((section) => section.id === container.id)?.title
                : undefined,
          }),
        );
      }
    };

    const onItemKeyDown = (
      event: ReactKeyboardEvent<HTMLDivElement>,
      placement: DashboardPlacement,
      container: ContainerRef,
    ) => {
      // Only keys aimed at the cell itself — interactive widget content keeps
      // its own keystrokes (FlowCanvas key-target discipline).
      if (event.target !== event.currentTarget) return;
      const { key } = event;
      const activate = key === 'Enter' || key === ' ';
      if (pick) {
        if (pick.id !== placement.id) return; // one pick at a time
        if (key === 'Escape') {
          // Layered dismiss: this Escape ends the pick, never a host modal.
          event.preventDefault();
          event.stopPropagation();
          cancelPick();
          return;
        }
        if (activate) {
          event.preventDefault();
          setPick(null);
          // Same-cell drop mirrors the pointer no-op guard: nothing changed,
          // even if committing would compact an uncompacted value.
          if (
            !(
              containerKey(pick.from) === containerKey(pick.container) &&
              pick.x === pick.homeX &&
              pick.y === pick.homeY
            )
          ) {
            commit(applyMove(value, pick.from, pick.container, pick.id, pick.x, pick.y));
          }
          announce(t('dashboardCanvas.dropped'));
          return;
        }
        if (key.startsWith('Arrow')) {
          event.preventDefault();
          stepPick(pick, key);
        }
        return;
      }
      if (activate) {
        event.preventDefault(); // Space must not scroll the page
        setPick({
          id: placement.id,
          from: container,
          container,
          homeX: placement.x,
          homeY: placement.y,
          w: placement.w,
          x: placement.x,
          y: placement.y,
          preview: value,
        });
        announce(t('dashboardCanvas.pickedUp'));
        return;
      }
      if (event.shiftKey && key.startsWith('Arrow')) {
        event.preventDefault();
        const w = placement.w + (key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0);
        const h = placement.h + (key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0);
        // Committed per keypress — no resize mode (FlowCanvas nudge precedent).
        const next = applyResize(
          value,
          container,
          placement.id,
          w,
          h,
          constraintsFor(placement.id),
        );
        commit(next);
        // Announce the engine-clamped size: at a constraint the layout does
        // not change, but the user still needs the "you're at the limit" echo.
        const result = itemsOf(next, container).find((p) => p.id === placement.id) ?? placement;
        announce(t('dashboardCanvas.resized', { w: result.w, h: result.h }));
      }
    };

    const onHeaderKeyDown = (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      sectionId: string | number,
    ) => {
      if (!event.shiftKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
      // Composed onto Accordion.Trigger's own onKeyDown (it runs ours first);
      // the target is always the trigger button itself — extras and the grip
      // handle live outside it, so there's nothing to exclude here anymore.
      const fromIndex = value.sections.findIndex((section) => section.id === sectionId);
      if (fromIndex === -1) return;
      event.preventDefault();
      const next = reorderSection(
        value,
        sectionId,
        fromIndex + (event.key === 'ArrowDown' ? 1 : -1),
      );
      if (next === value) return; // clamped at the edge — nothing moved
      reclaimRef.current = { kind: 'section', id: sectionId };
      commit(next);
      announce(
        t('dashboardCanvas.sectionMoved', {
          title: value.sections[fromIndex].title,
          position: next.sections.findIndex((section) => section.id === sectionId) + 1,
        }),
      );
    };

    // Focus reclaim. No dependency array — the flag is only ever raised
    // alongside a state update, and the check costs a ref read. When focus
    // survived (same element, still connected) this is a no-op.
    useEffect(() => {
      const target = reclaimRef.current;
      if (!target) return;
      reclaimRef.current = null;
      const root = rootRef.current;
      if (!root) return;
      const active = document.activeElement;
      if (
        active &&
        active !== document.body &&
        active !== document.documentElement &&
        active.isConnected &&
        root.contains(active)
      ) {
        return;
      }
      // Attribute-value scan instead of a selector: ids are consumer strings
      // and CSS-escaping them buys nothing at this element count.
      const el =
        target.kind === 'item'
          ? Array.from(root.querySelectorAll<HTMLElement>('[data-dc-item]')).find(
              (node) => node.getAttribute('data-dc-item') === String(target.id),
            )
          : Array.from(root.querySelectorAll<HTMLElement>('[data-dc-section]'))
              .find((node) => node.getAttribute('data-dc-section') === String(target.id))
              ?.querySelector<HTMLElement>('button[aria-expanded]');
      el?.focus({ preventScroll: true });
    });

    // Focus leaving the picked item cancels the pick — Tab is never trapped
    // (WCAG 2.1.2) and an unfocused pick would be uncancellable (Escape is
    // handled on the item). The reclaim flag distinguishes the transient
    // blur of a mid-step remount/reorder from a real departure.
    const handleRootBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
      onBlurProp?.(event);
      if (!pick || reclaimRef.current) return;
      const target = event.target as HTMLElement;
      if (target.getAttribute?.('data-dc-item') === String(pick.id)) cancelPick();
    };

    // Escape cancels an armed gesture and restores the current value. An
    // armed drag or keyboard pick is an Escape-consuming mode — registering
    // it as a floating surface makes a host Modal/Drawer yield that Escape
    // (FlowCanvas #282). The pick's own Escape lands on the focused item.
    const dragging = live != null;
    useFloatingSurface(dragging || pick != null);
    // Window-level Escape: cancels a pointer drag wherever focus sits, and
    // is the belt-and-braces exit for a pick whose item lost focus (the
    // item-level handler consumes Escape first when focused).
    useEffect(() => {
      if (!dragging && !pick) return undefined;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        dragRef.current = null;
        setLive(null);
        if (pick) cancelPick();
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
      // cancelPick is re-created per render but only reads current state.
    }, [dragging, pick]);

    // JS mirror of the CSS `@container (max-width: $collapse-md)` rule —
    // width alone gates editing (below it, gestures + keyboard editing turn
    // off; collapse toggles are unaffected). typeof-guard for jsdom; a
    // reported 0 width means the root isn't laid out yet (hidden mount),
    // which stays wide for the same reason FlowCanvas's node ResizeObserver
    // treats 0×0 as unmeasured rather than "small."
    useEffect(() => {
      const root = rootRef.current;
      if (!root || typeof ResizeObserver === 'undefined') return undefined;
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        setIsNarrow(width > 0 && width <= NARROW_PX);
      });
      observer.observe(root);
      return () => observer.disconnect();
    }, []);

    // readOnly OR the narrow-width gate flipping editing off mid-gesture
    // aborts it — same restore as Escape.
    useEffect(() => {
      if (editingEnabled) return;
      dragRef.current = null;
      setLive(null);
      if (pick) {
        setPick(null);
        announce(t('dashboardCanvas.cancelled'));
      }
      // Deliberately keyed on the two raw gate inputs (not the derived
      // `editingEnabled`, recomputed every render); the closure is from the
      // render where either flipped, so `pick` is current.
    }, [readOnly, isNarrow]);

    // An external value change mid-pick invalidates the pick's home/from
    // coordinates (and can delete the picked item outright, which would
    // strand the canvas: every pointerdown is gated on `pick` and the
    // Escape handler lives on the now-gone item) — abort, same discipline
    // as the readOnly flip. Identity-guarded, no dependency array: a drop
    // clears `pick` before onChange in the same batch, so our own commits
    // never trip this.
    const prevValueRef = useRef(value);
    useEffect(() => {
      if (prevValueRef.current === value) return;
      prevValueRef.current = value;
      if (!pick) return;
      setPick(null);
      announce(t('dashboardCanvas.cancelled'));
    });

    // Render EXACTLY what the engine returned for the in-flight gesture —
    // never parallel geometry. Section band order only changes on commit.
    const shown =
      live != null && live.kind !== 'section' ? live.value : pick != null ? pick.preview : value;
    const gestures: CanvasGestures = {
      // The item/section internals only care whether editing is off, not
      // WHY — readOnly and narrow-width both render identically (no
      // handles, not editing-focusable, gestures inert).
      readOnly: !editingEnabled,
      movingId: live?.kind === 'move' ? live.id : null,
      resizingId: live?.kind === 'resize' ? live.id : null,
      pickedId: pick?.id ?? null,
      instructionsId,
      onMovePointerDown,
      onResizePointerDown,
      onItemKeyDown,
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
        aria-describedby={mergeAriaDescribedby(ariaDescribedby, instructionsId)}
        className={clsx(styles.canvas, className)}
        data-readonly={readOnly ? '' : undefined}
        data-narrow={isNarrow ? '' : undefined}
        data-dragging={dragging ? '' : undefined}
        onPointerMove={handleRootPointerMove}
        onPointerUp={handleRootPointerUp}
        onPointerCancel={handleRootPointerCancel}
        onLostPointerCapture={handleLostPointerCapture}
        onBlur={handleRootBlur}
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
        {shown.sections.length > 0 && (
          <Accordion
            type="multiple"
            value={openSectionIds}
            onValueChange={handleSectionOpenChange}
            gap="md"
            indicatorSide="left"
          >
            {shown.sections.map((section, index) => (
              <Fragment key={section.id}>
                {bandSlot === index && bandIndicator}
                <DashboardCanvasSection
                  section={section}
                  renderItem={renderItem}
                  renderSectionHeader={renderSectionHeader}
                  gestures={gestures}
                  dragging={live?.kind === 'section' && live.id === section.id}
                  onHeaderPointerDown={onHeaderPointerDown}
                  onHeaderKeyDown={onHeaderKeyDown}
                  setContainerEl={setContainerEl}
                  setBandEl={setBandEl}
                />
              </Fragment>
            ))}
            {bandSlot === shown.sections.length && bandIndicator}
          </Accordion>
        )}
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
        <div id={instructionsId} className={styles.srOnly}>
          {t(
            editingEnabled
              ? 'dashboardCanvas.instructions'
              : 'dashboardCanvas.instructionsReadOnly',
          )}
        </div>
        <div role="status" className={styles.srOnly}>
          <span key={announcement.nonce}>{announcement.text}</span>
        </div>
      </div>
    );
  },
);
