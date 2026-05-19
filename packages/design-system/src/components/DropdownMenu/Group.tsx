import { forwardRef, useContext, useId, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';
import { GroupContext } from './context';
import { sanitizeId } from '../_internal/refs';

/**
 * Props for `<DropdownMenu.Group>`.
 *
 * Extends all standard `div` HTML attributes so consumers can attach
 * `data-*`, `className`, event handlers, etc.
 */
export interface DropdownMenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Menu items (and optionally a `<DropdownMenu.Label>`) to include in the group. */
  children: ReactNode;
}

/**
 * Visual and accessible grouping wrapper for related menu items. Renders
 * `<div role="group">` with `aria-labelledby` wired to any
 * `<DropdownMenu.Label>` inside — no manual id management needed.
 *
 * Use to wrap a label + items section (e.g., a labeled RadioGroup or a
 * labeled checkbox bank).
 *
 * @example
 * <DropdownMenu.Group>
 *   <DropdownMenu.Label>Sort by</DropdownMenu.Label>
 *   <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
 *     <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
 *     <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
 *   </DropdownMenu.RadioGroup>
 * </DropdownMenu.Group>
 *
 * @example
 * <DropdownMenu.Group>
 *   <DropdownMenu.Label>Visibility</DropdownMenu.Label>
 *   <DropdownMenu.CheckboxItem checked={a} onCheckedChange={setA}>Active</DropdownMenu.CheckboxItem>
 *   <DropdownMenu.CheckboxItem checked={p} onCheckedChange={setP}>Pending</DropdownMenu.CheckboxItem>
 * </DropdownMenu.Group>
 *
 * @remarks When NOT to use
 * - Around a single Item — overkill. Group is for sections of 2+ related items.
 * - As a generic layout primitive. Use `<Stack>` or `<Cluster>` for non-menu layout.
 * - Around a RadioGroup if you don't need a visible Label too — RadioGroup
 *   already provides `role="radiogroup"`. Group adds a second role layer.
 */
export const Group = forwardRef<HTMLDivElement, DropdownMenuGroupProps>(function Group(
  { children, className, ...rest },
  ref,
) {
  const reactId = useId();
  const labelId = `dropdown-menu-label-${sanitizeId(reactId)}`;
  return (
    <GroupContext.Provider value={{ labelId }}>
      {/* {...rest} first so role and aria-labelledby always win */}
      <div
        {...rest}
        ref={ref}
        role="group"
        aria-labelledby={labelId}
        className={clsx(styles.group, className)}
      >
        {children}
      </div>
    </GroupContext.Provider>
  );
});

/**
 * Props for `<DropdownMenu.Label>`.
 *
 * Extends all standard `div` HTML attributes. When rendered inside a
 * `<DropdownMenu.Group>`, the component controls the `id` attribute to
 * satisfy the `aria-labelledby` contract — a consumer-supplied `id` is
 * used only when outside a Group.
 */
export interface DropdownMenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  /** The label text content. */
  children: ReactNode;
}

/**
 * Non-interactive section heading inside a `<DropdownMenu.Content>`. Renders
 * a small uppercase tracked text row. When placed inside a
 * `<DropdownMenu.Group>`, Label gets the group's auto-generated id so
 * `aria-labelledby` resolves correctly. Outside a Group, Label still renders —
 * without aria wiring.
 *
 * @example
 * // Inside a Group — id/aria wiring is automatic:
 * <DropdownMenu.Group>
 *   <DropdownMenu.Label>Sort by</DropdownMenu.Label>
 *   <DropdownMenu.Item onSelect={handleEdit}>Edit</DropdownMenu.Item>
 * </DropdownMenu.Group>
 *
 * @example
 * // Standalone label (no Group), no aria wiring — useful for casual headings:
 * <DropdownMenu.Content>
 *   <DropdownMenu.Label>Quick actions</DropdownMenu.Label>
 *   <DropdownMenu.Item onSelect={refresh}>Refresh</DropdownMenu.Item>
 * </DropdownMenu.Content>
 *
 * @remarks When NOT to use
 * - As a clickable item — Label carries no `role="menuitem"` and is not
 *   keyboard-focusable. Use a disabled `<DropdownMenu.Item>` for a
 *   selectable header-style row.
 * - As a replacement for `<DropdownMenu.Group>` + Label. Outside a Group,
 *   there is no `aria-labelledby` wiring.
 */

export const Label = forwardRef<HTMLDivElement, DropdownMenuLabelProps>(function Label(
  { children, className, id: idProp, ...rest },
  ref,
) {
  const groupCtx = useContext(GroupContext);
  // If inside a Group, use the group's label id so aria-labelledby resolves.
  // Otherwise leave id as the consumer's (or undefined).
  const id = idProp ?? groupCtx?.labelId;
  return (
    // {...rest} first so the resolved id (consumer prop ?? GroupContext) always wins.
    <div {...rest} ref={ref} id={id} className={clsx(styles.label, className)}>
      {children}
    </div>
  );
});
