import { memo } from 'react';
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import type { FlowCanvasNode, FlowCanvasPoint } from './types';
import styles from './FlowCanvas.module.scss';

interface FlowNodeProps {
  node: FlowCanvasNode;
  position: FlowCanvasPoint;
  selected: boolean;
  dragging: boolean;
  connectTarget: boolean;
  /** Whether connecting is enabled — gates the connect handle. */
  canConnect: boolean;
  roleDescription: string;
  registerEl: (id: string, el: HTMLDivElement | null) => void;
  onNodePointerDown: (id: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onNodeDoubleClick: (id: string, event: ReactMouseEvent<HTMLDivElement>) => void;
  onHandlePointerDown: (id: string, event: ReactPointerEvent<HTMLElement>) => void;
}

/** Internal: one node card. Positioned absolutely on the stage. */
export const FlowNode = memo(function FlowNode({
  node,
  position,
  selected,
  dragging,
  connectTarget,
  canConnect,
  roleDescription,
  registerEl,
  onNodePointerDown,
  onNodeDoubleClick,
  onHandlePointerDown,
}: FlowNodeProps) {
  const style: CSSProperties = { left: position.x, top: position.y };
  if (node.color) (style as Record<string, string | number>)['--flow-node-color'] = node.color;
  return (
    // role=button: activatable via Enter (open); roledescription localizes "node".
    <div
      ref={(el) => registerEl(node.id, el)}
      role="button"
      tabIndex={-1}
      aria-roledescription={roleDescription}
      aria-label={node.label}
      data-flow-node={node.id}
      data-selected={selected || undefined}
      data-dragging={dragging || undefined}
      data-connect-target={connectTarget || undefined}
      className={styles.node}
      style={style}
      onPointerDown={(event) => onNodePointerDown(node.id, event)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onNodeDoubleClick(node.id, event);
      }}
    >
      <span className={styles.nodeLabel}>{node.label}</span>
      {node.adornment != null ? <span>{node.adornment}</span> : null}
      {canConnect ? (
        <span
          aria-hidden="true"
          className={styles.handle}
          data-flow-handle=""
          onPointerDown={(event) => {
            event.stopPropagation();
            onHandlePointerDown(node.id, event);
          }}
        />
      ) : null}
    </div>
  );
});
