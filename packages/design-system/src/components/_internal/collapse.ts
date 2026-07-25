import { createContext } from 'react';

/**
 * Container-width threshold for `collapseBelow` on Grid / Sortable (grid
 * arrangement). `sm` 480px / `md` 640px / `lg` 768px — measured against the
 * grid's OWN width (container query), not the viewport.
 */
export type CollapseBreakpoint = 'sm' | 'md' | 'lg';

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
