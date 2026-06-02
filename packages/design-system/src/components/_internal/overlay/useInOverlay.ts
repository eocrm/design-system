import { useLayoutEffect, useState, type RefObject } from 'react';

// Modal/Drawer portal roots. A floating surface whose trigger lives inside one
// of these is being opened from within an overlay and must stack above it.
const OVERLAY_PORTAL_SELECTOR = '[data-drawer-portal-root], [data-modal-portal-root]';

/**
 * True when `referenceRef`'s element is rendered inside a `Modal`/`Drawer`
 * overlay portal. Floating surfaces (`Select` / `Popover` / `DropdownMenu`) use
 * this to elevate their portaled content above the overlay — their default
 * z-index sits below `--z-modal`, so without elevation they render behind it.
 *
 * Recomputed whenever `active` toggles (the trigger is mounted by then). Uses
 * `useLayoutEffect` so the elevation attribute is set before the browser paints
 * the opened surface (no flash behind the overlay).
 *
 * @example
 * // `ctx` is the component's own context (e.g. useSelectContext()).
 * const inOverlay = useInOverlay(ctx.triggerRef, ctx.open);
 * // Empty-string presence idiom — React serializes `{true}` on a data-*
 * // attribute as "true", so use `? '' : undefined` to match the CSS
 * // `[data-in-overlay]` selector and the `data-*-content=""` convention:
 * // <ul data-in-overlay={inOverlay ? '' : undefined} ...>
 */
export function useInOverlay(referenceRef: RefObject<HTMLElement | null>, active: boolean): boolean {
  const [inOverlay, setInOverlay] = useState(false);
  useLayoutEffect(() => {
    if (!active) {
      setInOverlay(false);
      return;
    }
    setInOverlay(Boolean(referenceRef.current?.closest(OVERLAY_PORTAL_SELECTOR)));
  }, [active, referenceRef]);
  return inOverlay;
}
