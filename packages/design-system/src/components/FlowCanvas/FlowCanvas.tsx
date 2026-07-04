import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  FocusEvent as ReactFocusEvent,
  HTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import clsx from 'clsx';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../Button';
import { overlayStack, useFocusTrap, useScrollLock } from '../_internal/overlay';
import { useTranslation } from '../../i18n/useTranslation';
import { mergeAriaDescribedby, mergeRefs, sanitizeId } from '../_internal/refs';
import { useControllableState } from '../_internal/useControllableState';
import { computeLayout, ESTIMATED_NODE_SIZE } from './layout';
import type { NodeSize } from './layout';
import { edgeGeometry, selfLoopGeometry } from './edgePath';
import type { Rect } from './edgePath';
import { nearestInDirection, topLeftMost } from './spatialNav';
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
  /**
   * Consumer-rendered controls shown in a top-left toolbar overlay. Put design-
   * system `<Button>`s here (e.g. an "Add node" button wired to your own state).
   * Stays pinned when the canvas is maximized. @default none
   */
  controls?: ReactNode;
  /**
   * Show the built-in maximize / restore toggle (top-right). Set false to drive
   * maximize entirely via the `maximized` prop. @default true
   */
  maximizeControl?: boolean;
  /** Controlled maximize state. Use with `onMaximizedChange`. */
  maximized?: boolean;
  /** Initial maximize state when uncontrolled. @default false */
  defaultMaximized?: boolean;
  /** Fires whenever maximize is toggled (button, `F` key, or Escape). */
  onMaximizedChange?: (maximized: boolean) => void;
}

