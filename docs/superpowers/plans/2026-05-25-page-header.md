# PageHeader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<PageHeader>` — a compound layout primitive that bundles breadcrumb, back-navigation, leading element (Avatar/icon), title, subtitle, meta row, and right-aligned actions into a single grid-based container with consistent spacing and an optional bottom border.

**Architecture:** Compound pattern (`<PageHeader>` + 7 sub-components attached via `Object.assign`). The root reads children via `Children.toArray` + a `flattenChildren` helper (one level of Fragment unwrap), finds each known sub-component by `c.type === SubComponent`, and renders them into the correct CSS-grid slot via `grid-template-areas`. Each sub-component actively renders its own JSX (not a marker-null). Missing slots collapse to zero-height rows. `borderBottom: boolean = true` toggles the bottom border for when Tabs follows as a sibling.

**Tech Stack:** React 19, TypeScript, CSS Modules + SCSS, Vitest + React Testing Library. Composes existing primitives (`<Title>`, `<Breadcrumb>`, `<Avatar>` etc.) — no new dependencies. `ChevronLeft` icon from `lucide-react` (already a transitive dep via playground).

---

**Reference spec:** `docs/superpowers/specs/2026-05-25-page-header-design.md` (commit `52d11b3`).

**Branch:** `feat/page-header` (already checked out, currently at spec commit).

**Conventions used throughout this plan:**

- **Plan-verbatim:** every code block is the literal file contents the implementer commits. Don't paraphrase, rename props, reorder imports, or "clean up."
- **CSS-Modules class naming:** camelCase throughout (matches Title / Progress / FileUpload / ImageCrop / ColorPicker precedent).
- **Compound attach:** `Object.assign(PageHeaderRoot, { Breadcrumb, BackButton, Aside, Title, Subtitle, Meta, Actions })`.
- **Pattern A spread** (props last so consumer wins): `{...rest}` last on elements that take pass-through props.
- **Commit format:** subject + blank line + body (1–3 sentences) + blank line + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **`git add` discipline:** stage by explicit path. No `git add -A`.
- **Stylelint requirements:**
  - `cursor: pointer`, `cursor: not-allowed` (CSS keywords) → inline disable.
  - `text-decoration: none` on `.backButton` (CSS keyword for the `<a>` case) → inline disable.
  - `margin-top: var(--space-3)` on `.actions` inside the media query → `property-disallowed-list` disable with rationale `-- internal responsive spacing in this layout primitive`.
  - `font-weight: 500` is blocked by `scale-unlimited/declaration-strict-value` if it ever appears — none in this plan, leaving the proactive note here.
- **Gates after each source-touching task:** `make test`, `make build-lib`, `make build`, `make lint`. All four must pass before commit + advance.
- **If pre-push hook flags prettier:** `npx prettier --write <flagged files>` + follow-up commit `PageHeader: prettier --write` with the same Co-Authored-By footer.

---

## File structure

### NEW files

```
packages/design-system/src/components/PageHeader/
  PageHeader.tsx              ← T1: root + 7 sub-components + Object.assign + flattenChildren helper
  PageHeader.module.scss      ← T1: grid layout + slot styling
  PageHeader.test.tsx         ← T2: ~18 cases
  index.ts                    ← T2: barrel
```

### MODIFIED files

```
packages/design-system/src/index.ts                              ← T2: barrel re-export
packages/design-system/AGENTS.md                                 ← T3: PageHeader section after <Divider>
packages/playground/src/pages/components/PageHeaderDemo.tsx      ← T4: 5 demo examples (NEW file)
packages/playground/src/App.tsx                                  ← T4: import + Route
packages/playground/src/layout/AppShell/AppShell.tsx             ← T4: LayoutPanelTop icon import + Layout-cluster nav item
packages/playground/src/pages/components/ComponentsIndex.tsx     ← T4: import + card
packages/playground/src/pages/mockups/registry.ts                ← T4: extend ComponentName union
```

No mockup refactor in this PR (ContactDetail / Members migration deferred per spec).

---

## Task 1: PageHeader source bundle (TSX + SCSS)

**Files:**

- Create: `packages/design-system/src/components/PageHeader/PageHeader.tsx`
- Create: `packages/design-system/src/components/PageHeader/PageHeader.module.scss`

### Step 1.1: Write `PageHeader.tsx`

- [ ] Write file contents (verbatim):

