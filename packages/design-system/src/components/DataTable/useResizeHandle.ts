import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface UseResizeHandleOptions {
  initialWidth: number;
  minWidth: number;
  maxWidth?: number;
  onResize: (nextWidth: number) => void;
}

interface ResizeHandleApi {
  isResizing: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
}

/**
 * Pointer-based resize-handle hook. Attach `onPointerDown` to the handle
 * element. While dragging, `pointermove` on window fires `onResize` with
 * the clamped width; `pointerup` / `pointercancel` ends the drag.
 *
 * `initialWidth` is captured at pointerdown — callers don't need to keep
 * it in sync between events (the hook holds the start width internally).
 *
 * @remarks
 * **When NOT to use / anti-patterns**
 *
 * - Do not use this hook outside of a column-resize context. It is
 *   purpose-built for DataTable header cells and assumes a horizontal
 *   drag interaction with a fixed start width.
 * - Do not wire `onPointerDown` to a full cell — only the narrow resize
 *   handle element. Attaching it to the whole header cell will intercept
 *   sort clicks and other cell interactions.
 * - Do not rely on `setPointerCapture` being functional in all
 *   environments (it is best-effort / no-op in jsdom). The hook falls
 *   back to window-level listeners for cross-browser reliability.
 */
export function useResizeHandle(options: UseResizeHandleOptions): ResizeHandleApi {
  const { minWidth, maxWidth, onResize } = options;
  const [isResizing, setIsResizing] = useState(false);

  // Held in refs so handlers attached to window don't go stale.
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const minRef = useRef(minWidth);
  minRef.current = minWidth;
  const maxRef = useRef(maxWidth);
  maxRef.current = maxWidth;

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      e.stopPropagation?.();
      startXRef.current = e.clientX;
      startWidthRef.current = options.initialWidth;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // No-op for older browsers / jsdom.
      }
      setIsResizing(true);
    },
    [options.initialWidth],
  );

  useEffect(() => {
    if (!isResizing) return;

    function clamp(n: number) {
      const min = minRef.current;
      const max = maxRef.current;
      let v = Math.max(min, n);
      if (max != null) v = Math.min(max, v);
      return v;
    }

    function onMove(e: PointerEvent) {
      const delta = e.clientX - startXRef.current;
      const next = clamp(startWidthRef.current + delta);
      onResizeRef.current(next);
    }
    function onEnd() {
      setIsResizing(false);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [isResizing]);

  return { isResizing, onPointerDown };
}
