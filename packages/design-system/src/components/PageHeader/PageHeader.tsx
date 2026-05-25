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
function findSlot<P>(
  children: ReactNode,
  type: ComponentType<P>,
): ReactElement<P> | undefined {
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
export function PageHeaderBreadcrumb({
  children,
  className,
  ...rest
}: PageHeaderBreadcrumbProps) {
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
    <button
      type="button"
      disabled
      aria-label={ariaLabel}
      className={styles.backButton}
    >
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
export function PageHeaderSubtitle({
  children,
  className,
  ...rest
}: PageHeaderSubtitleProps) {
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
const PageHeaderRoot = forwardRef<HTMLDivElement, PageHeaderProps>(
  function PageHeaderRoot(
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
  },
);
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
