# `Split` — master–detail layout primitive — Design

**Date:** 2026-06-10
**Status:** Approved (design)
**Package:** `@eocrm/design-system`

## Problem

The vertical `Tabs` orientation (shipped in v0.1.33) is meant for master–detail
screens — a narrow vertical rail beside a filling detail panel. But the library
has **no primitive that expresses that two-pane layout**:

- `Cluster` is a wrapping flex row. With a narrow preview width and a panel that
  has a `min-width`, the panel wraps _below_ the rail (the exact bug reported on
  the Tabs demo). `Cluster`'s own JSDoc lists "Cluster as a 2-column layout" as
  an anti-pattern.
- `Grid` only does N equal columns (`columns`) or auto-fit (`minColumnWidth`) —
  it cannot express "intrinsic-width aside + filling main."
- `Rail` is the collapsible **app navigation** sidebar; `AppLayout` is the
  **viewport shell** (sidebar + topbar + content). Neither is an _in-page_
  two-pane container.

The Tabs JSDoc `@example` and the AGENTS.md Tabs snippet shipped in v0.1.33
both recommend `<Cluster>` for this layout — i.e. the broken anti-pattern is in
the published guidance, not just the demo.

## Solution

A new layout-owning primitive, **`Split`**, that renders a CSS grid
`grid-template-columns: auto 1fr` (or `1fr auto` for `side="end"`): an
intrinsic-width `aside` beside a filling `main`. It never wraps; on narrow
widths `main` shrinks (`min-width: 0`) while `aside` keeps its width.

Then fix the Tabs bug at its three sites by switching them from `Cluster` to
`Split`: the `TabsDemo` vertical example, the Tabs component JSDoc `@example`,
and the AGENTS.md Tabs snippet.

`Split` is a sibling of `Stack` (vertical) / `Cluster` (horizontal-wrap) /
`Grid` (2D equal/auto-fit), and — like `Stack`/`Cluster`/`Grid`/`AppLayout`/
`Page`/`Screen` — a documented exception to the "components don't own layout"
rule: it owns ONLY its internal grid (template columns, gap, item alignment) and
sets no outer margin/position/width.

## Public API

Slot-based, mirroring `AppLayout`'s `sidebar=` / `topBar=` slots (asymmetric
layouts read better as named slots than as ordered children).

```tsx
<Split aside={<Tabs orientation="vertical" … />} gap="lg">
  <SectionPanel id={section} />   {/* main = children */}
</Split>
```

### Props (`SplitProps extends HTMLAttributes<HTMLDivElement>`)

