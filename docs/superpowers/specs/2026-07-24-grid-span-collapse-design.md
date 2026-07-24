# Grid: per-cell span + responsive collapse — design

**Issue:** eocrm/design-system#314
**Date:** 2026-07-24
**Status:** approved

## Problem

`<Grid>` supports `columns={N}` and `minColumnWidth` but has no per-cell span
(its docstring defers to raw CSS via `className`) and fixed-column grids never
collapse on narrow containers. The eocrm tenant dashboard ships a shim
(`DashboardGrid`) with span classes + a 640px single-column collapse. Widgets
carry catalog sizes that map to fractional row widths: 25% / 33% / 50% / 67% /
75% / 100%.

## Design

### `Grid.Item` (new subcomponent)

```ts
type GridItemSpan = number | 'full' | '25%' | '33%' | '50%' | '67%' | '75%' | '100%';
interface GridItemProps extends HTMLAttributes<HTMLElement> {
  /** Column span. Fractions assume a 12-column grid. Default: auto (1 track). */
  span?: GridItemSpan;
  /** Element to render. Default 'div'. */
  as?: 'div' | 'li' | 'section' | 'article' | 'aside';
}
```

- Fraction spans map to tracks on a **12-column base**: `25%`→3, `33%`→4,
  `50%`→6, `67%`→8, `75%`→9. `'100%'` and `'full'` are aliases for
  `grid-column: 1 / -1` (safe in ANY grid, including auto-fit).
- Numeric spans emit `grid-column: span N` (relative to whatever `columns`
  the consumer set).
- Implementation: single SCSS class `grid-column: var(--grid-item-span, auto)`;
  the resolved value (`span 3` / `1 / -1`) is set as an inline custom property.
  No class-per-span enumeration.
- `forwardRef`, spread attrs, `className` merged, full JSDoc (Rule 7).
- Rule-4 note: Grid/Stack/Cluster are the layout primitives; `grid-column` on
  `Grid.Item` is their sanctioned job (mirrors Stack owning flex).
- Documented, not runtime-validated: fraction spans (other than 100%) require
  `columns={12}`; numeric `span > columns` creates implicit tracks (CSS
  behavior) — both called out in JSDoc anti-patterns + AGENTS.md.
- Plain (non-`Grid.Item`) children remain valid; `Grid.Item` is opt-in per cell.

### `collapseBelow?: 'sm' | 'md' | 'lg'` (fixed-columns variant only)

- Preset container-width breakpoints: `sm` 480px / `md` 640px / `lg` 768px —
  SCSS constants in `Grid.tokens.scss` (query conditions cannot read CSS custom
  properties; SCSS `$` constants are the single source).
- Lives on `GridFixedColumns` only (`minColumnWidth` grids already reflow; the
  existing discriminated union enforces exclusion at the type level).
- Implementation: the prop adds a `collapsible` class setting
  `container-type: inline-size` on the grid element (only then — existing
  grids get zero containment changes) plus a per-breakpoint class with an
  `@container (max-width: $bp)` rule making **every direct child**
  `grid-column: 1 / -1`. The template is untouched; the grid renders as a
  single visual column. The collapse rule wins over `Grid.Item` span by
  same-file source order (collapse rules declared after the item rule — no
  `!important`).
- Container (not viewport) queries: a grid beside an open Drawer/sidebar
  collapses when IT is narrow.

### Dashboard mapping (consumer)

`<Grid columns={12} gap="md" collapseBelow="md">` +
`<Grid.Item span="25%|33%|50%|67%|75%|100%">` — replaces the shim 1:1
(the shim's 640px = `md`).

## Testing

- Unit (jsdom — `@container` doesn't evaluate; assert classes + inline var):
  span mappings (number, each fraction, full/100% → `1 / -1`), default auto,
  `as` polymorphism, ref forwarding, className merge; grid: `collapseBelow`
  classes present only when set, absent otherwise; type-level: `collapseBelow`
  rejected alongside `minColumnWidth`.
- Visual (Playwright against the playground, port 8090+): 12-col fraction
  demo renders 25/75 + 33/67 + 50/50 rows aligned; narrow the container below
  640px → single column.

## Docs

- Grid JSDoc: replace the two "span → raw CSS" remarks with `Grid.Item`
  examples (dashboard 12-col + collapse example included).
- Export `Grid.Item` (as property of `Grid`) + `GridItemProps`, `GridItemSpan`,
  `GridCollapseBreakpoint` types from `index.ts`.
- AGENTS.md Grid TL;DR: fraction span table + collapseBelow.
- Playground `GridDemo.tsx`: new "Dashboard spans + collapse" section.
