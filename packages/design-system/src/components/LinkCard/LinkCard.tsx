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
  /** Inner padding — same scale as `Card`. Defaults to `'md'`. */
  padding?: CardPadding;
  /** Optional left-edge tone stripe — same vocabulary as `Card`. */
  tone?: CardTone;
  children?: ReactNode;
}

/** Polymorphic props helper (identical to Link's). */
type PolymorphicProps<C extends ElementType, P> = P & { as?: C } & Omit<
    ComponentPropsWithoutRef<C>,
    keyof P | 'as'
  >;

/**
 * Public LinkCard prop type. Generic `C` defaults to `'a'`. Passing
 * `as={SomeComponent}` makes all of its props available with full inference
 * (including `to` / `replace` for `react-router-dom`'s `<Link>`).
 */
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

/**
 * A clickable Card whose entire surface is one navigation or action target; polymorphic like `<Link>`.
 * @see docs/components/LinkCard.md
 */
export const LinkCard = forwardRef(function LinkCard<C extends ElementType = 'a'>(
  { as, padding = 'md', tone, className, children, ...props }: LinkCardProps<C>,
  ref: ForwardedRef<Element>,
) {
  const Component = (as || 'a') as ElementType;
  // Default native <button> to type="button" so it doesn't submit forms (Rule 6).
  // Spread before {...props} so a consumer can still pass type="submit".
  const typeDefault = Component === 'button' ? { type: 'button' as const } : {};

  // typeDefault first, then {...props} (consumer wins), then component-owned
  // className (merged via clsx) + data-tone — same spread order as Link.
  return (
    <Component
      ref={ref}
      {...typeDefault}
      {...props}
      className={clsx(styles.linkCard, paddingClass[padding], className)}
      data-tone={tone}
    >
      {children}
    </Component>
  );
}) as LinkCardComponent;