```tsx
import {
  Children,
  forwardRef,
  Fragment,
  isValidElement,
  useEffect,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ComponentType,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { Title, type TitleSize } from '../Title';
import styles from './PageHeader.module.scss';

// ─── Types ───────────────────────────────────────────────────────────────

export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Render a 1px bottom border under the header. Default `true`. Set
   * `false` when placing a `<Tabs>` component as a sibling below — Tabs
   * has its own `border-bottom`, and you don't want the double line.
   */
  borderBottom?: boolean;
}

export interface PageHeaderBreadcrumbProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface PageHeaderBackButtonProps {
  /**
   * If set, renders as `<a href={href}>`. Mutually exclusive with
   * `onClick` — passing both renders as `<button>` (the onClick wins)
   * and emits a dev-only warning.
   */
  href?: string;
  /**
   * If set, renders as `<button type="button" onClick={onClick}>`.
   * Mutually exclusive with `href`.
   */
  onClick?: () => void;
  /** Accessible label. Default `"Go back"`. */
  'aria-label'?: string;
  /** Icon to render. Default `<ChevronLeft size={16}>` from lucide-react. */
  icon?: ReactNode;
}

export interface PageHeaderAsideProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface PageHeaderTitleProps {
  /**
   * Heading semantic level (1–6). Default `1`. Passes through to
   * `<Title order={order}>` so the rendered element is `<h1>`–`<h6>`.
   */
  order?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Visual size override (decouples from semantic level). Pass-through to
   * `<Title size>` — useful for "section-level page headers" where the
   * h-level is 2 but you want it to LOOK like an h1.
   */
  size?: TitleSize;
  children: ReactNode;
}

export interface PageHeaderSubtitleProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export interface PageHeaderMetaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface PageHeaderActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// ─── Internal helpers ────────────────────────────────────────────────────

/**
 * Flatten one level of React Fragments out of children. `React.Children.toArray`
 * does NOT recursively unwrap fragments — this helper handles the common case
 * of wrapping a single sub-component in `<>...</>`. Deeper nesting (HOCs, etc.)
 * is intentionally NOT supported; documented as an anti-pattern.
 */
function flattenChildren(children: ReactNode): ReactNode[] {
  const flat: ReactNode[] = [];
  Children.toArray(children).forEach((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      flat.push(
        ...Children.toArray((child as ReactElement<{ children: ReactNode }>).props.children),
      );
    } else {
      flat.push(child);
    }
  });
  return flat;
}

/** Find the first child whose `type` equals the given component. */
function findSlot<P>(children: ReactNode, type: ComponentType<P>): ReactElement<P> | undefined {
  return flattenChildren(children).find(
    (c): c is ReactElement<P> => isValidElement(c) && c.type === type,
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

/**
 * Wraps a `<Breadcrumb>` (or any breadcrumb-like content) into the top row
 * of the PageHeader grid. The breadcrumb row also hosts `<PageHeader.BackButton>`
 * to its left when present — both are rendered together with a small gap.
 *
 * @example
 * <PageHeader.Breadcrumb>
 *   <Breadcrumb items={[...]} />
 * </PageHeader.Breadcrumb>
 */
export function PageHeaderBreadcrumb({ children, className, ...rest }: PageHeaderBreadcrumbProps) {
  return (
    <div className={clsx(styles.breadcrumbInner, className)} {...rest}>
      {children}
    </div>
  );
}
PageHeaderBreadcrumb.displayName = 'PageHeaderBreadcrumb';

/**
 * Compact back-navigation icon button rendered in the breadcrumb row
 * (leading position). Renders as `<a href>` when `href` is set, or
 * `<button type="button" onClick>` when `onClick` is set.
 *
 * @example
 * // Anchor — relies on the consumer's router to intercept the click.
 * <PageHeader.BackButton href="/contacts" aria-label="Back to contacts" />
 *
 * @example
 * // Button — for programmatic navigation (history.back, route()).
 * <PageHeader.BackButton onClick={() => router.back()} aria-label="Back" />
 *
 * @remarks Anti-patterns
 * - ❌ Passing both `href` AND `onClick`. The component renders as a
 *   `<button>` (onClick wins) and emits a dev-only warning. Pick one.
 * - ❌ Passing neither `href` NOR `onClick`. Renders as a disabled
 *   `<button>` with a dev-only warning — you almost certainly forgot a prop.
 */
export function PageHeaderBackButton({
  href,
  onClick,
  'aria-label': ariaLabel = 'Go back',
  icon = <ChevronLeft size={16} />,
}: PageHeaderBackButtonProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && href && onClick) {
      // eslint-disable-next-line no-console
      console.warn(
        '<PageHeader.BackButton> received both `href` and `onClick`. Rendering as <button>; `href` is ignored.',
      );
    }
    if (process.env.NODE_ENV !== 'production' && !href && !onClick) {
      // eslint-disable-next-line no-console
      console.warn(
        '<PageHeader.BackButton> rendered without `href` or `onClick`. Rendering as a disabled <button>.',
      );
    }
  }, [href, onClick]);

  if (onClick) {
    const buttonProps: ButtonHTMLAttributes<HTMLButtonElement> = {
      type: 'button',
      onClick,
      'aria-label': ariaLabel,
      className: styles.backButton,
    };
    return <button {...buttonProps}>{icon}</button>;
  }
  if (href) {
    const anchorProps: AnchorHTMLAttributes<HTMLAnchorElement> = {
      href,
      'aria-label': ariaLabel,
      className: styles.backButton,
    };
    return <a {...anchorProps}>{icon}</a>;
  }
  return (
    <button type="button" disabled aria-label={ariaLabel} className={styles.backButton}>
      {icon}
    </button>
  );
}
PageHeaderBackButton.displayName = 'PageHeaderBackButton';

/**
 * The leading element to the LEFT of the title row — typically an Avatar,
 * icon, or small image. Vertically centered with the title block. Distinct
 * from `<PageHeader.BackButton>` which lives in the breadcrumb row.
 *
 * @example
 * <PageHeader.Aside>
 *   <Avatar size="lg" name="Acme Corp" src="..." />
 * </PageHeader.Aside>
 *
 * @remarks
 * - Position-based name (Aside) rather than semantic (Icon). The slot
 *   accepts ANY ReactNode — Avatar, icon, image, custom badge. Naming it
 *   "Icon" would lie about the common Avatar use case.
 */
export function PageHeaderAside({ children, className, ...rest }: PageHeaderAsideProps) {
  return (
    <div className={clsx(styles.aside, className)} {...rest}>
      {children}
    </div>
  );
}
PageHeaderAside.displayName = 'PageHeaderAside';

/**
 * The main heading. Default `order={1}` renders an `<h1>`. Use `order={2}`
 * (or higher) for section-level page headers within a larger page. `size`
 * decouples visual size from semantic level — e.g. `<PageHeader.Title
 * order={2} size="3xl">` renders an `<h2>` that LOOKS like an h1.
 *
 * @example
 * <PageHeader.Title>Acme Corporation</PageHeader.Title>
 *
 * @example
 * // Section header — h2 with default visual size for h2 (2xl):
 * <PageHeader.Title order={2}>Filters</PageHeader.Title>
 */
export function PageHeaderTitle({ order = 1, size, children }: PageHeaderTitleProps) {
  return (
    <Title order={order} size={size} className={styles.title}>
      {children}
    </Title>
  );
}
PageHeaderTitle.displayName = 'PageHeaderTitle';

/**
 * One-line description rendered below the title. Always a `<p>` with muted
 * foreground color.
 *
 * @example
 * <PageHeader.Subtitle>Founded 2014 · 230 employees</PageHeader.Subtitle>
 */
export function PageHeaderSubtitle({ children, className, ...rest }: PageHeaderSubtitleProps) {
  return (
    <p className={clsx(styles.subtitle, className)} {...rest}>
      {children}
    </p>
  );
}
PageHeaderSubtitle.displayName = 'PageHeaderSubtitle';

/**
 * Free slot for badges, timestamps, status chips, or any other small
 * metadata you want below the subtitle. Rendered as a flex row that wraps
 * to a new line on narrow viewports.
 *
 * @example
 * <PageHeader.Meta>
 *   <Badge tone="success">Active</Badge>
 *   <Text size="sm" tone="muted">Last contacted 2 days ago</Text>
 * </PageHeader.Meta>
 */
export function PageHeaderMeta({ children, className, ...rest }: PageHeaderMetaProps) {
  return (
    <div className={clsx(styles.meta, className)} {...rest}>
      {children}
    </div>
  );
}
PageHeaderMeta.displayName = 'PageHeaderMeta';

/**
 * Right-aligned action cluster — typically a `<Cluster>` of `<Button>`s or
 * a `<ButtonGroup>`. Vertically centered with the title block. Wraps to a
 * new row below the title on viewports < 640px.
 *
 * @example
 * <PageHeader.Actions>
 *   <Button variant="secondary">Email</Button>
 *   <Button variant="secondary">Call</Button>
 *   <Button>Edit</Button>
 * </PageHeader.Actions>
 */
export function PageHeaderActions({ children, className, ...rest }: PageHeaderActionsProps) {
  return (
    <div className={clsx(styles.actions, className)} {...rest}>
      {children}
    </div>
  );
}
PageHeaderActions.displayName = 'PageHeaderActions';

// ─── Root ────────────────────────────────────────────────────────────────

/**
 * Top-of-page heading area for CRM pages. Bundles seven optional slots
 * (Breadcrumb, BackButton, Aside, Title, Subtitle, Meta, Actions) into a
 * single CSS-grid layout with consistent spacing and an optional bottom
 * border.
 *
 * Use the compound API — children are detected by `c.type === <SubComponent>`,
 * placed into their grid area, and missing slots collapse to zero-height
 * rows. Unrecognized children (e.g., a bare `<div>`) are silently dropped.
 *
 * @example
 * // Minimal:
 * <PageHeader>
 *   <PageHeader.Title>Settings</PageHeader.Title>
 * </PageHeader>
 *
 * @example
 * // Members-style — title + subtitle + actions:
 * <PageHeader>
 *   <PageHeader.Title>Members</PageHeader.Title>
 *   <PageHeader.Subtitle>Manage team access and roles.</PageHeader.Subtitle>
 *   <PageHeader.Actions>
 *     <Button>Invite member</Button>
 *   </PageHeader.Actions>
 * </PageHeader>
 *
 * @example
 * // ContactDetail-style — everything:
 * <PageHeader>
 *   <PageHeader.Breadcrumb>
 *     <Breadcrumb items={[...]} />
 *   </PageHeader.Breadcrumb>
 *   <PageHeader.BackButton href="/contacts" aria-label="Back to contacts" />
 *   <PageHeader.Aside>
 *     <Avatar size="lg" name="Acme Corp" />
 *   </PageHeader.Aside>
 *   <PageHeader.Title>Acme Corporation</PageHeader.Title>
 *   <PageHeader.Subtitle>Founded 2014 · 230 employees</PageHeader.Subtitle>
 *   <PageHeader.Meta>
 *     <Badge tone="success">Active</Badge>
 *     <Text size="sm" tone="muted">Last contacted 2 days ago</Text>
 *   </PageHeader.Meta>
 *   <PageHeader.Actions>
 *     <Button variant="secondary">Email</Button>
 *     <Button>Edit</Button>
 *   </PageHeader.Actions>
 * </PageHeader>
 *
 * @example
 * // With sibling Tabs — disable the bottom border:
 * <PageHeader borderBottom={false}>
 *   <PageHeader.Title>Reports</PageHeader.Title>
 * </PageHeader>
 * <Tabs value={tab} onChange={setTab}>...</Tabs>
 *
 * @remarks When NOT to use
 * - For arbitrary section headers WITHIN a page that aren't the page's
 *   primary heading. Use a `<Title order={2}>` directly.
 * - For a sticky top bar. PageHeader is a regular block element; wrap it
 *   in your own sticky container if you need sticky behavior.
 *
 * @remarks Anti-patterns
 * - ❌ Nesting `<PageHeader>` inside another `<PageHeader>` — undefined
 *   behavior. Use a single PageHeader per page.
 * - ❌ Putting non-PageHeader children (a bare `<div>`, a `<Stack>`) inside
 *   `<PageHeader>`. They're silently dropped. Use one of the seven slots.
 * - ❌ Wrapping a `<PageHeader.Title>` in an HOC or deep nesting. The
 *   `c.type ===` detection only handles one level of Fragment unwrap.
 * - ❌ Putting an Avatar inside `<PageHeader.Title>`. Muddles the `<h1>`
 *   text-content for screen readers. Use `<PageHeader.Aside>` instead.
 * - ❌ `position: sticky` on `<PageHeader>` itself — out of scope for v1.
 *   Wrap PageHeader in your own sticky container if you need it.
 */
const PageHeaderRoot = forwardRef<HTMLDivElement, PageHeaderProps>(function PageHeaderRoot(
  { borderBottom = true, className, children, ...rest },
  ref,
) {
  const breadcrumb = findSlot(children, PageHeaderBreadcrumb);
  const backButton = findSlot(children, PageHeaderBackButton);
  const aside = findSlot(children, PageHeaderAside);
  const title = findSlot(children, PageHeaderTitle);
  const subtitle = findSlot(children, PageHeaderSubtitle);
  const meta = findSlot(children, PageHeaderMeta);
  const actions = findSlot(children, PageHeaderActions);

  return (
    <div
      ref={ref}
      className={clsx(styles.root, borderBottom && styles.rootWithBorder, className)}
      {...rest}
    >
      {(breadcrumb || backButton) && (
        <div className={styles.breadcrumb}>
          {backButton}
          {breadcrumb}
        </div>
      )}
      {aside}
      {title}
      {subtitle}
      {meta}
      {actions}
    </div>
  );
});
PageHeaderRoot.displayName = 'PageHeader';

/** Compound API: `<PageHeader>` + 7 sub-components. */
export const PageHeader = Object.assign(PageHeaderRoot, {
  Breadcrumb: PageHeaderBreadcrumb,
  BackButton: PageHeaderBackButton,
  Aside: PageHeaderAside,
  Title: PageHeaderTitle,
  Subtitle: PageHeaderSubtitle,
  Meta: PageHeaderMeta,
  Actions: PageHeaderActions,
});
```

