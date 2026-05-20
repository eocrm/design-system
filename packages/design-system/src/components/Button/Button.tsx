import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Button.module.scss';

/** Visual variant. See ButtonProps#variant for when to use each. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

/** Control height. See ButtonProps#size for when to use each. */
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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
}

/**
 * Action trigger. Renders a `<button type="button">` and forwards refs and
 * HTML attributes. Defaults to `type="button"` so it won't submit ancestor
 * forms unless you explicitly pass `type="submit"`.
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
 * // Icon-only at xs — pass `aria-label` so screen readers announce the action.
 * <Button size="xs" variant="ghost" aria-label="Remove">
 *   <X size={12} />
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
 * - Navigation to another URL → use a router-aware `<Link>` (not yet shipped).
 * - Toggle state (on/off) → use `Switch` or `Checkbox` (not yet shipped), not
 *   a Button with internal state.
 * - A clickable table row → make the row itself the interactive surface;
 *   don't nest a button.
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
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(styles.button, styles[variant], styles[size], className)}
      {...props}
    />
  );
});
