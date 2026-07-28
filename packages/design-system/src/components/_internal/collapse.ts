import { createContext, useMemo, useSyncExternalStore } from 'react';

/**
 * Shared `collapseBelow` threshold scale: `sm` 480px / `md` 640px / `lg` 768px.
 *
 * The scale is shared; **the measurement basis is per-component**:
 *
 * - **Container** (`@container (max-width: …)`) for Grid / Sortable (grid
 *   arrangement) / Split / DashboardCanvas. Collapsing re-templates content
 *   *inside* a box whose width the collapse doesn't change, so querying the
 *   box's own width is stable and needs no JS.
 * - **Viewport** (`matchMedia`) for Rail. A container query there would be
 *   circular — the rail's own width IS what collapsing changes (240px → 56px),
 *   so collapsing would keep the query true. Rail's collapsed state also drives
 *   React behavior (Item tooltips, Group flyouts, section titles), which CSS
 *   can't express, so the threshold has to exist in JS regardless.
 */
export type CollapseBreakpoint = 'sm' | 'md' | 'lg';

/**
 * Pixel value of each breakpoint, for components that evaluate the threshold in
 * JS (`matchMedia`) rather than in CSS.
 *
 * **Keep in sync with `collapse.scss`** (`$collapse-sm` / `-md` / `-lg`) — the
 * SCSS constants are the CSS-side copy of these same numbers. Both are
 * inclusive upper bounds: `max-width: 480px` matches AT 480px.
 */
export const COLLAPSE_BREAKPOINT_PX: Record<CollapseBreakpoint, number> = {
  sm: 480,
  md: 640,
  lg: 768,
};

/**
 * Graduated collapse: breakpoint → column count. Below each breakpoint the
 * grid re-templates to that many equal columns and every item's span is
 * clamped to fit. E.g. `{ md: 6, sm: 1 }` = 12-col grid above 640px, 6-col
 * between 480–640px, single column below 480px. When several breakpoints
 * match, the smallest wins.
 */
export type CollapseColumnsMap = Partial<Record<CollapseBreakpoint, number>>;

/** Largest → smallest; step CSS is declared in this order so the smallest matching breakpoint wins by source order. */
export const COLLAPSE_BREAKPOINTS: readonly CollapseBreakpoint[] = ['lg', 'md', 'sm'];

/**
 * The container's graduated-collapse map, provided by Grid / Sortable (grid
 * arrangement) to their Items so each can stamp per-breakpoint clamped span
 * custom properties. `null` when the container has no map-form collapse.
 */
export const CollapseColumnsContext = createContext<CollapseColumnsMap | null>(null);

/** Track template for a collapse step — mirrors Grid's fixed-column template. */
export function collapseTrackTemplate(columns: number): string {
  return `repeat(${columns}, minmax(0, 1fr))`;
}

/**
 * Subscribes to `(max-width: <breakpoint>px)` on the VIEWPORT and reports
 * whether it currently matches. `false` when no breakpoint is given, and on a
 * server / any environment without `matchMedia`.
 *
 * Viewport, not container — use this only where a container query would be
 * circular, i.e. where the thing being measured is what the collapse changes:
 * `Rail` (its own width IS the collapse) and `AppLayout`'s overlay sidebar (the
 * sidebar's presence in the row IS the collapse). For content that re-templates
 * inside a box of stable width, prefer the container-query `collapseBelow`
 * classes instead — see the type doc above.
 */
export function useBelowBreakpoint(breakpoint: CollapseBreakpoint | undefined): boolean {
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
