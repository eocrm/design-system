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
 * Accessible grouping wrapper for related menu items, labelled by a `DropdownMenu.Label` inside it.
 * @see docs/components/DropdownMenu.md
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
 * Non-interactive section heading inside a `DropdownMenu.Content`.
 * @see docs/components/DropdownMenu.md
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
