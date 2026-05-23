# Link + Breadcrumb Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two paired primitives in one PR. `<Link>` is a polymorphic styled anchor (via `as` prop) with three visual variants (default/muted/subtle). `<Breadcrumb>` is a compound (Breadcrumb.Item) that uses Link internally and auto-marks the last child as the current page.

**Architecture:** Link is a polymorphic forwardRef where the `as` prop swaps the underlying element. The TypeScript pattern uses a `PolymorphicProps<C, P>` helper that intersects `P` with `Omit<ComponentPropsWithoutRef<C>, ...>` and casts the return through a `LinkComponent` type to preserve generics at the call site (React's `forwardRef` strips generics by default). Breadcrumb iterates children via `React.Children.toArray` + `cloneElement`, injecting `current={true}` into the last child when not already set. Each non-current Item forwards `as`/native props into an internal `<Link variant="muted">`.

**Tech Stack:** React 19 + TypeScript (source-distributed). `clsx` for class composition. `lucide-react` peer dep for the default ChevronRight separator. CSS Modules + SCSS. Vitest + RTL. No new packages, no new tokens.

**Source of truth:** `docs/superpowers/specs/2026-05-23-link-breadcrumb-design.md` (commit `cd9ef66`).

**Branch:** `feat/link-breadcrumb`. Commit per task. Open the PR after the Hard-Rule-8 cycle (Task 8).

---

## File Structure

```
packages/design-system/src/components/Link/
  Link.tsx                  ← Task 1. Polymorphic forwardRef with `as LinkComponent` cast. Full JSDoc.
  Link.module.scss          ← Task 1. base + .default / .muted / .subtle + focus-visible.
  index.ts                  ← Task 1. exports Link + types.
  Link.test.tsx             ← Task 2. ~14 cases.

packages/design-system/src/components/Breadcrumb/
  Breadcrumb.tsx            ← Task 3. Root + Item compound (Object.assign). Auto-current via cloneElement.
  Breadcrumb.module.scss    ← Task 3. <nav>/<ol> reset + separator gap + current-page styling.
  index.ts                  ← Task 3. exports Breadcrumb + types.
  Breadcrumb.test.tsx       ← Task 4. ~12 cases.

packages/design-system/src/index.ts                                      ← Task 5. MODIFY: re-export both.
packages/design-system/AGENTS.md                                         ← Task 5. MODIFY: two TL;DR sections.

packages/playground/src/pages/components/LinkDemo.tsx                    ← Task 6. NEW.
packages/playground/src/pages/components/BreadcrumbDemo.tsx              ← Task 6. NEW.
packages/playground/src/App.tsx                                          ← Task 6. MODIFY: 2 routes + 2 imports.
packages/playground/src/layout/AppShell/AppShell.tsx                     ← Task 6. MODIFY: 2 sidebar entries.
packages/playground/src/pages/components/ComponentsIndex.tsx             ← Task 6. MODIFY: 2 overview cards.
packages/playground/src/pages/mockups/registry.ts                        ← Task 6. MODIFY: 2 ComponentName union entries.

packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx        ← Task 7. MODIFY: swap inline breadcrumb for <Breadcrumb>.
packages/playground/src/pages/mockups/ContactDetail/ContactDetail.module.scss ← Task 7. MODIFY: delete .breadcrumb rule.
```

**Decomposition rationale:**

- **Tasks 1 + 2 (Link)** land before Tasks 3 + 4 (Breadcrumb) because Breadcrumb consumes Link via `<Link variant="muted">`.
- **Source + tests are split per component** (T1/T3 source, T2/T4 tests) so the test diff is reviewable in isolation — matches the Textarea/Switch precedent.
- **Task 5 (exports + AGENTS)** is grouped because both components' surface changes apply at the same files.
- **Task 6 (playground demos + nav)** bundles two new demos + 8 nav touchpoints into one commit so both demos land routable together.
- **Task 7 (mockup refactor)** lands AFTER the demo so the implementer can dogfood the API. Out-of-scope: refactoring `.cardLink`/`.nameLink`/`.viewLink` to use `<Link>`. Deferred to a future cleanup PR.
- **Task 8 (Hard-Rule-8)** — gates, fresh-context reviewer cycle, push, PR.

---

## Task 1 — Link source bundle

**Files:**

- Create: `packages/design-system/src/components/Link/Link.tsx`
- Create: `packages/design-system/src/components/Link/Link.module.scss`
- Create: `packages/design-system/src/components/Link/index.ts`

- [ ] **Step 1: Verify branch + clean tree**

```bash
cd /home/dpws/projects/design-system
git status
git branch --show-current
git log --oneline -3
```

Expected:
- Branch: `feat/link-breadcrumb`
- Working tree clean
- Most recent: `cd9ef66 Link + Breadcrumb: design spec`

- [ ] **Step 2: Create the component directory + write the SCSS**

```bash
mkdir -p packages/design-system/src/components/Link
```

Create `packages/design-system/src/components/Link/Link.module.scss`:

```scss
@use '../../styles/mixins' as *;

.link {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition:
    color var(--transition-fast),
    text-decoration-color var(--transition-fast);

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

- [ ] **Step 3: Write `Link.tsx` — the polymorphic forwardRef component**

Create `packages/design-system/src/components/Link/Link.tsx`:

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
import styles from './Link.module.scss';

/**
 * Visual variant. Defaults to `'default'`.
 * - `'default'` — accent color, no underline at rest, underline + accent-hover on hover.
 *   Use for inline CTA links ("View all →", "Read more").
 * - `'muted'` — muted color, no underline, accent-hover on hover.
 *   Use inside breadcrumbs or any low-emphasis nav.
 * - `'subtle'` — full foreground color, no underline at rest, underline + accent-hover on hover.
 *   Use for primary clickable text in dense surfaces (table name cells, card titles).
 */
export type LinkVariant = 'default' | 'muted' | 'subtle';

interface LinkOwnProps {
  /** Visual variant. See `LinkVariant` for descriptions. */
  variant?: LinkVariant;
  children?: ReactNode;
}

/**
 * Polymorphic props helper. Intersects the component's own props with the
 * underlying element's props (minus what we own), plus the `as` selector.
 */
type PolymorphicProps<C extends ElementType, P> = P & { as?: C } & Omit<
  ComponentPropsWithoutRef<C>,
  keyof P | 'as'
>;

/**
 * Public Link prop type. Generic `C` defaults to `'a'`. When the consumer
 * passes `as={SomeComponent}`, all of SomeComponent's props become available
 * with full TypeScript inference (including `to`, `replace`, `state`, etc. for
 * `react-router-dom`'s `<Link>`).
 */
export type LinkProps<C extends ElementType = 'a'> = PolymorphicProps<
  C,
  LinkOwnProps
>;

/**
 * Internal ref type for the polymorphic generic. React's `forwardRef` strips
 * the generic from the returned component, so we re-attach it via the
 * `LinkComponent` cast on the export below.
 */
type LinkComponent = <C extends ElementType = 'a'>(
  props: LinkProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] },
) => ReactElement | null;

const VARIANT_CLASS: Record<LinkVariant, string> = {
  default: styles.default,
  muted: styles.muted,
  subtle: styles.subtle,
};

/**
 * Polymorphic styled anchor. Default element is `<a>`. Pass `as={Component}`
 * to render any router-aware link primitive — the library has no router
 * dependency, but the polymorphic generic lets the consumer wire up whatever
 * routing solution they use with full type inference.
 *
 * Three visual variants cover the inline-text use cases (CTA, breadcrumb-style
 * muted, and subtle name-link). Use Button for action triggers — Link is for
 * navigation only.
 *
 * @example
 * // External link — uses native `<a>`.
 * <Link href="https://docs.example.com">Documentation</Link>
 *
 * @example
 * // SPA route — pass router's Link as `as`.
 * import { Link as RouterLink } from 'react-router-dom';
 * <Link as={RouterLink} to="/contacts">Contacts</Link>
 *
 * @example
 * // Variants compose freely with `as`.
 * <Link as={RouterLink} to="/x" variant="muted">Subdued nav</Link>
 * <Link as={RouterLink} to="/x" variant="subtle">Contact name</Link>
 *
 * @remarks When NOT to use
 * - For action triggers (submitting forms, opening modals) → use `<Button>`.
 * - For mutually-exclusive view switchers → use `<Tabs>` or `<ButtonGroup>`.
 * - For a "link styled as a button" → use `<Button variant="ghost">`.
 *
 * @remarks Anti-patterns
 * - ❌ `<Link href="#" onClick={...}>` — fake hrefs break right-click "open in new tab".
 *   Use `<Button variant="ghost">` instead.
 * - ❌ Forgetting `rel="noopener noreferrer"` on `target="_blank"` links — security risk.
 * - ❌ Using `variant="default"` for low-emphasis nav (breadcrumbs, footer). Use `muted`.
 */
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

**Why the `as LinkComponent` cast**: React's `forwardRef` return type is non-generic (`ForwardRefExoticComponent<P>`). To preserve the `<C extends ElementType>` generic at the call site, we cast the result through our own `LinkComponent` function type. This is the established pattern (Mantine, Chakra v2, Radix Slot, etc.). Without the cast, `<Link as={RouterLink} to="/x">` would lose the `to` prop's type inference.

- [ ] **Step 4: Write the folder barrel**

Create `packages/design-system/src/components/Link/index.ts`:

```ts
export { Link } from './Link';
export type { LinkProps, LinkVariant } from './Link';
```

- [ ] **Step 5: Typecheck + lint**

```bash
cd /home/dpws/projects/design-system
make build-lib
make lint
```

Expected: both clean.

If `make build-lib` fails with a "ref type" complaint on the `forwardRef` line, the most common cause is a TypeScript version mismatch between the lib and the cast. Verify with:

```bash
grep '"typescript"' packages/design-system/package.json
```

The expected version is `^6.0.3`. The polymorphic-forwardRef cast pattern works in TS 5.7+ and 6.x without changes.

If `make lint` flags any of the SCSS (e.g., `rule-empty-line-before`), add blank lines between sibling top-level rules.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/Link/Link.tsx \
        packages/design-system/src/components/Link/Link.module.scss \
        packages/design-system/src/components/Link/index.ts
git commit -m "$(cat <<'EOF'
Link: source — polymorphic styled anchor (3 variants)

forwardRef component with a fully polymorphic `as` prop. Default
element is `<a>`; consumers pass `as={RouterLink}` (or any other
component) for SPA navigation, with full TypeScript inference of the
underlying element's props. Three visual variants cover the inline
link use cases: default (accent + hover-underline), muted (subdued,
used inside breadcrumbs), subtle (foreground with hover-accent +
underline, for name-link table cells).

The polymorphic typing is preserved across forwardRef via the
`as LinkComponent` cast — matches the pattern used by Mantine/Chakra/
Radix Slot. The library has no react-router dependency.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Link unit tests

**Files:**

- Create: `packages/design-system/src/components/Link/Link.test.tsx`

- [ ] **Step 1: Write the test file**

Create `packages/design-system/src/components/Link/Link.test.tsx`:

```tsx
import { createRef, type ComponentProps, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { Link } from './Link';

// A stub component used to verify polymorphic `as` forwarding. Looks like
// react-router-dom's <Link> — accepts `to`, optionally `replace`, etc.
function StubRouterLink({
  to,
  replace,
  children,
  ...rest
}: {
  to: string;
  replace?: boolean;
  children?: ReactNode;
} & ComponentProps<'a'>) {
  return (
    <a data-to={to} data-replace={replace ? 'true' : undefined} {...rest}>
      {children}
    </a>
  );
}

describe('<Link>', () => {
  it('renders an <a> by default', () => {
    const { container } = render(<Link href="/x">click</Link>);
    expect(container.querySelector('a')).toBeInTheDocument();
  });

  it('forwards href to the default <a>', () => {
    render(<Link href="https://example.com">x</Link>);
    expect(screen.getByText('x')).toHaveAttribute('href', 'https://example.com');
  });

  it('renders the element specified by `as`', () => {
    render(
      <Link as={StubRouterLink} to="/contacts">
        Contacts
      </Link>,
    );
    // StubRouterLink renders an <a> with data-to.
    expect(screen.getByText('Contacts')).toHaveAttribute('data-to', '/contacts');
  });

  it('forwards extra props the `as` component accepts (e.g., replace)', () => {
    render(
      <Link as={StubRouterLink} to="/x" replace>
        x
      </Link>,
    );
    expect(screen.getByText('x')).toHaveAttribute('data-replace', 'true');
  });

  it('defaults to variant="default"', () => {
    render(<Link href="/x">x</Link>);
    expect(screen.getByText('x').className).toMatch(/default/);
  });

  it.each([
    ['default', 'default'],
    ['muted', 'muted'],
    ['subtle', 'subtle'],
  ] as const)('variant="%s" applies the %s class', (variant, expectedFragment) => {
    render(
      <Link href="/x" variant={variant}>
        {variant}
      </Link>,
    );
    expect(screen.getByText(variant).className).toMatch(new RegExp(expectedFragment));
  });

  it('className is merged with the variant + base classes, not replaced', () => {
    render(
      <Link href="/x" className="custom">
        x
      </Link>,
    );
    const link = screen.getByText('x');
    expect(link.className).toMatch(/link/);
    expect(link.className).toMatch(/default/);
    expect(link.className).toMatch(/custom/);
  });

  it('ref forwards to the default <a>', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Link ref={ref} href="/x">
        x
      </Link>,
    );
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('A');
  });

  it('ref forwards to the `as` component output', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <Link as={StubRouterLink} to="/x" ref={ref}>
        x
      </Link>,
    );
    // StubRouterLink renders an <a>, so ref points at an <a>.
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('A');
  });

  it('children renders inside the link', () => {
    render(
      <Link href="/x">
        <span>nested</span>
      </Link>,
    );
    expect(screen.getByText('nested')).toBeInTheDocument();
  });

  it('onClick fires on the default <a>', async () => {
    const handleClick = vi.fn();
    render(
      <Link href="/x" onClick={handleClick}>
        x
      </Link>,
    );
    screen.getByText('x').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('target + rel pass through to the default <a>', () => {
    render(
      <Link href="/x" target="_blank" rel="noopener noreferrer">
        x
      </Link>,
    );
    const link = screen.getByText('x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does NOT set aria-current automatically', () => {
    render(<Link href="/x">x</Link>);
    expect(screen.getByText('x')).not.toHaveAttribute('aria-current');
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd /home/dpws/projects/design-system
npm test -w @eocrm/design-system -- --run src/components/Link/Link.test.tsx
```

Expected: 15 tests pass (12 top-level + 3 from `it.each` expansion).

If a test fails on the polymorphic-ref case (`ref` forwarding via `as={StubRouterLink}`), check:
- `StubRouterLink` MUST spread `{...rest}` onto its `<a>` so the ref reaches it.
- The plan's `StubRouterLink` already does this. If you simplified it, restore the spread.

If `it.each` rows produce a generic-type error, the issue is the `as const` tuple — keep the cast verbatim from the plan.

- [ ] **Step 3: Full suite + lint + typecheck**

```bash
make test
make build-lib
make lint
```

Expected: everything clean. Total test count goes up by 15.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/Link/Link.test.tsx
git commit -m "$(cat <<'EOF'
Link: unit tests

15 cases (12 + 3 it.each expansion): default <a> rendering + href
forwarding, polymorphic as={StubRouterLink} + `to`/`replace` prop
pass-through, three variants apply the right class, className merge,
ref forwarding (default <a> AND through `as`), children rendering,
onClick + target + rel pass-through, aria-current NOT set automatically.

The StubRouterLink helper mimics react-router-dom's <Link> shape
(accepts `to`, `replace`) so the polymorphic generic is exercised
without pulling in the actual router dep.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Breadcrumb source bundle

**Files:**

- Create: `packages/design-system/src/components/Breadcrumb/Breadcrumb.tsx`
- Create: `packages/design-system/src/components/Breadcrumb/Breadcrumb.module.scss`
- Create: `packages/design-system/src/components/Breadcrumb/index.ts`

- [ ] **Step 1: Create the component directory + write the SCSS**

```bash
mkdir -p packages/design-system/src/components/Breadcrumb
```

Create `packages/design-system/src/components/Breadcrumb/Breadcrumb.module.scss`:

```scss
.nav {
  font-size: var(--font-size-sm);
}

.list {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  list-style: none;
  /* stylelint-disable-next-line property-disallowed-list -- native <ol> margin reset */
  margin: 0;
  /* stylelint-disable-next-line property-disallowed-list -- native <ol> padding reset */
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

- [ ] **Step 2: Write `Breadcrumb.tsx`**

Create `packages/design-system/src/components/Breadcrumb/Breadcrumb.tsx`:

```tsx
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { Link } from '../Link';
import styles from './Breadcrumb.module.scss';

/**
 * Polymorphic props helper. Same shape as Link's — duplicated here so the
 * Breadcrumb module doesn't reach into Link's internals.
 */
type PolymorphicProps<C extends ElementType, P> = P & { as?: C } & Omit<
  ComponentPropsWithoutRef<C>,
  keyof P | 'as'
>;

interface BreadcrumbItemOwnProps {
  /**
   * Mark this item as the current page. Forced to `true` automatically for
   * the last child of `<Breadcrumb>` (auto-current). When `true`, the item
   * renders as `<span aria-current="page">` and ignores all link-related
   * props (`as`, `to`, `href`, etc.).
   */
  current?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * Polymorphic — same generic shape as Link. When NOT current, the Item
 * forwards `as` and all native props to an internal `<Link variant="muted">`.
 */
export type BreadcrumbItemProps<C extends ElementType = 'a'> = PolymorphicProps<
  C,
  BreadcrumbItemOwnProps
>;

export interface BreadcrumbProps {
  /**
   * One or more `<Breadcrumb.Item>` children. The component injects the
   * separator between items and auto-marks the last child as current
   * (renders as `<span aria-current="page">` instead of a link).
   */
  children: ReactNode;
  /**
   * Custom separator between items. Defaults to a small `<ChevronRight>`
   * lucide icon. The separator renders inside a `<span aria-hidden="true">`
   * wrapper automatically.
   */
  separator?: ReactNode;
  /**
   * Visible label for the `<nav>` element. Defaults to `'Breadcrumb'`.
   * Localize or override when multiple breadcrumb instances coexist.
   */
  ariaLabel?: string;
  /** Pass-through className applied to the `<nav>` wrapper. */
  className?: string;
}

/**
 * `<Breadcrumb.Item>`. Polymorphic. Not `forwardRef`-wrapped because the
 * return shape varies (`<span>` for current, `<Link>` for non-current). If
 * you need a ref to a specific crumb, render the underlying link manually
 * inside an Item, or use Link directly.
 */
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
  // Non-current → wrap children in a muted Link, forwarding `as` + native props.
  return (
    <Link as={as} variant="muted" {...props} className={className}>
      {children}
    </Link>
  );
}

const DEFAULT_SEPARATOR = <ChevronRight size={14} aria-hidden="true" />;

/**
 * Navigation breadcrumb trail. Renders a `<nav>` with an `<ol>` of items,
 * separated by a customizable icon (default: ChevronRight). The last child
 * is auto-marked as the current page — rendered as `<span aria-current="page">`
 * instead of a link.
 *
 * Compose with `<Breadcrumb.Item>` (compound API):
 *
 * @example
 * // Basic — auto-current on the last child
 * <Breadcrumb>
 *   <Breadcrumb.Item as={RouterLink} to="/mockups">Mockups</Breadcrumb.Item>
 *   <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">Contacts</Breadcrumb.Item>
 *   <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>
 * </Breadcrumb>
 *
 * @example
 * // Custom separator
 * <Breadcrumb separator={<Slash size={12} />}>
 *   <Breadcrumb.Item as={RouterLink} to="/a">A</Breadcrumb.Item>
 *   <Breadcrumb.Item>B</Breadcrumb.Item>
 * </Breadcrumb>
 *
 * @example
 * // External crumb (default `<a>`)
 * <Breadcrumb>
 *   <Breadcrumb.Item href="https://docs.example.com">Docs</Breadcrumb.Item>
 *   <Breadcrumb.Item>This page</Breadcrumb.Item>
 * </Breadcrumb>
 *
 * @remarks When NOT to use
 * - For a horizontal nav of equal-importance siblings → use `<Tabs>` or `<ButtonGroup>`.
 * - For "Step 2 of 5" progress indicators → use a dedicated Stepper (not yet shipped).
 * - When there's only one crumb (root page) — omit the Breadcrumb entirely.
 *
 * @remarks Anti-patterns
 * - ❌ Putting a clickable `<Breadcrumb.Item>` for the current page. Current items
 *   are non-link by design — they represent "you are here", not navigation.
 * - ❌ More than ~5 levels deep. Long trails wrap and become illegible.
 */
function BreadcrumbRoot({
  children,
  separator = DEFAULT_SEPARATOR,
  ariaLabel = 'Breadcrumb',
  className,
}: BreadcrumbProps) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{
    current?: boolean;
  }>[];
  const lastIndex = items.length - 1;

  return (
    <nav aria-label={ariaLabel} className={clsx(styles.nav, className)}>
      <ol className={styles.list}>
        {items.map((child, index) => {
          const isLast = index === lastIndex;
          const shouldBeCurrent = child.props.current ?? isLast;
          const renderedChild =
            shouldBeCurrent !== child.props.current
              ? cloneElement(child, { current: shouldBeCurrent })
              : child;

          return (
            <li key={index} className={styles.item}>
              {renderedChild}
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

export const Breadcrumb = Object.assign(BreadcrumbRoot, { Item: BreadcrumbItem });
```

- [ ] **Step 3: Write the folder barrel**

Create `packages/design-system/src/components/Breadcrumb/index.ts`:

```ts
export { Breadcrumb } from './Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItemProps } from './Breadcrumb';
```

- [ ] **Step 4: Typecheck + lint**

```bash
cd /home/dpws/projects/design-system
make build-lib
make lint
```

Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/Breadcrumb/Breadcrumb.tsx \
        packages/design-system/src/components/Breadcrumb/Breadcrumb.module.scss \
        packages/design-system/src/components/Breadcrumb/index.ts
git commit -m "$(cat <<'EOF'
Breadcrumb: source — compound nav trail with auto-current

Compound API (Object.assign): <Breadcrumb><Breadcrumb.Item>...</Breadcrumb>.
The root iterates children via React.Children.toArray + cloneElement,
injecting current={true} into the last child when not already set
(auto-current behavior).

Breadcrumb.Item is polymorphic via the same `as` pattern as Link. When
not current, the Item wraps children in `<Link variant="muted">`,
forwarding `as`/native props. When current, the Item renders as
`<span aria-current="page">` and ignores link-related props.

Skipped forwardRef on Item — return shape varies (span vs Link). If a
consumer needs a ref to a specific crumb, they render Link inside the
Item directly. Matches ButtonGroup.Item precedent.

Default separator is a small ChevronRight from lucide-react; consumer
overrides via the `separator` prop. The separator span has
aria-hidden="true" so AT doesn't announce the decoration.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Breadcrumb unit tests

**Files:**

- Create: `packages/design-system/src/components/Breadcrumb/Breadcrumb.test.tsx`

- [ ] **Step 1: Write the test file**

Create `packages/design-system/src/components/Breadcrumb/Breadcrumb.test.tsx`:

```tsx
import { type ComponentProps, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from './Breadcrumb';

// Stub for the polymorphic `as` test.
function StubRouterLink({
  to,
  children,
  ...rest
}: {
  to: string;
  children?: ReactNode;
} & ComponentProps<'a'>) {
  return (
    <a data-to={to} {...rest}>
      {children}
    </a>
  );
}

describe('<Breadcrumb>', () => {
  it('renders a <nav> with aria-label="Breadcrumb" by default', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item>B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('custom ariaLabel overrides the default', () => {
    render(
      <Breadcrumb ariaLabel="Page hierarchy">
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item>B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(screen.getByRole('navigation', { name: 'Page hierarchy' })).toBeInTheDocument();
  });

  it('renders an <ol> with one <li> per item', () => {
    const { container } = render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b">B</Breadcrumb.Item>
        <Breadcrumb.Item>C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(container.querySelector('ol')).toBeInTheDocument();
    expect(container.querySelectorAll('li')).toHaveLength(3);
  });

  it('auto-current: the LAST child gets aria-current="page" and is NOT a link', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b">B</Breadcrumb.Item>
        <Breadcrumb.Item>C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const currentNode = screen.getByText('C');
    expect(currentNode).toHaveAttribute('aria-current', 'page');
    expect(currentNode.tagName).toBe('SPAN');
  });

  it('non-last items render as muted Links', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b">B</Breadcrumb.Item>
        <Breadcrumb.Item>C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const a = screen.getByText('A');
    const b = screen.getByText('B');
    expect(a.tagName).toBe('A');
    expect(a).toHaveAttribute('href', '/a');
    expect(a.className).toMatch(/muted/);
    expect(b.tagName).toBe('A');
    expect(b.className).toMatch(/muted/);
  });

  it('separator renders between items but NOT after the last', () => {
    const { container } = render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b">B</Breadcrumb.Item>
        <Breadcrumb.Item>C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    // 3 items → 2 separators (between A-B and B-C, NOT after C).
    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators).toHaveLength(2);
  });

  it('custom separator is used when provided', () => {
    render(
      <Breadcrumb separator={<span data-testid="slash">/</span>}>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item>B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('slash')).toBeInTheDocument();
  });

  it('separator wrapper span has aria-hidden="true"', () => {
    const { container } = render(
      <Breadcrumb separator={<span data-testid="sep">/</span>}>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item>B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const wrapper = screen.getByTestId('sep').parentElement;
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
  });

  it('explicit current={true} on a non-last child works', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a">A</Breadcrumb.Item>
        <Breadcrumb.Item href="/b" current>
          B (current)
        </Breadcrumb.Item>
        <Breadcrumb.Item href="/c">C</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const b = screen.getByText('B (current)');
    expect(b.tagName).toBe('SPAN');
    expect(b).toHaveAttribute('aria-current', 'page');
    // C still becomes auto-current too (last child).
    const c = screen.getByText('C');
    expect(c.tagName).toBe('SPAN');
    expect(c).toHaveAttribute('aria-current', 'page');
  });

  it('Item `as` prop forwards to a custom component', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item as={StubRouterLink} to="/contacts">
          Contacts
        </Breadcrumb.Item>
        <Breadcrumb.Item>Acme</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const contactsLink = screen.getByText('Contacts');
    expect(contactsLink).toHaveAttribute('data-to', '/contacts');
  });

  it('Item className merges onto the rendered element', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item href="/a" className="custom-link">
          A
        </Breadcrumb.Item>
        <Breadcrumb.Item className="custom-current">B</Breadcrumb.Item>
      </Breadcrumb>,
    );
    expect(screen.getByText('A').className).toMatch(/custom-link/);
    expect(screen.getByText('B').className).toMatch(/custom-current/);
  });

  it('single-child Breadcrumb auto-marks that child as current', () => {
    render(
      <Breadcrumb>
        <Breadcrumb.Item>Only crumb</Breadcrumb.Item>
      </Breadcrumb>,
    );
    const node = screen.getByText('Only crumb');
    expect(node.tagName).toBe('SPAN');
    expect(node).toHaveAttribute('aria-current', 'page');
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd /home/dpws/projects/design-system
npm test -w @eocrm/design-system -- --run src/components/Breadcrumb/Breadcrumb.test.tsx
```

Expected: 12 tests pass.

If the auto-current test fails because `<Link>` is rendering despite `current={true}`, verify Breadcrumb.tsx's BreadcrumbItem ordering — the `if (current)` branch MUST come before the Link branch.

If the separator-count test fails, ensure the SCSS class hash isn't being matched too broadly; use a more specific selector if needed.

- [ ] **Step 3: Full suite + lint + typecheck**

```bash
make test
make build-lib
make lint
```

Expected: everything clean. Test count goes up by 12.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/Breadcrumb/Breadcrumb.test.tsx
git commit -m "$(cat <<'EOF'
Breadcrumb: unit tests

12 cases: <nav aria-label> + override, <ol>/<li> structure, auto-current
on last child (renders as <span aria-current="page">), non-last items
render as muted Links with href, separator renders between but not
after last, custom separator override, separator wrapper has
aria-hidden, explicit current on non-last works, polymorphic `as`
forwarding via StubRouterLink, className merges on both span and link
shapes, single-child case auto-becomes current.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Public exports + AGENTS.md TL;DR

**Files:**

- Modify: `packages/design-system/src/index.ts`
- Modify: `packages/design-system/AGENTS.md`

- [ ] **Step 1: Add Link + Breadcrumb to `src/index.ts`**

Open `packages/design-system/src/index.ts`. Add:

```ts
export { Link } from './components/Link';
export type { LinkProps, LinkVariant } from './components/Link';

export { Breadcrumb } from './components/Breadcrumb';
export type { BreadcrumbProps, BreadcrumbItemProps } from './components/Breadcrumb';
```

Place alphabetically with the existing exports. The file is not strictly alphabetical (recent additions like Toast/Textarea/Switch are appended near the bottom). Match the surrounding convention — if you're unsure, place these alongside other recently-added components.

Verify with:

```bash
grep -n "Link\|Breadcrumb" packages/design-system/src/index.ts | head
```

- [ ] **Step 2: Add the Link TL;DR to AGENTS.md**

Find the `### \`<ButtonGroup>\`` section header (around line 68). Insert the Link section AFTER ButtonGroup and BEFORE `### \`<Input>\`` (around line 101). The new section ends just before `### \`<Input>\``.

Add this content verbatim:

````markdown
### `<Link>` — polymorphic styled anchor

Inline navigation link. Polymorphic via `as` — defaults to `<a>`, consumers pass a router's `<Link>` for SPA navigation. Three visual variants cover the inline use cases.

```tsx
import { Link } from '@eocrm/design-system';

// External — defaults to <a>
<Link href="https://docs.example.com">Documentation</Link>

// SPA route — pass router's Link
import { Link as RouterLink } from 'react-router-dom';
<Link as={RouterLink} to="/contacts">Contacts</Link>

// Variants
<Link href="/x">View all</Link>                                  {/* default — accent, hover-underline */}
<Link href="/x" variant="muted">Subdued nav</Link>               {/* breadcrumb-style */}
<Link href="/x" variant="subtle">Contact name</Link>             {/* fg color, hover-accent */}
```

- **Polymorphic**: `as={Component}` forwards all of Component's props with full TypeScript inference.
- **Library has no router dependency** — the `as` mechanism is consumer-driven.
- **Three variants**:
  - `default`: accent color, hover-underline. Inline CTA ("View all →").
  - `muted`: muted color, hover-accent. Low-emphasis nav (breadcrumb-style).
  - `subtle`: foreground color, hover-accent + underline. Dense-surface name links.
- **No `disabled` state** — render `<span>` directly for non-clickable labels.

#### When NOT to use

- ❌ Action triggers (submit, open modal) → use `<Button>`.
- ❌ Mutually-exclusive switchers → use `<Tabs>` or `<ButtonGroup>`.
- ❌ "Link styled as button" → use `<Button variant="ghost">`.

#### Anti-patterns

- ❌ `<Link href="#" onClick={...}>` — fake hrefs break right-click "open in new tab".
- ❌ Forgetting `rel="noopener noreferrer"` on `target="_blank"` links.
- ❌ Using `variant="default"` for low-emphasis nav like breadcrumbs.
````

- [ ] **Step 3: Add the Breadcrumb TL;DR to AGENTS.md**

Find `### \`<Tabs>\`` (around line 415). Insert the Breadcrumb section AFTER Tabs and BEFORE the next section (around `### \`<DropdownMenu>\`` near line 439).

Add this content verbatim:

````markdown
### `<Breadcrumb>` — navigation trail

Compound (Breadcrumb.Item) navigation breadcrumb. Last child is auto-marked as the current page (`<span aria-current="page">`); non-last items are muted Links. Default separator is a ChevronRight icon.

```tsx
import { Breadcrumb, Link } from '@eocrm/design-system';
import { Link as RouterLink } from 'react-router-dom';

<Breadcrumb>
  <Breadcrumb.Item as={RouterLink} to="/mockups">Mockups</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">Contacts</Breadcrumb.Item>
  <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>      {/* auto-current */}
</Breadcrumb>

// Custom separator
<Breadcrumb separator={<Slash size={12} />}>
  <Breadcrumb.Item as={RouterLink} to="/a">A</Breadcrumb.Item>
  <Breadcrumb.Item>B</Breadcrumb.Item>
</Breadcrumb>
```

- **Compound API** — wrap each crumb in `<Breadcrumb.Item>`.
- **Auto-current** — last child gets `aria-current="page"` and renders as `<span>`. Override with explicit `current` prop.
- **Item is polymorphic** — same `as` pattern as Link.
- **Default separator** is `<ChevronRight size={14} />`. Override via the `separator` prop.
- **`<nav aria-label="Breadcrumb">` wrapper** — semantic landmark, AT-friendly.

#### When NOT to use

- ❌ Horizontal nav of equal-importance siblings → `<Tabs>`.
- ❌ Step-by-step progress → a dedicated Stepper (not shipped).
- ❌ Single-page apps with no parent hierarchy — omit Breadcrumb entirely.

#### Anti-patterns

- ❌ Making the current page clickable. Current items are non-link by design.
- ❌ Long trails (5+ levels) — wrap and become illegible.
- ❌ Building your own `<nav>` + chevron pattern. Use Breadcrumb.
````

- [ ] **Step 4: Run gates**

```bash
make test
make build-lib
```

Expected: everything green. `structure.test.ts` should now find Link AND Breadcrumb in the barrel.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/index.ts packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
Link + Breadcrumb: public exports + AGENTS.md TL;DRs

Re-exports Link + LinkProps/LinkVariant and Breadcrumb +
BreadcrumbProps/BreadcrumbItemProps from the package barrel.

AGENTS.md gains two TL;DR sections: Link slots after ButtonGroup
(showing the polymorphic-as pattern with both external and SPA
routes); Breadcrumb slots after Tabs (showing the compound API
with auto-current and the custom-separator override).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Playground demos + 8-place nav wiring

**Files:**

- Create: `packages/playground/src/pages/components/LinkDemo.tsx`
- Create: `packages/playground/src/pages/components/BreadcrumbDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

- [ ] **Step 1: Write `LinkDemo.tsx`**

Create `packages/playground/src/pages/components/LinkDemo.tsx`:

```tsx
import { Link as RouterLink } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Cluster, Link, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Link/Link.tsx?raw';
import scssSource from '@lib-source/components/Link/Link.module.scss?raw';

export function LinkDemo() {
  return (
    <DemoLayout
      name="Link"
      componentName="Link"
      description="Polymorphic styled anchor. Default <a>; consumers pass `as={RouterLink}` for SPA navigation. Three visual variants cover inline CTA, muted nav, and subtle name-link patterns."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Link.tsx"
      scssFilename="Link.module.scss"
    >
      <Example
        title="Default — external link"
        description="No `as` prop = native <a>. Use for external URLs."
        code={`<Link href="https://docs.example.com">Documentation</Link>`}
      >
        <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
          Documentation
        </Link>
      </Example>

      <Example
        title="Three variants side by side"
        description="Pure visual difference. Pick by emphasis level."
        code={`<Link href="/x">default — accent + hover-underline</Link>
<Link href="/x" variant="muted">muted — subdued nav</Link>
<Link href="/x" variant="subtle">subtle — fg, hover-accent + underline</Link>`}
      >
        <Stack gap="sm">
          <Link href="#default" onClick={(e) => e.preventDefault()}>
            default — accent + hover-underline
          </Link>
          <Link href="#muted" variant="muted" onClick={(e) => e.preventDefault()}>
            muted — subdued nav
          </Link>
          <Link href="#subtle" variant="subtle" onClick={(e) => e.preventDefault()}>
            subtle — fg, hover-accent + underline
          </Link>
        </Stack>
      </Example>

      <Example
        title="SPA navigation via `as={RouterLink}`"
        description="Passes through router's `to`, `replace`, etc. with full type inference."
        code={`import { Link as RouterLink } from 'react-router-dom';

<Link as={RouterLink} to="/mockups/contacts">Go to Contacts</Link>`}
      >
        <Link as={RouterLink} to="/mockups/contacts">
          Go to Contacts
        </Link>
      </Example>

      <Example
        title="Composed with an icon"
        description="Compose Link with whatever children you want — it's just a styled anchor."
        code={`<Link href="https://docs.example.com" target="_blank" rel="noopener noreferrer">
  Open docs <ExternalLink size={12} />
</Link>`}
      >
        <Link href="https://example.com" target="_blank" rel="noopener noreferrer">
          Open docs <ExternalLink size={12} />
        </Link>
      </Example>

      <Example
        title="Inline in body text"
        description="Inherits font-size and color context from the surrounding paragraph."
        code={`<p>
  See the <Link href="/x">documentation</Link> for more info.
</p>`}
      >
        <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-fg)', margin: 0 }}>
          See the{' '}
          <Link href="#docs" onClick={(e) => e.preventDefault()}>
            documentation
          </Link>{' '}
          for more info, or skip to the{' '}
          <Link href="#examples" variant="muted" onClick={(e) => e.preventDefault()}>
            examples
          </Link>
          .
        </p>
      </Example>

      <Example
        title="Cluster of links"
        description="Multiple links lay out via Cluster — no special grouping primitive needed."
        code={`<Cluster gap="md">
  <Link href="/a">Home</Link>
  <Link href="/b">Features</Link>
  <Link href="/c">Pricing</Link>
</Cluster>`}
      >
        <Cluster gap="md">
          <Link href="#home" onClick={(e) => e.preventDefault()}>
            Home
          </Link>
          <Link href="#features" onClick={(e) => e.preventDefault()}>
            Features
          </Link>
          <Link href="#pricing" onClick={(e) => e.preventDefault()}>
            Pricing
          </Link>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 2: Write `BreadcrumbDemo.tsx`**

Create `packages/playground/src/pages/components/BreadcrumbDemo.tsx`:

```tsx
import { Link as RouterLink } from 'react-router-dom';
import { Slash } from 'lucide-react';
import { Breadcrumb, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Breadcrumb/Breadcrumb.tsx?raw';
import scssSource from '@lib-source/components/Breadcrumb/Breadcrumb.module.scss?raw';

export function BreadcrumbDemo() {
  return (
    <DemoLayout
      name="Breadcrumb"
      componentName="Breadcrumb"
      description="Compound navigation breadcrumb. Last child auto-marks as the current page. Default separator is a ChevronRight icon."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Breadcrumb.tsx"
      scssFilename="Breadcrumb.module.scss"
    >
      <Example
        title="Basic — auto-current on last child"
        description="No explicit `current` prop needed; the last child becomes `<span aria-current='page'>` automatically."
        code={`<Breadcrumb>
  <Breadcrumb.Item as={RouterLink} to="/mockups">Mockups</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">Contacts</Breadcrumb.Item>
  <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Breadcrumb>
          <Breadcrumb.Item as={RouterLink} to="/mockups">
            Mockups
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/mockups/contacts">
            Contacts
          </Breadcrumb.Item>
          <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>
        </Breadcrumb>
      </Example>

      <Example
        title="Custom separator"
        description="Pass any ReactNode as the separator. The wrapper applies aria-hidden automatically."
        code={`<Breadcrumb separator={<Slash size={12} />}>
  <Breadcrumb.Item as={RouterLink} to="/a">A</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/b">B</Breadcrumb.Item>
  <Breadcrumb.Item>C</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Breadcrumb separator={<Slash size={12} />}>
          <Breadcrumb.Item as={RouterLink} to="/a">
            A
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/b">
            B
          </Breadcrumb.Item>
          <Breadcrumb.Item>C</Breadcrumb.Item>
        </Breadcrumb>
      </Example>

      <Example
        title="Single crumb"
        description="A single child auto-becomes current (renders as <span>). Useful when programmatically rendering breadcrumbs from a route hierarchy that bottoms out at the root."
        code={`<Breadcrumb>
  <Breadcrumb.Item>Only crumb</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Breadcrumb>
          <Breadcrumb.Item>Only crumb</Breadcrumb.Item>
        </Breadcrumb>
      </Example>

      <Example
        title="Long trail (5+ items)"
        description="v1 has no truncation. Long trails wrap naturally; pick the separator/font-size that fits your layout."
        code={`<Breadcrumb>
  <Breadcrumb.Item as={RouterLink} to="/a">Workspace</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/b">Mockups</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/c">Contacts</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/d">Acme Corp</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/e">Deals</Breadcrumb.Item>
  <Breadcrumb.Item>Q4 Renewal</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Breadcrumb>
          <Breadcrumb.Item as={RouterLink} to="/a">
            Workspace
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/b">
            Mockups
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/c">
            Contacts
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/d">
            Acme Corp
          </Breadcrumb.Item>
          <Breadcrumb.Item as={RouterLink} to="/e">
            Deals
          </Breadcrumb.Item>
          <Breadcrumb.Item>Q4 Renewal</Breadcrumb.Item>
        </Breadcrumb>
      </Example>

      <Example
        title="External crumb (default <a>)"
        description="No `as` prop = native <a> for external URLs."
        code={`<Breadcrumb>
  <Breadcrumb.Item href="https://docs.example.com" target="_blank" rel="noopener noreferrer">Docs</Breadcrumb.Item>
  <Breadcrumb.Item as={RouterLink} to="/getting-started">Getting Started</Breadcrumb.Item>
  <Breadcrumb.Item>This page</Breadcrumb.Item>
</Breadcrumb>`}
      >
        <Stack gap="md">
          <Breadcrumb>
            <Breadcrumb.Item
              href="https://example.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </Breadcrumb.Item>
            <Breadcrumb.Item as={RouterLink} to="/mockups">
              Getting Started
            </Breadcrumb.Item>
            <Breadcrumb.Item>This page</Breadcrumb.Item>
          </Breadcrumb>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
```

- [ ] **Step 3: Wire routes + imports in `App.tsx`**

Open `packages/playground/src/App.tsx`. Add the 2 imports alphabetically:

```tsx
import { BreadcrumbDemo } from './pages/components/BreadcrumbDemo';
import { LinkDemo } from './pages/components/LinkDemo';
```

(Match the surrounding pattern — likely alphabetical with `B*` and `L*` slots; or append near recent additions like ToastDemo/SwitchDemo if the file leans toward chronological order.)

Add the 2 routes inside `<Routes>`:

```tsx
<Route path="/components/breadcrumb" element={<BreadcrumbDemo />} />
<Route path="/components/link" element={<LinkDemo />} />
```

- [ ] **Step 4: Add sidebar entries in `AppShell.tsx`**

Open `packages/playground/src/layout/AppShell/AppShell.tsx`. The `Navigation` group currently has just Tabs. Add Breadcrumb to it:

```tsx
{
  heading: 'Navigation',
  items: [
    { to: '/components/breadcrumb', label: 'Breadcrumb', icon: MoveRight, end: false },
    { to: '/components/tabs', label: 'Tabs', icon: PanelTop, end: false },
  ],
},
```

For Link — there's no "inline text" group. Link is most closely a navigation primitive but visually it's inline body content. Add it to the `Navigation` group as well, alphabetically between Breadcrumb and Tabs:

```tsx
{
  heading: 'Navigation',
  items: [
    { to: '/components/breadcrumb', label: 'Breadcrumb', icon: MoveRight, end: false },
    { to: '/components/link', label: 'Link', icon: ExternalLink, end: false },
    { to: '/components/tabs', label: 'Tabs', icon: PanelTop, end: false },
  ],
},
```

Add `MoveRight` and `ExternalLink` to the existing lucide-react import. Verify both exist:

```bash
node -e "console.log(Object.keys(require('lucide-react')).filter(k => /^(MoveRight|ExternalLink)$/.test(k)).join(', '))"
```

Both should print. If `MoveRight` is missing in lucide-react 1.x, fall back to `ArrowRight`. If `ExternalLink` is missing, fall back to `Link2` or `ChevronsRight`.

- [ ] **Step 5: Add overview cards in `ComponentsIndex.tsx`**

Open `packages/playground/src/pages/components/ComponentsIndex.tsx`. Add `Link` and `Breadcrumb` to the existing `@eocrm/design-system` import:

```tsx
import { Link as DSLink, Breadcrumb } from '@eocrm/design-system';
```

(Aliased as `DSLink` to avoid colliding with the file's other `Link` imports if any. If the file doesn't currently import the router's Link, the alias is unnecessary — match the surrounding pattern.)

Add 2 cards to the items array. Place near other navigation primitives (alphabetical or with Tabs cluster):

```tsx
{
  to: '/components/breadcrumb',
  name: 'Breadcrumb',
  description: 'Navigation trail with auto-current on the last item.',
  preview: (
    <Breadcrumb>
      <Breadcrumb.Item href="#a" onClick={(e) => e.preventDefault()}>
        Workspace
      </Breadcrumb.Item>
      <Breadcrumb.Item href="#b" onClick={(e) => e.preventDefault()}>
        Contacts
      </Breadcrumb.Item>
      <Breadcrumb.Item>Acme</Breadcrumb.Item>
    </Breadcrumb>
  ),
},
{
  to: '/components/link',
  name: 'Link',
  description: 'Polymorphic styled anchor with three visual variants.',
  preview: (
    <DSLink href="#" onClick={(e) => e.preventDefault()}>
      View details →
    </DSLink>
  ),
},
```

- [ ] **Step 6: Register the component names in `registry.ts`**

Open `packages/playground/src/pages/mockups/registry.ts`. Find `export type ComponentName =` and add `'Breadcrumb'` (alphabetical, between `'Badge'` and `'Button'`) and `'Link'` (between `'Input'` and `'Modal'`):

```ts
export type ComponentName =
  // …existing names…
  | 'Avatar'
  | 'Badge'
  | 'Breadcrumb'
  | 'Button'
  // …existing through 'Input'…
  | 'Input'
  | 'Link'
  | 'Modal'
  // …rest unchanged…;
```

Existing mockups DO use breadcrumb (ContactDetail) and Link (across multiple mockups). Update `usesComponents` for those:

```bash
grep -n "usesComponents" packages/playground/src/pages/mockups/registry.ts | head
```

Find the entry for the `ContactDetail` mockup (or whichever entries reference it) and add `'Breadcrumb'` to its `usesComponents` list. Same for any entry that's about to use Link after the Task 7 refactor.

If you're unsure which mockups to update, leave the `usesComponents` lists unchanged for now — Task 7's mockup refactor will surface the right entries.

- [ ] **Step 7: Build + test**

```bash
make test
make build-lib
make build
make lint
```

Expected: everything clean. Total test count unchanged from Task 4 (Task 6 doesn't add tests). The playground build verifies both new demos compile.

- [ ] **Step 8: Spot-check the demos (OPTIONAL)**

Skip unless a gate fails. We'll do visual verification in Task 8's HR8 round if needed.

- [ ] **Step 9: Commit**

```bash
git add packages/playground/src/pages/components/LinkDemo.tsx \
        packages/playground/src/pages/components/BreadcrumbDemo.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
playground: LinkDemo + BreadcrumbDemo + 8-place nav wiring

LinkDemo: 6 examples — external link, three variants side by side,
SPA navigation via as={RouterLink}, icon composition, inline in body
text, Cluster grouping.

BreadcrumbDemo: 5 examples — basic with auto-current, custom Slash
separator, single-child auto-current edge case, long trail, mixed
external + SPA route crumbs.

Both demos wired into Navigation sidebar group, /components routes,
overview-grid cards, and the mockups ComponentName union.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7 — Refactor `ContactDetail.tsx` to use `<Breadcrumb>`

The dogfood test — swap the inline breadcrumb pattern in ContactDetail for the new primitive.

**Files:**

- Modify: `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx`
- Modify: `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.module.scss`
- Modify: `packages/playground/src/pages/mockups/registry.ts` (add `'Breadcrumb'` to ContactDetail's `usesComponents` if not already done in Task 6)

- [ ] **Step 1: Update `ContactDetail.tsx`**

Current (`lines 31-36`):

```tsx
<nav className={styles.breadcrumb}>
  <Link to="/mockups/contacts">Contacts</Link>
  <ChevronRight size={14} aria-hidden />
  <span>{contact.name}</span>
</nav>
```

The existing `Link` import is from `react-router-dom`. We'll alias the library's `Breadcrumb` and use it with the router's Link as `as={Link}`.

Replace the JSX block with:

```tsx
<Breadcrumb>
  <Breadcrumb.Item as={Link} to="/mockups/contacts">
    Contacts
  </Breadcrumb.Item>
  <Breadcrumb.Item>{contact.name}</Breadcrumb.Item>
</Breadcrumb>
```

Add `Breadcrumb` to the existing `@eocrm/design-system` imports:

```tsx
import { Breadcrumb } from '@eocrm/design-system';
```

Match the surrounding import pattern — the file currently has multiple lines of `import { X } from '@eocrm/design-system';`. Add Breadcrumb on its own line alphabetically (between `Badge` and `Button`).

Remove the now-unused `ChevronRight` from the lucide-react import:

```tsx
// Before:
import { ChevronRight, Mail, Phone, MoreHorizontal, Building, MapPin } from 'lucide-react';

// After:
import { Mail, Phone, MoreHorizontal, Building, MapPin } from 'lucide-react';
```

- [ ] **Step 2: Delete the obsolete `.breadcrumb` SCSS**

Open `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.module.scss`. Find and delete the `.breadcrumb { ... }` block (including its nested `a { ... }`).

```bash
grep -A 15 "^.breadcrumb" packages/playground/src/pages/mockups/ContactDetail/ContactDetail.module.scss
```

After deletion, verify the file has no more references to `.breadcrumb`:

```bash
grep "breadcrumb" packages/playground/src/pages/mockups/ContactDetail/ContactDetail.module.scss
```

Should produce no output.

- [ ] **Step 3: Update mockup registry**

If you didn't already do this in Task 6 Step 6, open `packages/playground/src/pages/mockups/registry.ts` and add `'Breadcrumb'` to the ContactDetail mockup's `usesComponents` list:

```bash
grep -A 20 "ContactDetail\|contacts/:id" packages/playground/src/pages/mockups/registry.ts | head -30
```

Find the entry and update its array.

- [ ] **Step 4: Build + lint**

```bash
make test
make build-lib
make build
make lint
```

Expected: everything clean. No tests should break — Task 7 only touches the playground mockup.

- [ ] **Step 5: Commit**

```bash
git add packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx \
        packages/playground/src/pages/mockups/ContactDetail/ContactDetail.module.scss \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
mockups: ContactDetail uses <Breadcrumb> from the library

Replaces the inline <nav className={styles.breadcrumb}> pattern in
ContactDetail with the new <Breadcrumb> primitive. Deletes the
.breadcrumb SCSS rule (~14 lines) since the library handles the
styling. Removes the unused ChevronRight import — Breadcrumb's
default separator now provides the icon.

The router's Link is passed via `as={Link}` to Breadcrumb.Item,
demonstrating the polymorphic-as integration pattern documented in
the spec. The last crumb (contact name) is auto-marked as current.

Out-of-scope: refactoring .cardLink / .nameLink / .viewLink usages
across other mockups. Deferred to a separate cleanup PR.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8 — Hard-Rule-8 cycle + push + PR

Per `packages/design-system/CLAUDE.md` Rule 8. Run until 0 Critical + 0 Important findings, all gates green.

- [ ] **Step 1: Final gate run**

```bash
cd /home/dpws/projects/design-system
make test
make build-lib
make build
make lint
```

Expected: all green. Total test count goes up by ~27 (15 Link + 12 Breadcrumb).

- [ ] **Step 2: Dry-pack to confirm tarball contents**

```bash
npm pack --dry-run -w @eocrm/design-system 2>&1 | grep -E "Link|Breadcrumb|test\."
```

Expected:
- Link + Breadcrumb source files (`Link.tsx`, `Link.module.scss`, `Breadcrumb.tsx`, `Breadcrumb.module.scss`, `index.ts`) in the tarball
- NO `*.test.*` files

- [ ] **Step 3: Dispatch a fresh-context Hard-Rule-8 reviewer**

Use a `general-purpose` subagent with model `opus`. Prompt template (substitute `<sha>` with the current HEAD):

> Fresh-context Hard-Rule-8 review of the Link + Breadcrumb PR. Branch `feat/link-breadcrumb` at HEAD `<sha>`. Per `packages/design-system/CLAUDE.md` Rule 8 — review the full diff against `main` and report findings as Critical / Important / Nice-to-have / Regression-watch.
>
> Files in scope:
> - `packages/design-system/src/components/Link/` (all 4 files)
> - `packages/design-system/src/components/Breadcrumb/` (all 4 files)
> - `packages/design-system/src/index.ts`
> - `packages/design-system/AGENTS.md` (two new sections)
> - `packages/playground/src/pages/components/LinkDemo.tsx`, `BreadcrumbDemo.tsx`
> - `packages/playground/src/App.tsx`, `layout/AppShell/AppShell.tsx`, `pages/components/ComponentsIndex.tsx`, `pages/mockups/registry.ts`
> - `packages/playground/src/pages/mockups/ContactDetail/ContactDetail.tsx` and `.module.scss`
>
> Read first: `packages/design-system/CLAUDE.md` (Rules 1–7), `packages/design-system/AGENTS.md` (Link + Breadcrumb sections), `docs/superpowers/specs/2026-05-23-link-breadcrumb-design.md`. Compare against ButtonGroup.Item (`packages/design-system/src/components/ButtonGroup/ButtonGroupItem.tsx`) for the no-forwardRef-on-Item precedent.
>
> Verify:
> - **Rule 1**: tests exist for both Link and Breadcrumb (~15 + ~12 cases). Spot-check coverage matches what the spec enumerates.
> - **Rule 3**: NO raw values in either SCSS module. All colors/spacing/radii via `var(--…)`. The `<ol>` margin/padding reset has inline disables with rationale.
> - **Rule 4**: NO `position`, `align-self`, `flex: 1`, or width on either component's `.tsx` element. The SCSS modules use only `display: flex` + `gap` + `text-decoration`/`color`. Layout-at-component-boundary clean.
> - **Rule 5**: re-exported from `src/index.ts` (both component + types).
> - **Rule 6**: Link uses `forwardRef` with the polymorphic-cast pattern. BreadcrumbItem skips `forwardRef` (return shape varies between `<span>` and `<Link>`) — same precedent as ButtonGroup.Item. Document the exception in any review note.
> - **Rule 7**: full JSDoc on Link (component, every prop, both type aliases), Breadcrumb (component, BreadcrumbItem function, both prop interfaces). At least 3 `@example` blocks each. "When NOT to use" + "Anti-patterns" in `@remarks`.
> - **ARIA**:
>   - Link's `aria-current` is NOT set automatically.
>   - Breadcrumb root: `<nav aria-label="Breadcrumb">` (customizable via ariaLabel).
>   - Breadcrumb.Item when current: `<span aria-current="page">`.
>   - Separator wrapper: `aria-hidden="true"`.
>   - `<ol>` is used, not `<ul>` (semantic — order matters in breadcrumbs).
> - **Polymorphic typing**: `<Link as={SomeComponent} to="...">` preserves the `to` prop's type. The `as LinkComponent` cast is correctly placed and the generic parameter survives. Verify by reading the test file — the StubRouterLink test exercises this.
> - **Auto-current correctness**:
>   - Last child of Breadcrumb without explicit `current` becomes current
>   - Last child WITH explicit `current={false}` stays non-current (consumer override wins) — verify this is the behavior
>   - Explicit `current={true}` on a non-last child works
>   - Single-child Breadcrumb: that child becomes current
> - **Cross-package leakage**: neither component imports from `packages/playground`. Breadcrumb imports `Link` from a sibling component folder — that's internal-cross-folder, NOT cross-package; allowed.
> - **Package/distribution**: `npm pack --dry-run` excludes test files.
> - **Mockup refactor**: ContactDetail.tsx successfully swaps to `<Breadcrumb>`. The `.breadcrumb` SCSS is deleted. The router's `Link` is correctly passed as `as={Link}` to Breadcrumb.Item.
>
> End with verdict: **clean enough to stop** OR **keep iterating**.

- [ ] **Step 4: Fix every Critical + Important finding**

Group fixes into a single commit titled `Link + Breadcrumb: review-cycle fixes (round N)`. Document deliberately-skipped Nice-to-have items in the commit body.

- [ ] **Step 5: Re-run gates after each fix round**

```bash
make test && make build-lib && make build && make lint
```

- [ ] **Step 6: Re-dispatch fresh reviewer**

Same prompt, same model, fresh context. Repeat until **clean enough to stop**.

- [ ] **Step 7: Push the branch**

```bash
git push -u origin feat/link-breadcrumb
```

If the husky `pre-push` hook fails on `format:check`:

```bash
npx prettier --write docs/superpowers/specs/2026-05-23-link-breadcrumb-design.md \
                     docs/superpowers/plans/2026-05-23-link-breadcrumb.md \
                     packages/design-system/src/components/Link/ \
                     packages/design-system/src/components/Breadcrumb/ \
                     packages/playground/src/pages/components/LinkDemo.tsx \
                     packages/playground/src/pages/components/BreadcrumbDemo.tsx
git add -A
git commit -m "$(cat <<'EOF'
Link + Breadcrumb: prettier --write

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push -u origin feat/link-breadcrumb
```

- [ ] **Step 8: Open the PR**

```bash
gh pr create --title "Link + Breadcrumb: polymorphic anchor + compound nav trail" --body "$(cat <<'EOF'
## Summary

Two paired primitives in one PR.

- **`<Link>`** — polymorphic styled anchor. Default \`<a>\`; consumers pass \`as={Component}\` (typically \`react-router-dom\`'s \`<Link>\`) for SPA navigation. Three visual variants (default/muted/subtle) cover the inline CTA, breadcrumb-style, and subtle-name-link patterns currently inlined across the mockups.
- **`<Breadcrumb>`** — compound (Breadcrumb.Item) navigation trail. Uses Link internally. Auto-marks the last child as the current page (\`<span aria-current=\"page\">\`). Default separator is a ChevronRight icon; customizable.
- **Library has no router dependency** — the polymorphic \`as\` mechanism is consumer-driven.
- **Dogfooded**: \`ContactDetail.tsx\` swaps its inline \`<nav className={styles.breadcrumb}>\` for \`<Breadcrumb>\`, deleting ~14 lines of mockup SCSS.

## Design highlights

- **Polymorphic forwardRef typing**: the \`as LinkComponent\` cast preserves the \`<C extends ElementType>\` generic across React's \`forwardRef\` boundary. This is the canonical pattern (Mantine, Chakra v2, Radix Slot) — React's built-in \`forwardRef\` return type strips generics, so the cast bridges the gap.
- **Auto-current via \`React.Children.toArray\` + \`cloneElement\`**: the Breadcrumb root iterates its children, injecting \`current={true}\` into the last child when not already set. Consumer can override with explicit \`current={true|false}\` on any item.
- **Breadcrumb.Item is NOT forwardRef-wrapped**: its return shape varies (\`<span>\` for current, \`<Link>\` for not-current), so a single ref target is ambiguous. Matches the ButtonGroup.Item precedent. Consumers needing a ref to a specific crumb can render Link inside the Item directly.

## Hard Rule 8

Multiple rounds with fresh-context reviewers (opus) until 0 Critical + 0 Important. ~27 new tests (15 Link + 12 Breadcrumb) covering rendering, polymorphism, variants, ref forwarding, className merge, auto-current, custom separator, single-child edge case.

All four gates green: \`make test\` · \`make build-lib\` · \`make build\` · \`make lint\` · \`npm pack --dry-run\` (no test files in tarball).

## Test plan

- [ ] \`<Link href=\"...\">External</Link>\` renders a native \`<a>\` with the href
- [ ] \`<Link as={RouterLink} to=\"/x\">SPA</Link>\` renders the RouterLink with full SPA navigation
- [ ] All three Link variants show distinct visual treatments (default accent, muted, subtle fg)
- [ ] Link ref forwarding works for both default \`<a>\` and \`as\`-supplied components
- [ ] \`<Breadcrumb>\` renders \`<nav aria-label=\"Breadcrumb\">\` with an \`<ol>\` of items
- [ ] Last \`<Breadcrumb.Item>\` child auto-becomes \`<span aria-current=\"page\">\`
- [ ] Non-last items render as \`<Link variant=\"muted\">\` with the right href
- [ ] Custom \`separator\` prop overrides the default ChevronRight
- [ ] Explicit \`current={true}\` on a non-last child works
- [ ] Single-child Breadcrumb: that child is current (visual edge case)
- [ ] ContactDetail mockup at \`/mockups/contacts/c-1001\` renders the new Breadcrumb correctly
- [ ] No \`.breadcrumb\` SCSS remains in ContactDetail.module.scss
- [ ] Playground demos at \`/components/link\` and \`/components/breadcrumb\` render without console errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 9: Confirm CI**

Watch the GitHub Actions Quality check on the PR. If it fails for the same `format:check` reason, run the prettier fix locally and push again.

- [ ] **Step 10: Mark task complete**

Once verdict is `clean enough to stop`, gates green, CI green, PR open — task done.

---

## Summary of expected commits on the branch (before review-fix rounds)

```
Link + Breadcrumb: design spec
Link: source — polymorphic styled anchor (3 variants)
Link: unit tests
Breadcrumb: source — compound nav trail with auto-current
Breadcrumb: unit tests
Link + Breadcrumb: public exports + AGENTS.md TL;DRs
playground: LinkDemo + BreadcrumbDemo + 8-place nav wiring
mockups: ContactDetail uses <Breadcrumb> from the library
```

Plus review-cycle fix commits + prettier fix-up as needed.
