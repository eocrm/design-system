import { useEffect, type RefObject } from 'react';

export type DrawerSide = 'left' | 'right' | 'top' | 'bottom';

export interface UseDragToCloseOptions {
  side: DrawerSide;
  /** When false, the hook attaches no listeners. */
  active: boolean;
  /** Called when the gesture crosses the dismiss threshold. */
  onDismiss: () => void;
  /** Ref to the dialog container; transform is applied here via --drag-translate-x/y. */
  contentRef: RefObject<HTMLElement | null>;
}

const DISTANCE_THRESHOLD = 0.4; // 40% of drawer size
const VELOCITY_THRESHOLD = 0.5; // px/ms in dismiss direction

/**
 * Touch-only drag-to-close gesture. Attaches touch listeners to `headerRef`.
 * During drag, applies `--drag-translate-{x|y}` on the content element and
 * `--drag-opacity` on the parent overlay. On release, dismisses if the
 * gesture crossed the distance OR velocity threshold; otherwise snaps back.
 *
 * Per-side dismiss direction:
 * - right:  positive deltaX (drag right)
 * - left:   negative deltaX (drag left)
 * - top:    negative deltaY (drag up)
 * - bottom: positive deltaY (drag down)
 */
export function useDragToClose(
  headerRef: RefObject<HTMLElement | null>,
  options: UseDragToCloseOptions,
): void {
  const { side, active, onDismiss, contentRef } = options;

  useEffect(() => {
    if (!active) return;
    const header = headerRef.current;
    if (!header) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      dragging = true;
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = performance.now();
    }

    function dismissDelta(deltaX: number, deltaY: number): number {
      switch (side) {
        case 'right':  return Math.max(0, deltaX);
        case 'left':   return Math.max(0, -deltaX);
        case 'top':    return Math.max(0, -deltaY);
        case 'bottom': return Math.max(0, deltaY);
      }
    }

    function applyDragStyles(deltaX: number, deltaY: number) {
      const content = contentRef.current;
      if (!content) return;
      const drawerSize =
        side === 'left' || side === 'right' ? content.offsetWidth : content.offsetHeight;
      const progress = Math.min(1, dismissDelta(deltaX, deltaY) / drawerSize);

      // Per-axis transform (clamped to dismiss direction so drawer doesn't pull off-edge backwards)
      if (side === 'right') {
        content.style.setProperty('--drag-translate-x', `${Math.max(0, deltaX)}px`);
      } else if (side === 'left') {
        content.style.setProperty('--drag-translate-x', `${Math.min(0, deltaX)}px`);
      } else if (side === 'top') {
        content.style.setProperty('--drag-translate-y', `${Math.min(0, deltaY)}px`);
      } else {
        content.style.setProperty('--drag-translate-y', `${Math.max(0, deltaY)}px`);
      }

      const overlay = content.parentElement;
      if (overlay) overlay.style.setProperty('--drag-opacity', String(1 - progress));
    }

    function clearDragStyles() {
      const content = contentRef.current;
      if (!content) return;
      content.style.removeProperty('--drag-translate-x');
      content.style.removeProperty('--drag-translate-y');
      const overlay = content.parentElement;
      if (overlay) overlay.style.removeProperty('--drag-opacity');
    }

    function onTouchMove(e: TouchEvent) {
      if (!dragging) return;
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      applyDragStyles(deltaX, deltaY);
    }

    function onTouchEnd(e: TouchEvent) {
      if (!dragging) return;
      dragging = false;
      const touch = e.changedTouches[0];
      if (!touch) {
        clearDragStyles();
        return;
      }
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const elapsed = Math.max(1, performance.now() - startTime);

      const content = contentRef.current;
      const drawerSize = content
        ? (side === 'left' || side === 'right' ? content.offsetWidth : content.offsetHeight)
        : 0;
      const delta = dismissDelta(deltaX, deltaY);
      const velocity = delta / elapsed;

      const shouldDismiss =
        delta >= drawerSize * DISTANCE_THRESHOLD || velocity >= VELOCITY_THRESHOLD;

      clearDragStyles();
      if (shouldDismiss) onDismiss();
    }

    header.addEventListener('touchstart', onTouchStart, { passive: true });
    header.addEventListener('touchmove', onTouchMove, { passive: true });
    header.addEventListener('touchend', onTouchEnd, { passive: true });
    header.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      header.removeEventListener('touchstart', onTouchStart);
      header.removeEventListener('touchmove', onTouchMove);
      header.removeEventListener('touchend', onTouchEnd);
      header.removeEventListener('touchcancel', onTouchEnd);
      clearDragStyles();
    };
  }, [headerRef, contentRef, side, active, onDismiss]);
}
