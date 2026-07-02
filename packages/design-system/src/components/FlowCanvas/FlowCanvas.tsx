import { forwardRef, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from 'react';
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

  // `_setSelection` is wired up by the interaction tasks (click/focus/Escape).
  const [selection, _setSelection] = useControllableState<FlowCanvasSelection>({
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
        next.set(id, { width: el.offsetWidth, height: el.offsetHeight });
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
    <div
      aria-label={t('flowCanvas.canvasLabel')}
      {...rest}
      ref={setRootRef}
      role="application"
      tabIndex={0}
      aria-describedby={mergeAriaDescribedby(ariaDescribedby, instructionsId)}
      className={clsx(styles.root, className)}
    >
      <div
        className={styles.stage}
        data-flow-stage=""
        style={{ transform: 'translate(0px, 0px) scale(1)' }}
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
      <FlowControls onZoomIn={() => {}} onZoomOut={() => {}} onFit={() => {}} />
      <div id={instructionsId} className={styles.srOnly}>
        {t('flowCanvas.instructions')}
      </div>
      <div role="status" className={styles.srOnly} />
    </div>
  );
});

FlowCanvas.displayName = 'FlowCanvas';
