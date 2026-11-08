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
import styles from './TabNav.module.scss';

/**
 * Polymorphic props helper. Same shape as Link's — duplicated so this module
 * doesn't reach into Link's internals.
 */
type PolymorphicProps<C extends ElementType, P> = P & { as?: C } & Omit<
    ComponentPropsWithoutRef<C>,
    keyof P | 'as'
  >;

interface TabNavLinkOwnProps {
  /**
   * Marks this link as the current page: sets `aria-current="page"`, which
   * draws the active colour and moves the underline here. Leave unset when the
   * `as` component sets `aria-current` itself (react-router's `NavLink` does);
   * TabNav picks that up from the DOM. Default `false`.
   */
  current?: boolean;
  /**
   * Adornment before the label (an icon, a status dot). Rendered as-is, NOT
   * `aria-hidden`: mark decorative nodes `aria-hidden` yourself; meaningful
   * ones join the link's accessible name.
   */
  leading?: ReactNode;
  /**
   * Adornment after the label (a count `Badge`). Rendered as-is — same a11y
   * note as `leading`.
   */
  trailing?: ReactNode;
  /** The link label. */
  children?: ReactNode;
}

/**
 * `TabNav.Link` props. Generic `C` defaults to `'a'`; with `as={NavLink}` the
 * router component's props (`to`, `end`, …) are typed and forwarded.
 */
export type TabNavLinkProps<C extends ElementType = 'a'> = PolymorphicProps<C, TabNavLinkOwnProps>;

type TabNavLinkComponent = <C extends ElementType = 'a'>(
  props: TabNavLinkProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] },
) => ReactElement | null;

/**
 * One link in a `TabNav` — an `<li>` holding a polymorphic link (`as`, default `a`).
 * @see docs/components/TabNav.md
 */
export const TabNavLink = forwardRef(function TabNavLink<C extends ElementType = 'a'>(
  { as, current, leading, trailing, className, children, ...props }: TabNavLinkProps<C>,
  ref: ForwardedRef<Element>,
) {
  const Component = (as || 'a') as ElementType;
  return (
    <li className={styles.item}>
      {/* {...props} first so the class stays ours; `current` only adds
          aria-current, so a NavLink's own value is kept when it is unset. */}
      <Component
        {...props}
        ref={ref}
        {...(current ? { 'aria-current': 'page' } : null)}
        className={clsx(styles.link, className)}
      >
        {leading != null && <span className={styles.adornment}>{leading}</span>}
        <span className={styles.label}>{children}</span>
        {trailing != null && <span className={styles.adornment}>{trailing}</span>}
      </Component>
    </li>
  );
}) as TabNavLinkComponent;
