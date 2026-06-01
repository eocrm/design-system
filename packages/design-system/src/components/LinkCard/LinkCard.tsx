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
 * A clickable Card whose entire surface is one navigation/action target.
 * Polymorphic like `<Link>`: renders an `<a>` by default; pass `as={RouterLink}`
 * for SPA routes or `as="button"` for an action. Carries `Card`'s surface
 * (`padding`, `tone`) plus a hover lift and a `:focus-visible` ring.
 *
 * Use when the WHOLE card is clickable. For non-interactive grouping use
 * `<Card>`; for inline text navigation use `<Link>`; for a form action use
 * `<Button>`.
 *
 * @example
 * // SPA route — pass your router's Link as `as`.
 * import { Link as RouterLink } from 'react-router-dom';
 * <LinkCard as={RouterLink} to="/contacts/42" padding="md">
 *   <Stack gap="xs">
 *     <Text weight="semibold">Acme Corp</Text>
 *     <Text size="sm" tone="muted">12 open deals</Text>
 *   </Stack>
 * </LinkCard>
 *
 * @example
 * // External link (native <a>) + a tone stripe.
 * <LinkCard href="https://status.example.com" tone="success">
 *   <Text weight="semibold">All systems operational</Text>
 * </LinkCard>
 *
 * @example
 * // Card-shaped action button.
 * <LinkCard as="button" type="button" onClick={openImporter}>
 *   <Text weight="semibold">Import contacts</Text>
 * </LinkCard>
 *
 * @remarks When NOT to use
 * - Non-interactive grouped content → `<Card>`.
 * - Inline text navigation ("View all →") → `<Link>`.
 * - A form action / trigger that isn't card-shaped → `<Button>`.
 *
 * @remarks Anti-patterns
 * - ❌ Nesting interactive controls (`<Button>` / `<Link>`) inside a LinkCard —
 *   nested interactives are invalid + confusing. Keep the card content
 *   non-interactive, or use a plain `<Card>` with explicit controls.
 * - ❌ `<LinkCard href="#" onClick={…}>` — a fake href breaks "open in new tab".
 *   Use `as="button"` for an action.
 * - ❌ `<LinkCard href="https://…" target="_blank">` without `rel="noopener noreferrer"` — security risk.
 *
 * @remarks A11y
 * - Renders a real `<a>` / `<button>` / router link, so it has native
 *   semantics; the children supply the accessible name — keep the primary
 *   label first. `:focus-visible` provides the keyboard ring.
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
