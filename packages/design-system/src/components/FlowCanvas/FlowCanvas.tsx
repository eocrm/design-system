import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { mergeAriaDescribedby, mergeRefs, sanitizeId } from '../_internal/refs';
import { useControllableState } from '../_internal/useControllableState';
import { computeLayout, ESTIMATED_NODE_SIZE } from './layout';
import type { NodeSize } from './layout';
import { edgeGeometry, selfLoopGeometry } from './edgePath';
import type { Rect } from './edgePath';
import { nearestInDirection } from './spatialNav';
import type { NavDirection } from './spatialNav';
import { FlowControls } from './FlowControls';
import { FlowEdge } from './FlowEdge';
import { FlowNode } from './FlowNode';
import type { FlowCanvasEdge, FlowCanvasNode, FlowCanvasPoint, FlowCanvasSelection } from './types';
import { PAN_STEP, ZOOM_STEP, useViewport } from './useViewport';
import styles from './FlowCanvas.module.scss';

/** Props for {@link FlowCanvas}. */
export interface FlowCanvasProps extends HTMLAttributes<HTMLDivElement> {
  /** Nodes to render. The canvas never mutates this array. */
  nodes: FlowCanvasNode[];
  /** Directed edges between nodes. Edges referencing unknown ids are skipped (dev warning). */
  edges: FlowCanvasEdge[];
  /** Called when the user requests a node at a canvas point (double-click empty canvas). */
  onNodeCreate?: (position: FlowCanvasPoint) => void;
  /** Called when a node's position is committed (drag end, keyboard nudge). */
  onNodeMove?: (id: string, position: FlowCanvasPoint) => void;
  /** Called when a node is opened (Enter/Space or double-click). */
  onNodeOpen?: (id: string) => void;
  /** Called when deletion of the selected node is requested (Delete/Backspace). */
  onNodeDelete?: (id: string) => void;
  /** Called when the user draws or confirms a connection between two nodes. */
  onEdgeCreate?: (from: string, to: string) => void;
  /** Called when an edge is opened (Enter/Space or double-click). */
  onEdgeOpen?: (id: string) => void;
  /** Called when deletion of the selected edge is requested (Delete/Backspace). */
  onEdgeDelete?: (id: string) => void;
  /**
   * Live validation while drawing a connection. Invalid targets can't be
   * dropped on (pointer) and are skipped (keyboard).
   * @default rejects self-loops and duplicate (from, to) pairs
   */
  isValidConnection?: (from: string, to: string) => boolean;
  /**
   * Controlled selection. Use with `onSelectionChange`. A selection whose id
   * is not (or no longer) in `nodes`/`edges` acts as no selection — e.g.
   * after applying a delete intent — until the id reappears in the graph.
   */
  selection?: FlowCanvasSelection;
  /** Initial selection when uncontrolled. Stale ids act as no selection. @default null */
  defaultSelection?: FlowCanvasSelection;
  /** Fires whenever the selection changes (click, focus, Escape). */
  onSelectionChange?: (selection: FlowCanvasSelection) => void;
  /**
   * Render-only mode: create/move/connect/delete are disabled; selection and
   * open still work. @default false
   */
  readOnly?: boolean;
}

/**
 * Generic node-edge graph editor primitive: pan/zoom canvas, nodes over a
 * bezier-edge SVG underlay, single selection, and intent callbacks. The
 * canvas never mutates consumer data — every user gesture surfaces as an
 * `on*` event for the consumer to apply.
 *
 * @remarks
 * Under construction on this branch: static rendering is in place; pan/zoom,
 * dragging, connecting, and keyboard interactions land in follow-up tasks.
 * Full usage docs arrive with the final task.
 */
