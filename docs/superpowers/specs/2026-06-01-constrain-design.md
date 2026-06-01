# `<Constrain>` — width / flex constraint primitive

## Goal

A layout primitive that carries the width and flex properties `Stack`/`Cluster` deliberately can't
(Rule 4 keeps them spacing-only). It closes the `<Box>` / `<Constrain>` `TODO.md` gap — the raw
`<div style={{ …minWidth: 320px… }}>` the Members seats card hand-rolls, and the search inputs that
currently stretch full-width.

```tsx
<Constrain maxWidth="sm">
  <Input placeholder="Search…" />
</Constrain>

<Cluster wrap={false} gap="sm">
  <Constrain flex="grow"><Progress value={x} max={y} /></Constrain>
  <Button>Upgrade plan</Button>
</Cluster>
```

## Locked-in decisions (brainstorm)

1. **Name:** `Constrain` (precise + self-limiting — not a generic `Box` that accretes style props).
2. **Width = a named, tokenized scale.** `width` / `minWidth` / `maxWidth` take `'xs' | 'sm' | 'md' |
'lg' | 'xl' | 'full'`, mapped to a new `--measure-*` width-token scale. No raw px at call sites.
3. **`flex` prop:** `'grow' | 'shrink' | 'auto' | 'none'` — how the box behaves as a flex child.
4. **Layout-owning primitive** (the documented Rule-4 exception, like `Page`/`Grid`/`Screen`): it
   intentionally sets `width`/`min-width`/`max-width`/`flex`. A plain `<div>` — **no internal layout**
   (compose `Cluster`/`Stack` inside for that).
5. **Mock refactor:** Members seats card → `<Cluster wrap={false}>` + `<Constrain flex="grow">` around
   the Progress (responsive, replaces the 320px floor); Contacts + Members search `<Input>` →
   `<Constrain maxWidth="sm">`. Ticks the `<Box>` TODO (shipped as `<Constrain>`).

## New token scale

Add to `src/styles/tokens.scss` `:root` (a new design-token category — content/container measure widths,
distinct from `--space-*` gaps and `--size-*` control sizes):

```scss
--measure-xs: 200px;
--measure-sm: 320px; // search inputs, the seats Progress row
--measure-md: 448px;
--measure-lg: 640px;
--measure-xl: 800px;
```

`full` is the keyword `100%` (not a token). The scale is a shared primitive — `Constrain` consumes
`--measure-*` directly, so it needs no `Constrain.tokens.scss` (like `BrandIcon`, which also ships only
the four structure-required files).

## Architecture

`forwardRef<HTMLDivElement>`, Pattern A (`{...rest}` last). A plain block `<div>` with per-size classes
— mirrors how `Stack`/`Cluster` apply their gap scale (no inline style).

```tsx
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Constrain.module.scss';

/** Named width step → a `--measure-*` token; `'full'` = 100%. */
export type ConstrainWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

/** How the box behaves as a flex child. */
export type ConstrainFlex = 'grow' | 'shrink' | 'auto' | 'none';

export interface ConstrainProps extends HTMLAttributes<HTMLDivElement> {
  /** Fixed width — a named step (`xs`–`xl`) or `full` (100%). */
  width?: ConstrainWidth;
  /** Minimum width floor. */
  minWidth?: ConstrainWidth;
  /** Maximum width cap (the common case — e.g. a search input at `sm`). */
  maxWidth?: ConstrainWidth;
  /**
   * Flex behavior as a child of a flex row/column (`Cluster`/`Stack`).
   * - `grow` — fill remaining space (`flex: 1 1 0`).
   * - `auto` — size to content, may grow/shrink (`flex: 1 1 auto`).
   * - `shrink` — don't grow, may shrink (`flex: 0 1 auto`, the flex default).
   * - `none` — fixed, never grow/shrink (`flex: 0 0 auto`).
   */
  flex?: ConstrainFlex;
  children: ReactNode;
}

export const Constrain = forwardRef<HTMLDivElement, ConstrainProps>(function Constrain(
  { width, minWidth, maxWidth, flex, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(
        width && styles[`w-${width}`],
        minWidth && styles[`minW-${minWidth}`],
        maxWidth && styles[`maxW-${maxWidth}`],
        flex && styles[`flex-${flex}`],
        className,
      )}
      // {...rest} last so consumer overrides win (Pattern A). Constrain has no
      // locked attributes; even a one-off inline style can still override.
      {...rest}
    >
      {children}
    </div>
  );
});
```