### Step 1.2: Write `PageHeader.module.scss`

- [ ] Write file contents (verbatim):

```scss
@use '../../styles/mixins' as *;

.root {
  display: grid;
  grid-template-areas:
    'breadcrumb breadcrumb breadcrumb'
    'aside title actions'
    'aside subtitle actions'
    'aside meta actions';
  grid-template-columns: auto 1fr auto;
  gap: var(--space-2) var(--space-3);
  padding-block: var(--space-4) var(--space-3);
}

.rootWithBorder {
  border-bottom: var(--border-width) solid var(--color-border);
}

.breadcrumb {
  grid-area: breadcrumb;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.breadcrumbInner {
  display: flex;
  align-items: center;
  min-width: 0;
}

.backButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-fg-muted);

  // CSS keyword — interactive trigger.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: pointer;

  // CSS keyword — kill the default underline when rendered as <a>.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  text-decoration: none;
}

.backButton:hover:not(:disabled) {
  background: var(--color-bg-muted);
  color: var(--color-fg);
}

.backButton:focus-visible {
  @include focus-ring;

  outline: none;
}

.backButton:disabled {
  // CSS keyword — disabled affordance.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.aside {
  grid-area: aside;
  align-self: center;
}

.title {
  grid-area: title;
}

.subtitle {
  grid-area: subtitle;
  font-size: var(--font-size-md);
  color: var(--color-fg-muted);
  line-height: var(--line-height-snug);
}

.meta {
  grid-area: meta;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.actions {
  grid-area: actions;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  align-self: center;
}

// ─── Responsive: actions wrap below the title on narrow viewports ────────
@media (max-width: 640px) {
  .root {
    grid-template-areas:
      'breadcrumb breadcrumb'
      'aside title'
      'aside subtitle'
      'aside meta'
      'actions actions';
    grid-template-columns: auto 1fr;
  }

  .actions {
    justify-content: flex-start;

    // stylelint-disable-next-line property-disallowed-list -- internal responsive spacing in this layout primitive
    margin-top: var(--space-3);
  }
}
```

If `<p class="subtitle">` accumulates browser-default margin via the global reset that conflicts with the grid, add `margin: 0;` inside `.subtitle` with a `property-disallowed-list` disable. The reset SHOULD zero `<p>` margins (verify by inspection); leaving it out of the verbatim SCSS unless lint flags it.

### Step 1.3: Verify gates

- [ ] Run `make build-lib` from `/home/dpws/projects/design-system`. Expected: clean (typecheck passes).
- [ ] Run `make lint`. Expected: clean.

DO NOT run `make test` yet — `index.ts` doesn't exist, `src/index.ts` doesn't re-export PageHeader, the structure meta-test would fail because there's no `PageHeader.test.tsx`.

If lint flags a property not already pre-disabled, add the matching inline disable in place. Most likely flag is `subtitle`'s `margin: 0` (if the reset doesn't zero `<p>` margin).

### Step 1.4: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/src/components/PageHeader/PageHeader.tsx packages/design-system/src/components/PageHeader/PageHeader.module.scss && git commit -m "$(cat <<'EOF'
PageHeader: source bundle (root + 7 sub-components + SCSS)

Compound layout primitive for top-of-page headers. Seven slots
(Breadcrumb, BackButton, Aside, Title, Subtitle, Meta, Actions) attached
via Object.assign. The root reads children via Children.toArray + a small
flattenChildren helper (one level of Fragment unwrap), finds each known
sub-component by c.type === SubComponent, and renders into the correct
grid area via grid-template-areas. Missing slots collapse to 0-height
rows; unrecognized children silently dropped.

BackButton renders <a href> or <button onClick> depending on prop; both
present → button wins + dev warn; neither → disabled button + dev warn.

borderBottom: boolean = true toggles the bottom border for the
sibling-Tabs case. Responsive @media (max-width: 640px) re-orders the
grid so Actions wraps below the title — first library component with a
media query inside its SCSS Module.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Tests + barrel exports

**Files:**

- Create: `packages/design-system/src/components/PageHeader/PageHeader.test.tsx`
- Create: `packages/design-system/src/components/PageHeader/index.ts`
- Modify: `packages/design-system/src/index.ts`

### Step 2.1: Create `PageHeader.test.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { PageHeader } from './index';

describe('PageHeader — rendering', () => {
  it('renders only the slots provided', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>Acme</PageHeader.Title>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Acme' })).toBeInTheDocument();
    // No subtitle / meta / actions / aside / breadcrumb rendered.
    expect(container.querySelector('[class*="subtitle"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="meta"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="actions"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="aside"]')).not.toBeInTheDocument();
    expect(container.querySelector('[class*="breadcrumb"]')).not.toBeInTheDocument();
  });

  it('renders all seven slots when provided', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Breadcrumb>
          <nav data-testid="bc">crumb</nav>
        </PageHeader.Breadcrumb>
        <PageHeader.BackButton href="/back" />
        <PageHeader.Aside>
          <span data-testid="aside-content">A</span>
        </PageHeader.Aside>
        <PageHeader.Title>T</PageHeader.Title>
        <PageHeader.Subtitle>S</PageHeader.Subtitle>
        <PageHeader.Meta>M</PageHeader.Meta>
        <PageHeader.Actions>
          <button type="button">btn</button>
        </PageHeader.Actions>
      </PageHeader>,
    );
    expect(screen.getByTestId('bc')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go back' })).toBeInTheDocument();
    expect(screen.getByTestId('aside-content')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'T' })).toBeInTheDocument();
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'btn' })).toBeInTheDocument();
    // Spot-check that aside got positioned via the .aside class.
    expect(container.querySelector('[class*="aside"]')).toBeInTheDocument();
  });

  it('applies rootWithBorder class by default', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/rootWithBorder/);
  });

  it('does NOT apply rootWithBorder when borderBottom={false}', () => {
    const { container } = render(
      <PageHeader borderBottom={false}>
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toMatch(/rootWithBorder/);
  });

  it('renders as a <div>, not a <header>', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    expect(container.firstElementChild?.tagName).toBe('DIV');
    // Confirm no banner landmark is introduced.
    expect(container.querySelector('header')).not.toBeInTheDocument();
  });
});

