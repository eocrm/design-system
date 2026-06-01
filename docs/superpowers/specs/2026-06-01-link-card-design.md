# `<LinkCard>` — clickable, full-surface Card

## Goal

A Card-surfaced container whose entire area is a single click target (router link / href / button), with
a hover lift and a keyboard focus ring. Closes the last `<NavCard>` `TODO.md` gap — the index grids that
currently fake it with a router `<Link>` wrapping a `<Card>` + inline style (and no hover). Named
`LinkCard` to match the name `Card`'s own JSDoc already promises ("that's a different component,
`LinkCard`, not yet shipped").

```tsx
<LinkCard as={RouterLink} to="/mockups/dashboard" padding="md">
  <Stack gap="xs">
    <Text weight="semibold">Dashboard</Text>
    <Text size="sm" tone="muted">
      KPI cards, pipeline summary, recent activity.
    </Text>
  </Stack>
</LinkCard>
```

## Locked-in decisions (brainstorm)

1. **Name:** `LinkCard` (matches Card's existing JSDoc reference — no Card change needed).
2. **Polymorphic, mirroring `<Link>`.** Generic `as` (default `<a>`), full prop inference for the
   consumer's router Link. `as` subsumes href (`<a>`) / router (`as={RouterLink} to=…`) / button
   (`as="button" onClick=…`). The library keeps no router dependency (Rule 5).
3. **Card-surface parity:** `padding?: CardPadding` (default `'md'`) + `tone?: CardTone` — the _same_
   types/vocabulary as `Card` (imported, single source of truth), reusing `--card-*` tokens so it stays
   pixel-aligned with `Card`.
4. **Subtle hover:** border-color → `--color-border-strong`, shadow `--shadow-sm` → `--shadow-md` (no
   transform); `:focus-visible` → `--ring-accent` / `--ring-width` ring; `transition` on border/shadow,
   disabled under `prefers-reduced-motion`.
5. **Single interactive element** (not a Card wrapped in an anchor) — CSS-modules can't drive a child
   Card's hashed classes on `:hover`, so `LinkCard` IS the card-shaped link.
6. **Cluster:** Navigation (interactive nav element, sibling to `Link`). **Tier:** composition (imports
   Card's `CardPadding`/`CardTone` types — a real dependency on Card's contract).
7. **Refactor both index grids:** `MockupsIndex` (the TODO's mock site) **and** `ComponentsIndex` (same
   hack, dogfood). Ticks the `<NavCard>` TODO (shipped as `<LinkCard>`).

## Architecture

Mirrors `Link`'s polymorphic generic-`forwardRef` + cast pattern exactly.

```tsx
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { type CardPadding, type CardTone } from '../Card';
import styles from './LinkCard.module.scss';

interface LinkCardOwnProps {
  /** Inner padding — same scale as Card. Defaults to `'md'`. */
  padding?: CardPadding;
  /** Optional left-edge tone stripe — same vocabulary as Card. */
  tone?: CardTone;
  children?: ReactNode;
}

/** Polymorphic props helper (identical to Link's). */
type PolymorphicProps<C extends ElementType, P> = P & { as?: C } & Omit<
    ComponentPropsWithoutRef<C>,
    keyof P | 'as'
  >;

/** Public prop type. Generic `C` defaults to `'a'`; `as={X}` brings X's props (incl. `to`). */
export type LinkCardProps<C extends ElementType = 'a'> = PolymorphicProps<C, LinkCardOwnProps>;

type LinkCardComponent = <C extends ElementType = 'a'>(
  props: LinkCardProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] },
) => ReactElement | null;

const paddingClass: Record<CardPadding, string> = {
  none: styles.paddingNone,
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
};

export const LinkCard = forwardRef(function LinkCard<C extends ElementType = 'a'>(
  { as, padding = 'md', tone, className, children, ...props }: LinkCardProps<C>,
  ref: ForwardedRef<Element>,
) {
  const Component = (as || 'a') as ElementType;
  // {...props} first, then our className (merged via clsx) + data-tone — same
  // order as Link, so the consumer's className merges and the surface classes
  // are component-owned.
  return (
    <Component
      ref={ref}
      {...props}
      className={clsx(styles.linkCard, paddingClass[padding], className)}
      data-tone={tone}
    >
      {children}
    </Component>
  );
}) as LinkCardComponent;
```

`import { type CardPadding, type CardTone } from '../Card'` is a real `../Card` import (the `Card` barrel
re-exports both types — verified), so the manifest classifies `LinkCard` as **composition**
(`composes: ['Card']`) — accurate: it's built on Card's padding/tone contract.

### A11y

It renders a real `<a>` (or the consumer's router Link / `<button>`), so it carries native link/button
semantics — the children supply the accessible name (the card title text). `:focus-visible` gives the
keyboard ring. No extra ARIA. (A whole-card link is a standard, accessible pattern; keep the primary
label as the first text so the link's name is meaningful.)

## SCSS (`LinkCard.module.scss` + `LinkCard.tokens.scss`)

Reuses Card's surface tokens; an internal `--link-card-elevation` custom property holds the current
shadow so `:hover` and the per-tone stripe compose cleanly (one elevation var, flipped on hover):

```scss
@use './LinkCard.tokens';

.linkCard {
  --link-card-elevation: var(--link-card-shadow);

  display: block;
  background: var(--card-bg);
  border: var(--border-width) solid var(--card-border-color);
  border-radius: var(--card-radius);
  box-shadow: var(--link-card-elevation);
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  transition: var(--link-card-transition);
}

.linkCard:hover {
  --link-card-elevation: var(--link-card-hover-shadow);
  border-color: var(--link-card-hover-border-color);
}

.linkCard:focus-visible {
  outline: var(--ring-width) solid var(--ring-accent);
  outline-offset: var(--link-card-focus-offset);
}

@media (prefers-reduced-motion: reduce) {
  .linkCard {
    transition: none;
  }
}

// Tone stripe (reuses Card's stripe tokens) layered over the live elevation var,
// so a toned card still gets the hover elevation automatically.
.linkCard[data-tone='accent'] {
  box-shadow:
    inset var(--card-stripe-width) 0 0 var(--card-stripe-color-accent),
    var(--link-card-elevation);
}
.linkCard[data-tone='info'] {
  box-shadow:
    inset var(--card-stripe-width) 0 0 var(--card-stripe-color-info),
    var(--link-card-elevation);
}
.linkCard[data-tone='success'] {
  box-shadow:
    inset var(--card-stripe-width) 0 0 var(--card-stripe-color-success),
    var(--link-card-elevation);
}
.linkCard[data-tone='warning'] {
  box-shadow:
    inset var(--card-stripe-width) 0 0 var(--card-stripe-color-warning),
    var(--link-card-elevation);
}
.linkCard[data-tone='danger'] {
  box-shadow:
    inset var(--card-stripe-width) 0 0 var(--card-stripe-color-danger),
    var(--link-card-elevation);
}

.paddingNone {
  padding: 0;
}
.paddingSm {
  padding: var(--card-padding-sm);
}
.paddingMd {
  padding: var(--card-padding-md);
}
.paddingLg {
  padding: var(--card-padding-lg);
}
```

```scss
// LinkCard.tokens.scss — interactive-state tokens over Card's reused surface tokens.
:root {
  --link-card-shadow: var(--card-shadow); // rest = Card's shadow (--shadow-sm)
  --link-card-hover-shadow: var(--shadow-md);
  --link-card-hover-border-color: var(--color-border-strong);
  --link-card-transition: border-color 120ms ease, box-shadow 120ms ease;
  --link-card-focus-offset: 2px;
}
```

`box-shadow`/`outline`/`transition` are not in stylelint's `declaration-strict-value` list (color /
background / border-color / border-width / opacity only), and `overflow`/`display:block`/`cursor` are
fine; `color: inherit` and `text-decoration: none` are ignored values. `width`/`height` aren't set.

## Files

| File                                                                             | Change                                                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/design-system/src/components/LinkCard/LinkCard.tsx`                    | NEW — component + props + JSDoc                              |
| `packages/design-system/src/components/LinkCard/LinkCard.module.scss`            | NEW                                                          |
| `packages/design-system/src/components/LinkCard/LinkCard.tokens.scss`            | NEW                                                          |
| `packages/design-system/src/components/LinkCard/LinkCard.test.tsx`               | NEW                                                          |
| `packages/design-system/src/components/LinkCard/index.ts`                        | NEW                                                          |
| `packages/design-system/src/index.ts`                                            | MODIFY — re-export                                           |
| `packages/design-system/src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` | MODIFY — `LinkCard: 'Navigation'`                            |
| `packages/design-system/src/components.manifest.json`                            | REGEN                                                        |
| `packages/design-system/AGENTS.md`                                               | MODIFY — Navigation TL;DR                                    |
| `packages/design-system/src/components/TODO.md`                                  | MODIFY — tick `<NavCard>` (shipped as `<LinkCard>`)          |
| `packages/playground/src/pages/components/LinkCardDemo.tsx`                      | NEW — demo                                                   |
| `packages/playground/src/App.tsx`                                                | MODIFY — `/components/link-card` route                       |
| `packages/playground/src/layout/AppShell/AppShell.tsx`                           | MODIFY — Navigation nav entry (lucide icon, plan picks one)  |
| `packages/playground/src/pages/components/ComponentsIndex.tsx`                   | MODIFY — overview card + refactor its own grid onto LinkCard |
| `packages/playground/src/pages/mockups/registry.ts`                              | MODIFY — `ComponentName` union gains `LinkCard`              |
| `packages/playground/src/pages/mockups/MockupsIndex.tsx`                         | MODIFY — refactor the grid onto LinkCard                     |

## Tests (`LinkCard.test.tsx`)

- Renders as an `<a>` by default; children render inside it; `href` passes through.
- `as="button"` renders a `<button>`; `onClick` fires on click. `as={StubLink}` (a tiny test
  component receiving `to`) renders that component and passes `to` through (polymorphic inference works).
- `forwardRef` reaches the rendered element.
- `padding` default `md` → `paddingMd` class; `padding="lg"` → `paddingLg`; `padding="none"` → `paddingNone`.
- `tone="accent"` → `data-tone="accent"` attribute; omitted → no `data-tone`.
- `className` merges with the base `linkCard` class; other attrs spread through.
- (Class-name assertions via `/linkCard/`, `/paddingMd/`, mirroring Link/Card tests.)

## Demo (`LinkCardDemo.tsx`)

`DemoLayout` + `Example` blocks: a router-style card (using a no-op `as` or `href="#"`), an `href`
external card, an `as="button"` action card, the padding scale, the tone stripes, and a 2–3 card grid in
a `<Grid>` (the canonical "index grid" use). Wired into `App.tsx` (`/components/link-card`), AppShell
**Navigation** group, `ComponentsIndex`.

## Refactor (ticks the `<NavCard>` TODO)

- **`MockupsIndex.tsx`** (the mock site): replace the `{/* TODO: replace when <NavCard> ships */}` +
  `<Link to={m.path} style={{ textDecoration:'none', color:'inherit', display:'block' }}><Card
padding="md">…</Card></Link>` with `<LinkCard as={RouterLink} to={m.path} padding="md">…</LinkCard>`
  (drops the inline style + nested Card; gains the hover affordance). Remove the now-unused `Card` import
  if nothing else uses it.
- **`ComponentsIndex.tsx`** (same grid-of-clickable-cards hack — playground tooling, dogfood): refactor
  its card grid onto `<LinkCard>` likewise.
- `registry.ts`: add `'LinkCard'` to the `ComponentName` union. (No registered mockup uses it — the index
  pages aren't registry entries — so no `usesComponents` change.)
- `TODO.md`: tick the `<NavCard>` entry `[x]`, note it **shipped as `<LinkCard>`** (the name Card's JSDoc
  already references) with the polymorphic `as` API + hover/focus affordance, and that MockupsIndex +
  ComponentsIndex were refactored.

## When NOT to use (JSDoc `@remarks` + AGENTS.md)

- Non-interactive grouped content → `<Card>`. LinkCard is for when the **whole** surface navigates/acts.
- Inline text navigation ("View all →") → `<Link>`. LinkCard is a block surface, not inline text.
- A form action / trigger that isn't navigation → `<Button>` (or `<LinkCard as="button">` only when you
  genuinely want a card-shaped button).
- Anti-pattern: ❌ nesting interactive controls (a `<Button>`/`<Link>`) inside a LinkCard — nested
  interactives are invalid/confusing. Keep the card's content non-interactive, or use a plain `<Card>`
  with explicit controls instead.

## Out of scope (v1)

- `overflow="visible"` opt-out (always clips, like the index-grid use needs).
- The compound `Card.Header`/`List`/`ListRow` API inside a LinkCard (a clickable card with internal
  sections is unusual).
- A `disabled` state (render a non-link instead).
- The prominent/lift hover variant (accent border + `--shadow-lg` + transform) — subtle only.
