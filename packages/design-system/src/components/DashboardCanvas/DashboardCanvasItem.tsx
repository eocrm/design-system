import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import type { ContainerRef, DashboardPlacement } from './engine';
import styles from './DashboardCanvas.module.scss';

/** Which resize handle a resize gesture started from. */
export type ResizeEdge = 'e' | 's' | 'se';

/**
 * Gesture wiring handed down from DashboardCanvas to every item, top-level or
 * inside a section. One bag instead of five props so DashboardCanvasSection
 * forwards it untouched.
 */
export interface CanvasGestures {
  readOnly: boolean;
  /** Item currently being moved — its cell renders the drop-preview style. */
  movingId: string | number | null;
  /** Item currently being resized — its cell renders the resize affordance. */
  resizingId: string | number | null;
  /** Item currently keyboard-picked — its cell renders the picked style. */
  pickedId: string | number | null;
  /** id of the visually-hidden keyboard instructions block (aria-describedby). */
  instructionsId: string;
  onMovePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    placement: DashboardPlacement,
    container: ContainerRef,
  ) => void;
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    placement: DashboardPlacement,
    container: ContainerRef,
    edge: ResizeEdge,
  ) => void;
  onItemKeyDown: (
    event: ReactKeyboardEvent<HTMLDivElement>,
    placement: DashboardPlacement,
    container: ContainerRef,
  ) => void;
}

/**
 * Stable (y, then x) render order — matches the engine's own processing
 * order (`compact`/`placeWithPushDown`/`stackOrder`), so DOM order always
 * agrees with visual stacking order (load-bearing below the md breakpoint,
 * Task 5, where DOM order becomes the single-column stack order).
 */
export function sortByPosition(items: readonly DashboardPlacement[]): DashboardPlacement[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

interface DashboardCanvasItemProps {
  placement: DashboardPlacement;
  container: ContainerRef;
  gestures: CanvasGestures;
  children: ReactNode;
}

/**
 * Internal — one grid cell. Stamps the placement as inline custom properties
 * consumed by `.item` in DashboardCanvas.module.scss (Grid.Item precedent).
 * `data-dc-item` is a stable hook for tests/consumers' CSS, independent of
 * the hashed-in-production module class name.
 *
 * In edit mode the whole cell is the move-drag surface, and E/S/SE resize
 * handles overlay the edges. The handles are pointer-only `aria-hidden` divs
 * (not focusable) — keyboard resize is Shift+arrows on the focused cell, so
 * exposing the handles to AT would only add noise. The cell itself is the
 * keyboard editing surface: role=button (named by the widget's own content,
 * FlowNode precedent) with a localized "widget" roledescription.
 */
export function DashboardCanvasItem({
  placement,
  container,
  gestures,
  children,
}: DashboardCanvasItemProps) {
  const t = useTranslation();
  const { id, x, y, w, h } = placement;
  const {
    readOnly,
    movingId,
    resizingId,
    pickedId,
    instructionsId,
    onMovePointerDown,
    onResizePointerDown,
    onItemKeyDown,
  } = gestures;
  return (
    <div
      className={styles.item}
      data-dc-item={String(id)}
      data-dc-drop-preview={movingId === id ? '' : undefined}
      data-dc-resizing={resizingId === id ? '' : undefined}
      data-dc-picked={pickedId === id ? '' : undefined}
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? undefined : 0}
      aria-roledescription={readOnly ? undefined : t('dashboardCanvas.itemRole')}
      aria-describedby={readOnly ? undefined : instructionsId}
      style={{
        ['--dc-col' as string]: `${x + 1} / span ${w}`,
        ['--dc-row' as string]: `${y + 1} / span ${h}`,
        // Task 5's below-md single-column rule reads this to keep the
        // item's own height once `--dc-row` stops being consumed.
        ['--dc-h-span' as string]: `span ${h}`,
      }}
      onPointerDown={readOnly ? undefined : (e) => onMovePointerDown(e, placement, container)}
      onKeyDown={readOnly ? undefined : (e) => onItemKeyDown(e, placement, container)}
    >
      {children}
      {!readOnly && (
        <>
          <div
            className={styles.handleE}
            data-dc-resize="e"
            aria-hidden="true"
            onPointerDown={(e) => onResizePointerDown(e, placement, container, 'e')}
          />
          <div
            className={styles.handleS}
            data-dc-resize="s"
            aria-hidden="true"
            onPointerDown={(e) => onResizePointerDown(e, placement, container, 's')}
          />
          <div
            className={styles.handleSE}
            data-dc-resize="se"
            aria-hidden="true"
            onPointerDown={(e) => onResizePointerDown(e, placement, container, 'se')}
          />
        </>
      )}
    </div>
  );
}
