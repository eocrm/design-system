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
