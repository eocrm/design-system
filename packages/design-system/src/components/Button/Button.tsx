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
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

/** Control height. See ButtonProps#size for when to use each. */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonOwnProps {
  /**
   * Visual variant.
   * - `primary` (default) — the section's main action. Use **one** per page section.
   * - `secondary` — supporting actions like "Cancel", "Export", "Filter".
   * - `ghost` — tertiary actions in dense UIs (toolbar buttons, row actions).
   * - `danger` — destructive operations only (Delete, Revoke, Remove). Pair with a confirmation if irreversible.
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
 * Action trigger. Renders a `<button type="button">` and forwards refs and
 * HTML attributes. Defaults to `type="button"` so it won't submit ancestor
 * forms unless you explicitly pass `type="submit"`.
 *
 * Polymorphic via `as`: `<Button as="a" href="…">` renders a real `<a>`, so it
 * navigates and announces as a link, and `type="button"` is not emitted. Use
 * it for a destination that must look like a button; use `<Link>` for
 * link-shaped navigation in running text.
 *
 * Pass `aria-disabled="true"` when an unavailable action must remain focusable
 * (for example, so keyboard users can discover it and its explanation). This
 * provides unavailable visual treatment without setting native `disabled`, so
 * it does not prevent events. The consumer must suppress activation in its
 * handler while the action is unavailable.
 *
 * @example
 * <Button onClick={save}>Save</Button>
 *
 * @example
 * <Button variant="danger" size="sm" onClick={remove}>
 *   <Trash2 size={14} /> Delete
 * </Button>
 *
 * @example
 * // Icon-only square button — pass `iconOnly` for a square shape (20×20 at
 * // xs, 32×32 at md, etc.) and `aria-label` so screen readers announce it.
 * <Button size="xs" variant="ghost" iconOnly aria-label="Remove">
 *   <X size={12} />
 * </Button>
 *
 * @example
 * // A destination that must look like a button — renders a real <a>, so it
 * // navigates, announces as a link, and supports middle-click / open-in-new-tab.
 * // `rel="noreferrer"` belongs with `target="_blank"`, as on any anchor.
 * <Button as="a" href={idpConsoleUrl} target="_blank" rel="noreferrer" variant="secondary">
 *   Open identity console
 * </Button>
 *
 * @example
 * // Form footer pattern:
 * <Cluster justify="end" gap="sm">
 *   <Button variant="secondary">Cancel</Button>
 *   <Button type="submit">Save</Button>
 * </Cluster>
 *
 * @example
 * // Persistent filter trigger — state belongs to the consumer.
 * const [ownerApplied, setOwnerApplied] = useState(false);
 * <Button
 *   variant="secondary"
 *   selected={ownerApplied}
 *   aria-pressed={ownerApplied}
 *   onClick={() => setOwnerApplied((value) => !value)}
 * >
 *   Owner: Ada
 * </Button>
 *
 * @example
 * // Transient success confirmation (~1.5s). The timer is the consumer's
 * // responsibility — the variant is just paint. Track the timer in a ref so
 * // you can clear it on unmount (prevents a setState-after-unmount warning)
 * // and on a rapid second click (prevents the new flash from being cut short
 * // by the previous timer firing).
 * const [saved, setSaved] = useState(false);
 * const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 * useEffect(
 *   () => () => {
 *     if (timerRef.current) clearTimeout(timerRef.current);
 *   },
 *   [],
 * );
 * const handleSave = async () => {
 *   await save();
 *   if (timerRef.current) clearTimeout(timerRef.current);
 *   setSaved(true);
 *   timerRef.current = setTimeout(() => setSaved(false), 1500);
 * };
 * <Button variant={saved ? 'success' : 'primary'} onClick={handleSave}>
 *   {saved ? 'Saved!' : 'Save'}
 * </Button>
 *
 * @remarks When NOT to use
 * - Navigation in running text, a table cell, or a breadcrumb → use `<Link>`
 *   (which is itself polymorphic: `<Link as={NavLink} to="…">`). Reserve
 *   `<Button as="a">` for a destination that belongs in a row of buttons.
 * - Toggle state (on/off) → use `Switch` or `Checkbox` (not yet shipped), not
 *   a Button with internal state.
 * - Mutually exclusive choices → use `<ButtonGroup>`, which supplies the
 *   group-level selection semantics.
 * - A clickable table row → make the row itself the interactive surface;
 *   don't nest a button.
 * - On touch-first surfaces, prefer `size="sm"` or larger. `xs` (20px×~28px, or
 *   20×20 with `iconOnly`) is below WCAG 2.5.5 Level AAA touch-target
 *   guidance (24×24); acceptable here because the CRM is desktop-first.
 *
 * @remarks Anti-patterns
 * - ❌ Two `variant="primary"` Buttons in the same section. Pick one; others
 *   are `secondary`.
 * - ❌ `<Button style={{ marginLeft: 'auto' }}>` — wrap in `<Cluster
 *   justify="end">` (or `justify="between">` with a sibling) instead.
 * - ❌ Overriding padding/height via `className`. If you need a different
 *   visual size, that's a missing variant — request it, don't hack it.
 * - ❌ Using `variant="ghost"` for the page's primary action. Users won't
 *   discover it.
 * - ❌ Rendering `<Button variant="success">Save</Button>` on initial mount.
 *   `success` is a confirmation state, not an action intent — start as
 *   `primary` and flip to `success` after the action resolves.
 * - ❌ Using `size="xs"` for the primary or most prominent action in a
 *   section. `xs` is for inline density, not emphasis — reach for `md` or
 *   `lg` when the button should draw the eye.
 * - ❌ `<Button iconOnly><X /></Button>` without `aria-label`. The button has
 *   no accessible name; screen readers announce nothing. Always pair
 *   `iconOnly` with `aria-label="…"`.
 * - ❌ Assuming `selected` adds toggle semantics. It is paint only. Pass
 *   `aria-pressed` explicitly when activating the Button toggles that state;
 *   do not add it to menu or disclosure triggers.
 * - ❌ Assuming `aria-disabled="true"` blocks activation. It preserves native
 *   focusability and pointer events; guard the consumer's event handler.
 * - ❌ `<Button onClick={() => (window.location.href = url)}>` for navigation.
 *   It announces as a button, and there is no middle-click, no open-in-new-tab
 *   and no status-bar preview. Use `<Button as="a" href={url}>`.
 * - ❌ `<Button as="a">` with no `href`, for a click handler you wanted to look
 *   like a link. An anchor without one is neither focusable nor activatable —
 *   the type requires `href` whenever `as="a"`, so this does not compile.
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
