import { createContext } from 'react';

/**
 * Shared `collapseBelow` threshold scale: `sm` 480px / `md` 640px / `lg` 768px.
 *
 * The scale is shared; **the measurement basis is per-component**:
 *
 * - **Container** (`@container (max-width: …)`) for Grid / Sortable (grid
 *   arrangement) / Split / DashboardCanvas / DataTable. Collapsing re-templates
 *   content *inside* a box whose width the collapse doesn't change, so querying
 *   the box's own width is stable and needs no JS.
 * - **Viewport** (`matchMedia`, via the `useBelowBreakpoint` hook in
 *   `src/hooks/`) for Rail and AppLayout's overlay sidebar. A container query
 *   there would be circular — the thing being measured IS what the collapse
 *   changes (Rail's own width 240px → 56px; the sidebar's presence in
 *   AppLayout's row). Rail's collapsed state also drives React behavior (Item
 *   tooltips, Group flyouts, section titles), which CSS can't express, so the
 *   threshold has to exist in JS regardless.
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