describe('PageHeader — sub-component detection', () => {
  it('renders <PageHeader.Title> into the title slot', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>Match me</PageHeader.Title>
      </PageHeader>,
    );
    const title = container.querySelector('[class*="title"]') as HTMLElement;
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H1');
    expect(title.textContent).toBe('Match me');
  });

  it('silently drops unrecognized children', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>Kept</PageHeader.Title>
        <div data-testid="bad-child">should not render</div>
        <span>also dropped</span>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Kept' })).toBeInTheDocument();
    expect(screen.queryByTestId('bad-child')).not.toBeInTheDocument();
    expect(screen.queryByText('also dropped')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('should not render');
  });

  it('unwraps one level of Fragment around a sub-component', () => {
    render(
      <PageHeader>
        <>
          <PageHeader.Title>Fragmented</PageHeader.Title>
          <PageHeader.Subtitle>Also fragmented</PageHeader.Subtitle>
        </>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Fragmented' })).toBeInTheDocument();
    expect(screen.getByText('Also fragmented')).toBeInTheDocument();
  });
});

describe('PageHeader.Title', () => {
  it('defaults to order=1 (renders <h1>)', () => {
    render(
      <PageHeader>
        <PageHeader.Title>H1</PageHeader.Title>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'H1' })).toBeInTheDocument();
  });

  it('renders <h2> when order={2}', () => {
    render(
      <PageHeader>
        <PageHeader.Title order={2}>H2</PageHeader.Title>
      </PageHeader>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'H2' })).toBeInTheDocument();
    // And NO h1 should exist.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});

