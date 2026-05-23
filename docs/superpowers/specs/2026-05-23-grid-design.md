# Grid — design spec

**Date:** 2026-05-23
**Branch:** `feat/grid`
**Scope:** New `<Grid>` 2D layout primitive — CSS-Grid wrapper with token-driven gap, mutually-exclusive `columns` (fixed) / `minColumnWidth` (auto-fit responsive), optional `alignItems` / `justifyItems`, and a limited polymorphic `as` prop.

## Goal

Close the third leg of the layout-primitive stool. `<Stack>` covers vertical flow, `<Cluster>` covers horizontal-with-wrap. `<Grid>` covers everything that needs **equal-width columns** or **a responsive tile layout** — dashboard cards, form label/field columns, photo galleries, two-column page layouts. Both existing primitives' "When NOT to use" sections already point readers toward CSS Grid for this case; this component formalizes the boundary.

## Why now

- Modal + Drawer are shipped. The next CRM mockups need dashboard tile layouts and form column layouts — both of which are clumsy with raw `<div style={{ display: 'grid', ... }}>`.
- Token-aware gap presets matter most when the same scale (`xs` / `sm` / `md` / `lg` / `xl` / `2xl`) is shared across Stack / Cluster / Grid. Encoding that as a typed prop on a layout component prevents off-scale spacing drift.
- `minColumnWidth + auto-fit` is the "responsive without breakpoints" pattern that consumers reach for repeatedly. Wrapping it in a single prop turns five lines of CSS into one prop.

## Non-goals (v1)

- **No string `columns` for custom track lists.** `<Grid columns="auto 1fr">` is NOT supported. Consumers who need named tracks or asymmetric column widths use raw CSS Grid via `className`. Keeping the prop as `number` only prevents off-token escape hatches.
- **No per-cell `span` / placement props.** That's what raw CSS Grid is for. Grid is a container primitive, not a placement system.
- **No breakpoint object syntax** (e.g., `columns={{ base: 1, md: 2, lg: 4 }}`). `minColumnWidth` covers the responsive case more elegantly without consumers having to know the breakpoint scale.
- **No `rows` prop.** Almost always unnecessary in real layouts; cells stack into rows naturally based on the column count.
- **No full polymorphic `as` with ElementType.** Limited string union of ten common semantic elements (`div` / `section` / `ul` / `ol` / `nav` / `main` / `aside` / `article` / `header` / `footer`). The full TS polymorphic-ref pattern is ~30 lines of type gymnastics for almost no real-world benefit.

## Architecture

### Dependencies

No new packages, no new tokens. Reuses `--space-*` via the gap class mapping.

### File layout

```
packages/design-system/src/components/Grid/
  Grid.tsx              ← forwardRef + spread; renders the chosen `as` element
  Grid.module.scss      ← Token-driven gap, alignItems/justifyItems classes, columns via --grid-columns custom prop
  Grid.test.tsx         ← Unit tests
  index.ts              ← Public re-exports
```

Plus standard integration points:

- `packages/design-system/src/index.ts` — re-export Grid + types
- `packages/design-system/AGENTS.md` — TL;DR slot near Stack/Cluster
- `packages/playground/src/pages/components/GridDemo.tsx` — new demo
- `packages/playground/src/App.tsx` — route
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar nav, Layout group (alongside Stack/Cluster)
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview grid tile
- `packages/playground/src/pages/mockups/registry.ts` — `'Grid'` in `ComponentName` union

### Composition

- Pairs with Stack (vertical) and Cluster (horizontal-with-wrap).
- Reuses the existing `--space-*` tokens for gap.
- No new behavioral primitives. Pure CSS wrapper.

## Public API

```ts
export type GridGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type GridAlignItems = 'start' | 'center' | 'end' | 'stretch';
export type GridJustifyItems = 'start' | 'center' | 'end' | 'stretch';
export type GridAs =
  | 'div' | 'section' | 'ul' | 'ol' | 'nav'
  | 'main' | 'aside' | 'article' | 'header' | 'footer';

interface GridBaseProps {
  /**
   * Gap between cells.
   * `xs` (4) / `sm` (8) / `md` (12, default) / `lg` (16) / `xl` (24) / `2xl` (32).
   * Same scale as Stack and Cluster.
   */
  gap?: GridGap;
  /** Cross-axis (vertical-within-row) alignment of each cell. Default 'stretch'. */
  alignItems?: GridAlignItems;
  /** Main-axis (horizontal-within-track) alignment of each cell. Default 'stretch'. */
  justifyItems?: GridJustifyItems;
  /** Element to render. Default 'div'. Limited to common layout / semantic elements. */
  as?: GridAs;
}

interface GridFixedColumns extends GridBaseProps, HTMLAttributes<HTMLElement> {
  /** Fixed equal-width columns. Mutually exclusive with `minColumnWidth`. */
  columns: number;
  minColumnWidth?: never;
}

interface GridAutoFit extends GridBaseProps, HTMLAttributes<HTMLElement> {
  /**
   * Minimum column width for auto-fit responsive layout. Columns reflow based on
   * container width (no breakpoints needed). String must be a CSS length:
   * '240px' / '15rem'. If neither `columns` nor `minColumnWidth` is provided,
   * defaults to '240px'.
   */
  minColumnWidth?: string;
  columns?: never;
}

export type GridProps = GridFixedColumns | GridAutoFit;
```

