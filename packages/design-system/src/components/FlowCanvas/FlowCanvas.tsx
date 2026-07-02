// PLACEHOLDER SKELETON — FlowCanvas is being built task-by-task on this
// branch (see docs/superpowers/plans/2026-07-02-flowcanvas.md). This file
// exists so the structure/manifest meta-tests stay green at every commit;
// Task 8 (static rendering) replaces it with the real implementation.

import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './FlowCanvas.module.scss';
import type { FlowCanvasEdge, FlowCanvasNode } from './types';

/** Props for {@link FlowCanvas}. */
export interface FlowCanvasProps extends HTMLAttributes<HTMLDivElement> {
  /** Nodes (vertices) to render on the canvas. */
  nodes: FlowCanvasNode[];
  /** Directed edges between nodes, referencing node ids. */
  edges: FlowCanvasEdge[];
}

/**
 * Generic node-edge graph editor primitive (pan/zoom canvas, draggable
 * nodes, directed bezier edges, full keyboard parity).
 *
 * @remarks
 * Under construction: this is a placeholder skeleton that accepts the final
 * public data props but renders an empty canvas surface. Rendering and
 * interactions land with the FlowCanvas implementation tasks on this branch.
 * Do not use it in consumer code yet.
 */
export const FlowCanvas = forwardRef<HTMLDivElement, FlowCanvasProps>(function FlowCanvas(
  { nodes: _nodes, edges: _edges, className, ...props },
  ref,
) {
  // {...props} last so the consumer can override anything (pattern A).
  return <div ref={ref} className={clsx(styles.root, className)} {...props} />;
});
