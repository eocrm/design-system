import { memo } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { EdgeGeometry } from './edgePath';
import type { FlowCanvasEdge } from './types';
import styles from './FlowCanvas.module.scss';

interface FlowEdgeProps {
  edge: FlowCanvasEdge;
  geometry: EdgeGeometry;
  active: boolean; // selected or focused — thicker accent stroke
  markerId: string;
  markerActiveId: string;
  ariaLabel: string;
  roleDescription: string;
  registerEl: (id: string, el: SVGPathElement | null) => void;
  onEdgePointerDown: (id: string, event: ReactPointerEvent<SVGPathElement>) => void;
  onEdgeDoubleClick: (id: string) => void;
}

/** Internal: one edge — visible path plus a wide transparent hit/focus path. */
export const FlowEdge = memo(function FlowEdge({
  edge,
  geometry,
  active,
  markerId,
  markerActiveId,
  ariaLabel,
  roleDescription,
  registerEl,
  onEdgePointerDown,
  onEdgeDoubleClick,
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
    </g>
  );
});
