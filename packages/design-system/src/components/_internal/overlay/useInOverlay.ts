import { useLayoutEffect, useState, type RefObject } from 'react';

// Overlay hosts whose descendants' floating surfaces must stack above them.
// Modal/Drawer portal roots, plus Popover.Content and DropdownMenu content
// (so a DropdownMenu/Popover/ConfirmationPopover opened from inside a Popover —
// or from a DropdownMenu item nested in one — elevates above its host instead
// of rendering behind it). Reuses the existing content markers; no new attrs.
// `[data-in-overlay]` makes elevation transitive: a surface nested inside an
// already-elevated surface (the embedded TimeField clock inside a DatePicker
// calendar that sits in a Modal, #272) elevates with its host — the host's
// marker lands on the DOM via the layout effect's setState (a second
// synchronous commit, still pre-paint) before the nested surface can open,
// so the chain is observable by the time the child's hook runs.
const OVERLAY_PORTAL_SELECTOR =
  '[data-drawer-portal-root], [data-modal-portal-root], [data-lightbox-portal-root], [data-popover-content], [data-dropdown-menu-content], [data-in-overlay]';

/**
 * True when `referenceRef`'s element is rendered inside an overlay host — a
 * `Modal`/`Drawer`/`Lightbox` overlay portal, a `Popover.Content` / `DropdownMenu`
 * content panel, or ANY already-elevated surface carrying `[data-in-overlay]`
 * (transitive elevation). Floating surfaces (`Select` / `Popover` /
 * `DropdownMenu` / `DatePicker` / `DateRangePicker` / `TimeField`) use this
 * to elevate their portaled content above the host — their default z-index
 * sits below `--z-modal` (and at/below an open Popover), so without
 * elevation they render behind it. Covers a kebab `DropdownMenu`, nested
 * `Popover`, or `ConfirmationPopover` opened from inside a Popover panel —
 * and, via the transitive marker, the embedded `TimeField` clock inside an
 * elevated `DatePicker` calendar (#272).
 *
 * Consumers MUST place `data-in-overlay` on the portaled FLOATING element,
 * never on the reference element itself — `closest()` includes the start
 * node, so a marked reference would self-match on the next recompute.
 *
 * Recomputed whenever `active` toggles (the trigger is mounted by then). Uses
 * `useLayoutEffect` so the elevation attribute lands in the same pre-paint
 * commit as the opened surface (no flash behind the overlay).
 *
 * @example
 * // `ctx` is the component's own context (e.g. useSelectContext()) — but any
 * // ref to the trigger or a wrapper ancestor works equally well (DatePicker/
 * // DateRangePicker/TimeField pass their wrapperRef).
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
