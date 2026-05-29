# `<Masonry>` — height-balanced masonry layout primitive

## Goal

A layout primitive that packs variable-height children into N columns, placing each item into
the currently-shortest column (greedy balancing) so the result reads left→right in source order
with balanced column heights — true Pinterest-style masonry. Sibling to `<Grid>` (equal-height
2D tiles), `<Stack>` (one column), and `<Cluster>` (wrapping rows). Fills the gap `Grid`'s JSDoc
explicitly punts on ("true masonry → not supported; use raw CSS").

## Locked-in decisions (brainstorm)

1. **Technique: JS height-balanced** (not CSS multi-column). Items are measured and placed into
   the shortest column → left→right reading order (top row `1·2·3`) + tighter balance. Hand-rolled
   with `ResizeObserver` (no new deps).
2. **API mirrors `Grid`:** `columns: number` **xor** `minColumnWidth: string` (discriminated
   union; default `minColumnWidth="240px"`); `gap` on the `xs…2xl` token scale (default `'md'`).
3. **Single `gap`** for both column gap and item vertical gap (matches Grid; no separate
   column/row gap in v1).
4. **No polymorphic `as`** in v1 — the internal column structure makes it awkward; root is a `<div>`.
5. **Layout-owning primitive** (documented Rule-4 exception, like `Grid`/`Rail`/`Page`).
6. **Cluster:** Layout · **tier:** primitive (wraps children; no library-component deps). **No i18n.**

## Architecture

### DOM

```
<div class="masonry gapMd" ref>          // display:flex; gap:<columnGap>
  <div class="column">                    // flex:1; display:flex; flex-direction:column; gap:<rowGap>
    <div class="cell" ref>{child}</div>   // measured wrapper, one per assigned child
    …
  </div>
  …N columns…
</div>
```

### State machine

- `children` → `Children.toArray(children)` (stable, keyed array; `null`/`false` filtered).
- `columnCount: number` — `columns` prop (fixed) or computed from the measured container width in
  `minColumnWidth` mode.
- `columns: number[][]` — the distribution: `columns[c]` is the ordered list of child indices in
  column `c`.

### Flow

1. **Initial render (pre-measure / SSR / no-JS):** distribute children **round-robin**
   (`index % columnCount`) so the first paint is already a sensible multi-column layout.
2. **`useLayoutEffect` (after mount + on deps change):**
   - Compute `columnCount`: in `minColumnWidth` mode, `columnsForWidth(rootWidth, minColPx, gapPx)`;
     in `columns` mode, the prop (clamped ≥ 1).
   - Measure each cell's height via its ref (`getBoundingClientRect().height`).
   - `balanceColumns(heights, columnCount)` → new distribution; `setColumns` if it changed.
3. **`ResizeObserver`** (guarded — skipped when `typeof ResizeObserver === 'undefined'`, i.e. SSR/
   jsdom): observe the root (width → recompute `columnCount`) and every cell (height → rebalance
   when content settles, e.g. images finish loading). Each callback re-runs step 2.

### Pure helpers — `masonryUtils.ts` (unit-tested directly; jsdom has no layout)

```ts
/** Greedy shortest-column-first packing. Returns columnCount arrays of child indices. */
export function balanceColumns(heights: number[], columnCount: number): number[][] {
  const cols = Math.max(1, Math.floor(columnCount));
  const out: number[][] = Array.from({ length: cols }, () => []);
  const colHeights = new Array(cols).fill(0);
  heights.forEach((h, i) => {
    let min = 0;
    for (let c = 1; c < cols; c++) if (colHeights[c] < colHeights[min]) min = c;
    out[min].push(i);
    colHeights[min] += h;
  });
  return out;
}

/** Columns that fit in `width` for a given min column width + gap (all px). Min 1. */
export function columnsForWidth(width: number, minColumnPx: number, gapPx: number): number {
  if (width <= 0 || minColumnPx <= 0) return 1;
  return Math.max(1, Math.floor((width + gapPx) / (minColumnPx + gapPx)));
}
```

`minColumnWidth` is parsed with `parseFloat` (px value; documented — v1's column-count math is
px-based). `gapPx` comes from a constant map mirroring the gap tokens:
`{ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 }` (= `--space-1/2/3/4/6/8`).

## Props

```ts
/** Gap between columns and between items. Same token scale as Grid/Stack. */
export type MasonryGap = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface MasonryBaseProps {
  /** `xs`(4) / `sm`(8) / `md`(12, default) / `lg`(16) / `xl`(24) / `2xl`(32). */
  gap?: MasonryGap;
  children?: ReactNode;
}
interface MasonryFixedColumns extends MasonryBaseProps, HTMLAttributes<HTMLDivElement> {
  /** Fixed number of columns. Mutually exclusive with `minColumnWidth`. */
  columns: number;
  minColumnWidth?: never;
}
interface MasonryResponsive extends MasonryBaseProps, HTMLAttributes<HTMLDivElement> {
  /** Min column width (px) for a responsive column count. Default `'240px'`. */
  minColumnWidth?: string;
  columns?: never;
}
export type MasonryProps = MasonryFixedColumns | MasonryResponsive;
```

`forwardRef` → root `<div>`; `className`/`style` → root; remaining `HTMLAttributes` spread onto
root (Pattern A — consumer wins; nothing safety-critical). Internal width-measuring ref is merged
with the forwarded ref (the `mergeRefs` helper Checkbox already uses).

## Tokens — `Masonry.tokens.scss`

```scss
:root {
  --masonry-gap-xs: var(--space-1);
  --masonry-gap-sm: var(--space-2);
  --masonry-gap-md: var(--space-3);
  --masonry-gap-lg: var(--space-4);
  --masonry-gap-xl: var(--space-6);
  --masonry-gap-2xl: var(--space-8);
}
```

