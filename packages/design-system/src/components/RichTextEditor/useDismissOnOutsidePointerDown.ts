// useDismissOnOutsidePointerDown.ts — shared "click outside to dismiss" for the
// <RichTextEditor> floating overlays (link bubble, attachment config popover).
// A capture-phase document pointerdown listener fires `onClose` when the press
// lands outside `ref`. Capture phase + pointerdown (not click) so the dismissal
// runs before the press can move/clear the editor selection. Internal; NOT
// exported from the package.
import { useEffect, type RefObject } from 'react';

/**
 * Call `onClose` when a pointerdown lands outside the element referenced by `ref`.
 * The listener is registered on `document` in the capture phase. `ref` is a stable
 * `useRef` object, so the effect effectively re-subscribes only when `onClose`'s
 * identity changes — matching the overlays' original `[onClose]`-keyed effects.
 */
export function useDismissOnOutsidePointerDown(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [ref, onClose]);
}
