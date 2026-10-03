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
   * `breadcrumb.ariaLabel` (`'Breadcrumb'` in English) when omitted OR empty —
   * an empty string is not an explicit name, so it takes the default too.
   * Override when multiple breadcrumb instances coexist on the same page.
   */
  ariaLabel?: string;
  /** Pass-through className applied to the `<nav>` wrapper. */
  className?: string;
}

/**
 * `<Breadcrumb.Item>`. Polymorphic.
 * @see docs/components/Breadcrumb.md
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
 * Navigation breadcrumb trail; the last child is auto-marked as the current page.
 * @see docs/components/Breadcrumb.md
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
      aria-label={ariaLabel || t('breadcrumb.ariaLabel')}
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