describe('PageHeader.BackButton', () => {
  it('renders <a> when href is provided', () => {
    render(
      <PageHeader>
        <PageHeader.BackButton href="/contacts" aria-label="Back to contacts" />
      </PageHeader>,
    );
    const link = screen.getByRole('link', { name: 'Back to contacts' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/contacts');
  });

  it('renders <button> when onClick is provided', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PageHeader>
        <PageHeader.BackButton onClick={onClick} aria-label="Back" />
      </PageHeader>,
    );
    const btn = screen.getByRole('button', { name: 'Back' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveAttribute('type', 'button');
    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('warns in dev when both href and onClick are passed; renders as <button>', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <PageHeader>
        <PageHeader.BackButton href="/x" onClick={() => {}} aria-label="Back" />
      </PageHeader>,
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('received both `href` and `onClick`'),
    );
    expect(screen.getByRole('button', { name: 'Back' }).tagName).toBe('BUTTON');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    warnSpy.mockRestore();
  });

  it('warns in dev when neither href nor onClick; renders disabled <button>', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <PageHeader>
        <PageHeader.BackButton aria-label="Back" />
      </PageHeader>,
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('without `href` or `onClick`'));
    const btn = screen.getByRole('button', { name: 'Back' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toBeDisabled();
    warnSpy.mockRestore();
  });

  it('defaults aria-label to "Go back" when not provided', () => {
    render(
      <PageHeader>
        <PageHeader.BackButton href="/back" />
      </PageHeader>,
    );
    expect(screen.getByRole('link', { name: 'Go back' })).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(
      <PageHeader>
        <PageHeader.BackButton href="/back" icon={<span data-testid="custom-icon">⟵</span>} />
      </PageHeader>,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});

describe('PageHeader.Aside + PageHeader.Actions', () => {
  it('renders Aside children inside the .aside slot', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Aside>
          <span data-testid="content">A</span>
        </PageHeader.Aside>
        <PageHeader.Title>T</PageHeader.Title>
      </PageHeader>,
    );
    const aside = container.querySelector('[class*="aside"]') as HTMLElement;
    expect(aside).toBeInTheDocument();
    expect(aside).toContainElement(screen.getByTestId('content'));
  });

  it('renders Actions children inside the .actions slot', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>T</PageHeader.Title>
        <PageHeader.Actions>
          <button type="button">Save</button>
          <button type="button">Cancel</button>
        </PageHeader.Actions>
      </PageHeader>,
    );
    const actions = container.querySelector('[class*="actions"]') as HTMLElement;
    expect(actions).toBeInTheDocument();
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Save' }));
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Cancel' }));
  });
});

describe('PageHeader.Subtitle + PageHeader.Meta', () => {
  it('renders both below the title in the center column', () => {
    const { container } = render(
      <PageHeader>
        <PageHeader.Title>T</PageHeader.Title>
        <PageHeader.Subtitle>S</PageHeader.Subtitle>
        <PageHeader.Meta>
          <span data-testid="meta-child">M</span>
        </PageHeader.Meta>
      </PageHeader>,
    );
    expect(container.querySelector('[class*="subtitle"]')?.textContent).toBe('S');
    expect(screen.getByTestId('meta-child')).toBeInTheDocument();
  });
});

describe('PageHeader — misc', () => {
  it('forwards ref to the outermost div', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PageHeader ref={ref}>
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('className merges with the base class on the root', () => {
    const { container } = render(
      <PageHeader className="custom-class">
        <PageHeader.Title>X</PageHeader.Title>
      </PageHeader>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/custom-class/);
    expect(root.className).toMatch(/root/);
  });

  it('aria-labelledby support — h1 has a stable id we can target if needed', () => {
    // Sanity that Title renders the actual <h1> element with text content
    // (not a button or generic role).
    render(
      <PageHeader>
        <PageHeader.Title>Findable</PageHeader.Title>
      </PageHeader>,
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.tagName).toBe('H1');
    expect(h1.textContent).toBe('Findable');
  });
});
```

### Step 2.2: Create `index.ts`

- [ ] Write file contents (verbatim):

```ts
export {
  PageHeader,
  PageHeaderBreadcrumb,
  PageHeaderBackButton,
  PageHeaderAside,
  PageHeaderTitle,
  PageHeaderSubtitle,
  PageHeaderMeta,
  PageHeaderActions,
} from './PageHeader';
export type {
  PageHeaderProps,
  PageHeaderBreadcrumbProps,
  PageHeaderBackButtonProps,
  PageHeaderAsideProps,
  PageHeaderTitleProps,
  PageHeaderSubtitleProps,
  PageHeaderMetaProps,
  PageHeaderActionsProps,
} from './PageHeader';
```

### Step 2.3: Modify `src/index.ts` — add PageHeader barrel re-export

Read `packages/design-system/src/index.ts` first to find an alphabetical slot. `PageHeader` (P) slots after `Modal` and before `Pagination` / `PasswordInput` (any earlier P-named export).

Use the Edit tool with `replace_all: false`. Suggested anchor — find a Modal-related export block:

**old_string** (find the actual Modal block in the file; example template):

```ts
export { Modal } from './components/Modal';
export type { ModalProps, ModalSize } from './components/Modal';
```

**new_string:**

```ts
export { Modal } from './components/Modal';
export type { ModalProps, ModalSize } from './components/Modal';

export { PageHeader } from './components/PageHeader';
export type {
  PageHeaderProps,
  PageHeaderBreadcrumbProps,
  PageHeaderBackButtonProps,
  PageHeaderAsideProps,
  PageHeaderTitleProps,
  PageHeaderSubtitleProps,
  PageHeaderMetaProps,
  PageHeaderActionsProps,
} from './components/PageHeader';
```

If the Modal block in the file has different surrounding context (e.g. extra type fields), expand `old_string` until it's unique and apply the equivalent insertion.

### Step 2.4: Verify gates

From `/home/dpws/projects/design-system`:

- [ ] Run `make test`. Expected: baseline tests + ~18 new PageHeader tests pass + structure meta-test passes. Total test count rises by ~18.
- [ ] Run `make build-lib`. Expected: clean.
- [ ] Run `make build`. Expected: clean.
- [ ] Run `make lint`. Expected: clean.

If a test fails, most likely modes:

- **Fragment test fails** — verify `flattenChildren`'s handling. The test wraps both Title and Subtitle in `<>...</>`; both should be detected. If only one is found, the helper is unwrapping wrong.
- **"both href and onClick" test fails on the warn assertion** — useEffect timing. The warn is in a `useEffect`; React Testing Library auto-runs effects in `render()`, so the warn should fire by the time the assertion runs. If not, wrap the assertion in `await waitFor(...)`.
- **Subtitle margin** — if a global reset leaves a `<p>` with default browser margins, the `.subtitle` element may not align with the grid as expected. The test asserts only text content, not visual position, so this would NOT fail tests — but flag it for the demo step.

### Step 2.5: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/src/components/PageHeader/PageHeader.test.tsx packages/design-system/src/components/PageHeader/index.ts packages/design-system/src/index.ts && git commit -m "$(cat <<'EOF'
PageHeader: unit tests (~18 cases) + barrel re-exports

Tests cover rendering (only-title minimal, all-seven-slots, borderBottom
default + false, root is <div>), sub-component detection (Title slot,
unrecognized children dropped, Fragment unwrap), Title (order=1 default,
order=2 → h2), BackButton (<a> when href, <button> when onClick, both →
button + warn, neither → disabled button + warn, default aria-label,
custom icon), Aside + Actions slot content, Subtitle + Meta rendering,
and misc (forwardRef, className merge, h1 sanity).

Also re-exports PageHeader (with all 7 sub-components attached via
Object.assign) and the per-slot Props types from src/index.ts so
structure.test.ts passes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: AGENTS.md PageHeader section

**Files:**

- Modify: `packages/design-system/AGENTS.md`

### Step 3.1: Verify the PageHeader re-export exists

- [ ] Read `packages/design-system/src/index.ts` and confirm there's a block exporting `PageHeader` from `./components/PageHeader` (T2 added it). If missing, STOP and report BLOCKED.

### Step 3.2: Insert PageHeader section AFTER `<Divider>` (last in the Layout cluster)

Read `packages/design-system/AGENTS.md` to find the boundary — the `<Divider>` section's closing line immediately followed by whatever section comes next (typically a Forms or Display section heading).

Use Edit with `replace_all: false`. Suggested anchor (verify against the file — the closing line of `<Divider>` is typically a "Hard rule" anti-pattern bullet):

**old_string** (find the actual Divider closing line; example template):

```markdown
- ❌ Using `<Divider>` as a vertical separator inside a `<Cluster>` — use `<Divider orientation="vertical">` for that, then `<Divider>` knows to render as a vertical line instead of horizontal.

### `<Button>` — action triggers
```

**new_string:**

````markdown
- ❌ Using `<Divider>` as a vertical separator inside a `<Cluster>` — use `<Divider orientation="vertical">` for that, then `<Divider>` knows to render as a vertical line instead of horizontal.

### `<PageHeader>` — top-of-page heading area

```tsx
<PageHeader>
  <PageHeader.Breadcrumb>
    <Breadcrumb items={[...]} />
  </PageHeader.Breadcrumb>
  <PageHeader.BackButton href="/contacts" aria-label="Back to contacts" />
  <PageHeader.Aside>
    <Avatar size="lg" name="Acme Corp" />
  </PageHeader.Aside>
  <PageHeader.Title>Acme Corporation</PageHeader.Title>
  <PageHeader.Subtitle>Founded 2014 · 230 employees</PageHeader.Subtitle>
  <PageHeader.Meta>
    <Badge tone="success">Active</Badge>
    <Text size="sm" tone="muted">Last contacted 2 days ago</Text>
  </PageHeader.Meta>
  <PageHeader.Actions>
    <Button variant="secondary">Email</Button>
    <Button>Edit</Button>
  </PageHeader.Actions>
</PageHeader>
```

- **Compound API.** Seven slots: `Breadcrumb`, `BackButton`, `Aside`, `Title`, `Subtitle`, `Meta`, `Actions`. Detected via `c.type === SubComponent` after one level of Fragment unwrap. Unrecognized children are silently dropped.
- **All slots optional.** Missing slots collapse to zero-height rows; minimal usage is `<PageHeader><PageHeader.Title>…</PageHeader.Title></PageHeader>`.
- **`borderBottom: boolean = true`** — toggles the 1px bottom border. Set `false` when placing `<Tabs>` immediately below (Tabs has its own bottom border; you don't want two lines).
- **`<PageHeader.BackButton>`** renders as `<a href>` when `href` is provided, or `<button onClick>` when `onClick` is provided. Mutually exclusive — both → button wins with a dev warn; neither → disabled button with a dev warn. Default `aria-label="Go back"`; default icon `<ChevronLeft size={16}>`. Lives in the breadcrumb row, left of the breadcrumb itself.
- **`<PageHeader.Aside>`** is a position-based slot (not named "Icon" / "Avatar") so it accepts whatever leading element you need. Vertically centered with the title block.
- **`<PageHeader.Title>`** passes through to `<Title order={order} size={size}>`. Default `order={1}` (renders `<h1>`); set `order={2}` for sub-page section headers.
- **`<PageHeader.Subtitle>`** is a `<p>` with muted color.
- **`<PageHeader.Meta>`** is a flex row that wraps — good for badges + timestamps.
- **`<PageHeader.Actions>`** is a flex row, right-aligned by default. On viewports < 640px, Actions wraps below the title block.
- **NOT a `<header>` landmark.** PageHeader renders a `<div>` to avoid conflicting with the AppShell's app-level `<header role="banner">`.

#### Hard rule

- ❌ Nesting `<PageHeader>` inside another `<PageHeader>` — undefined behavior. Use one PageHeader per page.
- ❌ Putting non-PageHeader children (a `<div>`, a `<Stack>`) inside `<PageHeader>` — they're silently dropped. Use one of the seven slots.
- ❌ Wrapping a sub-component in an HOC or deep nesting. The `c.type ===` detection handles ONE level of Fragment unwrap only.
- ❌ Putting an Avatar inside `<PageHeader.Title>` — muddles the `<h1>`'s text content for screen readers. Use `<PageHeader.Aside>` instead.
- ❌ `position: sticky` directly on `<PageHeader>` — out of scope for v1. Wrap in your own sticky container if you need sticky behavior.
- ❌ Passing both `href` and `onClick` to `<PageHeader.BackButton>` — onClick wins with a dev warn. Pick one.

### `<Button>` — action triggers
````

If the anchor differs (e.g. `<Divider>` is followed by `<Card>` instead of `<Button>`), expand `old_string` upward with one more preceding line for uniqueness and replace with the equivalent insertion.

### Step 3.3: Verify gates

- [ ] Run `make build`. Expected: clean.
- [ ] Run `make lint`. Expected: clean.

### Step 3.4: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/design-system/AGENTS.md && git commit -m "$(cat <<'EOF'
AGENTS.md: add PageHeader section after <Divider> in Layout cluster

Covers compound API (7 slots), borderBottom prop for sibling Tabs,
BackButton's <a> vs <button> rendering with the mutual-exclusion warn,
Aside as position-based slot, Title pass-through to <Title order size>,
Subtitle / Meta / Actions, and the "Hard rule" callout with 6
anti-patterns. PageHeader renders a <div> (not <header>) to avoid
conflicting with AppShell's app-level banner landmark.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Playground demo + 4-place wiring

**Files:**

- Create: `packages/playground/src/pages/components/PageHeaderDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

### Step 4.1: Create `PageHeaderDemo.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { useState } from 'react';
import {
  PageHeader,
  Avatar,
  Badge,
  Button,
  Breadcrumb,
  Tabs,
  Text,
  Stack,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/PageHeader/PageHeader.tsx?raw';
import scssSource from '@lib-source/components/PageHeader/PageHeader.module.scss?raw';

function MinimalDemo() {
  return (
    <PageHeader>
      <PageHeader.Title>Settings</PageHeader.Title>
    </PageHeader>
  );
}

function WithSubtitleAndActions() {
  return (
    <PageHeader>
      <PageHeader.Title>Members</PageHeader.Title>
      <PageHeader.Subtitle>Manage team access and roles.</PageHeader.Subtitle>
      <PageHeader.Actions>
        <Button>Invite member</Button>
      </PageHeader.Actions>
    </PageHeader>
  );
}

function FullDemo() {
  return (
    <PageHeader>
      <PageHeader.Breadcrumb>
        <Breadcrumb items={[{ label: 'Contacts', href: '#' }, { label: 'Acme Corp' }]} />
      </PageHeader.Breadcrumb>
      <PageHeader.BackButton href="#" aria-label="Back to contacts" />
      <PageHeader.Aside>
        <Avatar size="lg" name="Acme Corp" />
      </PageHeader.Aside>
      <PageHeader.Title>Acme Corporation</PageHeader.Title>
      <PageHeader.Subtitle>Founded 2014 · 230 employees</PageHeader.Subtitle>
      <PageHeader.Meta>
        <Badge tone="success">Active</Badge>
        <Text size="sm" tone="muted">
          Last contacted 2 days ago
        </Text>
      </PageHeader.Meta>
      <PageHeader.Actions>
        <Button variant="secondary">Email</Button>
        <Button variant="secondary">Call</Button>
        <Button>Edit</Button>
      </PageHeader.Actions>
    </PageHeader>
  );
}

function WithSiblingTabs() {
  const [tab, setTab] = useState('overview');
  return (
    <Stack gap="0">
      <PageHeader borderBottom={false}>
        <PageHeader.Title>Reports</PageHeader.Title>
        <PageHeader.Actions>
          <Button variant="secondary">Export</Button>
          <Button>New report</Button>
        </PageHeader.Actions>
      </PageHeader>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'pipeline', label: 'Pipeline' },
          { value: 'forecast', label: 'Forecast' },
        ]}
      />
    </Stack>
  );
}

