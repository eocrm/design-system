# `<Indent>` — nested-content indentation primitive — Design

**Status:** design approved (user said "yes"), ready for plan
**Date:** 2026-06-24
**Component:** `@eocrm/design-system` → `src/components/Indent/`
**Resolves:** GitHub issue eocrm/design-system#196

## Goal

A first-class, DS-native way to **indent nested content by a level/gutter** without
inline CSS or raw HTML. The driving use case is the eoCRM **threaded comments tree**
(replies nest up to 3 levels) — each nesting level needs a consistent left gutter so
the hierarchy is legible. Today the only DS-native option is to abuse `Split`
(`side="start"` with an empty fixed-width `aside`), which isn't what `Split`
(master–detail) is for and reads awkwardly recursively. This retires the
`apps/web/src/shared/ds-shims/Indent.tsx` shim.

## Resolved decisions (from brainstorm)

1. **Standalone `<Indent>` component** (NOT a `gutter`/`indent` prop on `Stack`). Matches
   the existing single-purpose layout-primitive family (`Constrain`, `Rail`, `Split`).
   `Stack` stays deliberately spacing-only.
2. **`level × gutter` magnitude.** `level` is the nesting depth (multiplies the gutter);
   `gutter` is a named spacing step. Mechanism is a CSS custom property + `calc()`, so
   `level` is unbounded (no enumerated cap), matching the `Split`/`Grid`/`DefinitionList`
   precedent of driving a dynamic dimension via a `--var` set in `style`.
3. **RTL-aware via `padding-inline-start`** (logical property → left gutter in LTR, right
   in RTL, automatically).

## Architecture

```
src/components/Indent/
  Indent.tsx            ← (new) forwardRef<HTMLDivElement> + spread, full JSDoc
  Indent.module.scss    ← (new) .indent + .gutter-* classes (tokens only)
  Indent.tokens.scss    ← (new) --indent-gutter-* defaulting to --space-*
  Indent.test.tsx       ← (new)
  index.ts              ← (new)
```

`<Indent>` pads **its own box** only — it does not lay out its children (mirrors
`Constrain`, which sizes its own box only). Put a layout primitive (`Stack`/`Cluster`)
_inside_ it when you need both. A single child or a wrapper both work.

## Public API

```ts
/** Per-level indent size — a spacing step. */
export type IndentGutter = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface IndentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Nesting depth — multiplies the gutter. `0` = flush (no indent, e.g. a
   * root-level comment). Defaults to `1` (one gutter). Negative values clamp to `0`.
   */
  level?: number;
  /**
   * Per-level indent size — a spacing step. Defaults to `'lg'` (16px per level).
   * - `xs` 4px · `sm` 8px · `md` 12px · `lg` 16px · `xl` 24px · `2xl` 32px
   */
  gutter?: IndentGutter;
  /** The nested content to indent. Required — an Indent with nothing inside indents nothing. */
  children: ReactNode;
}

export const Indent: React.ForwardRefExoticComponent<
  IndentProps & React.RefAttributes<HTMLDivElement>
>;
```

Consumer usage — a flat comment list rendered at known depths:

```tsx
{
  comments.map((c) => (
    <Indent key={c.id} level={c.depth}>
      <CommentCard comment={c} />
    </Indent>
  ));
}
```

…or physically nested (compounds because padding stacks):

```tsx
<Indent>
  Reply A<Indent>Reply A.1</Indent>
</Indent>
```

## Mechanism

