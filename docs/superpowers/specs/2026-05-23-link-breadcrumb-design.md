# Link + Breadcrumb — design spec

**Date:** 2026-05-23
**Branch:** `feat/link-breadcrumb`
**Scope:** Two related primitives shipped together. (1) `<Link>` — a polymorphic styled anchor with three visual variants (`default` / `muted` / `subtle`). (2) `<Breadcrumb>` — a compound navigation primitive that uses Link internally; auto-detects the last child as the current page.

## Goal

Replace the open-coded link styles scattered across the playground mockups (`.cardLink`, `.nameLink`, `.viewLink`, `.breadcrumb a`) with a single library primitive that handles the visual variants and integrates cleanly with the consumer's router (typically `react-router-dom`, but the library MUST NOT depend on it). Breadcrumb formalizes the inline `<nav><Link>Crumb</Link><Chevron/></nav>` pattern in `ContactDetail.tsx`.

## Why now

- 4 distinct `.\*Link` recipes live in the playground mockups today, each ~10 lines of SCSS. They drift visually because they were written ad-hoc.
- Breadcrumb is open-coded in `ContactDetail.tsx` with an inline `<nav>` + manual `<ChevronRight>` separator. Any future page wanting breadcrumbs would copy this pattern, perpetuating the inconsistency.
- The router-integration concern (library can't depend on `react-router-dom`) is the same for both components, so they share an architectural decision worth solving once.

## Non-goals (v1)

- **No external-link icon.** No automatic `<ExternalLink />` glyph when `target="_blank"`. Consumer composes manually if they want it: `<Link href="..." target="_blank">Docs <ExternalLink size={12} /></Link>`.
- **No `disabled` state.** Native anchors don't have disabled semantics. If you need a non-clickable label, render `<span>` directly (or use `current` on Breadcrumb.Item).
- **No truncation / collapse on Breadcrumb.** No "First > … > Last" collapsing for long crumbs. Add v2 when a real CRM page has 5+ crumbs.
- **No size variants on Link.** The variant covers the look-and-feel axis; size comes from the surrounding text via `font-size: inherit`. Breadcrumb sets `--font-size-sm` on its items.
- **No `underline` prop on Link.** Underline behavior is baked into each variant. Override via className if a one-off truly needs it.
- **No `aria-current` value other than `'page'`** on Breadcrumb.Item. WAI-ARIA's other values (`step`, `location`, etc.) aren't relevant for breadcrumb-trail nav.
- **No nested Breadcrumb compound** (e.g., `Breadcrumb.Separator` as an explicit subcomponent). The separator is a single root-level prop with a sensible default.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- `lucide-react` peer dep — `ChevronRight` icon as default Breadcrumb separator
- Existing tokens: `--color-accent`, `--color-accent-hover`, `--color-fg`, `--color-fg-muted`, `--font-size-sm`, `--space-1`, `--space-2`, `--transition-fast`, `--ring-accent`, `--ring-width`, `--radius-sm`

No new tokens needed.

### File layout

```
packages/design-system/src/components/Link/
  Link.tsx                  ← Polymorphic forwardRef. Default 'a'; consumer passes `as={RouterLink}` for SPA routes.
  Link.module.scss          ← Base + 3 variants (default / muted / subtle) + focus-visible ring
  Link.test.tsx             ← ~14 cases
  index.ts                  ← export { Link } + types

packages/design-system/src/components/Breadcrumb/
  Breadcrumb.tsx            ← Root + Item (Object.assign compound). Auto-current on last child.
  Breadcrumb.module.scss    ← <nav>/<ol>/<li> reset + separator gap + current-page styling
  Breadcrumb.test.tsx       ← ~12 cases
  index.ts                  ← export { Breadcrumb } + types
```

Plus integration points:

- `packages/design-system/src/index.ts` — re-export `Link`, `Breadcrumb`, and types
- `packages/design-system/AGENTS.md` — TL;DR for both (Link goes near other inline primitives; Breadcrumb in a Navigation section)
- `packages/playground/src/pages/components/LinkDemo.tsx` — 6 examples
- `packages/playground/src/pages/components/BreadcrumbDemo.tsx` — 5 examples
- `packages/playground/src/App.tsx` — 2 new routes
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar entries
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview cards
- `packages/playground/src/pages/mockups/registry.ts` — `'Link'` + `'Breadcrumb'` in `ComponentName` union
- **Mockup refactor**: `ContactDetail.tsx` and `ContactDetail.module.scss` — replace inline breadcrumb with `<Breadcrumb>`. Optional follow-up: convert other `.cardLink`/`.nameLink`/`.viewLink` usages to `<Link variant="...">`. Out of scope for v1 unless trivial.

## Public API — Link

```ts
import type { ComponentPropsWithoutRef, ComponentPropsWithRef, ElementType, ReactNode } from 'react';

/** Visual variant. Defaults to 'default'. */
export type LinkVariant = 'default' | 'muted' | 'subtle';

interface LinkOwnProps {
  /**
   * Visual style.
   * - `'default'` — accent color, no underline at rest, underline + accent-hover on hover.
   *   Use for inline CTA links ("View all →", "Read more").
   * - `'muted'` — muted-fg color, no underline, accent-hover on hover.
   *   Use inside breadcrumbs or any low-emphasis nav.
   * - `'subtle'` — full foreground color, no underline at rest, underline + accent-hover on hover.
   *   Use for primary clickable text inside dense surfaces (table name cells, card titles).
   */
  variant?: LinkVariant;
  children?: ReactNode;
}

/**
 * Fully polymorphic via `as`. Defaults to `<a>`. Pass `as={Component}` for any
 * router-aware link primitive (e.g. `react-router-dom`'s `<Link>`); all props
 * the underlying component accepts pass through with full type inference.
 */
type PolymorphicProps<C extends ElementType, P> =
  P & { as?: C } & Omit<ComponentPropsWithoutRef<C>, keyof P | 'as'>;

export type LinkProps<C extends ElementType = 'a'> =
  PolymorphicProps<C, LinkOwnProps>;
```

The `forwardRef` type for a polymorphic component:

```ts
type LinkComponent = <C extends ElementType = 'a'>(
  props: LinkProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] }
) => ReactElement | null;
```

Implementation:

```tsx
export const Link = forwardRef(function Link<C extends ElementType = 'a'>(
  { as, variant = 'default', className, children, ...props }: LinkProps<C>,
  ref: ForwardedRef<Element>,
) {
  const Component = (as || 'a') as ElementType;
  return (
    <Component
      ref={ref}
      {...props}
      className={clsx(styles.link, VARIANT_CLASS[variant], className)}
    >
      {children}
    </Component>
  );
}) as LinkComponent;
```

The outer cast `as LinkComponent` preserves the generic at the call site — `React.forwardRef`'s return type doesn't preserve generics, so this assertion bridges the gap. Common pattern across React polymorphic libraries (Mantine, Chakra v2, Radix Slot).

**Examples**:

```tsx
// External — defaults to <a>
<Link href="https://docs.example.com">Documentation</Link>

// SPA route — pass router's Link
import { Link as RouterLink } from 'react-router-dom';
<Link as={RouterLink} to="/contacts">Contacts</Link>

// Variants
<Link variant="muted" as={RouterLink} to="/x">Subtle nav</Link>
<Link variant="subtle" as={RouterLink} to="/x">Name link</Link>

// Forwards arbitrary props the underlying component accepts
<Link as={RouterLink} to="/x" replace state={{ from: 'here' }}>
  Replace-mode SPA route
</Link>

// Composes with icons
<Link href="https://x.com" target="_blank" rel="noopener noreferrer">
  Docs <ExternalLink size={12} />
</Link>
```

## Public API — Breadcrumb

```ts
import type { ElementType, ReactNode } from 'react';

export interface BreadcrumbProps {
  /**
   * The breadcrumb items. Must be `<Breadcrumb.Item>` children (one per crumb).
   * The component injects the separator between items and auto-marks the last
   * child as current (renders as `<span aria-current="page">` instead of a link).
   */
  children: ReactNode;

  /**
   * Custom separator between items. Defaults to a `<ChevronRight size={14} aria-hidden />`.
   * The separator renders with `aria-hidden="true"` automatically (the component
   * wraps whatever you pass).
   */
  separator?: ReactNode;

  /**
   * Visible label for the `<nav>` element. Defaults to `'Breadcrumb'`. Override
   * for localization or when multiple breadcrumb instances coexist on a page
   * (rare).
   */
  ariaLabel?: string;

  /** Pass-through className applied to the `<nav>` wrapper. */
  className?: string;
}

interface BreadcrumbItemOwnProps {
  /**
   * Mark this item as the current page. Forced `true` automatically for the
   * last child of `<Breadcrumb>` (auto-current). When `true`, the item renders
   * as `<span aria-current="page">` and ignores `as`/link props.
   */
  current?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * Polymorphic — same generic shape as Link. When NOT current, the Item forwards
 * `as`/`to`/etc. to an internal `<Link variant="muted">`. When current, the
 * Item ignores polymorphic props and renders `<span aria-current="page">`.
 */
export type BreadcrumbItemProps<C extends ElementType = 'a'> =
  PolymorphicProps<C, BreadcrumbItemOwnProps>;
```

Compound assembly:

```ts
export const Breadcrumb = Object.assign(BreadcrumbRoot, { Item: BreadcrumbItem });
```

**Examples**:

```tsx
// Basic — auto-current on last child
<Breadcrumb>
  <Breadcrumb.Item as={RouterLink} to="/mockups">Mockups</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">Contacts</Breadcrumb.Item>
  <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>
</Breadcrumb>

// Custom separator
<Breadcrumb separator={<Slash size={12} />}>
  <Breadcrumb.Item as={RouterLink} to="/a">A</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/b">B</Breadcrumb.Item>
  <Breadcrumb.Item>C</Breadcrumb.Item>
</Breadcrumb>

// Explicit current (overrides auto-detect — e.g., for breadcrumbs that
// shouldn't have a current page, like a stack trace)
<Breadcrumb>
  <Breadcrumb.Item as={RouterLink} to="/a">Step 1</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/b" current>Step 2</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/c">Step 3</Breadcrumb.Item>
</Breadcrumb>

// External crumb (defaults to <a>)
<Breadcrumb>
  <Breadcrumb.Item href="https://docs.example.com">Docs</Breadcrumb.Item>
  <Breadcrumb.Item>This page</Breadcrumb.Item>
</Breadcrumb>
```

## Architecture flow

### Link

A near-pure render component. The only logic is the polymorphic `as` dispatch.

```tsx
const Component = (as || 'a') as ElementType;
return <Component ref={ref} {...props} className={clsx(...)}>{children}</Component>;
```

**Spread order — Pattern A (consumer wins)**: `{...props}` BEFORE `className` so the consumer can override `className`; the consumer's `className` is then merged with the variant class via `clsx` (which always concatenates). Result: consumer's `className` strings get appended to the library's class list.

Component-owned attrs: only `className`. Everything else (`href`, `to`, `target`, `rel`, `onClick`, etc.) is the consumer's responsibility.

### Breadcrumb

The root iterates over children via `React.Children.map`. For each non-last child, it wraps in `<li>` and appends the separator. For the last child, it forces `current={true}` (via cloneElement) UNLESS the consumer already set it explicitly.

```tsx
function BreadcrumbRoot({ children, separator = <ChevronRight ... />, ariaLabel = 'Breadcrumb', className }) {
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const lastIndex = items.length - 1;

  return (
    <nav aria-label={ariaLabel} className={clsx(styles.nav, className)}>
      <ol className={styles.list}>
        {items.map((child, index) => {
          const isLast = index === lastIndex;
          const isCurrent = child.props.current ?? isLast;
          const itemWithCurrent = isCurrent !== child.props.current
            ? cloneElement(child, { current: isCurrent })
            : child;

          return (
            <li key={index} className={styles.item}>
              {itemWithCurrent}
              {!isLast && (
                <span className={styles.separator} aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

`BreadcrumbItem`:

```tsx
function BreadcrumbItem<C extends ElementType = 'a'>({
  current,
  as,
  children,
  className,
  ...props
}: BreadcrumbItemProps<C>) {
  if (current) {
    return (
      <span aria-current="page" className={clsx(styles.current, className)}>
        {children}
      </span>
    );
  }
  // Non-current → wrap children in a muted Link, forwarding `as` + all native props.
  return (
    <Link as={as} variant="muted" {...props} className={className}>
      {children}
    </Link>
  );
}
```

`BreadcrumbItem` isn't `forwardRef`-wrapped because the meaningful ref target depends on `current`:
- When `current`: a `<span>` (not focusable, refs rarely useful).
- When not `current`: forwards to whatever `as` renders (Link handles its own ref forwarding).

Pragmatic call: skip `forwardRef` on `BreadcrumbItem`. Document in JSDoc.

### Auto-current edge cases

- **No children**: render `<nav><ol></ol></nav>`. No items, no current. Caller bug; we don't throw.
- **Single child**: that single child is the last child → marked current. Renders as `<span aria-current="page">`. Visually odd (no link at all) but semantically correct.
- **Mixed types** (a stray `<div>` between `<Breadcrumb.Item>`s): `React.Children.toArray` keeps all valid elements; the last `<div>` would get `current=true` cloned in but `<div>` ignores the prop. Caller bug; we don't validate. Document.
- **Explicit `current={true}` on a non-last child + last child has no explicit current**: both get `current=true`. The non-last one renders as `<span aria-current="page">`, the last one ALSO gets auto-marked. Visually: two non-link items. Caller bug; we don't deduplicate.

## Styling — `Link.module.scss`

```scss
@use '../../styles/mixins' as *;

.link {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  text-decoration: none;
  transition:
    color var(--transition-fast),
    text-decoration-color var(--transition-fast);
  border-radius: var(--radius-sm);

  &:focus-visible {
    @include focus-ring;

    outline: none;
  }
}

.default {
  color: var(--color-accent);

  &:hover {
    color: var(--color-accent-hover);
    text-decoration: underline;
  }
}

.muted {
  color: var(--color-fg-muted);

  &:hover {
    color: var(--color-accent);
  }
}

.subtle {
  color: var(--color-fg);

  &:hover {
    color: var(--color-accent);
    text-decoration: underline;
  }
}
```

**Rule 4 check**: no `margin`, `position`, `align-self`, `flex: 1`, or width. `color: inherit` + variant-specific colors only. `border-radius` is for the focus-ring shape, not layout.

## Styling — `Breadcrumb.module.scss`

```scss
.nav {
  font-size: var(--font-size-sm);
}

.list {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  list-style: none;
  margin: 0;
  padding: 0;
}

.item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.separator {
  display: inline-flex;
  align-items: center;
  color: var(--color-fg-muted);
}

.current {
  color: var(--color-fg);
}
```

**Rule 4 check**: `.list` has `margin: 0; padding: 0` to reset the native `<ol>` defaults. The disallowed-list normally blocks `margin`, but this is the canonical reset pattern and matches what other components use for native list resets. Likely needs inline `stylelint-disable-next-line property-disallowed-list -- native <ol> reset` comments on the `margin: 0` and `padding: 0` lines.

`gap` on `.list` and `.item` is internal child spacing, not layout-at-component-boundary. Allowed.

## ARIA + behavior reference

| Concern | Behavior |
|---|---|
| **Link element** | `<a>` by default. Polymorphic via `as` for router integration. |
| **Link variant** | Pure visual. No semantic difference between variants. |
| **Focus** | `:focus-visible` ring on Link (any variant). |
| **External link safety** | NOT auto-added. Consumer manages `rel="noopener noreferrer"` when using `target="_blank"`. |
| **Breadcrumb wrapper** | `<nav aria-label="Breadcrumb">` (customizable). |
| **Breadcrumb list** | `<ol>` — ordered list, semantic. |
| **Breadcrumb current** | Last item (auto-detected) → `<span aria-current="page">`. |
| **Separator** | `<span aria-hidden="true">` wrapping the consumer-supplied separator (default ChevronRight). |
| **Item ref** | Not forwarded (different return shapes for current vs not-current). Use Link directly if you need a ref. |

## Testing

### `Link.test.tsx` — ~14 cases

1. Renders an `<a>` by default with no `as` prop
2. Renders the element specified by `as`
3. `as={Component}` forwards arbitrary props (e.g., `to="..."` to a stub component)
4. Default variant applies the default class + accent color
5. `variant="muted"` applies the muted class
6. `variant="subtle"` applies the subtle class
7. `className` merges, doesn't replace
8. `ref` forwards to the rendered element (assert `tagName` matches `as`)
9. `children` renders inside
10. `target`/`rel`/`onClick` pass through to the underlying `<a>`
11. `href` passes through (default-element case)
12. Spread order: consumer-supplied `className` is appended, not replaced
13. TypeScript: passing `as` that doesn't accept a given prop is a type error (smoke test via `@ts-expect-error`)
14. `aria-current` is NOT set automatically (that's Breadcrumb's job)

### `Breadcrumb.test.tsx` — ~12 cases

1. Renders `<nav aria-label="Breadcrumb">` by default
2. Custom `ariaLabel` overrides the default
3. `<ol>` is rendered with items as `<li>`
4. Auto-current: the LAST child gets `aria-current="page"` and is NOT a link
5. Non-last children render as muted Links (via the internal Link component)
6. Default separator (ChevronRight) renders between items but NOT after the last
7. Custom `separator` is used when provided
8. Separator span has `aria-hidden="true"`
9. Explicit `current={true}` on a non-last child works (renders as `<span aria-current="page">`)
10. Item `as` prop forwards to whatever component is supplied (verified by rendering with a custom stub)
11. Item `className` merges on the rendered element
12. Single-child Breadcrumb: that child auto-becomes current (renders as `<span>`)

**Vitest gotchas**:
- For the polymorphic test (passing a stub component as `as`), use a small inline component: `const StubLink = ({ to, children, ...rest }: any) => <span data-to={to} {...rest}>{children}</span>`.
- The `aria-current="page"` assertion: `expect(screen.getByText('Acme Corp')).toHaveAttribute('aria-current', 'page')`.

## Playground demos

### `LinkDemo.tsx` — 6 examples

1. **Default variant** — `<Link href="...">Click me</Link>` (external)
2. **All three variants side by side** — show the visual difference
3. **SPA navigation via `as={RouterLink}`** — clicking changes the route
4. **Composed with an icon** — `<Link href="..." target="_blank" rel="...">Docs <ExternalLink /></Link>`
5. **In a paragraph** — show inline behavior alongside body text
6. **Inside a Cluster of links** — show how multiple Links lay out together

### `BreadcrumbDemo.tsx` — 5 examples

1. **Basic** — 3-deep crumb trail, auto-current on last
2. **Custom separator** — Slash icon (lucide-react `Slash` or `ChevronsRight`)
3. **Single crumb** — auto-becomes current (visual edge case)
4. **Long crumbs** — 5+ items, demonstrates current overflow behavior (since v1 has no truncation, this shows the natural wrap)
5. **External crumb** — `<Breadcrumb.Item href="https://...">Docs</Breadcrumb.Item>` (no `as`)

## AGENTS.md TL;DR slots

Two sections to add:

### `<Link>` — placement
After `<ButtonGroup>`, before `<Input>` (alphabetically `L` comes between `B` and `I` — but the file isn't strictly alphabetical; match the surrounding pattern. Likely append near the existing inline-text primitives or in a new "Navigation" cluster).

### `<Breadcrumb>` — placement
With other navigation primitives (`<Tabs>`, `<DropdownMenu>` cluster). Goes near `<Tabs>` since both are navigation patterns.

(Detailed TL;DR content in the plan, not duplicated here.)

## Hard Rule 8

The pre-push review-fix cycle on library changes is mandatory. Gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions

None. All clarifications baked in above. One judgment call left to the implementer: which existing mockup `.\*Link` recipes to refactor in this PR vs. defer. **Default: refactor only `ContactDetail.tsx`'s breadcrumb** (high-value, low-risk; everything else stays as inline SCSS until a separate cleanup PR).