/**
 * A pan/zoom canvas for directed node-edge diagrams — the primitive behind
 * visual workflow builders. Nodes are draggable cards with a colored accent
 * bar and an adornment slot; edges are directed bezier curves with an
 * optional mid-edge chip slot. The canvas is events-only: it renders the
 * `nodes`/`edges` you pass and emits intent callbacks (`onNodeCreate`,
 * `onEdgeCreate`, …) — it never mutates data, so wire the callbacks to your
 * own state or server mutations and re-render.
 *
 * Nodes without `position` are auto-laid-out (layered, left → right) and stay
 * draggable for the session. Full keyboard support: arrows rove between
 * nodes, E cycles a node's connections, C starts a keyboard connect mode,
 * Shift+arrows nudge, +/−/0 zoom and fit, Ctrl+arrows pan.
 *
 * @remarks
 * When NOT to use:
 * - Large graphs (100+ nodes) — there is no virtualization; rendering and
 *   auto-layout are O(n·e) per change.
 * - Column/list reordering — use `Kanban` or `Sortable`; this is a 2D canvas,
 *   not a sortable list.
 * - Undirected or free-form drawing (mind maps, whiteboards) — edges here are
 *   directed with arrowheads and the interaction model assumes a digraph.
 * - As the only editing surface for critical flows — keep an accessible
 *   form-based alternative for complex attribute editing; the canvas's inline
 *   surface is selection + spatial arrangement only, editors belong to the
 *   consumer (anchor modals/popovers via the open callbacks).
 * - Rewiring an existing edge's endpoints by dragging — not supported;
 *   delete + recreate instead.
 *
 * @example
 * ```tsx
 * const [nodes, setNodes] = useState<FlowCanvasNode[]>([
 *   { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge>Initial</Badge> },
 *   { id: 'done', label: 'Done', color: '#1F845A' },
 * ]);
 * const [edges, setEdges] = useState<FlowCanvasEdge[]>([
 *   { id: 't1', from: 'open', to: 'done', label: <Badge tone="purple">Guard</Badge> },
 * ]);
 *
 * <div style={{ height: 480 }}>
 *   <FlowCanvas
 *     nodes={nodes}
 *     edges={edges}
 *     onEdgeCreate={(from, to) =>
 *       setEdges((prev) => [...prev, { id: crypto.randomUUID(), from, to }])
 *     }
 *     onNodeMove={(id, position) =>
 *       setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, position } : n)))
 *     }
 *     onNodeOpen={(id) => openStateModal(id)}
 *   />
 * </div>
 * ```
 *
 * @example
 * ```tsx
 * // Read-only diagram (record page): no editing intents, still zoomable.
 * <FlowCanvas nodes={nodes} edges={edges} readOnly aria-label="Deal workflow" />
 * ```
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
    controls,
    maximizeControl = true,
    maximized: maximizedProp,
    defaultMaximized = false,
    onMaximizedChange,
    className,
    'aria-describedby': ariaDescribedby,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeyDown,
    onDoubleClick,
    onBlur,
    onFocusCapture,
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
  const [maximized, setMaximized] = useControllableState<boolean>({
    value: maximizedProp,
    defaultValue: defaultMaximized,
    onChange: onMaximizedChange,
  });
  // Toggle + announce in one place so the button, the F key, and the Escape
  // exit all narrate consistently.
  const setMaximizedAnnounced = (next: boolean) => {
    setMaximized(next);
    announce(t(next ? 'flowCanvas.maximized' : 'flowCanvas.restored'));
  };
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
  // A ref detach for the element that holds focus is EITHER that element
  // unmounting (the consumer applied a delete intent — focus is about to
  // collapse to <body>) OR ref-identity churn on a re-render of a
  // still-focused node/edge (FlowNode/FlowEdge attach inline ref callbacks,
  // so every memo re-render detaches and re-attaches within one commit). The
  // two are indistinguishable here in the mutation phase, so the registers
  // only raise this flag; the post-commit effect below (see "focus reclaim")
  // decides — a churned element still holds focus, a deleted one has lost it.
  const pendingFocusReclaim = useRef(false);
  const flagFocusReclaim = useCallback((el: Element | undefined) => {
    if (el && (el === document.activeElement || el.contains(document.activeElement))) {
      pendingFocusReclaim.current = true;
    }
  }, []);
  const registerNodeEl = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) {
        nodeEls.current.set(id, el);
      } else {
        flagFocusReclaim(nodeEls.current.get(id));
        nodeEls.current.delete(id);
      }
    },
    [flagFocusReclaim],
  );
  const registerEdgeEl = useCallback(
    (id: string, el: SVGPathElement | null) => {
      if (el) {
        edgeEls.current.set(id, el);
      } else {
        flagFocusReclaim(edgeEls.current.get(id));
        edgeEls.current.delete(id);
      }
    },
    [flagFocusReclaim],
  );

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
    /** Pointer that started a pointer-mode draw; null in keyboard mode. */
    pointerId: number | null;
    target: string | null;
    cursor: FlowCanvasPoint | null; // pointer mode ghost end
  } | null>(null);
  // Latest connect gesture, readable from the stable node/edge/handle pointer
  // handlers without taking `connect` as a dependency (same reasoning as
  // `selectionRef` above).
  const connectRef = useRef(connect);
  connectRef.current = connect;

  const defaultIsValid = useCallback(
    (from: string, to: string) => from !== to && !edges.some((e) => e.from === from && e.to === to),
    [edges],
  );
  const isValid = isValidConnection ?? defaultIsValid;

  const nodeAtPoint = useCallback(
    (point: FlowCanvasPoint): string | null => {
      // Reverse iteration matches paint order: later nodes render on top, so
      // when nodes overlap the hit must go to the visually-topmost one.
      for (const [id, rect] of [...rects].reverse()) {
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

  // Commit-time revalidation: `connect.target` was validated when it was
  // LAST SET (pointer move / arrow step), but the graph is live props — the
  // consumer can remove either node or add an identical edge between then
  // and the commit (pointerup / Enter). Re-checking here keeps the same
  // invariant as the derived selection above: intents never fire with ids
  // that are not in (or no longer valid against) the current graph.
  const canCommitConnect = (from: string, to: string): boolean =>
    nodeById.has(from) && nodeById.has(to) && isValid(from, to);

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

  // Explicit svg box spanning the full content extent: the default SVG box
  // is 300x150 and some engines (historically WebKit) hit-test SVG children
  // unreliably outside the element's box — any multi-rank layout exceeds the
  // default, and dragged/consumer positions can go negative. The box is
  // anchored at the (clamped-to-zero) minimum via left/top, with a viewBox
  // starting at the same origin so child path coordinates stay plain canvas
  // coordinates. The margin absorbs arrowheads, self-loops, and pair bows.
  const svgExtent = useMemo(() => {
    const MARGIN = 64;
    if (!contentBounds) return { x: 0, y: 0, width: 1, height: 1 };
    const x = Math.min(0, contentBounds.x) - MARGIN;
    const y = Math.min(0, contentBounds.y) - MARGIN;
    return {
      x,
      y,
      width: Math.max(1, contentBounds.x + contentBounds.width + MARGIN - x),
      height: Math.max(1, contentBounds.y + contentBounds.height + MARGIN - y),
    };
  }, [contentBounds]);

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

  // Any pointer press elsewhere on the canvas visibly abandons an in-flight
  // KEYBOARD connect: without this, the ghost edge stays pinned after the
  // user clicks/drags other nodes, arrows keep stepping the stale target, and
  // Enter would create an edge from the long-forgotten source. Reads through
  // `connectRef` so the stable node/edge handlers can call it without
  // re-rendering every memoized node when the connect state changes.
  // (Pointer-mode connects are unaffected — they end with their own pointer.)
  const cancelKeyboardConnect = useCallback(() => {
    if (connectRef.current?.mode !== 'keyboard') return;
    setConnect(null);
    announce(t('flowCanvas.connectCancelled'));
  }, [announce, t]);

  // Consumer handlers (composed below) run before the canvas's own gesture
  // handling; `event.preventDefault()` in a consumer handler opts out of it.
  const handleRootPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || !isBackgroundTarget(event.target)) return;
    cancelKeyboardConnect(); // pressing empty canvas abandons a keyboard connect
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
    // Only the pointer that started the draw moves the ghost — a second
    // finger's moves fall through to the drag/pan branches below (same
    // pointerId discipline as `dragState`/`panState`).
    if (connect?.mode === 'pointer' && event.pointerId === connect.pointerId) {
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
    // Only the drawing pointer's release ends the connection — a second
    // finger lifting must neither commit nor cancel it (it falls through to
    // its own drag/pan cleanup below).
    if (connect?.mode === 'pointer' && event.pointerId === connect.pointerId) {
      // End-of-gesture cleanup always runs (like drag/pan below); the create
      // intent honors a consumer's preventDefault() the same way the drag
      // commit does, and revalidates against the live graph (the target was
      // only known-valid when the pointer last moved).
      if (
        connect.target &&
        !event.defaultPrevented &&
        canCommitConnect(connect.from, connect.target)
      ) {
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
      const node = nodeById.get(drag.id);
      // Commit-time revalidation, same as connect/Delete/Enter intents: a
      // node deleted mid-drag must not emit onNodeMove with a dead id.
      if (drag.moved && !event.defaultPrevented && node) {
        // Fold in any final movement carried by the pointerup itself, at the
        // current zoom — the same per-segment conversion as the move handler.
        const position = {
          x: drag.position.x + (event.clientX - drag.lastClientX) / viewport.z,
          y: drag.position.y + (event.clientY - drag.lastClientY) / viewport.z,
        };
        if (node.position === undefined) {
          // Session-local arrangement for auto-laid-out nodes.
          setDragOverrides((prev) => new Map(prev).set(drag.id, position));
        }
        onNodeMove?.(drag.id, position);
        announce(t('flowCanvas.nodeMoved', { label: node.label }));
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
    if (connect?.mode === 'pointer' && event.pointerId === connect.pointerId) {
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

  // --- roving focus: spatial arrows, Home/End, E edge cycling --------------
  // The in-flight E-cycle: which node's edges are being cycled and where the
  // cycle stands. Any node focus (arrow, Home/End, click) resets it.
  const edgeCycle = useRef<{ nodeId: string; index: number } | null>(null);

  // Keyboard focus must never rely on native focus-scrolling: the
  // overflow:hidden root is still a scroll container, so a browser
  // scroll-into-view would silently offset root.scrollLeft/Top and desync
  // the dot-grid and all pointer→canvas math from the transform-based
  // viewport. Focus calls pass preventScroll and reveal via the viewport
  // transform instead — panning just enough to bring the rect fully into
  // view (with padding so the focus ring isn't clipped at the edge).
  const REVEAL_PAD = 24;
  const revealRect = useCallback(
    (rect: Rect) => {
      const rootRect = rootRef.current?.getBoundingClientRect();
      if (!rootRect || rootRect.width === 0 || rootRect.height === 0) return;
      const { tx, ty, z } = viewport;
      const left = rect.x * z + tx;
      const top = rect.y * z + ty;
      const right = (rect.x + rect.width) * z + tx;
      const bottom = (rect.y + rect.height) * z + ty;
      let dx = 0;
      let dy = 0;
      if (right > rootRect.width) dx = rootRect.width - REVEAL_PAD - right;
      if (left + dx < 0) dx = REVEAL_PAD - left; // left/top win for over-wide rects
      if (bottom > rootRect.height) dy = rootRect.height - REVEAL_PAD - bottom;
      if (top + dy < 0) dy = REVEAL_PAD - top;
      if (dx !== 0 || dy !== 0) panBy(dx, dy);
    },
    [viewport, panBy],
  );

  const focusNode = useCallback(
    (id: string) => {
      const el = nodeEls.current.get(id);
      if (!el) return;
      edgeCycle.current = null;
      el.focus({ preventScroll: true });
      const rect = rects.get(id);
      if (rect) revealRect(rect);
      const index = nodes.findIndex((n) => n.id === id);
      announce(
        t('flowCanvas.nodeFocused', {
          label: nodeById.get(id)?.label ?? id,
          index: index + 1,
          total: nodes.length,
        }),
      );
    },
    [nodes, nodeById, announce, t, rects, revealRect],
  );

  const focusEdge = useCallback(
    (id: string, index: number, total: number) => {
      const el = edgeEls.current.get(id);
      if (!el) return;
      el.focus({ preventScroll: true });
      const resolved = resolvedEdges.find((r) => r.edge.id === id);
      if (resolved) {
        // Reveal around the midpoint — where the focus highlight and the
        // label chip sit — rather than the edge's full bounding box, which
        // for a long edge could exceed the viewport and force a max zoom-out.
        const { midpoint } = resolved.geometry;
        revealRect({ x: midpoint.x - 20, y: midpoint.y - 20, width: 40, height: 40 });
      }
      const edge = edges.find((e) => e.id === id);
      if (edge) {
        announce(
          t('flowCanvas.edgeFocused', {
            from: nodeById.get(edge.from)?.label ?? edge.from,
            to: nodeById.get(edge.to)?.label ?? edge.to,
            index,
            total,
          }),
        );
      }
    },
    [edges, nodeById, announce, t, resolvedEdges, revealRect],
  );

  // Focus reclaim: when the focused node/edge unmounts (the consumer applied
  // a delete intent), the browser drops focus to <body> — the keyboard user
  // is silently ejected from the application widget. The registers flag that
  // unregister; this post-commit effect returns focus to the canvas root and
  // announces the move. No dependency array — the flag can only be raised
  // during a commit, and the check costs a ref read.
  useEffect(() => {
    if (!pendingFocusReclaim.current) return;
    pendingFocusReclaim.current = false;
    const active = document.activeElement;
    // Focus still on a live element? Then the detach was ref-identity churn
    // on a re-render (the node/edge kept focus), or the consumer already
    // moved focus deliberately (e.g. into a confirm dialog) — don't steal it.
    // (`isConnected` guards jsdom, which can leave activeElement detached.)
    if (
      active &&
      active !== document.body &&
      active !== document.documentElement &&
      active.isConnected
    ) {
      return;
    }
    const root = rootRef.current;
    if (!root || !root.isConnected) return; // the whole canvas unmounted
    root.focus({ preventScroll: true });
    announce(t('flowCanvas.focusReturned'));
  });

  // Viewport, roving-focus, and selection-intent keys.
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
    // Escape also aborts an in-flight pointer draw (spec: "Esc/miss
    // cancels"). Dropping the connect state makes the gesture's eventual
    // pointerup a no-op — its connect branch matches on the stored state,
    // which is gone.
    if (connect?.mode === 'pointer' && key === 'Escape') {
      event.preventDefault();
      // Layered dismiss, same as the selection-clearing Escape below: this
      // Escape is consumed here; a consumer's own bubble-phase Escape
      // handler (panel/overlay) must not co-fire on a mere gesture cancel.
      event.stopPropagation();
      setConnect(null);
      announce(t('flowCanvas.connectCancelled'));
      return;
    }
    // Keyboard connect mode swallows every key first — Escape must cancel the
    // connection (not clear the selection), Enter must confirm (not open),
    // and arrows must step the target (not navigate/pan).
    if (connect?.mode === 'keyboard') {
      if (key === 'Tab') {
        // Never a keyboard trap (WCAG 2.1.2): let Tab move focus out
        // untouched; the focus-out handler cancels the connect (and
        // announces) once focus actually leaves the canvas.
        return;
      }
      if (ctrlKey || metaKey) {
        if (key.startsWith('Arrow')) {
          // The instructions promise Ctrl/Cmd+Arrow pans — keep that true
          // mid-connect too (same directions as the main pan branch).
          event.preventDefault();
          if (key === 'ArrowRight') panBy(-PAN_STEP, 0);
          else if (key === 'ArrowLeft') panBy(PAN_STEP, 0);
          else if (key === 'ArrowDown') panBy(0, -PAN_STEP);
          else if (key === 'ArrowUp') panBy(0, PAN_STEP);
          return;
        }
        // Other modifier combos stay the browser's: page zoom (ctrl +/-/0,
        // WCAG 1.4.4), copy, etc. — same carve-out the plain keys make.
        return;
      }
      event.preventDefault();
      if (key === 'Escape') {
        // Layered dismiss — see the pointer-draw Escape above.
        event.stopPropagation();
        setConnect(null);
        // The arrow-step reveals may have panned the (still-focused) source
        // off-screen; bring its focus ring back into view on exit.
        const sourceRect = rects.get(connect.from);
        if (sourceRect) revealRect(sourceRect);
        announce(t('flowCanvas.connectCancelled'));
        return;
      }
      if (key === 'Enter') {
        // Same commit-time revalidation as pointerup: the target was only
        // known-valid when the last arrow press set it.
        if (connect.target && canCommitConnect(connect.from, connect.target)) {
          onEdgeCreate?.(connect.from, connect.target);
          announce(
            t('flowCanvas.connectDone', {
              from: nodeById.get(connect.from)?.label ?? connect.from,
              to: nodeById.get(connect.target)?.label ?? connect.target,
            }),
          );
        } else {
          // No target picked (or the graph changed under the gesture): the
          // mode still ends, and that must be audible — Escape parity. A
          // silent exit would leave a screen-reader user pressing arrows
          // that now navigate/pan instead of stepping targets.
          announce(t('flowCanvas.connectCancelled'));
        }
        setConnect(null);
        // Focus stayed on the source throughout the gesture — reveal it, as
        // on Escape, in case target-stepping panned it off-screen.
        const exitRect = rects.get(connect.from);
        if (exitRect) revealRect(exitRect);
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
        let next = nearestInDirection(fromId, candidates, direction);
        if (next === connect.from) {
          // The source is not a valid target but can sit between targets
          // (A — S — B: stepping left from B hits S first). Hop over it by
          // re-measuring from the source's rect in the same direction —
          // nearestInDirection excludes the cursor id, so this terminates.
          next = nearestInDirection(connect.from, candidates, direction);
        }
        if (next && next !== connect.from) {
          setConnect({ ...connect, target: next });
          // Same pan-to-reveal invariant as roving focus: a zoomed-in
          // keyboard user must see the target ring, and zoom keys are
          // swallowed while connecting.
          const targetRect = candidates.get(next);
          if (targetRect) revealRect(targetRect);
          announce(t('flowCanvas.connectTarget', { label: nodeById.get(next)?.label ?? next }));
        } else {
          // Nothing valid that way — say so; a silent no-op reads as a
          // dead keyboard to a screen-reader user mid-connect.
          announce(t('flowCanvas.connectNoTarget'));
        }
        return;
      }
      return; // swallow other keys while connecting
    }
    // Plain C starts keyboard connect mode; ctrl/cmd+C stays the browser's
    // copy shortcut.
    if ((key === 'c' || key === 'C') && !ctrlKey && !metaKey) {
      if (readOnly) return;
      // One gesture at a time (mirror of handleHandlePointerDown's guard):
      // C mid-pointer-draw must not replace the in-flight draw with a
      // keyboard connect — the discarded drag would turn its eventual
      // pointerup into a silent no-op.
      if (connect?.mode === 'pointer') return;
      const nodeId =
        targetEl.getAttribute('data-flow-node') ??
        (selection?.type === 'node' ? selection.id : null);
      if (!nodeId) return;
      event.preventDefault();
      setConnect({ from: nodeId, mode: 'keyboard', pointerId: null, target: null, cursor: null });
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
      // Keep the pan-to-reveal invariant: repeated nudges must not push the
      // focused node (and its focus ring) out of the viewport.
      const size = rects.get(nodeId);
      if (size) revealRect({ x: next.x, y: next.y, width: size.width, height: size.height });
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
    // Everything below acts on the FOCUSED node/edge when there is one, and
    // falls back to the selection (the two are normally in sync via
    // selection-follows-focus — belt and braces).
    const focusedNodeId = targetEl.getAttribute('data-flow-node');
    const focusedEdgeId = targetEl.getAttribute('data-flow-edge');
    // Plain arrows rove focus spatially (nudge/pan/connect arrows returned above).
    if (key.startsWith('Arrow')) {
      event.preventDefault();
      if (focusedEdgeId) {
        // Any arrow on an edge returns to a node: the E-cycle's origin when
        // the cycle belongs to this edge (also right for incoming edges);
        // otherwise — an edge focused by pointer click has no cycle, and a
        // cycle left over from an unrelated node is stale — the edge's source.
        const edge = edges.find((e) => e.id === focusedEdgeId);
        const cycleOrigin = edgeCycle.current?.nodeId;
        const originId =
          edge && cycleOrigin != null && (edge.from === cycleOrigin || edge.to === cycleOrigin)
            ? cycleOrigin
            : edge?.from;
        if (originId) {
          focusNode(originId);
          return;
        }
      }
      const direction = key.replace('Arrow', '').toLowerCase() as NavDirection;
      if (!focusedNodeId) {
        // Resume roving where the user left off: a selected node (e.g. after
        // tabbing out to the zoom controls and back) beats the top-left
        // default — Enter/Delete already fall back to the selection the
        // same way.
        const first =
          selection?.type === 'node' && rects.has(selection.id) ? selection.id : topLeftMost(rects);
        if (first) focusNode(first);
        return;
      }
      const next = nearestInDirection(focusedNodeId, rects, direction);
      if (next) focusNode(next);
      return;
    }
    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      const target = key === 'Home' ? nodes[0] : nodes[nodes.length - 1];
      if (target) focusNode(target.id);
      return;
    }
    // E cycles through the origin node's edges (outgoing first, then
    // incoming); pressing E on a focused edge steps to the next one.
    if (key === 'e' || key === 'E') {
      // Origin resolution on a focused edge applies the arrow branch's
      // staleness rule: the E-cycle only counts when it belongs to this edge
      // (its origin is the edge's from/to) — a cycle left over from an
      // unrelated node must not hijack the key. Otherwise (click-focused
      // edge, no cycle or a stale one) the edge's source is the origin.
      const focusedEdge = focusedEdgeId ? edges.find((e) => e.id === focusedEdgeId) : undefined;
      const cycleOrigin = edgeCycle.current?.nodeId;
      const cycleOwnsFocusedEdge =
        focusedEdge != null &&
        cycleOrigin != null &&
        (focusedEdge.from === cycleOrigin || focusedEdge.to === cycleOrigin);
      const originId =
        focusedNodeId ??
        (focusedEdge ? (cycleOwnsFocusedEdge ? cycleOrigin : focusedEdge.from) : cycleOrigin);
      if (!originId) return;
      event.preventDefault();
      // Cycle only over rendered edges: a broken edge (skipped from rendering
      // for referencing a missing node) has no element to focus, so cycling
      // onto it would be a silent dead E press.
      const renderable = new Set(resolvedEdges.map((r) => r.edge.id));
      const attached = [
        ...edges.filter((e) => e.from === originId),
        ...edges.filter((e) => e.to === originId && e.from !== originId),
      ].filter((e) => renderable.has(e.id));
      if (attached.length === 0) return;
      // A cycle left over from another node (focus moved by click, not
      // focusNode) must restart at 0, not resume that node's index.
      const index =
        edgeCycle.current?.nodeId === originId
          ? (edgeCycle.current.index + 1) % attached.length
          : 0;
      edgeCycle.current = { nodeId: originId, index };
      focusEdge(attached[index].id, index + 1, attached.length);
      return;
    }
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
    if ((key === 'f' || key === 'F') && !ctrlKey && !metaKey) {
      // Maximize works in readOnly too (viewing a large graph fullscreen is valid).
      event.preventDefault();
      setMaximizedAnnounced(!maximized);
      return;
    }
    if (key === 'Delete' || key === 'Backspace') {
      if (readOnly) return;
      const target =
        focusedNodeId != null
          ? ({ type: 'node', id: focusedNodeId } as const)
          : focusedEdgeId != null
            ? ({ type: 'edge', id: focusedEdgeId } as const)
            : selection;
      if (!target) return;
      event.preventDefault();
      if (target.type === 'node') onNodeDelete?.(target.id);
      else onEdgeDelete?.(target.id);
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
        return;
      }
      // No selection: exit maximize, unless an open floating surface (a
      // consumer DropdownMenu/Popover) is claiming this press (#274).
      if (
        maximized &&
        !overlayStack.hasOpenFloating() &&
        !overlayStack.wasEscapeConsumed(event.nativeEvent)
      ) {
        event.preventDefault();
        event.stopPropagation();
        setMaximizedAnnounced(false);
      }
      return;
    }
    if (key === 'Enter' || key === ' ') {
      const target =
        focusedNodeId != null
          ? ({ type: 'node', id: focusedNodeId } as const)
          : focusedEdgeId != null
            ? ({ type: 'edge', id: focusedEdgeId } as const)
            : selection;
      if (!target) return;
      event.preventDefault();
      // Open stays allowed in readOnly — only create/move/connect/delete are gated.
      if (target.type === 'node') onNodeOpen?.(target.id);
      else onEdgeOpen?.(target.id);
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
      cancelKeyboardConnect(); // the user visibly moved on to another node
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
    [setSelection, cancelKeyboardConnect, readOnly, nodeById, dragOverrides, layoutPositions],
  );
  // Dragging from a node's connect handle starts a pointer connection. The
  // ROOT captures the pointer (not the handle) so the move/up stream keeps
  // flowing to the root handlers while the ghost edge tracks the cursor.
  const handleHandlePointerDown = useCallback(
    (id: string, event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || readOnly) return;
      // One draw at a time (matching the drag guard): a second pointer
      // grabbing a handle mid-draw must not hijack the first ghost. A
      // keyboard connect, by contrast, is superseded by the new draw.
      if (connectRef.current?.mode === 'pointer') return;
      setConnect({
        from: id,
        mode: 'pointer',
        pointerId: event.pointerId,
        target: null,
        cursor: null,
      });
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
      cancelKeyboardConnect(); // the user visibly moved on to an edge
      const current = selectionRef.current;
      if (current?.type === 'edge' && current.id === id) return;
      setSelection({ type: 'edge', id });
    },
    [setSelection, cancelKeyboardConnect],
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

  // Keyboard connect must not outlive focus: if focus leaves the canvas
  // entirely, the mode would persist invisibly — the ghost edge stays pinned
  // and a later Enter would still create an edge from the forgotten source.
  // Focus moves WITHIN the canvas (root ↔ node ↔ adornment) keep it alive.
  // React's onBlur is backed by the bubbling focusout event, so node blurs
  // reach this root handler. (focusout is not cancelable, so there is no
  // preventDefault opt-out here.)
  const handleRootBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    onBlur?.(event);
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    cancelKeyboardConnect();
  };

  // Selection follows focus: focusing a node/edge (roving arrows, E cycling,
  // or a browser click-focus) selects it, keeping the two in sync. Re-selects
  // are guarded like the pointer handlers — useControllableState has no
  // equality check, so an unguarded set would re-fire onSelectionChange with
  // a fresh object every time focus lands on the already-selected element.
  const handleRootFocusCapture = (event: ReactFocusEvent<HTMLDivElement>) => {
    onFocusCapture?.(event);
    const el = event.target as HTMLElement;
    const nodeId = el.getAttribute?.('data-flow-node');
    const edgeId = el.getAttribute?.('data-flow-edge');
    const current = selectionRef.current;
    if (nodeId && !(current?.type === 'node' && current.id === nodeId)) {
      setSelection({ type: 'node', id: nodeId });
    } else if (edgeId && !(current?.type === 'edge' && current.id === edgeId)) {
      setSelection({ type: 'edge', id: edgeId });
    }
  };

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
      className={clsx(
        styles.root,
        isPanning && styles.rootPanning,
        maximized && styles.rootMaximized,
        className,
      )}
      data-flowcanvas-maximized={maximized ? '' : undefined}
      onPointerDown={handleRootPointerDown}
      onPointerMove={handleRootPointerMove}
      onPointerUp={handleRootPointerUp}
      onPointerCancel={handleRootPointerCancel}
      onKeyDown={handleRootKeyDown}
      onDoubleClick={handleRootDoubleClick}
      onBlur={handleRootBlur}
      onFocusCapture={handleRootFocusCapture}
    >
      <div
        className={styles.stage}
        data-flow-stage=""
        style={{ transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.z})` }}
      >
        {/* NOT aria-hidden: the child hit-paths are the focusable edges —
            hiding the svg would strip every edge out of the a11y tree. */}
        <svg
          className={styles.edges}
          style={{ left: svgExtent.x, top: svgExtent.y }}
          width={svgExtent.width}
          height={svgExtent.height}
          viewBox={`${svgExtent.x} ${svgExtent.y} ${svgExtent.width} ${svgExtent.height}`}
        >
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
                cancelKeyboardConnect(); // same abandon rule as handleEdgePointerDown
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
      {controls != null ? (
        // data-flow-controls: background-pan hit-testing skips this subtree, so
        // pressing a control never starts a canvas pan (same carve-out as the
        // zoom cluster).
        <div
          className={styles.controlsTopLeft}
          data-flow-controls=""
          role="toolbar"
          aria-label={t('flowCanvas.controlsLabel')}
        >
          {controls}
        </div>
      ) : null}
      {maximizeControl ? (
        <div className={styles.controlsTopRight} data-flow-controls="">
          <Button
            variant="secondary"
            size="sm"
            iconOnly
            aria-label={t(maximized ? 'flowCanvas.exitFullscreen' : 'flowCanvas.enterFullscreen')}
            aria-pressed={maximized}
            onClick={() => setMaximizedAnnounced(!maximized)}
          >
            {maximized ? (
              <Minimize2 size={16} aria-hidden="true" />
            ) : (
              <Maximize2 size={16} aria-hidden="true" />
            )}
          </Button>
        </div>
      ) : null}
      <div id={instructionsId} className={styles.srOnly}>
        {/* readOnly gets its own cheat-sheet: describing Delete/move/connect
            on a canvas where those keys are inert would contradict behavior. */}
        {t(readOnly ? 'flowCanvas.instructionsReadOnly' : 'flowCanvas.instructions')}
      </div>
      <div role="status" className={styles.srOnly}>
        <span key={announcement.nonce}>{announcement.text}</span>
      </div>
    </div>
  );
});

FlowCanvas.displayName = 'FlowCanvas';