Discriminated-union `never` enforces mutual exclusion at compile time — `<Grid columns={2} minColumnWidth="240px" />` is a type error.

`as` is a string union rather than `ElementType` to keep types simple. Ref is typed as `HTMLElement` (broad but covers all valid `as` choices).

## Architecture flow

### Rendering

```tsx
// Lookup tables mirror Stack/Cluster precedent — explicit object literals
// keyed by the prop value, mapping to the (camelCase) CSS Module class.
const gapClass: Record<GridGap, string> = {
  xs: styles.gapXs,
  sm: styles.gapSm,
  md: styles.gapMd,
  lg: styles.gapLg,
  xl: styles.gapXl,
  '2xl': styles.gap2xl,
};
const alignItemsClass: Record<GridAlignItems, string> = {
  start: styles.alignItemsStart,
  center: styles.alignItemsCenter,
  end: styles.alignItemsEnd,
  stretch: styles.alignItemsStretch,
};
const justifyItemsClass: Record<GridJustifyItems, string> = {
  start: styles.justifyItemsStart,
  center: styles.justifyItemsCenter,
  end: styles.justifyItemsEnd,
  stretch: styles.justifyItemsStretch,
};

function Grid({
  gap = 'md',
  alignItems,
  justifyItems,
  as = 'div',
  columns,
  minColumnWidth,
  className,
  style,
  ...rest
}, ref) {
  const template = columns !== undefined
    ? `repeat(${columns}, minmax(0, 1fr))`
    : `repeat(auto-fit, minmax(${minColumnWidth ?? '240px'}, 1fr))`;

  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={clsx(
        styles.grid,
        gapClass[gap],
        alignItems && alignItemsClass[alignItems],
        justifyItems && justifyItemsClass[justifyItems],
        className,
      )}
      style={{ ...style, ['--grid-columns' as string]: template }}
      {...rest}
    />
  );
}
```

Notes:
- The `--grid-columns` inline custom property drives `grid-template-columns` from SCSS. Keeping the template string off the inline style attribute (and behind a custom prop) makes it easy to override later via CSS without specificity wars.
- `minmax(0, 1fr)` is the standard fix for "long content blows the column out". Without the `0` floor, a long unbreakable word can force the track wider than `1fr`.
- Internal `--grid-columns` wins on conflict (the value spreads AFTER any consumer `style`). Consumers who genuinely need to override the template should use raw CSS Grid via `className` rather than fighting the prop. This keeps the prop API authoritative.

### SCSS

```scss
.grid {
  display: grid;
  grid-template-columns: var(--grid-columns, repeat(auto-fit, minmax(240px, 1fr)));
}

// Gap presets — mirror Stack/Cluster scale + camelCase naming
.gapXs  { gap: var(--space-1); }
.gapSm  { gap: var(--space-2); }
.gapMd  { gap: var(--space-3); }
.gapLg  { gap: var(--space-4); }
.gapXl  { gap: var(--space-6); }
.gap2xl { gap: var(--space-8); }

// Item alignment (cross-axis)
.alignItemsStart   { align-items: start; }
.alignItemsCenter  { align-items: center; }
.alignItemsEnd     { align-items: end; }
.alignItemsStretch { align-items: stretch; }

// Item alignment (main-axis)
.justifyItemsStart   { justify-items: start; }
.justifyItemsCenter  { justify-items: center; }
.justifyItemsEnd     { justify-items: end; }
.justifyItemsStretch { justify-items: stretch; }
```

The base `.grid` rule's `grid-template-columns` has a fallback to `repeat(auto-fit, minmax(240px, 1fr))` so that even if the `--grid-columns` custom prop fails to apply for some reason (consumer-style override stripping it), the component still renders a sane default.

CSS-class naming convention is camelCase — `.gapMd`, `.alignItemsStart`, `.justifyItemsCenter`. Matches the precedent Stack and Cluster set (verify with `grep "^\.gap" packages/design-system/src/components/Stack/Stack.module.scss` during implementation).

## ARIA contract

Grid is a presentational primitive. No roles, no labels, no focus management. The element it renders (`as` prop) governs semantics:

