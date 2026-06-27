// useOverlayRect.ts — shared gutter/handle overlay plumbing for <RichTextEditor>.
// The block-controls gutter and the image resize handle both (a) measure a target
// element's box relative to the editor shell, retrying across the mount race, and
// (b) report drag start/end while guarding against a mid-drag unmount. Both live
// here so the two overlays don't reimplement them. Internal; NOT exported from
// the package.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

/** A box measured relative to the editor shell (top/left/width/height, all in px). */
export interface ShellRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Measure `getEl()`'s box relative to the shell (`rootRef`), re-running whenever
 * `key` or `getEl` changes. Returns `null` when the shell or target element is
 * missing, retrying up to twice — the parent's element ref can attach after this
 * child's layout pass on mount, so the first measurement can race and come up empty.
 * Callers derive whatever they need from the returned rect (gutter: top/height;
 * resize handle: the bottom-right corner = top+height / left+width).
 */
export function useShellRelativeRect(
  rootRef: RefObject<HTMLElement | null>,
  getEl: () => HTMLElement | null,
  key: unknown,
): ShellRect | null {
  const [rect, setRect] = useState<ShellRect | null>(null);
  // Bumped to re-run measurement when the shell ref / target element is not yet
  // attached on the first layout-effect pass. Capped at 2.
  const [retry, setRetry] = useState(0);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const el = getEl();
    if (!root || !el) {
      setRect(null);
      if (retry < 2) setRetry((n) => n + 1);
      return;
    }
    const rootBox = root.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    setRect({
      top: box.top - rootBox.top,
      left: box.left - rootBox.left,
      width: box.width,
      height: box.height,
    });
  }, [rootRef, getEl, key, retry]);
  return rect;
}

/**
 * Returns a stable setter to report drag start/end, and fires `onDraggingChange(false)`
 * on unmount — so an overlay that unmounts mid-drag (its content removed, the editor
 * toggled to read-only, etc.) never leaves the editor stuck in a dragging state (no
 * pointerup/cancel fires in that case). The setter reads the latest `onDraggingChange`
 * via a ref, so it stays referentially stable across renders.
 */
export function useDraggingReporter(
  onDraggingChange?: (dragging: boolean) => void,
): (dragging: boolean) => void {
  // Latest callback, read by the stable setter + the unmount cleanup without resubscribing.
  const ref = useRef(onDraggingChange);
  ref.current = onDraggingChange;
  useEffect(() => {
    return () => {
      ref.current?.(false);
    };
  }, []);
  return useCallback((dragging: boolean) => ref.current?.(dragging), []);
}
