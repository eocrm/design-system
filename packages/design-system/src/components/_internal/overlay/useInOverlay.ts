import { useLayoutEffect, useState, type RefObject } from 'react';

// Overlay hosts whose descendants' floating surfaces must stack above them.
// Modal/Drawer portal roots, plus Popover.Content and DropdownMenu content
// (so a DropdownMenu/Popover/ConfirmationPopover opened from inside a Popover —
// or from a DropdownMenu item nested in one — elevates above its host instead
// of rendering behind it). Reuses the existing content markers; no new attrs.
const OVERLAY_PORTAL_SELECTOR =
  '[data-drawer-portal-root], [data-modal-portal-root], [data-popover-content], [data-dropdown-menu-content]';

/**
 * True when `referenceRef`'s element is rendered inside an overlay host — a
 * `Modal`/`Drawer` overlay portal, or a `Popover.Content` / `DropdownMenu`
 * content panel. Floating surfaces (`Select` / `Popover` / `DropdownMenu`) use
 * this to elevate their portaled content above the host — their default
 * z-index sits below `--z-modal` (and at/below an open Popover), so without
 * elevation they render behind it. Covers a kebab `DropdownMenu`, nested
 * `Popover`, or `ConfirmationPopover` opened from inside a Popover panel.
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
export function useInOverlay(
  referenceRef: RefObject<HTMLElement | null>,
  active: boolean,
): boolean {
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
