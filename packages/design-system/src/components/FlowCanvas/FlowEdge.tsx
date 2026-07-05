import { memo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { EdgeGeometry } from './edgePath';
import type { FlowCanvasEdge } from './types';
import styles from './FlowCanvas.module.scss';

interface FlowEdgeProps {
  edge: FlowCanvasEdge;
  geometry: EdgeGeometry;
  active: boolean; // selected or focused — thicker accent stroke
  /** When true (and `active`), render draggable source/target rewire handles. */
  editable: boolean;
  markerId: string;
  markerActiveId: string;
  ariaLabel: string;
  roleDescription: string;
  registerEl: (id: string, el: SVGPathElement | null) => void;
  onEdgePointerDown: (id: string, event: ReactPointerEvent<SVGPathElement>) => void;
  onEdgeDoubleClick: (id: string) => void;
  onEndpointPointerDown: (
    edgeId: string,
    end: 'source' | 'target',
    event: ReactPointerEvent<SVGCircleElement>,
  ) => void;
}

/** Internal: one edge — visible path plus a wide transparent hit/focus path. */
export const FlowEdge = memo(function FlowEdge({
  edge,
  geometry,
  active,
  editable,
  markerId,
  markerActiveId,
  ariaLabel,
  roleDescription,
  registerEl,
  onEdgePointerDown,
  onEdgeDoubleClick,
  onEndpointPointerDown,
}: FlowEdgeProps) {
  return (
    <g>
      <path
        className={styles.edgePath}
        d={geometry.path}
        data-active={active || undefined}
        markerEnd={`url(#${active ? markerActiveId : markerId})`}
      />
      <path
        ref={(el) => registerEl(edge.id, el)}
        className={styles.edgeHit}
        d={geometry.path}
        role="button"
        tabIndex={-1}
        aria-roledescription={roleDescription}
        aria-label={ariaLabel}
        data-flow-edge={edge.id}
        onPointerDown={(event) => onEdgePointerDown(edge.id, event)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onEdgeDoubleClick(edge.id);
        }}
      />
      {/* Rewire handles: a visible dot (.endpoint, pointer-events: none) plus a
          wider transparent hit circle (.endpointHit) that takes the pointer. */}
      {active && editable
        ? (['source', 'target'] as const).flatMap((end) => [
            <circle
              key={end}
              className={styles.endpoint}
              data-flow-edge-endpoint={end}
              cx={geometry[end].x}
              cy={geometry[end].y}
              r={4}
            />,
            <circle
              key={`hit-${end}`}
              className={styles.endpointHit}
              data-flow-edge-endpoint-hit={end}
              cx={geometry[end].x}
              cy={geometry[end].y}
              r={12}
              onPointerDown={(event) => onEndpointPointerDown(edge.id, end, event)}
            />,
          ])
        : null}
    </g>
  );
});
