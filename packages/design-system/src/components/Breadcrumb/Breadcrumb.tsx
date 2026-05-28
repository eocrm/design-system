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
import { useTranslation } from '../../i18n/useTranslation';
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
   * Visible label for the `<nav>` element. Defaults to the i18n value at
   * `breadcrumb.ariaLabel` (`'Breadcrumb'` in English). Override when
   * multiple breadcrumb instances coexist on the same page.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkProps = props as any;
  return (
    <Link as={as} variant="muted" {...linkProps} className={className}>
      {children}
    </Link>
  );
}

const DEFAULT_SEPARATOR = <ChevronRight size={14} />;

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
  ariaLabel,
  className,
}: BreadcrumbProps) {
  const t = useTranslation();
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{
    current?: boolean;
  }>[];
  const lastIndex = items.length - 1;

  return (
    <nav
      aria-label={ariaLabel ?? t('breadcrumb.ariaLabel')}
      className={clsx(styles.nav, className)}
    >
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