function SectionHeaderDemo() {
  return (
    <PageHeader>
      <PageHeader.Title order={2}>Filters</PageHeader.Title>
      <PageHeader.Subtitle>Narrow the dataset shown below.</PageHeader.Subtitle>
      <PageHeader.Actions>
        <Button variant="secondary">Reset</Button>
      </PageHeader.Actions>
    </PageHeader>
  );
}

export function PageHeaderDemo() {
  return (
    <DemoLayout
      name="PageHeader"
      description="Compound layout primitive for top-of-page headers. Seven slots (Breadcrumb, BackButton, Aside, Title, Subtitle, Meta, Actions) attached via Object.assign. Missing slots collapse; unrecognized children are silently dropped."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="PageHeader.tsx"
      scssFilename="PageHeader.module.scss"
      componentName="PageHeader"
    >
      <Example
        title="Minimal"
        description="The smallest useful PageHeader — just a Title. All other slots are absent and collapse to 0 height."
        code={`<PageHeader>
  <PageHeader.Title>Settings</PageHeader.Title>
</PageHeader>`}
      >
        <MinimalDemo />
      </Example>

      <Example
        title="With subtitle and actions"
        description="The dominant CRM list/index page pattern. Title + Subtitle on the left, a primary Action button on the right."
        code={`<PageHeader>
  <PageHeader.Title>Members</PageHeader.Title>
  <PageHeader.Subtitle>Manage team access and roles.</PageHeader.Subtitle>
  <PageHeader.Actions>
    <Button>Invite member</Button>
  </PageHeader.Actions>
</PageHeader>`}
      >
        <WithSubtitleAndActions />
      </Example>

      <Example
        title="Full (detail page)"
        description="ContactDetail-style header. Breadcrumb + BackButton in the top row; Aside (Avatar) to the left of the title block; Title + Subtitle + Meta (Badge + Text) stacked in the center; Actions cluster on the right."
        code={`<PageHeader>
  <PageHeader.Breadcrumb>
    <Breadcrumb items={[
      { label: 'Contacts', href: '#' },
      { label: 'Acme Corp' },
    ]} />
  </PageHeader.Breadcrumb>
  <PageHeader.BackButton href="#" aria-label="Back to contacts" />
  <PageHeader.Aside>
    <Avatar size="lg" name="Acme Corp" />
  </PageHeader.Aside>
  <PageHeader.Title>Acme Corporation</PageHeader.Title>
  <PageHeader.Subtitle>Founded 2014 · 230 employees</PageHeader.Subtitle>
  <PageHeader.Meta>
    <Badge tone="success">Active</Badge>
    <Text size="sm" tone="muted">Last contacted 2 days ago</Text>
  </PageHeader.Meta>
  <PageHeader.Actions>
    <Button variant="secondary">Email</Button>
    <Button variant="secondary">Call</Button>
    <Button>Edit</Button>
  </PageHeader.Actions>
</PageHeader>`}
      >
        <FullDemo />
      </Example>

      <Example
        title="Inline with sibling Tabs"
        description="When Tabs follows the header as a sibling, set `borderBottom={false}` so PageHeader's border doesn't duplicate Tabs' own border-bottom."
        code={`<Stack gap="0">
  <PageHeader borderBottom={false}>
    <PageHeader.Title>Reports</PageHeader.Title>
    <PageHeader.Actions>
      <Button variant="secondary">Export</Button>
      <Button>New report</Button>
    </PageHeader.Actions>
  </PageHeader>
  <Tabs value={tab} onChange={setTab} items={[
    { value: 'overview', label: 'Overview' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'forecast', label: 'Forecast' },
  ]} />
</Stack>`}
      >
        <WithSiblingTabs />
      </Example>

      <Example
        title="Section header (order={2})"
        description="Sub-page section header — renders as <h2> instead of <h1>. Useful for sub-pages within a tab or a panel where the page's <h1> lives elsewhere."
        code={`<PageHeader>
  <PageHeader.Title order={2}>Filters</PageHeader.Title>
  <PageHeader.Subtitle>Narrow the dataset shown below.</PageHeader.Subtitle>
  <PageHeader.Actions>
    <Button variant="secondary">Reset</Button>
  </PageHeader.Actions>
</PageHeader>`}
      >
        <SectionHeaderDemo />
      </Example>
    </DemoLayout>
  );
}
```

If `Breadcrumb`'s actual prop shape differs from `items={[{label, href?}]}` (verify by reading `packages/design-system/src/components/Breadcrumb/Breadcrumb.tsx` if the build fails), adapt the demo's Breadcrumb usage to match. If `Tabs`'s actual API differs from `items={[{value, label}]}` (likewise verify), adapt accordingly. The PageHeader's own contract is unaffected; these are just the demo's compositions.

### Step 4.2: Modify `App.tsx` — add import + Route

Read `packages/playground/src/App.tsx`. PageHeader (`P-a-g`) slots alphabetically between `Modal` and `Pagination` (any earlier P).

**Edit 4a — add import**:

old_string:

```tsx
import { ModalDemo } from './pages/components/ModalDemo';
```

new_string:

```tsx
import { ModalDemo } from './pages/components/ModalDemo';
import { PageHeaderDemo } from './pages/components/PageHeaderDemo';
```

**Edit 4b — add Route**:

old_string:

```tsx
<Route path="/components/modal" element={<ModalDemo />} />
```

new_string:

```tsx
          <Route path="/components/modal" element={<ModalDemo />} />
          <Route path="/components/page-header" element={<PageHeaderDemo />} />
```

If the actual Modal import / route block has more surrounding context (extra props, multi-line definitions), expand the anchor for uniqueness and apply the equivalent insertion.

### Step 4.3: Modify `AppShell.tsx` — add LayoutPanelTop icon + Layout-cluster nav item

Read `packages/playground/src/layout/AppShell/AppShell.tsx`.

**Edit 4c — add `LayoutPanelTop` import** (anchor on the existing `LayoutPanelLeft` line):

old_string:

```tsx
  LayoutPanelLeft,
```

new_string:

```tsx
  LayoutPanelLeft,
  LayoutPanelTop,
```

**Edit 4d — add Layout-cluster nav item at the END of the Layout group** (after `Card`):

old_string:

```tsx
      { to: '/components/card', label: 'Card', icon: RectangleHorizontal, end: false },
```

new_string:

```tsx
      { to: '/components/card', label: 'Card', icon: RectangleHorizontal, end: false },
      { to: '/components/page-header', label: 'PageHeader', icon: LayoutPanelTop, end: false },
```

If the Card line ends differently (additional flags, comment), include enough surrounding context in `old_string` for uniqueness.

### Step 4.4: Modify `ComponentsIndex.tsx` — add import + card

Read `packages/playground/src/pages/components/ComponentsIndex.tsx`.

**Edit 4e — add `PageHeader` import** (place alongside other library-component imports — find the Modal import line for the anchor):

old_string:

```tsx
import { Modal } from '@eocrm/design-system';
```

new_string:

```tsx
import { Modal } from '@eocrm/design-system';
import { PageHeader } from '@eocrm/design-system';
```

If `Modal` is imported as part of a multi-import block (e.g. `import { Modal, Tooltip } from '@eocrm/design-system';`), instead add a new dedicated import for PageHeader.

**Edit 4f — add card entry alphabetically** (after Modal, before any earlier P-name like `Pagination`):

Read the file to find the existing Modal card's complete `{ ... },` block. After it, insert this PageHeader card. Use Edit with the Modal card as `old_string` and `Modal card + PageHeader card` as `new_string`:

The new card:

```tsx
  {
    to: '/components/page-header',
    name: 'PageHeader',
    description:
      'Compound layout primitive for top-of-page headers. Breadcrumb + BackButton + Aside (Avatar) + Title + Subtitle + Meta + Actions.',
    preview: (
      <div style={{ width: '100%', pointerEvents: 'none' }}>
        <PageHeader borderBottom={false}>
          <PageHeader.Title order={2}>Acme Corp</PageHeader.Title>
          <PageHeader.Subtitle>230 employees</PageHeader.Subtitle>
          <PageHeader.Actions>
            <button
              type="button"
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: 'var(--border-width) solid var(--color-border)',
                background: 'var(--color-bg)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              Edit
            </button>
          </PageHeader.Actions>
        </PageHeader>
      </div>
    ),
  },