export const FlowCanvas = forwardRef<HTMLDivElement, FlowCanvasProps>(function FlowCanvas(
  {
    nodes,
    edges,
    onNodeCreate,
    onNodeMove,
    onNodeOpen,
    onNodeDelete,
    onEdgeCreate,
    onEdgeOpen,
    onEdgeDelete,
    isValidConnection,
    selection: selectionProp,
    defaultSelection = null,
    onSelectionChange,
    readOnly = false,
    className,
    'aria-describedby': ariaDescribedby,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeyDown,
    onDoubleClick,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const uid = sanitizeId(useId());
  const instructionsId = `flow-instructions-${uid}`;
  const markerId = `flow-arrow-${uid}`;
  const markerActiveId = `flow-arrow-active-${uid}`;

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const edgeIds = useMemo(() => new Set(edges.map((e) => e.id)), [edges]);

  const [rawSelection, setSelection] = useControllableState<FlowCanvasSelection>({
    value: selectionProp,
    defaultValue: defaultSelection,
    onChange: onSelectionChange,
  });
  // The consumer applies a delete intent by removing the node/edge from
  // props — but the retained (uncontrolled) selection state still holds the
  // dead id afterwards, and there is no imperative API to clear it. Every
  // read below goes through this derived selection instead: an id absent
  // from the current graph acts as no selection, so intents (Delete/Enter)
  // can never target ids that are not in the graph. The raw state is
  // deliberately kept — if the id returns (e.g. the consumer undoes the
  // delete), the selection resurrects.
  const selection = useMemo(() => {
    if (!rawSelection) return null;
    const exists =
      rawSelection.type === 'node' ? nodeById.has(rawSelection.id) : edgeIds.has(rawSelection.id);
    return exists ? rawSelection : null;
  }, [rawSelection, nodeById, edgeIds]);
  // Latest selection, readable from the stable node/edge pointer handlers:
  // they guard re-selects against it without taking `selection` as a
  // dependency (which would re-create the handlers and re-render every
  // memoized node/edge on each selection change).
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  // --- node registry + measurement -----------------------------------------
  const nodeEls = useRef(new Map<string, HTMLDivElement>());
  const edgeEls = useRef(new Map<string, SVGPathElement>());
  const [sizes, setSizes] = useState<Map<string, NodeSize>>(new Map());
  const registerNodeEl = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) nodeEls.current.set(id, el);
    else nodeEls.current.delete(id);
  }, []);
  const registerEdgeEl = useCallback((id: string, el: SVGPathElement | null) => {
    if (el) edgeEls.current.set(id, el);
    else edgeEls.current.delete(id);
  }, []);

  const nodeIdsKey = nodes.map((n) => n.id).join(' ');
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return; // jsdom — estimates are used
    const observer = new ResizeObserver(() => {
      const next = new Map<string, NodeSize>();
      for (const [id, el] of nodeEls.current) {
        // Hidden mounts (display: none Modal/Tab) measure 0x0 — treat those
        // as unmeasured so ESTIMATED_NODE_SIZE keeps applying and the
        // corrective 'estimated' -> 'done' re-fit still runs on reveal.
        if (el.offsetWidth > 0 && el.offsetHeight > 0) {
          next.set(id, { width: el.offsetWidth, height: el.offsetHeight });
        }
      }
      setSizes(next);
    });
    for (const el of nodeEls.current.values()) observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-observe when the node set changes
  }, [nodeIdsKey]);

  // --- positions: live drag > explicit prop > session override > layout ----
  // `dragOverrides` retains committed drags of auto-laid-out nodes for the
  // session; `liveDrag` is the in-flight gesture position and wins over
  // everything so controlled nodes track the pointer too (they snap back on
  // release unless the consumer persists the move from `onNodeMove`).
  const [dragOverrides, setDragOverrides] = useState<Map<string, FlowCanvasPoint>>(new Map());
  const [liveDrag, setLiveDrag] = useState<{ id: string; position: FlowCanvasPoint } | null>(null);
  const dragState = useRef<{
    id: string;
    pointerId: number;
    /** Pointerdown coordinates — the click-tolerance baseline (screen px). */
    startClientX: number;
    startClientY: number;
    /** Last processed coordinates — the per-segment conversion baseline. */
    lastClientX: number;
    lastClientY: number;
    /** Node position so far, accumulated per segment in canvas units. */
    position: FlowCanvasPoint;
    moved: boolean;
  } | null>(null);
  const layoutPositions = useMemo(() => computeLayout(nodes, edges, sizes), [nodes, edges, sizes]);
  const positionOf = useCallback(
    (node: FlowCanvasNode): FlowCanvasPoint => {
      if (liveDrag?.id === node.id) return liveDrag.position;
      return (
        node.position ??
        dragOverrides.get(node.id) ??
        layoutPositions.get(node.id) ?? { x: 0, y: 0 }
      );
    },
    [liveDrag, dragOverrides, layoutPositions],
  );
  const rects = useMemo(() => {
    const map = new Map<string, Rect>();
    for (const node of nodes) {
      const pos = positionOf(node);
      const size = sizes.get(node.id) ?? ESTIMATED_NODE_SIZE;
      map.set(node.id, { x: pos.x, y: pos.y, width: size.width, height: size.height });
    }
    return map;
  }, [nodes, positionOf, sizes]);

  // --- connections: pointer draw + keyboard connect mode -------------------
  // `connect` is the in-flight connection gesture. Pointer mode tracks the
  // cursor for the ghost edge; keyboard mode steps the target with arrows.
  const [connect, setConnect] = useState<{
    from: string;
    mode: 'pointer' | 'keyboard';
    target: string | null;
    cursor: FlowCanvasPoint | null; // pointer mode ghost end
  } | null>(null);

  const defaultIsValid = useCallback(
    (from: string, to: string) => from !== to && !edges.some((e) => e.from === from && e.to === to),
    [edges],
  );
  const isValid = isValidConnection ?? defaultIsValid;

  const nodeAtPoint = useCallback(
    (point: FlowCanvasPoint): string | null => {
      for (const [id, rect] of rects) {
        if (
          point.x >= rect.x &&
          point.x <= rect.x + rect.width &&
          point.y >= rect.y &&
          point.y <= rect.y + rect.height
        ) {
          return id;
        }
      }
      return null;
    },
    [rects],
  );

  // --- edges: resolve + skip broken ones (one-time dev warning) ------------
  const warnedEdges = useRef(new Set<string>());
  const resolvedEdges = useMemo(() => {
    const reverse = new Set(edges.map((e) => `${e.to} ${e.from}`));
    return edges.flatMap((edge) => {
      const source = rects.get(edge.from);
      const target = rects.get(edge.to);
      if (!source || !target) {
        if (process.env.NODE_ENV !== 'production' && !warnedEdges.current.has(edge.id)) {
          warnedEdges.current.add(edge.id);
          console.warn(
            `[FlowCanvas] edge "${edge.id}" references a missing node (${edge.from} → ${edge.to}) and was skipped.`,
          );
        }
        return [];
      }
      const geometry =
        edge.from === edge.to
          ? selfLoopGeometry(source)
          : edgeGeometry(
              source,
              target,
              reverse.has(`${edge.from} ${edge.to}`) ? (edge.from < edge.to ? 1 : -1) : 0,
            );
      return [{ edge, geometry }];
    });
  }, [edges, rects]);

  // --- viewport: pan/zoom/fit --------------------------------------------
  const { viewport, panBy, zoomBy, fitTo } = useViewport(rootRef);
  // The nonce forces a DOM mutation even for back-to-back identical messages
  // (select A, Escape, select B, Escape) — with a plain string, React bails
  // on the identical state and the live region never re-announces. The nonce
  // keys a child <span> so the region node itself stays stable (screen
  // readers can miss announcements when the live region is replaced).
  const [announcement, setAnnouncement] = useState({ text: '', nonce: 0 });
  const announce = useCallback(
    (message: string) => setAnnouncement((prev) => ({ text: message, nonce: prev.nonce + 1 })),
    [],
  );

  const contentBounds = useMemo(() => {
    if (rects.size === 0) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const rect of rects.values()) {
      minX = Math.min(minX, rect.x);
      minY = Math.min(minY, rect.y);
      maxX = Math.max(maxX, rect.x + rect.width);
      maxY = Math.max(maxY, rect.y + rect.height);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [rects]);

  // Fit once, as soon as the fit can actually apply. `fitTo` reports whether
  // it did (a 0x0 root is a no-op), so when the canvas mounts hidden — Modal
  // not yet open, inactive Tab, display: none panel — we retry on the root's
  // first non-zero measurement instead of permanently skipping the fit.
  // The mount fit necessarily runs before ResizeObserver delivers node sizes,
  // so its bounds come from ESTIMATED_NODE_SIZE rects ('estimated'); when the
  // first real measurements land a frame later and shift the bounds, the fit
  // re-applies once to correct itself ('done').
  const fitState = useRef<'pending' | 'estimated' | 'done'>('pending');
  const hasMeasuredSizes = sizes.size > 0;
  useEffect(() => {
    if (fitState.current === 'done' || !contentBounds) return;
    if (fitState.current === 'estimated') {
      if (hasMeasuredSizes && fitTo(contentBounds)) fitState.current = 'done';
      return;
    }
    if (fitTo(contentBounds)) {
      fitState.current = hasMeasuredSizes ? 'done' : 'estimated';
      return;
    }
    if (typeof ResizeObserver === 'undefined') return; // jsdom — stays unfit
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (fitState.current === 'pending' && fitTo(contentBounds)) {
        fitState.current = hasMeasuredSizes ? 'done' : 'estimated';
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [contentBounds, fitTo, hasMeasuredSizes]);

  const zoomIn = useCallback(() => {
    zoomBy(ZOOM_STEP);
  }, [zoomBy]);
  const zoomOut = useCallback(() => {
    zoomBy(1 / ZOOM_STEP);
  }, [zoomBy]);

  // Announce zoom changes (skip the initial render).
  const lastZoom = useRef(viewport.z);
  useEffect(() => {
    if (viewport.z !== lastZoom.current) {
      lastZoom.current = viewport.z;
      announce(t('flowCanvas.zoomLevel', { percent: Math.round(viewport.z * 100) }));
    }
  }, [viewport.z, announce, t]);

  // Background pan: press on empty canvas (not node/edge/chip/controls) drags
  // the viewport; a press-without-move clears the selection. `isPanning`
  // mirrors `panState.current?.moved` as state because the render output
  // (cursor class) depends on it — reading the ref during render would leave
  // a stale grabbing cursor after release.
  const [isPanning, setIsPanning] = useState(false);
  const panState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const isBackgroundTarget = (target: EventTarget | null): boolean => {
    const el = target as HTMLElement | null;
    return !el?.closest?.(
      '[data-flow-node], [data-flow-edge], [data-flow-chip], [data-flow-controls], [data-flow-handle]',
    );
  };

  // Consumer handlers (composed below) run before the canvas's own gesture
  // handling; `event.preventDefault()` in a consumer handler opts out of it.
  const handleRootPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || !isBackgroundTarget(event.target)) return;
    panState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* jsdom */
    }
  };
  const handleRootPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (event.defaultPrevented) return;
    if (connect?.mode === 'pointer') {
      const point = toCanvasPoint(event.clientX, event.clientY);
      const over = nodeAtPoint(point);
      const target = over && over !== connect.from && isValid(connect.from, over) ? over : null;
      setConnect({ ...connect, target, cursor: point });
      return;
    }
    const drag = dragState.current;
    if (drag && event.pointerId === drag.pointerId) {
      // 3px screen-space click tolerance, measured from the pointerdown point.
      if (
        !drag.moved &&
        Math.abs(event.clientX - drag.startClientX) + Math.abs(event.clientY - drag.startClientY) <
          3
      ) {
        return;
      }
      drag.moved = true;
      // Convert each move's own segment at the zoom in effect NOW and
      // accumulate, re-baselining like the pan branch below. Dividing the
      // total delta since pointerdown by the current z would retroactively
      // reconvert the whole gesture when the zoom changes mid-drag — a second
      // touch on the zoom controls, or '+'/'-'/'0' on the mousedown-focused
      // node — and jump the node.
      drag.position = {
        x: drag.position.x + (event.clientX - drag.lastClientX) / viewport.z,
        y: drag.position.y + (event.clientY - drag.lastClientY) / viewport.z,
      };
      drag.lastClientX = event.clientX;
      drag.lastClientY = event.clientY;
      setLiveDrag({ id: drag.id, position: drag.position });
      return;
    }
    const pan = panState.current;
    if (!pan || event.pointerId !== pan.pointerId) return;
    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (!pan.moved && Math.abs(dx) + Math.abs(dy) < 3) return; // click tolerance
    pan.moved = true;
    setIsPanning(true);
    pan.startX = event.clientX;
    pan.startY = event.clientY;
    panBy(dx, dy);
  };
  const handleRootPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerUp?.(event);
    if (connect?.mode === 'pointer') {
      // End-of-gesture cleanup always runs (like drag/pan below); the create
      // intent honors a consumer's preventDefault() the same way the drag
      // commit does.
      if (connect.target && !event.defaultPrevented) {
        onEdgeCreate?.(connect.from, connect.target);
        announce(
          t('flowCanvas.connectDone', {
            from: nodeById.get(connect.from)?.label ?? connect.from,
            to: nodeById.get(connect.target)?.label ?? connect.target,
          }),
        );
      }
      setConnect(null);
      return;
    }
    const drag = dragState.current;
    if (drag && event.pointerId === drag.pointerId) {
      // Like the pan below, end-of-gesture cleanup (dropping the drag state
      // and the live position) always runs so a drag can't get stuck; the
      // commit below (session override, onNodeMove, announcement) is what a
      // consumer's preventDefault() opts out of — the node then snaps back
      // exactly like a cancelled gesture.
      dragState.current = null;
      if (drag.moved && !event.defaultPrevented) {
        // Fold in any final movement carried by the pointerup itself, at the
        // current zoom — the same per-segment conversion as the move handler.
        const position = {
          x: drag.position.x + (event.clientX - drag.lastClientX) / viewport.z,
          y: drag.position.y + (event.clientY - drag.lastClientY) / viewport.z,
        };
        const node = nodeById.get(drag.id);
        if (node && node.position === undefined) {
          // Session-local arrangement for auto-laid-out nodes.
          setDragOverrides((prev) => new Map(prev).set(drag.id, position));
        }
        onNodeMove?.(drag.id, position);
        announce(t('flowCanvas.nodeMoved', { label: node?.label ?? drag.id }));
      }
      setLiveDrag(null);
      return;
    }
    const pan = panState.current;
    if (!pan || event.pointerId !== pan.pointerId) return;
    // End-of-gesture cleanup always runs (a stuck pan is unrecoverable);
    // consumer preventDefault() only opts out of click-clears-selection.
    panState.current = null;
    setIsPanning(false);
    if (!pan.moved && !event.defaultPrevented && selection != null) {
      // Guarded on selection: useControllableState has no equality check, so
      // an unguarded clear would fire onSelectionChange(null) and announce
      // "Selection cleared" even when nothing was selected.
      setSelection(null); // click on empty canvas clears selection
      announce(t('flowCanvas.selectionCleared'));
    }
  };
  const handleRootPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerCancel?.(event);
    if (connect?.mode === 'pointer') {
      // The system aborted the gesture — drop the pending connection without
      // creating an edge; the ghost edge disappears.
      setConnect(null);
      return;
    }
    const drag = dragState.current;
    if (drag && event.pointerId === drag.pointerId) {
      // The system aborted the gesture — drop the drag without committing
      // (no onNodeMove, no session override); the node snaps back.
      dragState.current = null;
      setLiveDrag(null);
      return;
    }
    const pan = panState.current;
    if (!pan || event.pointerId !== pan.pointerId) return;
    // The system aborted the gesture (palm rejection, OS interruption, pen
    // leaving range) — drop the pan silently. Unlike pointerup, this is not
    // a deliberate click, so it must not clear the selection.
    panState.current = null;
    setIsPanning(false);
  };

  // Viewport + selection-intent keys; later tasks extend this handler with
  // node/edge navigation keys.
  const handleRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    // Only act when the key targets the canvas itself, a node, or an edge —
    // never the consumer's interactive adornment content (e.g. an input
    // inside a node adornment must keep its own keystrokes).
    const targetEl = event.target as HTMLElement;
    const isCanvasKeyTarget =
      targetEl === event.currentTarget ||
      targetEl.hasAttribute('data-flow-node') ||
      targetEl.hasAttribute('data-flow-edge');
    if (!isCanvasKeyTarget) return;
    const { key, ctrlKey, metaKey } = event;
    // Keyboard connect mode swallows every key first — Escape must cancel the
    // connection (not clear the selection), Enter must confirm (not open),
    // and arrows must step the target (not navigate/pan).
    if (connect?.mode === 'keyboard') {
      event.preventDefault();
      if (key === 'Escape') {
        setConnect(null);
        announce(t('flowCanvas.connectCancelled'));
        return;
      }
      if (key === 'Enter') {
        if (connect.target) {
          onEdgeCreate?.(connect.from, connect.target);
          announce(
            t('flowCanvas.connectDone', {
              from: nodeById.get(connect.from)?.label ?? connect.from,
              to: nodeById.get(connect.target)?.label ?? connect.target,
            }),
          );
        }
        setConnect(null);
        return;
      }
      if (key.startsWith('Arrow')) {
        const candidates = new Map<string, Rect>();
        for (const [id, rect] of rects) {
          if (id !== connect.from && isValid(connect.from, id)) candidates.set(id, rect);
        }
        // Navigate among candidates from the current target (or the source —
        // included so the first arrow press has an origin to measure from).
        const sourceRect = rects.get(connect.from);
        if (sourceRect) candidates.set(connect.from, sourceRect);
        const fromId = connect.target ?? connect.from;
        const direction = key.replace('Arrow', '').toLowerCase() as NavDirection;
        const next = nearestInDirection(fromId, candidates, direction);
        if (next && next !== connect.from) {
          setConnect({ ...connect, target: next });
          announce(t('flowCanvas.connectTarget', { label: nodeById.get(next)?.label ?? next }));
        }
        return;
      }
      return; // swallow other keys while connecting
    }
    // Plain C starts keyboard connect mode; ctrl/cmd+C stays the browser's
    // copy shortcut.
    if ((key === 'c' || key === 'C') && !ctrlKey && !metaKey) {
      if (readOnly) return;
      const nodeId =
        targetEl.getAttribute('data-flow-node') ??
        (selection?.type === 'node' ? selection.id : null);
      if (!nodeId) return;
      event.preventDefault();
      setConnect({ from: nodeId, mode: 'keyboard', target: null, cursor: null });
      announce(t('flowCanvas.connectStart', { label: nodeById.get(nodeId)?.label ?? nodeId }));
      return;
    }
    // Shift+Arrow nudges the focused/selected node (checked before ctrl+arrow
    // pan so shift wins when both modifiers are held).
    if (event.shiftKey && key.startsWith('Arrow')) {
      if (readOnly) return;
      const nodeId =
        targetEl.getAttribute('data-flow-node') ??
        (selection?.type === 'node' ? selection.id : null);
      if (!nodeId) return;
      event.preventDefault();
      const node = nodeById.get(nodeId);
      if (!node) return;
      const current = positionOf(node);
      const NUDGE = 8;
      const next = {
        x: current.x + (key === 'ArrowRight' ? NUDGE : key === 'ArrowLeft' ? -NUDGE : 0),
        y: current.y + (key === 'ArrowDown' ? NUDGE : key === 'ArrowUp' ? -NUDGE : 0),
      };
      if (node.position === undefined) {
        setDragOverrides((prev) => new Map(prev).set(nodeId, next));
      }
      onNodeMove?.(nodeId, next);
      announce(t('flowCanvas.nodeMoved', { label: node.label }));
      return;
    }
    if ((ctrlKey || metaKey) && key.startsWith('Arrow')) {
      event.preventDefault();
      // Pan moves the stage opposite to the look direction: ArrowRight looks
      // right, so the stage shifts left (tx decreases).
      if (key === 'ArrowRight') panBy(-PAN_STEP, 0);
      else if (key === 'ArrowLeft') panBy(PAN_STEP, 0);
      else if (key === 'ArrowDown') panBy(0, -PAN_STEP);
      else if (key === 'ArrowUp') panBy(0, PAN_STEP);
      return;
    }
    // Ctrl/Cmd + '+'/'-'/'0' are the browser's page-zoom shortcuts — a WCAG
    // 1.4.4 resize path. Only the plain (unmodified) keys zoom the canvas.
    if (ctrlKey || metaKey) return;
    if (key === '+' || key === '=') {
      event.preventDefault();
      zoomIn();
      return;
    }
    if (key === '-' || key === '_') {
      event.preventDefault();
      zoomOut();
      return;
    }
    if (key === '0') {
      event.preventDefault();
      fitTo(contentBounds);
      return;
    }
    if (key === 'Delete' || key === 'Backspace') {
      if (readOnly || !selection) return;
      event.preventDefault();
      if (selection.type === 'node') onNodeDelete?.(selection.id);
      else onEdgeDelete?.(selection.id);
      return;
    }
    if (key === 'Escape') {
      if (selection) {
        // Layered dismiss: consume the key when the canvas acts on it so a
        // bubble-phase ancestor (a consumer's own overlay/panel keydown
        // handler) doesn't also dismiss; with nothing selected it propagates.
        // Note this library's Modal/Popover listen for Escape on document in
        // the CAPTURE phase, deliberately beating widget-level consumption —
        // inside those, Escape still closes the surface; a consumer who wants
        // Escape-to-deselect within a Modal uses its `disableEscapeClose`.
        event.preventDefault();
        event.stopPropagation();
        setSelection(null);
        announce(t('flowCanvas.selectionCleared'));
      }
      return;
    }
    if (key === 'Enter' || key === ' ') {
      if (!selection) return;
      event.preventDefault();
      // Open stays allowed in readOnly — only create/move/connect/delete are gated.
      if (selection.type === 'node') onNodeOpen?.(selection.id);
      else onEdgeOpen?.(selection.id);
      return;
    }
  };

  // Node/edge presses select immediately; a node press also arms a drag
  // (committed on pointerup only if the pointer actually moved). Re-selects
  // are guarded: useControllableState has no equality check, so re-pressing
  // the current selection would fire onSelectionChange with a fresh object on
  // every click (and twice more per double-click before the open intent).
  const handleNodePointerDown = useCallback(
    (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      const current = selectionRef.current;
      if (!(current?.type === 'node' && current.id === id)) {
        setSelection({ type: 'node', id });
      }
      if (readOnly) return;
      // One drag at a time: a second pointer going down mid-gesture (second
      // finger on this or another node) must not overwrite dragState — that
      // would orphan the first gesture (no commit) and snap it back on the
      // second pointer's tap-release.
      if (dragState.current) return;
      const node = nodeById.get(id);
      if (!node) return;
      const start = node.position ??
        dragOverrides.get(id) ??
        layoutPositions.get(id) ?? { x: 0, y: 0 };
      dragState.current = {
        id,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        position: start,
        moved: false,
      };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* jsdom */
      }
    },
    [setSelection, readOnly, nodeById, dragOverrides, layoutPositions],
  );
  // Dragging from a node's connect handle starts a pointer connection. The
  // ROOT captures the pointer (not the handle) so the move/up stream keeps
  // flowing to the root handlers while the ghost edge tracks the cursor.
  const handleHandlePointerDown = useCallback(
    (id: string, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || readOnly) return;
      setConnect({ from: id, mode: 'pointer', target: null, cursor: null });
      try {
        rootRef.current?.setPointerCapture(event.pointerId);
      } catch {
        /* jsdom */
      }
    },
    [readOnly],
  );
  const handleEdgePointerDown = useCallback(
    (id: string, event: ReactPointerEvent<SVGPathElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      const current = selectionRef.current;
      if (current?.type === 'edge' && current.id === id) return;
      setSelection({ type: 'edge', id });
    },
    [setSelection],
  );
  const handleNodeDoubleClick = useCallback((id: string) => onNodeOpen?.(id), [onNodeOpen]);
  const handleEdgeDoubleClick = useCallback((id: string) => onEdgeOpen?.(id), [onEdgeOpen]);

  /** Client (screen) coordinates → canvas coordinates, inverting the viewport transform. */
  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number): FlowCanvasPoint => {
      const rect = rootRef.current?.getBoundingClientRect();
      const x = (clientX - (rect?.left ?? 0) - viewport.tx) / viewport.z;
      const y = (clientY - (rect?.top ?? 0) - viewport.ty) / viewport.z;
      return { x, y };
    },
    [viewport],
  );

  // Double-click on empty canvas requests a node there. Nodes/edges/chips
  // stopPropagation on their own dblclick, but guard on the target anyway.
  const handleRootDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    onDoubleClick?.(event);
    if (event.defaultPrevented) return;
    if (readOnly || !isBackgroundTarget(event.target)) return;
    onNodeCreate?.(toCanvasPoint(event.clientX, event.clientY));
  };

  const setRootRef = useMemo(() => mergeRefs(rootRef, ref), [ref]);

  return (
    // aria-label before {...rest} so consumers can override it; role/tabIndex
    // after so the application-widget contract survives whatever is spread.
    // Pointer/key/double-click handlers are destructured out of the props and composed:
    // the consumer's handler runs first, and preventDefault() skips the
    // canvas's own gesture handling (except end-of-gesture state cleanup on
    // pointerup/pointercancel, which always runs so a pan can't get stuck).
    <div
      aria-label={t('flowCanvas.canvasLabel')}
      {...rest}
      ref={setRootRef}
      role="application"
      tabIndex={0}
      aria-describedby={mergeAriaDescribedby(ariaDescribedby, instructionsId)}
      className={clsx(styles.root, isPanning && styles.rootPanning, className)}
      onPointerDown={handleRootPointerDown}
      onPointerMove={handleRootPointerMove}
      onPointerUp={handleRootPointerUp}
      onPointerCancel={handleRootPointerCancel}
      onKeyDown={handleRootKeyDown}
      onDoubleClick={handleRootDoubleClick}
    >
      <div
        className={styles.stage}
        data-flow-stage=""
        style={{ transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.z})` }}
      >
        <svg className={styles.edges} aria-hidden={undefined}>
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className={styles.markerFill} />
            </marker>
            <marker
              id={markerActiveId}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className={styles.markerFillActive} />
            </marker>
          </defs>
          {resolvedEdges.map(({ edge, geometry }) => (
            <FlowEdge
              key={edge.id}
              edge={edge}
              geometry={geometry}
              active={selection?.type === 'edge' && selection.id === edge.id}
              markerId={markerId}
              markerActiveId={markerActiveId}
              ariaLabel={t('flowCanvas.edgeLabel', {
                from: nodeById.get(edge.from)?.label ?? edge.from,
                to: nodeById.get(edge.to)?.label ?? edge.to,
              })}
              roleDescription={t('flowCanvas.edgeRole')}
              registerEl={registerEdgeEl}
              onEdgePointerDown={handleEdgePointerDown}
              onEdgeDoubleClick={handleEdgeDoubleClick}
            />
          ))}
          {connect
            ? (() => {
                // Dashed ghost edge for the in-flight connection: source →
                // hovered/stepped target, or the pointer-mode cursor stub.
                const sourceRect = rects.get(connect.from);
                if (!sourceRect) return null;
                const targetRect = connect.target ? rects.get(connect.target) : null;
                const end: Rect = targetRect ?? {
                  x: (connect.cursor?.x ?? sourceRect.x + sourceRect.width + 40) - 1,
                  y: (connect.cursor?.y ?? sourceRect.y) - 1,
                  width: 2,
                  height: 2,
                };
                return <path className={styles.ghostEdge} d={edgeGeometry(sourceRect, end).path} />;
              })()
            : null}
        </svg>
        {resolvedEdges.map(({ edge, geometry }) =>
          edge.label != null ? (
            <div
              key={`chip-${edge.id}`}
              className={styles.chip}
              data-flow-chip={edge.id}
              style={{ left: geometry.midpoint.x, top: geometry.midpoint.y }}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.stopPropagation();
                // Same re-select guard as handleEdgePointerDown.
                if (selection?.type === 'edge' && selection.id === edge.id) return;
                setSelection({ type: 'edge', id: edge.id });
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                onEdgeOpen?.(edge.id);
              }}
            >
              {edge.label}
            </div>
          ) : null,
        )}
        {nodes.map((node) => (
          <FlowNode
            key={node.id}
            node={node}
            position={positionOf(node)}
            selected={selection?.type === 'node' && selection.id === node.id}
            dragging={liveDrag?.id === node.id}
            connectTarget={connect?.target === node.id}
            readOnly={readOnly}
            roleDescription={t('flowCanvas.nodeRole')}
            registerEl={registerNodeEl}
            onNodePointerDown={handleNodePointerDown}
            onNodeDoubleClick={handleNodeDoubleClick}
            onHandlePointerDown={handleHandlePointerDown}
          />
        ))}
      </div>
      <FlowControls onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={() => fitTo(contentBounds)} />
      <div id={instructionsId} className={styles.srOnly}>
        {t('flowCanvas.instructions')}
      </div>
      <div role="status" className={styles.srOnly}>
        <span key={announcement.nonce}>{announcement.text}</span>
      </div>
    </div>
  );
});

FlowCanvas.displayName = 'FlowCanvas';