## SCSS (`Constrain.module.scss`)

Per-size classes generated with a SCSS `@each` over the scale names (DRY — the value lives once in the
`--measure-*` token). The `flex` values use the **`flex` shorthand**, not the `flex-grow`/`flex-basis`
longhands stylelint's `property-disallowed-list` forbids; `width`/`min-width`/`max-width` are not in that
list, and `100%` / `var(--measure-*)` satisfy `declaration-strict-value` (which only governs
color/background/border/opacity).

```scss
// No base class — a Constrain with no props is a plain <div>; all styling comes
// from the width/flex modifier classes below (so there's no empty/redundant base
// ruleset). Mirrors how Stack/Cluster carry their scale in modifier classes.

@each $name in xs, sm, md, lg, xl {
  .w-#{$name} {
    width: var(--measure-#{$name});
  }
  .minW-#{$name} {
    min-width: var(--measure-#{$name});
  }
  .maxW-#{$name} {
    max-width: var(--measure-#{$name});
  }
}

.w-full {
  width: 100%;
}
.minW-full {
  min-width: 100%;
}
.maxW-full {
  max-width: 100%;
}

.flex-grow {
  flex: 1 1 0;
}
.flex-auto {
  flex: 1 1 auto;
}
.flex-shrink {
  flex: 0 1 auto;
}
.flex-none {
  flex: 0 0 auto;
}
```

> If the linter rejects the bare `@each`, the plan expands the loop to explicit classes — but `@each`
> generating non-empty rules is standard scss and expected to pass stylelint.

## Files

