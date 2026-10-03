import {
  forwardRef,
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
} from 'react';
import clsx from 'clsx';
import styles from './Button.module.scss';

/** Visual variant. See ButtonProps#variant for when to use each. */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'danger-outline'
  | 'success';

/** Control height. See ButtonProps#size for when to use each. */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonOwnProps {
  /**
   * Visual variant.
   * - `primary` (default) — the section's main action. Use **one** per page section.
   * - `secondary` — supporting actions like "Cancel", "Export", "Filter".
   * - `ghost` — tertiary actions in dense UIs (toolbar buttons, row actions).
   * - `danger` — destructive operations only (Delete, Revoke, Remove). Pair with a confirmation if irreversible.
   * - `danger-outline` — a destructive action that must not dominate: surface
   *   fill, danger text and border. For a Remove repeated on every row, or a
   *   destructive action beside a primary one. Use filled `danger` for the
   *   confirm step itself.
   * - `success` — **transient confirmation only**, not an initial state. Flip to
   *   `success` for ~1.5s after an action resolves (Save → "Saved!"), then
   *   flip back. Never render a button as `success` on mount — it has no
   *   action-intent meaning, only post-action feedback. See the `@example`
   *   below for the timer pattern.
   */
  variant?: ButtonVariant;
  /**
   * Control height (matches the shared `--size-*` scale used by Input and Avatar).
   * - `xs` (20px) — icon-only or very dense inline actions (row controls,
   *   chip-adjacent buttons). Pass `aria-label` when icon-only. Below WCAG
   *   2.5.5 Level AAA touch-target guidance; reserve for desktop-first surfaces.
   * - `sm` (24px) — dense toolbars, tables, inline actions.
   * - `md` (32px, default) — most contexts.
   * - `lg` (40px) — marketing-style empty states or emphasized primary actions.
   */
  size?: ButtonSize;
  /**
   * Render the button as a square icon-only target — `aspect-ratio` is forced
   * to 1 so width tracks the size's `height` token (`xs` → 20×20, `sm` → 24×24,
   * `md` → 32×32, `lg` → 40×40) and `padding` is tightened to a small inset
   * (4px) so the icon has breathing room without changing the outer shape.
   *
   * **Always pass `aria-label`** when `iconOnly` is set, otherwise the button
   * has no accessible name. Pass a single icon as `children`.
   *
   * Use for inline density (row controls, chip-adjacent actions, toolbar
   * affordances). For an icon + short text label, leave `iconOnly` off — the
   * button will lay out as a normal rectangle with the existing gap.
   */
  iconOnly?: boolean;
  /**
   * Controlled persistent paint for an applied filter or toolbar value.
   * Selected paint applies only to `secondary` and `ghost` Buttons;
   * `primary`, `danger`, and `success` retain their intent paint. This prop is
   * visual only and does not add toggle-button semantics. Pass native
   * `aria-pressed` explicitly only when activating the Button itself toggles
   * the selected state; menu and disclosure triggers keep their own semantics.
   * The consumer owns the state. Defaults to `undefined` (not selected).
   */
  selected?: boolean;
}

/**
 * Polymorphic props helper. Intersects the component's own props with the
 * underlying element's props (minus what we own), plus the `as` selector.
 * Mirrors `<Link>`.
 */
type PolymorphicProps<C extends ElementType, P> = P & {
  /**
   * Render a different element — the case that matters is `as="a"` with
   * `href`, for a link that must LOOK like a button (an external console, a
   * download, an IdP hand-off). The element named here is what actually
   * renders, and its own attributes are typed: `href` is REQUIRED when
   * `as="a"` (an anchor without one is neither focusable nor a link) and
   * rejected otherwise.
   *
   * Reach for `<Link>` first. `<Link>` is link-SHAPED navigation — inline text
   * in a sentence, a table cell, a breadcrumb. `<Button as="a">` is for a
   * destination that sits in a row of buttons and must carry their weight.
   * Either way the element is a real anchor, so assistive tech announces a
   * link and the browser gives middle-click, "open in new tab", and the status
   * bar preview — none of which a `<button onClick={() => navigate()}>` has.
   *
   * `type="button"` is emitted only for a real `<button>`; an anchor never
   * gets it. Everything else — variant, size, `iconOnly`, `selected`, the
   * focus ring — is unchanged.
   *
   * @default 'button'
   */
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof P | 'as'> &
  // `href` is optional on every anchor in the DOM typings, so `as="a"` alone
  // would compile to an element that is neither focusable nor a link — the
  // silent shape #530 is about. Required here instead. The conditional is
  // deferred until `C` is known, so `as={RouterLink}` (which names its URL
  // prop `to`) and every non-anchor element are untouched.
  (C extends 'a' ? { href: string } : unknown);

/**
 * Public Button prop type. Generic `C` defaults to `'button'`, so a Button
 * with no `as` accepts exactly the `<button>` attributes it always did — and
 * still rejects `href`. With `as="a"`, the anchor's attributes (`href`,
 * `target`, `rel`, `download`) become available instead.
 */
export type ButtonProps<C extends ElementType = 'button'> = PolymorphicProps<C, ButtonOwnProps>;

/**
 * Internal generic-preserving signature. React's `forwardRef` strips the
 * generic from the returned component, so it is re-attached via the cast on
 * the export below.
 */
type ButtonComponent = {
  <C extends ElementType = 'button'>(
    props: ButtonProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] },
  ): ReactElement | null;
  /** Kept on the type because the cast below would otherwise drop it. */
  displayName?: string;
};

/**
 * Action trigger. Renders a `<button type="button">` and forwards refs and HTML attributes.
 * @see docs/components/Button.md
 */
export const Button = forwardRef(function Button<C extends ElementType = 'button'>(
  {
    as,
    variant = 'primary',
    size = 'md',
    iconOnly = false,
    selected,
    className,
    ...props
  }: ButtonProps<C>,
  ref: ForwardedRef<Element>,
) {
  const Component = (as || 'button') as ElementType;
  const paintsSelected = selected && (variant === 'secondary' || variant === 'ghost');

  // `type="button"` is a <button>-only guarantee — it stops the button
  // submitting an ancestor form. An anchor's `type` is a MIME hint, so
  // emitting the default there would be wrong; #530 rendered a <button> with a
  // dead `href` for the mirror-image reason. A consumer-supplied `type` still
  // wins: it rides along in {...props}, spread last.
  const defaultType = Component === 'button' ? { type: 'button' as const } : undefined;

  return (
    <Component
      ref={ref}
      {...defaultType}
      className={clsx(
        styles.button,
        styles[variant],
        styles[size],
        iconOnly && styles.iconOnly,
        paintsSelected && styles.selected,
        className,
      )}
      // {...props} last so consumers can supply native semantics such as aria-pressed.
      {...props}
    />
  );
}) as ButtonComponent;