- `as="div"` (default) — no implicit role
- `as="section"` / `"article"` / `"main"` / `"header"` / `"footer"` / `"nav"` / `"aside"` — landmark semantics
- `as="ul"` / `"ol"` — list semantics. **Implementation caveat:** when `as="ul"` or `"ol"`, consumers are responsible for ensuring children are `<li>` elements. The component does not enforce this. Consider adding a dev-mode warning if `as="ul" || "ol"` and a non-`<li>` child is detected — but this can be a follow-up if it ever bites. Out of scope for v1.

## Testing strategy

`Grid.test.tsx` (~12 cases, matching the test density of Stack/Cluster):

- Renders without crashing with default props (no `columns` / `minColumnWidth`)
- Default behavior applies `repeat(auto-fit, minmax(240px, 1fr))` to the `--grid-columns` style
- `columns={4}` sets `--grid-columns` to `repeat(4, minmax(0, 1fr))`
- `minColumnWidth="200px"` sets `--grid-columns` to `repeat(auto-fit, minmax(200px, 1fr))`
- Each `gap` variant (`xs` / `sm` / `md` / `lg` / `xl` / `2xl`) applies the matching CSS class
- `alignItems` and `justifyItems` apply matching CSS classes; absence applies no class
- `as="section"` renders a `<section>` element
- `as="ul"` renders a `<ul>` element
- `className` is merged onto the rendered element, not replaced
- Consumer `style` merges with the internal `--grid-columns` (consumer-provided style values take precedence per spread order, but `--grid-columns` is preserved if the consumer doesn't override it)
- `ref` is forwarded to the rendered element (test via DOM identity)
- **TS-level**: a single `// @ts-expect-error` test asserts that `<Grid columns={2} minColumnWidth="240px" />` fails type-check (mutual exclusion enforced via discriminated union)

## Demo page

`packages/playground/src/pages/components/GridDemo.tsx` — 6 examples:

1. **Auto-fit (default)** — `<Grid>` containing 6 Cards, viewport resize demonstrates the reflow. No props set; relies on default `minColumnWidth="240px"`.
2. **Fixed columns** — `<Grid columns={2}>` for a label/field form layout demonstrating equal-width columns.
3. **Gap scale** — six grids side-by-side, each with a different gap (`xs` through `2xl`), so the visual difference is immediate.
4. **minColumnWidth variants** — three grids at 200px / 280px / 360px so consumers see how the prop affects layout density at the current viewport.
5. **alignItems / justifyItems** — cells of varying intrinsic height, demonstrating `start` / `center` / `end` / `stretch`.
6. **Semantic elements** — `<Grid as="section">` and `<Grid as="ul">` (with `<li>` children) showing the `as` prop in use.

Standard playground integration: route in `App.tsx`, sidebar entry in `AppShell.tsx` (Layout group with Stack/Cluster), card in `ComponentsIndex.tsx`, `'Grid'` added to `mockups/registry.ts` `ComponentName` union.

## AGENTS.md + JSDoc updates

Append a `<Grid>` TL;DR to AGENTS.md near the Stack/Cluster sections.

Cross-link from Stack and Cluster's existing "use CSS Grid" references in BOTH places they appear:
- **JSDoc in `Stack.tsx`**: change `For tabular data — use a real <table> or CSS Grid.` → `For tabular data — use a real <table> or <Grid>.`
- **JSDoc in `Cluster.tsx`**: change `For aligned columns of equal width — use CSS Grid.` → `For aligned columns of equal width — use <Grid>.`
- **AGENTS.md** Stack/Cluster TL;DRs if they have matching language.

Anti-patterns specific to Grid:

- ❌ Grid for vertical lists with single column — use Stack.
- ❌ Grid for unaligned button rows that wrap — use Cluster.
- ❌ `<Grid columns="auto 1fr">` strings — not supported in v1. For asymmetric or named tracks, use raw CSS Grid via className.
- ❌ `<Grid as="ul">` with non-`<li>` children — the component doesn't enforce list semantics; consumers must.

## Hard Rule 8 cycle

Same as Modal / Drawer:
1. Run all gates (test, build-lib, lint, build, npm pack --dry-run).
2. Spawn a fresh-context reviewer with the 10 review categories.
3. Fix Critical + Important findings; re-run gates; re-review.
4. Loop until verdict is "clean enough to stop".

## Out-of-PR follow-ups (noted, not in v1)

- Dev-mode warning when `as="ul" || "ol"` and a non-`<li>` child is rendered.
- String `columns` for custom grid-template-columns (`columns="auto 1fr"`). Only if real consumer demand surfaces.
- Per-cell `<Grid.Cell>` subcomponent for span / placement props. Only if real consumer demand surfaces.
- Breakpoint object syntax (`columns={{ base: 1, md: 2, lg: 4 }}`). The minColumnWidth approach should cover most cases; revisit only if specific consumer needs aren't satisfied.