| Prop         | Type                                             | Default   | Notes                                                                                                                                                                                                                                                                                                    |
| ------------ | ------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aside`      | `ReactNode`                                      | required  | The narrow pane (rail / nav / filters). Rendered in its own grid cell.                                                                                                                                                                                                                                   |
| `children`   | `ReactNode`                                      | —         | The main, filling pane.                                                                                                                                                                                                                                                                                  |
| `side`       | `SplitSide = 'start' \| 'end'`                   | `'start'` | Which side `aside` sits on. Implemented with logical grid order so it is RTL-aware.                                                                                                                                                                                                                      |
| `asideWidth` | `string`                                         | `'auto'`  | The `aside` column track size. `'auto'` = intrinsic (sizes to content). Pass a CSS length (e.g. `'240px'`) to pin it — avoids reflow of `main` when `aside` content changes width. Written to a CSS custom property consumed by the grid template (no raw value in a property the consumer can't theme). |
| `gap`        | `SplitGap = 'xs'\|'sm'\|'md'\|'lg'\|'xl'\|'2xl'` | `'md'`    | Gap between the two panes. Same scale + camelCase token names as Stack/Cluster/Grid.                                                                                                                                                                                                                     |
| `align`      | `SplitAlign = 'start' \| 'stretch' \| 'center'`  | `'start'` | Cross-axis (`align-items`): `start` = panes hug the top; `stretch` = `aside` matches `main` height (full-height bordered rail); `center` = vertically centered.                                                                                                                                          |

`forwardRef<HTMLDivElement>`; spreads `{...props}` (consumer-wins / Pattern A,
like Stack/Cluster/Grid — Split has no ARIA contract to protect). Exports
`Split` + `SplitProps`, `SplitSide`, `SplitGap`, `SplitAlign`.

### Exported union types

- `SplitSide` — `'start' | 'end'`.
- `SplitGap` — reuse `GridGap`/`StackGap` scale values (`'xs'…'2xl'`) so the
  scale stays synchronized across layout primitives. Define a local
  `SplitGap` type for a clean public surface (matching how `Grid` defines
  `GridGap`).
- `SplitAlign` — `'start' | 'stretch' | 'center'`.

## Behavior

- **Grid, not flex.** `display: grid`. `side="start"` →
  `grid-template-columns: var(--split-aside-width, auto) 1fr`; `side="end"` →
  `1fr var(--split-aside-width, auto)`. The `aside` slot is placed in the
  correct cell per `side`.
- **No wrap / no stacking in v1.** The grid keeps both panes on one row at all
  widths. `main` cell gets `min-width: 0` so its content shrinks (and can scroll
  internally) instead of overflowing or pushing the `aside`. Responsive
  stacking is explicitly out of scope for v1 (YAGNI); it can be added later
  behind a prop without breaking this API.
- **`asideWidth`** is applied via an inline CSS custom property
  (`style={{ '--split-aside-width': asideWidth }}`) read by the SCSS grid
  template, defaulting to `auto`. This keeps the dynamic value off the SCSS
  (which stays tokens-only) while not hard-coding a width in the component CSS.
- **No forced semantics / no `as` in v1.** Plain `<div>` container + two cell
  `<div>`s. Consumers add landmarks/roles if needed. (Matches how `Grid`
  began.)

## SCSS / tokens (Rule 3 + Rule 4)

- `Split.module.scss`: only `display: grid`, `grid-template-columns`,
  `gap: var(--split-gap-…)`, `align-items`, and `min-width: 0` on the main
  cell. No `margin`, no `position`, no `top/left/right/bottom`, no `width`
  other than the grid track variable, no `flex-grow`. `1fr`/`auto` in
  `grid-template-columns` are intrinsic grid keywords (not raw lengths), the
  same way `Grid.module.scss` already uses `1fr`/`minmax(...)` — permitted.
- `Split.tokens.scss`: `--split-gap-xs … --split-gap-2xl`, each defaulting to
  the matching `--space-*` primitive (mirror `Grid.tokens.scss` /
  `Cluster.tokens.scss`).

## Wiring / Core invariant (new component)

1. `src/components/Split/` — `Split.tsx`, `Split.module.scss`,
   `Split.tokens.scss`, `Split.test.tsx`, `index.ts`.
2. `src/index.ts` — `export { Split }` + `export type { SplitProps, SplitSide,
SplitGap, SplitAlign }`.
3. Playground demo `packages/playground/src/pages/components/SplitDemo.tsx`
   (DemoLayout + Example), wired into: `App.tsx` route
   `/components/split`; `AppShell.tsx` `componentGroups` **Layout** group;
   `ComponentsIndex.tsx` overview card; mockup `registry.ts` `ComponentName`
   union (so future mockups can reference it).
4. JSDoc on the component + every prop (Rule 7), with `@remarks When NOT to
use` / `Anti-patterns` blocks.
5. `AGENTS.md` — one-section `### <Split>` TL;DR + canonical snippet, placed
   near the other layout primitives (Stack/Cluster/Grid).
6. Manifest — add `Split: 'Layout'` to **both** `src/_meta/manifest.ts` and
   `scripts/generate-manifest.mjs` CLUSTERS maps, then
   `npm run build:manifest`.

## Tabs bug fix (same PR)

- `TabsDemo.tsx` — vertical example wraps the rail + detail `Card` in
  `<Split aside={<Tabs … vertical />}><Card …/></Split>` (replacing the
  wrapping `Cluster gap="lg" align="start"`).
- `Tabs.tsx` JSDoc `@example` — `<Cluster …>` → `<Split aside={…}>…</Split>`.
- `AGENTS.md` Tabs section vertical snippet — same `Cluster` → `Split` swap.

## Tests (Rule 1)

`Split.test.tsx` covers:

- Renders the `aside` node and the `children` (main) without crashing.
- Renders a single grid container with two cells; `aside` content and `children`
  content are both present and distinct.
- `side="start"` vs `side="end"` — the aside cell is ordered before vs after the
  main cell in the DOM/visual order (assert via the grid template or cell order).
- `gap` options map to the right class.
- `align` options map to the right class (`start`/`stretch`/`center`).
- `asideWidth` sets the `--split-aside-width` custom property inline (and is
  `auto` / absent when not provided).
- `className` from props is merged, not replaced.
- `ref` is forwarded to the container `<div>`.
- Native HTML attributes (`data-*`, `aria-*`) spread onto the container.

(jsdom has no layout engine — tests assert classes / inline custom property /
DOM cell order, not pixel geometry. The real side-by-side rendering is verified
in the playground.)

## Acceptance

- New `Split` satisfies the Core invariant + Hard rules 1–7, 9.
- `make test` / `make build-lib` / `make lint` / `npm run format:check` green;
  `npm pack --dry-run` leaks nothing.
- Manifest drift test passes (both maps in sync, regenerated JSON committed).
- The Tabs demo vertical example renders the detail panel **to the right of**
  the rail at the demo's preview width (the reported bug is gone) — verified in
  the running playground.
- Ships as the next library patch (v0.1.34).

## Out of scope (v1)

- Responsive stacking / breakpoint reflow.
- Resizable splitter / drag handle.
- Polymorphic `as` / forced landmark semantics.
- More than two panes.
