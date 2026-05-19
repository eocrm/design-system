import { useContext, useId, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';
import { GroupContext } from './context';
import { sanitizeId } from './utils';

/**
 * A semantic grouping wrapper for related menu items.
 *
 * Renders a `role="group"` container and wires up `aria-labelledby` to any
 * nested `<DropdownMenu.Label>` automatically — no manual id management needed.
 *
 * @example
 * ```tsx
 * <DropdownMenu.Group>
 *   <DropdownMenu.Label>Sort by</DropdownMenu.Label>
 *   <DropdownMenu.Item onSelect={() => {}}>Name</DropdownMenu.Item>
 *   <DropdownMenu.Item onSelect={() => {}}>Date</DropdownMenu.Item>
 * </DropdownMenu.Group>
 * ```
 */
export interface DropdownMenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Menu items (and optionally a `<DropdownMenu.Label>`) to include in the group. */
  children: ReactNode;
}

export function Group({ children, className, ...rest }: DropdownMenuGroupProps) {
  const reactId = useId();
  const labelId = `dropdown-menu-label-${sanitizeId(reactId)}`;
  return (
    <GroupContext.Provider value={{ labelId }}>
      {/* {...rest} first so role and aria-labelledby always win */}
      <div
        {...rest}
        role="group"
        aria-labelledby={labelId}
        className={clsx(styles.group, className)}
      >
        {children}
      </div>
    </GroupContext.Provider>
  );
}

/**
 * A non-interactive text label for a section of menu items.
 *
 * When placed inside `<DropdownMenu.Group>`, its `id` is automatically set to
 * match the group's `aria-labelledby` value, satisfying the ARIA grouping
 * contract without any manual id wiring.
 *
 * When placed outside a Group it renders as plain decorative text with no id
 * assignment.
 *
 * @remarks
 * **When NOT to use**: do not use `<DropdownMenu.Label>` as a clickable item —
 * it carries no `role="menuitem"` and is not keyboard-focusable. If you need a
 * selectable header-style row, use a disabled `<DropdownMenu.Item>` instead.
 *
 * @example
 * ```tsx
 * // Inside a Group — id/aria wiring is automatic
 * <DropdownMenu.Group>
 *   <DropdownMenu.Label>Actions</DropdownMenu.Label>
 *   <DropdownMenu.Item onSelect={handleEdit}>Edit</DropdownMenu.Item>
 * </DropdownMenu.Group>
 *
 * // Outside a Group — purely decorative, no id
 * <DropdownMenu.Label>Quick actions</DropdownMenu.Label>
 * ```
 */
export interface DropdownMenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  /** The label text content. */
  children: ReactNode;
}

export function Label({ children, className, id: idProp, ...rest }: DropdownMenuLabelProps) {
  const groupCtx = useContext(GroupContext);
  // If inside a Group, use the group's label id so aria-labelledby resolves.
  // Otherwise leave id as the consumer's (or undefined).
  const id = idProp ?? groupCtx?.labelId;
  return (
    // {...rest} first so id always wins (component controls it)
    <div {...rest} id={id} className={clsx(styles.groupLabel, className)}>
      {children}
    </div>
  );
}