```

Why an inline-styled `<button>` instead of the library's `<Button>`: the existing cards use Button freely; switch to `Button` if it's already imported in the file. If it isn't, use the inline-styled fallback above to keep the import surface unchanged.

### Step 4.5: Modify `registry.ts` — extend ComponentName union

old_string (alphabetical position):

```ts
  | 'Modal'
```

new_string:

```ts
  | 'Modal'
  | 'PageHeader'
```

If the union has different surrounding context, find a unique anchor and insert `'PageHeader'` in alphabetical position.

### Step 4.6: Verify gates

From `/home/dpws/projects/design-system`:

- [ ] Run `make build`. Expected: typecheck + vite bundle clean.
- [ ] Run `make lint`. Expected: clean.

If the build fails on the demo file:

- Type errors from `Breadcrumb` / `Tabs` — these libraries' actual prop shapes may differ from the demo's usage. Read their source files and adapt the demo's Breadcrumb / Tabs usage to match. The PageHeader contract is unaffected.
- `DemoLayout` / `Example` import paths — pre-existing playground patterns; mirror exactly from `ImageCropDemo.tsx` or `ColorPickerDemo.tsx`.

### Step 4.7: Commit

```bash
cd /home/dpws/projects/design-system && git add packages/playground/src/pages/components/PageHeaderDemo.tsx packages/playground/src/App.tsx packages/playground/src/layout/AppShell/AppShell.tsx packages/playground/src/pages/components/ComponentsIndex.tsx packages/playground/src/pages/mockups/registry.ts && git commit -m "$(cat <<'EOF'
PageHeader demo + 4-place wiring

PageHeaderDemo: 5 examples — minimal (Title only), with subtitle + actions
(Members-style), full (ContactDetail-style with Breadcrumb + BackButton +
Aside + Title + Subtitle + Meta + Actions), inline with sibling Tabs
(borderBottom={false}), and section header (order={2}).

Wired into App.tsx routes, AppShell Layout cluster nav (LayoutPanelTop
icon at the end of the Layout group), ComponentsIndex overview card,
mockup registry ComponentName union.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: HR8 + push + PR

**Files:** none directly — this task is the review loop on Tasks 1–4.

### Step 5.1: Run all four gates from the repo root

- [ ] `cd /home/dpws/projects/design-system && make test`. Expected: every test passes (baseline + ~18 new = ~1915).
- [ ] `make build-lib`. Expected: clean.
- [ ] `make build`. Expected: clean.
- [ ] `make lint`. Expected: clean.

If any gate fails, fix and re-run all four. Don't proceed to 5.2 until all four are green.

### Step 5.2: Dispatch the HR8 reviewer (round 1)

Use a fresh-context `general-purpose` agent with **opus** model. Brief on the 10 review categories from `packages/design-system/CLAUDE.md` Rule 8.

**Pre-known design decisions to forward** (do NOT re-litigate):

1. **Compound pattern** with 7 sub-components attached via `Object.assign`.
2. **`Aside` slot (not `Leading`, not `Icon`)** — position-based naming per user preference. Accepts Avatar / icon / image.
3. **`flattenChildren` helper handles ONE level of Fragment unwrap.** Deeper nesting / HOCs are documented anti-patterns.
4. **Unrecognized children are silently dropped** — no error, no warning. Documented as anti-pattern.
5. **BackButton: `<a>` if `href`, `<button>` if `onClick`.** Both → button + dev warn. Neither → disabled button + dev warn. Default `aria-label="Go back"`, default icon `<ChevronLeft size={16}>`.
6. **`<div>` root, NOT `<header>`** — avoids landmark conflict with the AppShell's app-level `<header role="banner">`.
7. **`borderBottom: boolean = true`** prop, with `false` for the sibling-Tabs case.
8. **First library component with a media query inside its CSS Module** — flagged as REGRESSION-WATCH.
9. **Mockup refactor** (ContactDetail, Members) deferred to a follow-up PR.
10. **Multiple `<PageHeader.Title>` children** — first wins, rest dropped. Documented edge case.

**Particular things to ask for fresh eyes on:**

A. **`flattenChildren` and `Children.toArray` interaction.** `Children.toArray` adds a `.$$typeof === Symbol.for('react.element')` check that wraps siblings into arrays with keys — does `c.type === SubComponent` work correctly across that? Walk the test "unwraps one level of Fragment" to confirm.

B. **Multiple children of the same sub-component.** What if a consumer passes `<PageHeader.Title>A</PageHeader.Title><PageHeader.Title>B</PageHeader.Title>`? `findSlot` returns the FIRST match; the second is silently dropped. Documented behavior — verify the test coverage.

