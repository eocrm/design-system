import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Button.module.scss';

/** Visual variant. See ButtonProps#variant for when to use each. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Control height. See ButtonProps#size for when to use each. */
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant.
   * - `primary` (default) — the section's main action. Use **one** per page section.
   * - `secondary` — supporting actions like "Cancel", "Export", "Filter".
   * - `ghost` — tertiary actions in dense UIs (toolbar buttons, row actions).
   * - `danger` — destructive operations only (Delete, Revoke, Remove). Pair with a confirmation if irreversible.
   */
  variant?: ButtonVariant;
  /**
   * Control height (matches the shared `--size-*` scale used by Input and Avatar).
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
 * // Form footer pattern:
 * <Cluster justify="end" gap="sm">
 *   <Button variant="secondary">Cancel</Button>
 *   <Button type="submit">Save</Button>
 * </Cluster>
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
