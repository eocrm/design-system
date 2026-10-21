/**
 * Set by Tour on the current step's found target (any step kind, modal or
 * not) while the tour is open. Distinct from `data-tour-active-target`, which
 * only marks interactive modal-step targets for overlay elevation (#684).
 */
export const TOUR_CURRENT_TARGET = 'data-tour-current-target';

/**
 * True when a floating surface must ignore a dismiss caused by `node` (a
 * pointerdown target or the element focus moved to): `node` is inside the
 * tour layer AND the tour's current target is inside `panel` or `trigger`.
 * A tour pointing into an open menu/picker must not close it just because
 * the user pressed Next or the tour focused its card (#684).
 */
export function isTourHeld(
  node: EventTarget | null,
  panel: Element | null,
  trigger: Element | null,
): boolean {
  if (!(node instanceof Element) || !node.closest('[data-tour-portal-root]')) return false;
  const target = document.querySelector(`[${TOUR_CURRENT_TARGET}]`);
  return !!target && (!!panel?.contains(target) || !!trigger?.contains(target));
}