## Styles — `Masonry.module.scss` (sketch)

```scss
@use './Masonry.tokens';

.masonry {
  display: flex;
  align-items: flex-start; // columns size to content, top-aligned
  width: 100%;
}
.column {
  display: flex;
  flex-direction: column;
  flex: 1 1 0; // equal-width columns
  min-width: 0;
}
.cell {
  width: 100%;
}

.gapXs { gap: var(--masonry-gap-xs); }
.gapSm { gap: var(--masonry-gap-sm); }
.gapMd { gap: var(--masonry-gap-md); }
.gapLg { gap: var(--masonry-gap-lg); }
.gapXl { gap: var(--masonry-gap-xl); }
.gap2xl { gap: var(--masonry-gap-2xl); }
```

The gap class is applied to BOTH the root (column gap) and each `.column` (row gap) so a single
`gap` prop drives both. `flex: 1 1 0` + `min-width: 0` keeps columns equal-width and lets content
shrink. Rule 4: Masonry is a layout-owning primitive (documented exception) — it owns its flex
structure and `width: 100%`; no `margin`/positioning.

## Files

| File | Change |
| --- | --- |
| `packages/design-system/src/components/Masonry/Masonry.tsx` | NEW — component |
| `packages/design-system/src/components/Masonry/Masonry.module.scss` | NEW — styles |
| `packages/design-system/src/components/Masonry/Masonry.tokens.scss` | NEW — `--masonry-*` tokens |
| `packages/design-system/src/components/Masonry/masonryUtils.ts` | NEW — `balanceColumns` + `columnsForWidth` (pure) |
| `packages/design-system/src/components/Masonry/Masonry.test.tsx` | NEW — unit tests (utils + component) |
| `packages/design-system/src/components/Masonry/index.ts` | NEW — `export { Masonry }` + `export type { MasonryProps, MasonryGap }` |
| `packages/design-system/src/index.ts` | MODIFY — re-export Masonry + types |
| `packages/design-system/src/_meta/manifest.ts` | MODIFY — `Masonry: 'Layout'` in `CLUSTERS` |
| `packages/design-system/scripts/generate-manifest.mjs` | MODIFY — `Masonry: 'Layout'` in its CLUSTERS copy (the `.mjs` is what `npm run build:manifest` runs — keep both in sync) |
| `packages/design-system/src/components.manifest.json` | REGEN — `npm run build:manifest` |
| `packages/design-system/AGENTS.md` | MODIFY — `<Masonry>` TL;DR (Layout section) |
| `packages/playground/src/pages/components/MasonryDemo.tsx` | NEW — demo page |
| `packages/playground/src/App.tsx` | MODIFY — `/components/masonry` route |
| `packages/playground/src/layout/AppShell/AppShell.tsx` | MODIFY — Layout-group nav entry, after `Grid`. Use a masonry-ish lucide icon (`GalleryVerticalEnd`); the plan confirms it isn't already imported and picks another layout glyph if so. |
| `packages/playground/src/pages/components/ComponentsIndex.tsx` | MODIFY — overview card (matches the file's real `items[]` entry shape) |

## Tests (`Masonry.test.tsx` minimum)

**Pure helpers (the real algorithm coverage — jsdom has no layout):**
- `balanceColumns([10,10,10,10], 2)` → `[[0,2],[1,3]]` (round-robin when equal).
- `balanceColumns([100,10,10,10], 2)` → tall item alone: `[[0],[1,2,3]]` (shortest-column packs).
- `balanceColumns([], 3)` → `[[],[],[]]`.
- `balanceColumns([5], 3)` → `[[0],[],[]]` (fewer items than columns).
- `balanceColumns(h, 0)` clamps to 1 column.
- `columnsForWidth(1000, 240, 16)` → 3; `columnsForWidth(100, 240, 16)` → 1 (min); `columnsForWidth(0, …)` → 1.

**Component (structure, not layout — jsdom heights are 0):**
- Renders all children (all present in the DOM).
- `columns={3}` → renders 3 column containers.
- default gap `md` applies `gapMd`; `gap="lg"` applies `gapLg` (on root + columns).
- `ref` forwards to the root element.
- `className` merges on the root.
- Does not throw when `ResizeObserver` is undefined (guarded) — render succeeds in jsdom.

## Demo page outline (`MasonryDemo.tsx`)

1. Basic responsive (`minColumnWidth="220px"`) gallery of ~12 variable-height tiles (colored
   blocks of differing heights, numbered so the left→right balance is visible).
2. Fixed `columns={3}` and `columns={4}`.
3. `gap` scale (sm vs lg).
4. With real images (`<Image>` children, varied aspect ratios) — the canonical photo-wall use,
   showing rebalance after images load.
5. Resize hint: a caption noting the column count reflows with container width (the playground
   content area is resizable by window).

## When NOT to use (JSDoc `@remarks` + AGENTS.md)

- Equal-height tiles / true 2D rows → use `<Grid>`.
- A single vertical column → use `<Stack>`.
- Wrapping rows of unequal items (toolbars, tag lists) → use `<Cluster>`.
- Anti-pattern: ❌ interactive/stateful children (videos, focus-holding forms) — rebalancing
  re-parents items between columns and React **remounts** them. Masonry is for *display* content.
- Anti-pattern: ❌ expecting strict source order top-to-bottom in a single column — items are
  distributed across columns; order is left→right by placement, not a single reading column.

## Out of scope (v1)

- Separate column/row gap.
- Polymorphic `as` / list semantics.
- `rem`/`%` `minColumnWidth` in the column-count math (px only in v1).
- Animated reflow / FLIP transitions when items rebalance.
- Virtualization for very large item counts.
- SSR height estimation (first paint is round-robin; client rebalances on mount).