`Indent.tsx` (Pattern A — `{...rest}` last so the consumer wins; but `style` is merged
explicitly so a consumer `style` can't clobber the level var, exactly like `Split`):

```tsx
export const Indent = forwardRef<HTMLDivElement, IndentProps>(function Indent(
  { level = 1, gutter = 'lg', className, style, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(styles.indent, styles[`gutter-${gutter}`], className)}
      style={{ ['--indent-level' as string]: Math.max(0, level), ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </div>
  );
});
```

`Indent.module.scss`:

```scss
@use './Indent.tokens';

.indent {
  // padding-inline-start → left gutter in LTR, right in RTL (logical property).
  // padding (not margin) keeps this clean under Hard rule 4.
  padding-inline-start: calc(var(--indent-level, 1) * var(--indent-gutter));
}

.gutter-xs {
  --indent-gutter: var(--indent-gutter-xs);
}
.gutter-sm {
  --indent-gutter: var(--indent-gutter-sm);
}
.gutter-md {
  --indent-gutter: var(--indent-gutter-md);
}
.gutter-lg {
  --indent-gutter: var(--indent-gutter-lg);
}
.gutter-xl {
  --indent-gutter: var(--indent-gutter-xl);
}
.gutter-2xl {
  --indent-gutter: var(--indent-gutter-2xl);
}
```

(A `.gutter-*` class is ALWAYS present because `gutter` defaults to `'lg'`, so
`--indent-gutter` is always defined.)

`Indent.tokens.scss` (component tokens default to the `--space-*` primitives — same
name→px mapping as `Stack` gap):

```scss
:root {
  --indent-gutter-xs: var(--space-1); // 4px
  --indent-gutter-sm: var(--space-2); // 8px
  --indent-gutter-md: var(--space-3); // 12px
  --indent-gutter-lg: var(--space-4); // 16px
  --indent-gutter-xl: var(--space-6); // 24px
  --indent-gutter-2xl: var(--space-8); // 32px
}
```

## Rules compliance

- **Hard rule 4 (no layout props):** `<Indent>` uses `padding-inline-start` only — `padding`
  is NOT in the forbidden list (`margin`/`position`/`top…`/`flex`/`width`/`grid-*` are).
  No exception needed. It IS a dedicated layout primitive (like `Constrain`), so even the
  spirit of the rule is satisfied — indentation is its single, explicit purpose.
- **Hard rule 3 (tokens only):** every value is a `var(--…)`; the `calc()` multiplies a
  CSS var by a token. No raw values.
- **Hard rule 6 (forwardRef + spread):** `forwardRef<HTMLDivElement>`, spreads `HTMLAttributes`.
- **Hard rule 7 (JSDoc):** component + every prop + `IndentGutter` documented; `@remarks`
  When-NOT-to-use + anti-patterns (below).
- **Hard rule 9 (i18n):** none needed — `<Indent>` renders no user-facing strings.

JSDoc `@remarks`:

- **When NOT to use:** vertical spacing between siblings → `<Stack gap>`; a bordered/padded
  surface → `<Card>`; arranging children in a row → `<Cluster>`. Indent only adds a leading
  inline gutter to its own box.
- **Anti-patterns:** ❌ using `<Indent>` for general left padding on non-nested content (it's
  for hierarchy/depth — reach for the parent layout's spacing otherwise); ❌ passing a
  fractional/huge `level` (it's a depth count); ❌ expecting it to arrange children — wrap a
  `<Stack>` inside if the indented block has multiple rows.

## Testing

`Indent.test.tsx` (Rule 1):

- renders children; default (`level=1`, `gutter='lg'`) → has `.indent` + `.gutter-lg` classes
  and inline `--indent-level: 1`.
- `level={0}` → `--indent-level: 0` (flush); `level={3}` → `--indent-level: 3`.
- negative `level` (e.g. `-2`) clamps to `0`.
- each `gutter` option (`xs`…`2xl`) renders the matching `.gutter-*` class.
- `ref` forwarded to the `<div>`.
- `className` from props is merged, not replaced.
- consumer `style` is merged and does NOT clobber `--indent-level` (e.g. pass
  `style={{ background: 'red' }}` → both the background and the level var are present).
- arbitrary HTML attrs spread (e.g. `data-testid`, `role`).

## Packaging (Core invariant — new component)

- **Component + tests** beside it (above).
- **Exports** from `src/index.ts`: `Indent`, `IndentProps`, `IndentGutter` (+ re-export from
  `Indent/index.ts`).
- **Manifest CLUSTERS:** `Indent: 'Layout'` in BOTH `src/_meta/manifest.ts` AND
  `scripts/generate-manifest.mjs`; then `npm run build:manifest` (entry: `tier: "primitive"`,
  `cluster: "Layout"`). Commit the regenerated JSON.
- **Demo page** `packages/playground/src/pages/components/IndentDemo.tsx` — a realistic eoCRM
  **threaded comments tree**: a flat list of comments each with a `depth` (0–2), rendered via
  `<Indent level={depth}>`, so 3 nesting levels are visible; plus a second example varying
  `gutter`. Wire into: `App.tsx` route `/components/indent`; `layout/AppShell/navItems.ts`
  **Layout** group; `pages/components/ComponentsIndex.tsx` overview card; `pages/mockups/registry.ts`
  `ComponentName` union (`'Indent'`).
- **AGENTS.md** TL;DR in the layout-primitives area: `<Indent level gutter>`, the
  `level × gutter` semantics, RTL note, "pads its own box; wrap a Stack inside for multi-row".

## Risks / decisions (resolved)

- **Unbounded `level`:** handled by the CSS-var + `calc()` mechanism (no enumerated cap), per
  established `Split`/`Grid` precedent. Negative clamps to 0 in JS.
- **`padding` vs `margin`:** padding is used so the indented box's background/border (if any
  wrapper adds one) spans the full width and the gutter is part of the box — and it sidesteps
  Hard rule 4's `margin` ban entirely.
- **RTL:** `padding-inline-start` is logical; no extra work.
- **Default `gutter='lg'` (16px)** and **default `level=1`:** a bare `<Indent>` indents once by
  16px — the intuitive reading of "indent this".
