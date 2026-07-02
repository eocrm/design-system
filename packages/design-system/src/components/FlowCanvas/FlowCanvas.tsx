import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
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
  /** Controlled selection. Use with `onSelectionChange`. */
  selection?: FlowCanvasSelection;
  /** Initial selection when uncontrolled. @default null */
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

  const [selection, setSelection] = useControllableState<FlowCanvasSelection>({
    value: selectionProp,
    defaultValue: defaultSelection,
    onChange: onSelectionChange,
  });

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

  // --- positions: explicit prop > session drag override > auto-layout ------
  // `_setDragOverrides` is wired up by the node-drag task.
  const [dragOverrides, _setDragOverrides] = useState<Map<string, FlowCanvasPoint>>(new Map());
  const layoutPositions = useMemo(() => computeLayout(nodes, edges, sizes), [nodes, edges, sizes]);
  const positionOf = useCallback(
    (node: FlowCanvasNode): FlowCanvasPoint =>
      node.position ?? dragOverrides.get(node.id) ?? layoutPositions.get(node.id) ?? { x: 0, y: 0 },
    [dragOverrides, layoutPositions],
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

  // --- edges: resolve + skip broken ones (one-time dev warning) ------------
  const warnedEdges = useRef(new Set<string>());
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
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
  const [announcement, setAnnouncement] = useState('');
  const announce = useCallback((message: string) => setAnnouncement(message), []);

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
    const pan = panState.current;
    if (!pan || event.pointerId !== pan.pointerId) return;
    // The system aborted the gesture (palm rejection, OS interruption, pen
    // leaving range) — drop the pan silently. Unlike pointerup, this is not
    // a deliberate click, so it must not clear the selection.
    panState.current = null;
    setIsPanning(false);
  };

  // Viewport keys; later tasks extend this handler with node/edge keys.
  const handleRootKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const { key, ctrlKey, metaKey } = event;
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
  };

  // Placeholder handlers — wired up in later tasks.
  const handleNodePointerDown = useCallback(
    (_id: string, _event: ReactPointerEvent<HTMLDivElement>) => {},
    [],
  );
  const handleHandlePointerDown = useCallback(
    (_id: string, _event: ReactPointerEvent<HTMLElement>) => {},
    [],
  );
  const handleEdgePointerDown = useCallback(
    (_id: string, _event: ReactPointerEvent<SVGPathElement>) => {},
    [],
  );
  const handleNodeDoubleClick = useCallback((id: string) => onNodeOpen?.(id), [onNodeOpen]);
  const handleEdgeDoubleClick = useCallback((id: string) => onEdgeOpen?.(id), [onEdgeOpen]);

  const setRootRef = useMemo(() => mergeRefs(rootRef, ref), [ref]);

  return (
    // aria-label before {...rest} so consumers can override it; role/tabIndex
    // after so the application-widget contract survives whatever is spread.
    // Pointer/key handlers are destructured out of the props and composed:
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
        </svg>
        {resolvedEdges.map(({ edge, geometry }) =>
          edge.label != null ? (
            <div
              key={`chip-${edge.id}`}
              className={styles.chip}
              data-flow-chip={edge.id}
              style={{ left: geometry.midpoint.x, top: geometry.midpoint.y }}
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
            dragging={false}
            connectTarget={false}
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
        {announcement}
      </div>
    </div>
  );
});

FlowCanvas.displayName = 'FlowCanvas';
