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

/**
 * Underline behavior, independent of `variant`. Defaults to `'hover'`, which
 * preserves each variant's existing look exactly — this prop only needs to
 * be passed to opt into one of the other two behaviors.
 * - `'hover'` — (default, same as omitting the prop) each variant's own
 *   at-rest/hover behavior: `default`/`subtle` underline on hover only,
 *   `muted` never underlines.
 * - `'always'` — underlined at rest (and stays underlined on hover). Use for
 *   any Link inside running text/body copy: color alone is not a sufficient
 *   visual cue (WCAG 1.4.1 — the default accent-on-body contrast is 2.06:1,
 *   below the 3:1 non-text threshold), so an inline link needs an underline
 *   to be told apart from surrounding words without relying on color.
 * - `'none'` — never underlined, not even on hover. Use for brand/nav/logo
 *   links that want a variant's subtle color without a hover underline.
 */
export type LinkUnderline = 'hover' | 'always' | 'none';

interface LinkOwnProps {
  /** Visual variant. See `LinkVariant` for descriptions. */
  variant?: LinkVariant;
  /** Underline behavior. See `LinkUnderline` for descriptions. Default: `'hover'`. */
  underline?: LinkUnderline;
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
export type LinkProps<C extends ElementType = 'a'> = PolymorphicProps<C, LinkOwnProps>;

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

// `'hover'` (the default) adds no class — each variant's own rules already
// implement it. Only the two overrides need a class.
const UNDERLINE_CLASS: Partial<Record<LinkUnderline, string>> = {
  always: styles.underlineAlways,
  none: styles.underlineNone,
};

/**
 * Polymorphic styled anchor (`as` for router links) with `default` / `muted` / `subtle` variants; for navigation only.
 * @see docs/components/Link.md
 */
export const Link = forwardRef(function Link<C extends ElementType = 'a'>(
  { as, variant = 'default', underline, className, children, ...props }: LinkProps<C>,
  ref: ForwardedRef<Element>,
) {
  const Component = (as || 'a') as ElementType;
  return (
    <Component
      ref={ref}
      {...props}
      className={clsx(
        styles.link,
        VARIANT_CLASS[variant],
        underline && UNDERLINE_CLASS[underline],
        className,
      )}
    >
      {children}
    </Component>
  );
}) as LinkComponent;