| File                                                                             | Change                                                                                       |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/design-system/src/styles/tokens.scss`                                  | MODIFY — add the `--measure-*` scale                                                         |
| `packages/design-system/src/components/Constrain/Constrain.tsx`                  | NEW — component + props + JSDoc                                                              |
| `packages/design-system/src/components/Constrain/Constrain.module.scss`          | NEW                                                                                          |
| `packages/design-system/src/components/Constrain/Constrain.test.tsx`             | NEW                                                                                          |
| `packages/design-system/src/components/Constrain/index.ts`                       | NEW                                                                                          |
| `packages/design-system/src/index.ts`                                            | MODIFY — re-export                                                                           |
| `packages/design-system/src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` | MODIFY — `Constrain: 'Layout'`                                                               |
| `packages/design-system/src/components.manifest.json`                            | REGEN                                                                                        |
| `packages/design-system/AGENTS.md`                                               | MODIFY — Layout TL;DR                                                                        |
| `packages/design-system/src/components/TODO.md`                                  | MODIFY — tick `<Box>` (shipped as `<Constrain>`)                                             |
| `packages/playground/src/pages/components/ConstrainDemo.tsx`                     | NEW — demo                                                                                   |
| `packages/playground/src/App.tsx`                                                | MODIFY — `/components/constrain` route                                                       |
| `packages/playground/src/layout/AppShell/AppShell.tsx`                           | MODIFY — Layout nav entry (a lucide icon, plan picks one)                                    |
| `packages/playground/src/pages/components/ComponentsIndex.tsx`                   | MODIFY — overview card                                                                       |
| `packages/playground/src/pages/mockups/registry.ts`                              | MODIFY — `ComponentName` union gains `Constrain`; add to Members + Contacts `usesComponents` |
| `packages/playground/src/pages/mockups/Members/Members.tsx`                      | MODIFY — seats card + search input                                                           |
| `packages/playground/src/pages/mockups/Contacts/Contacts.tsx`                    | MODIFY — search input                                                                        |

## Tests (`Constrain.test.tsx`)

- Renders children inside a `<div>`; `forwardRef` → the div.
- No props → a plain `<div>` with no width/flex modifier classes.
- `maxWidth="sm"` → `maxW-sm` class; `minWidth="sm"` → `minW-sm`; `width="md"` → `w-md`; `width="full"` →
  `w-full`.
- `flex="grow"` → `flex-grow` class; each of `shrink`/`auto`/`none` → its class.
- Multiple constraints compose (e.g. `maxWidth="lg" flex="grow"` → both classes present).
- `className` merges; other attrs (`data-*`, a consumer `style`) spread onto the div.

(Class-name assertions via `.className).toMatch(/maxW-sm/)`, mirroring `Stack`/`Cluster` tests.)

## Demo (`ConstrainDemo.tsx`)

`DemoLayout` + `Example` blocks: the `maxWidth` scale (xs→xl bars + full); `minWidth` floor; `flex="grow"`
filling a `Cluster` row next to a fixed button (the Members pattern); a search-input `maxWidth="sm"`
example. Wired into `App.tsx` (`/components/constrain`), AppShell **Layout** group, `ComponentsIndex`.

## Mock refactor (ticks the `<Box>` TODO)

- **Members seats card** (`Members.tsx`): replace the `{/* TODO: replace when <Box width> ships */}` +
  inline `<div style={{ display:flex, alignItems, gap, minWidth:320px }}>` wrapping `<Progress>` +
  `<Button>` with:

  ```tsx
  <Cluster wrap={false} gap="sm">
    <Constrain flex="grow">
      <Progress value={seatsUsed} max={seatLimit} size="sm" />
    </Constrain>
    <Button variant="secondary" size="sm">
      Upgrade plan
    </Button>
  </Cluster>
  ```

  (`flex="grow"` makes the bar fill the row responsively — better than the fixed 320px floor. The plan
  verifies the surrounding seats-card `Cluster` still lays out correctly; if the responsive fill reads
  worse than the original fixed width, fall back to `<Constrain minWidth="sm">` around the row.)

- **Search inputs** (`Members.tsx`, `Contacts.tsx`): wrap the search `<Input>` in
  `<Constrain maxWidth="sm">` so it stops stretching full-width (the TODO's "re-evaluate the search-input
  constraints").

- `registry.ts`: add `'Constrain'` to the `ComponentName` union and to the `members` + `contacts`
  `usesComponents` arrays.

- `TODO.md`: tick the `<Box>` entry `[x]`, note it **shipped as `<Constrain>`** with the named
  `--measure-*` width scale + `flex` prop, and that the Members seats card + the Contacts/Members search
  inputs were refactored.

## When NOT to use (JSDoc `@remarks` + AGENTS.md)

- Spacing or arranging children → `<Stack>` / `<Cluster>` / `<Grid>`. `Constrain` does **not** lay out
  its children; it only sizes its own box. Put a layout primitive _inside_ it.
- A bordered surface / padded container → `<Card>`. `Constrain` has no padding, border, or background.
- Centering a page-width column → that's fine (`<Constrain maxWidth="lg">` + a centering parent), but for
  full-bleed screens use `<Screen>`.
- Anti-pattern: ❌ reaching for `Constrain` to add `margin`/`padding` — it carries width/flex only.

## Out of scope (v1)

- Height constraints (`minHeight`/`maxHeight`), padding/margin, `as` polymorphism.
- Arbitrary px / free-string widths (named `--measure-*` scale only).
- A numeric `flex` value (the four-keyword enum only).
- Centering helper (`marginInline: auto`) — compose with the parent's layout instead.
