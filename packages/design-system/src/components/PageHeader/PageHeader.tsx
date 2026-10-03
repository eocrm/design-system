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
import { useTranslation } from '../../i18n/useTranslation';
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
  /**
   * Accessible label. Defaults to the i18n value at `pageHeader.back`
   * (`'Go back'` in English) when omitted OR empty — an empty string is not an
   * explicit name, so it takes the default too.
   */
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
  /**
   * Keep the title on one line, ending in an ellipsis where the title column
   * ends (at the actions on wide layouts) instead of wrapping. Pass-through to
   * `<Title truncate>`. Defaults to `false`. Anything inline AFTER the text
   * (e.g. a status badge) is clipped with it — put badges in `PageHeader.Meta`.
   * Screen readers still get the full text (don't add `aria-label`); sighted
   * users don't, so show the full title somewhere else too if it matters.
   */
  truncate?: boolean;
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
 * Top-row slot for a `<Breadcrumb>`; shares the row with `PageHeader.BackButton`.
 * @see docs/components/PageHeader.md
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
 * Compact back-navigation icon button: an `<a href>` or a `<button onClick>` (`PageHeader.BackButton`).
 * @see docs/components/PageHeader.md
 */
export function PageHeaderBackButton({
  href,
  onClick,
  'aria-label': ariaLabelProp,
  icon = <ChevronLeft size={16} />,
}: PageHeaderBackButtonProps) {
  const t = useTranslation();
  const ariaLabel = ariaLabelProp || t('pageHeader.back');
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
 * Leading slot left of the title row (avatar, icon or image) (`PageHeader.Aside`).
 * @see docs/components/PageHeader.md
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
 * The page heading: `order` sets the semantic level, `size` the visual size, `truncate` keeps it on one line (`PageHeader.Title`).
 * @see docs/components/PageHeader.md
 */
export function PageHeaderTitle({ order = 1, size, truncate, children }: PageHeaderTitleProps) {
  return (
    <Title order={order} size={size} truncate={truncate} className={styles.title}>
      {children}
    </Title>
  );
}
PageHeaderTitle.displayName = 'PageHeaderTitle';

/**
 * One-line muted description below the title (`PageHeader.Subtitle`).
 * @see docs/components/PageHeader.md
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
 * Wrapping flex row for badges, timestamps and status chips below the subtitle (`PageHeader.Meta`).
 * @see docs/components/PageHeader.md
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
 * Right-aligned, wrapping action row that drops below the title under 640px (`PageHeader.Actions`).
 * @see docs/components/PageHeader.md
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
 * Top-of-page heading area bundling seven optional slots (Breadcrumb, BackButton, Aside, Title, Subtitle, Meta, Actions) in one grid.
 * @see docs/components/PageHeader.md
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
      className={clsx(
        styles.root,
        aside && styles.rootWithAside,
        borderBottom && styles.rootWithBorder,
        className,
      )}
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
