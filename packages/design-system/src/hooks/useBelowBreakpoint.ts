import { useMemo, useSyncExternalStore } from 'react';
import { COLLAPSE_BREAKPOINT_PX, type CollapseBreakpoint } from '../components/_internal/collapse';

/**
 * Subscribes to `(max-width: <breakpoint>px)` on the VIEWPORT and reports
 * whether it currently matches. `false` when no breakpoint is given, and on a
 * server / any environment without `matchMedia`. In a client-only render (no
 * SSR — the CRM's case) the value is correct from the first render; the
 * server-then-hydrate caveat only applies if you server-render this.
 *
 * Viewport, not container — use this only where a container query would be
 * circular, i.e. where the thing being measured is what the collapse changes:
 * `Rail` (its own width IS the collapse) and `AppLayout`'s overlay sidebar (the
 * sidebar's presence in the row IS the collapse). For content that re-templates
 * inside a box of stable width, prefer the container-query `collapseBelow`
 * classes instead (see `CollapseBreakpoint`'s doc).
 *
 * The only public hook that lives outside a component directory. Import it directly:
 *
 * @example
 * import { useBelowBreakpoint } from '@eocrm/design-system';
 *
 * function NavTrigger() {
 *   const isOverlay = useBelowBreakpoint('lg');
 *   return isOverlay ? <Button onClick={openDrawer}>Menu</Button> : null;
 * }
 */
export function useBelowBreakpoint(breakpoint?: CollapseBreakpoint): boolean {
  // `max-width` is inclusive, matching the `@container (max-width: …)` form the
  // SCSS breakpoints use — the threshold matches AT the breakpoint value.
  const query = breakpoint ? `(max-width: ${COLLAPSE_BREAKPOINT_PX[breakpoint]}px)` : null;

  const [subscribe, getSnapshot] = useMemo(() => {
    const supported =
      query !== null && typeof window !== 'undefined' && typeof window.matchMedia === 'function';
    if (!supported) return [() => () => {}, () => false] as const;
    const mql = window.matchMedia(query);
    return [
      (onStoreChange: () => void) => {
        // Safari < 13.1 exposes `matchMedia` but no `addEventListener` on the
        // MediaQueryList — only the deprecated `addListener`. Feature-detecting
        // `matchMedia` alone would throw here during commit and take the app
        // down rather than degrading, so detect the subscription API too.
        if (typeof mql.addEventListener === 'function') {
          mql.addEventListener('change', onStoreChange);
          return () => mql.removeEventListener('change', onStoreChange);
        }
        mql.addListener(onStoreChange);
        return () => mql.removeListener(onStoreChange);
      },
      () => mql.matches,
    ] as const;
  }, [query]);

  // Server snapshot is `false`: SSR has no viewport, so the markup matches the
  // consumer's own value and the client corrects on hydration.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
