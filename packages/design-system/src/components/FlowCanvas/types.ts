import type { ReactNode } from 'react';

/** A point in canvas coordinates (px at zoom 1, origin at the stage's top-left). */
export interface FlowCanvasPoint {
  /** Horizontal offset in canvas units. */
  x: number;
  /** Vertical offset in canvas units. */
  y: number;
}

/** One node (vertex) on the canvas. */
export interface FlowCanvasNode {
  /** Stable unique id. Referenced by edges and every intent callback. */
  id: string;
  /**
   * Plain-text label rendered inside the node. Also used verbatim for
   * screen-reader announcements — keep it human-readable.
   */
  label: string;
  /**
   * Accent color for the node's left bar as a CSS color (typically `#RRGGBB`).
   * Defaults to the accent token when omitted.
   */
  color?: string;
  /**
   * Position in canvas coordinates. When omitted the node is auto-laid-out
   * (layered, left → right) and remains user-draggable for the session.
   */
  position?: FlowCanvasPoint;
  /**
   * Slot rendered after the label — badges, icons, counters. Not announced to
   * screen readers; keep essential state in `label` or the consumer's own UI.
   */
  adornment?: ReactNode;
}

/** One directed edge between two nodes. */
export interface FlowCanvasEdge {
  /** Stable unique id. Referenced by selection and intent callbacks. */
  id: string;
  /** Source node id. */
  from: string;
  /** Target node id. */
  to: string;
  /**
   * Slot rendered as a chip at the edge midpoint (e.g. a "Guard" badge).
   * Not announced to screen readers.
   */
  label?: ReactNode;
}

/** Current single selection: a node, an edge, or nothing. */
export type FlowCanvasSelection = { type: 'node' | 'edge'; id: string } | null;
