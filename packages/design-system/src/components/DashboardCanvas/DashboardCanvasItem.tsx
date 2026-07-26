import type { ReactNode } from 'react';
import type { DashboardPlacement } from './engine';
import styles from './DashboardCanvas.module.scss';

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
  children: ReactNode;
}

/**
 * Internal — one grid cell. Stamps the placement as inline custom properties
 * consumed by `.item` in DashboardCanvas.module.scss (Grid.Item precedent).
 * `data-dc-item` is a stable hook for tests/consumers' CSS, independent of
 * the hashed-in-production module class name.
 */
export function DashboardCanvasItem({ placement, children }: DashboardCanvasItemProps) {
  const { id, x, y, w, h } = placement;
  return (
    <div
      className={styles.item}
      data-dc-item={String(id)}
      style={{
        ['--dc-col' as string]: `${x + 1} / span ${w}`,
        ['--dc-row' as string]: `${y + 1} / span ${h}`,
        // Task 5's below-md single-column rule reads this to keep the
        // item's own height once `--dc-row` stops being consumed.
        ['--dc-h-span' as string]: `span ${h}`,
      }}
    >
      {children}
    </div>
  );
}
