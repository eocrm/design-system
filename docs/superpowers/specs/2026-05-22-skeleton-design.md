# Skeleton — design spec

**Date:** 2026-05-22
**Branch:** `feat/skeleton`
**Scope:** New `<Skeleton>` primitive — shimmer/pulse placeholder block for loading states.

## Goal

A single, dumb primitive that paints a token-colored placeholder rectangle, optionally animated. Consumers compose multiple `<Skeleton>`s in any layout to mimic the eventual content shape while it loads.

## Why now

DataTable v1 needs a loading state. So does every other "data-fetched-from-server" screen in the CRM. Shipping Skeleton first unblocks DataTable AND gives every consumer a primitive to use everywhere else (card placeholders, list rows, mockup data slots).

## Architecture

```tsx
<Skeleton variant="text" />
<Skeleton variant="circular" width={32} height={32} />
<Skeleton variant="rectangular" width="100%" height={120} />
```

- Single `<span>` (or `<div>` for rectangular) with a token-colored background.
- Optional CSS animation cycles opacity to suggest "loading" without being distracting.
- No children. Skeleton is a leaf — consumers compose multiple in a `<Stack>` / `<Cluster>` to build complex placeholders.

## Public API

```ts
export type SkeletonVariant = 'text' | 'circular' | 'rectangular';
export type SkeletonAnimation = 'pulse' | 'none';

export interface SkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Shape preset. Defaults to `'text'`.
   * - `'text'` — inline-block, height defaults to `1em` so it sits on text baselines. Use inside paragraphs / labels for word-shaped placeholders.
   * - `'circular'` — `border-radius: 50%`; width = height when only one is set. Avatar / icon placeholder.
   * - `'rectangular'` — block, small radius. Image / card / button placeholder.
   */
  variant?: SkeletonVariant;
  /** Explicit width. Number → px, string → as-is (e.g., `'60%'`, `'12rem'`). */
  width?: number | string;
  /** Explicit height. Number → px, string → as-is. Variant defaults: text=1em, circular=`width` (square), rectangular=no default. */
  height?: number | string;
  /**
   * Animation. Defaults to `'pulse'`.
   * - `'pulse'` — opacity 1 → 0.6 → 1, 1.5s ease-in-out infinite. Low-cost, hardware-accelerated.
   * - `'none'` — static (no animation). Use when stacking many skeletons to avoid motion overload, or when `prefers-reduced-motion` is set (we also respect that at the CSS level).
   */
  animation?: SkeletonAnimation;
}
```

## Visual

| Visual                    | Token                              |
| ------------------------- | ---------------------------------- |
| Background                | `--color-bg-muted` (`#f4f5f7`)     |
| Pulse opacity range       | 1 → 0.6 → 1                        |
| Pulse duration            | 1.5s ease-in-out infinite          |
| Border radius (text)      | `--radius-sm`                      |
| Border radius (circular)  | `--radius-full`                    |
| Border radius (rectangular)| `--radius-md`                     |

No new tokens. Inline `@keyframes pulse` defined in the SCSS module.

`@media (prefers-reduced-motion: reduce)`: animation is suppressed regardless of the `animation` prop.

## States

- **Default (pulse)** — token-muted bg with the opacity cycle.
- **`animation="none"`** — same bg, no animation. Used when N skeletons would create distracting motion (e.g., a long table loading 50 rows).
- **Reduced motion** — pulse suppressed via media query; bg stays static.

## A11y

- Skeleton is purely visual. Renders with `aria-hidden="true"` by default — AT users get nothing from the placeholder shape itself; they should hear "loading…" from a parent live region.
- Consumer can override `aria-hidden` (e.g., a top-level loading region that wants its own `aria-busy="true"` + label).

## File layout

```
packages/design-system/src/components/Skeleton/
  Skeleton.tsx
  Skeleton.module.scss
  Skeleton.test.tsx
  index.ts
```

Top-level `src/index.ts` re-exports `Skeleton`, `SkeletonProps`, `SkeletonVariant`, `SkeletonAnimation`.

## Tests

- Renders a span by default.
- `variant="text"` (default) applies the text class + height defaults to `1em`.
- `variant="circular"` applies the circular class + when only `width` is set, `height` matches.
- `variant="rectangular"` applies the rectangular class.
- `width` / `height` flow through to inline `style` (number → `px`, string → as-is).
- `animation="none"` does NOT apply the pulse class; default applies it.
- `aria-hidden="true"` by default; consumer can override.
- `ref` forwards to the root element.
- `className` merges, does not replace.

## Playground demo

`SkeletonDemo.tsx` — 7 examples:

1. **Text** — single text-line skeleton inline with real text ("Loading…")
2. **Multi-line text** — three text skeletons stacked, varied widths (`80%`, `60%`, `40%`) to mimic a paragraph
3. **Circular** — 32px and 40px circles (avatar placeholders)
4. **Rectangular** — image / button / card placeholders at different sizes
5. **Card composition** — Circle + 2 text lines + rectangle in a Card; the canonical "list row loading" shape
6. **Animation none** — five rectangles stacked, no animation
7. **Inside a Table** — placeholder rows (DataTable preview): a real `<Table>` with 5 body rows containing `<Skeleton>` cells

## AGENTS.md

Add `<Skeleton>` section in the Display group, right before `<Avatar>` alphabetically — or wherever it fits the existing groupings.

## Non-goals

- **Skeleton.Group / preset compounds** (e.g., `<Skeleton.Avatar>`, `<Skeleton.Card>`). YAGNI for v1; consumers compose what they need.
- **Shimmer animation** (gradient sweep). More expensive, more flashy; defer to v2 if a screen demands it.
- **Variant-specific defaults that change at different sizes** (e.g., text height tracking parent font). The `height: 1em` default handles the text case; consumer passes explicit `height` for the rectangular case.

## Risks / open questions

- **`aria-hidden="true"` by default** — correct for the common case (parent communicates loading). If a consumer renders a lone Skeleton with no parent loading indicator, AT users see nothing. Acceptable; documented in JSDoc.
- **Reduced-motion suppression at the CSS level** — applied unconditionally via `@media (prefers-reduced-motion: reduce)`. Means even `animation="pulse"` falls back to static when the user has reduced-motion on. No way to opt out (which is the right call).
- **No "shimmer" variant** — pulse is cheap and unintrusive. If a brand-y consumer wants gradient shimmer, that's a separate prop later.
- **Tokens chosen for the bg are NEUTRAL gray, not consumer-themed.** A future theme that recolors `--color-bg-muted` will recolor the skeleton automatically. No further theming hooks needed in v1.