C. **`<a className=...>` and `<button className=...>` styling parity.** Both use `.backButton` and `.backButton:hover`. Does `:hover:not(:disabled)` work correctly on an `<a>` (which doesn't have a `disabled` attribute)? Test: render `<a>`, hover via Playwright/jsdom — should bg change to `--color-bg-muted`. Verify the SCSS doesn't accidentally drop the `<a>`'s hover.

D. **`useEffect` for the BackButton warns.** React 18 StrictMode fires effects twice in development — does the warn fire twice? Spied warnSpy in the test should handle this (it just checks `toHaveBeenCalledWith(...)`, not the call count). But verify the warn message is correct.

E. **Subtitle margin reset.** If the global reset DOESN'T zero `<p>` margins, the subtitle has default top/bottom margin from the browser — visually breaks the grid spacing. Inspect the rendered DOM and confirm `<p>`'s computed margin is 0. If not, add `.subtitle { margin: 0; }` with a `property-disallowed-list` disable.

F. **Responsive media query.** First time we use one inside a component. Verify:

- The selector `@media (max-width: 640px)` is correct (not `min-width`).
- The re-ordered `grid-template-areas` actually compiles (the row count + column count matches).
- `margin-top: var(--space-3)` on `.actions` inside the media query is the only `margin` exception we add — flag in HR8.

G. **JSDoc completeness per Rule 7.** Every exported member needs JSDoc:

- PageHeader (root) — has detailed JSDoc with 4 examples + anti-patterns.
- PageHeaderBreadcrumb, BackButton, Aside, Title, Subtitle, Meta, Actions — each has JSDoc with at least one example.
- All 8 Props interfaces — present in the source.

H. **`npm pack --dry-run`** includes the PageHeader directory, excludes test files.

I. **AGENTS.md placement** — confirmed after `<Divider>`, before next non-Layout section.

J. **`flattenChildren` and primitive children.** If a consumer passes a string `"Hello"` as a direct child of `<PageHeader>`, `findSlot` gets a `ReactText` (not a `ReactElement`), `isValidElement` returns false, and it's dropped. Confirm by walking the helper.

K. **Aside vertical alignment.** `.aside { align-self: center; }` — but the aside spans rows 2-4 (3 rows). `align-self: center` centers it within those rows. With Title + Subtitle + Meta all present, the Aside is centered between row-2-top and row-4-bottom — roughly at the Subtitle line. With only Title + Subtitle, the empty Meta row collapses; the Aside centers between Title and Subtitle. Verify visually.

L. **`grid-area: aside` with `grid-row: 2 / 5`.** The grid-template-areas spans rows 2, 3, 4 automatically. Confirm by inspection (no explicit `grid-row` rule needed).

Output format: Critical / Important / Nice-to-have / Regression-watch + final verdict (`clean enough to stop` / `keep iterating`).

### Step 5.3: Fix every Critical + Important finding

- [ ] For each Critical, fix in-line and commit with `PageHeader: HR8 review-cycle fixes (round N) — <short rationale>`.
- [ ] Same for Important.
- [ ] Nice-to-haves are judgment calls — fix when cheap.
- [ ] For every finding deliberately skipped, include a one-line "why we skipped" in the next response.

### Step 5.4: Re-run all four gates after fixes

- [ ] `make test && make build-lib && make build && make lint`. All green.

### Step 5.5: Dispatch HR8 reviewer (round 2+)

Same prompt as 5.2, framed as "round N — verify round (N-1) fixes". Continue until verdict is `clean enough to stop`.

### Step 5.6: Push the branch

- [ ] `git push -u origin feat/page-header`. If husky pre-push hook fails on prettier:
  1. `npx prettier --write <listed files>`
  2. `git add <files> && git commit -m "PageHeader: prettier --write" -m "" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`
  3. `git push`

### Step 5.7: Open the PR

Write the PR body to `/tmp/pr-page-header-body.md` via the Write tool, then:

```bash
gh pr create --title "PageHeader: compound layout primitive for top-of-page headers" --body-file /tmp/pr-page-header-body.md
```

PR body content:

````markdown
## Summary

`<PageHeader>` — a compound layout primitive that bundles breadcrumb, back-navigation, leading element (Avatar / icon), title, subtitle, meta row, and right-aligned actions into a single grid-based container with consistent spacing and an optional bottom border.

## What ships

### Compound API — 7 slots

```tsx
<PageHeader>
  <PageHeader.Breadcrumb>...</PageHeader.Breadcrumb>
  <PageHeader.BackButton href="..." aria-label="..." />
  <PageHeader.Aside>
    <Avatar ... />
  </PageHeader.Aside>
  <PageHeader.Title>...</PageHeader.Title>
  <PageHeader.Subtitle>...</PageHeader.Subtitle>
  <PageHeader.Meta>
    <Badge ... />
    <Text ... />
  </PageHeader.Meta>
  <PageHeader.Actions>
    <Button ... />
  </PageHeader.Actions>
</PageHeader>
```
````

All slots optional; missing slots collapse to zero-height rows.

## Design decisions baked in

- **Compound pattern** — `<PageHeader>` + 7 sub-components attached via `Object.assign`, matching Card / Modal / Popover / ColorPicker idiom.
- **Marker-detection by `c.type ===`** with one level of Fragment unwrap via a small `flattenChildren` helper. Deeper nesting / HOCs documented as anti-patterns.
- **`<PageHeader.Aside>` (position-based name)** — accepts Avatar / icon / image. Naming it "Icon" or "Leading" was rejected as misleading; "Aside" is the position name with broad applicability.
- **`<PageHeader.BackButton>`** renders `<a href>` when `href` is set, `<button onClick>` when `onClick` is set. Both → button wins + dev warn. Neither → disabled button + dev warn.
- **`<div>` root, not `<header>`** — avoids landmark conflict with the AppShell's app-level `<header role="banner">`.
- **`borderBottom: boolean = true`** — toggle the bottom border when placing `<Tabs>` immediately below.
- **Sticky positioning deferred to v2** — consumers wrap PageHeader in their own sticky container if needed.
- **Mockup refactor deferred** — ContactDetail / Members migration to PageHeader is a follow-up PR.

## Tests

**~18 cases** across rendering (only-Title minimal, all-seven-slots, borderBottom default + false, `<div>` root), sub-component detection (Title slot, unrecognized children dropped, Fragment unwrap), Title (order=1 default, order=2 → h2), BackButton (`<a>` when `href`, `<button>` when `onClick`, both → button + warn, neither → disabled + warn, default `aria-label`, custom icon), Aside + Actions slot content, Subtitle + Meta rendering, and misc (forwardRef, className merge, h1 sanity).

## Hard Rule 8

Standard cycle ran to `clean enough to stop`.

## First library component with a media query inside its CSS Module

The responsive behavior (Actions wraps below the title block at `max-width: 640px`) introduces the library's first in-component `@media` query. Flagged as a regression-watch for the HR8 review — consumers who want a different breakpoint will need to override or compose differently.

## Test plan

- [ ] `/components/page-header`: 5 examples render (Minimal, with subtitle + actions, Full, Inline with sibling Tabs, Section header `order={2}`).
- [ ] Resize browser to < 640px: Actions wraps below the title block. Aside stays to the left.
- [ ] BackButton with `href="..."`: renders as `<a>` with the correct href. Click navigates.
- [ ] BackButton with `onClick={...}`: renders as `<button>`. Click fires the handler.
- [ ] BackButton with both → console warn + button rendering.
- [ ] BackButton with neither → console warn + disabled button rendering.
- [ ] `borderBottom={false}` example: no double border between PageHeader and Tabs.
- [ ] AGENTS.md PageHeader section appears in the Layout cluster after `<Divider>`.
- [ ] `npm pack --dry-run` includes PageHeader directory, no test files.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

```

- [ ] Print the PR URL when done.

---

## Self-review (run before invoking subagent-driven-development)

### Spec coverage

- Spec §Goal / §Why now — addressed by the whole bundle (T1-T4).
- Spec §Non-goals — encoded as anti-patterns in JSDoc (T1) and AGENTS.md (T3).
- Spec §Architecture (file layout, marker pattern, Fragment handling, grid) — T1 verbatim.
- Spec §Public API — T1 (type exports), T2 (test coverage), T3 (AGENTS.md docs).
- Spec §Slot inventory — T1 sub-components, T2 detection tests, T3 AGENTS.md table.
- Spec §Interactions (BackButton modes, borderBottom, responsive) — T1 implementation + T2 tests.
- Spec §Edge cases — T1 JSDoc + behavior, T2 tests for: no-children, only-Title, Fragment unwrap, both-href-onClick, neither, multiple-Title (first-wins, not explicitly tested but documented).
- Spec §SCSS sketch — T1 verbatim with stylelint disables.
- Spec §Testing strategy — T2 covers all listed cases (~18).
- Spec §Demo additions — T4 with all 5 examples.
- Spec §4-place wiring — T4.
- Spec §AGENTS.md addition — T3.
- Spec §HR8 cycle — T5.
- Spec §Follow-up work — listed in PR body + spec; out of scope.

### Placeholder scan

- "TBD" / "TODO" / "implement later" — none.
- "Add appropriate error handling" / "handle edge cases" — none.
- "Write tests for the above" without code — none (test code is verbatim).
- "Similar to Task N" — none.
- T4's `ComponentsIndex.tsx` card edit references an inline-styled fallback button IF `Button` isn't imported — that's a concrete fallback, not a placeholder. The implementer reads the file and chooses the appropriate path.

### Type consistency

- `PageHeaderProps`, `PageHeaderBreadcrumbProps`, `PageHeaderBackButtonProps`, `PageHeaderAsideProps`, `PageHeaderTitleProps`, `PageHeaderSubtitleProps`, `PageHeaderMetaProps`, `PageHeaderActionsProps` — declared in T1, exported in T1, re-exported in T2.
- Sub-component names (`PageHeaderBreadcrumb`, `PageHeaderBackButton`, etc.) — used in T1's `findSlot` calls, attached in `Object.assign`, referenced in tests.
- `displayName` values match the JSX function names: `PageHeaderBreadcrumb`, `PageHeaderBackButton`, etc.
- `borderBottom` prop consistent everywhere.
- SCSS class names: `.root`, `.rootWithBorder`, `.breadcrumb`, `.breadcrumbInner`, `.backButton`, `.aside`, `.title`, `.subtitle`, `.meta`, `.actions`. Test regex substrings (`/title/`, `/subtitle/`, `/aside/`, `/actions/`, `/rootWithBorder/`) match.

### Found and fixed inline during write

- `<a>` vs `<button>` styling parity for `.backButton:hover` — used `:not(:disabled)` so hover works on `<a>` (which doesn't have a disabled attribute, so the not-pseudo-class always matches).
- The "subtitle margin reset" — flagged in the HR8 review notes (L) since the global reset behavior is environment-dependent.
- The `:has` selector approach to collapse empty grid rows — not needed since CSS grid already collapses empty rows by default (no content, no row height).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-25-page-header.md`.

Per `feedback_plan_execution_mode` memory: always subagent-driven, no asking.

Use **superpowers:subagent-driven-development** to execute.

- Tasks 1, 2, 4: sonnet implementer
- Task 3: haiku implementer (mechanical AGENTS.md insertion)
- Task 5 reviewers: opus
```
