import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useDropdownMenuContext } from './context';
import { mergeRefs } from './utils';
import styles from './DropdownMenu.module.scss';

/** Item color treatment. */
export type DropdownMenuItemTone = 'default' | 'danger';

export interface DropdownMenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Called when the item is activated (click or Enter/Space). The consumer performs the action. */
  onSelect: () => void;
  /**
   * Visual tone.
   * - `'default'` — normal action.
   * - `'danger'` — destructive (Delete, Revoke, Remove). Reserve for irreversible operations.
   */
  tone?: DropdownMenuItemTone;
  /** Leading icon. Rendered in a fixed-size slot so labels stay aligned across items. */
  icon?: ReactNode;
  /** Trailing shortcut hint (e.g. `'⌘D'`). Visual cue only — does NOT register a global key handler. */
  shortcut?: string;
  /** Disabled items are skipped by keyboard nav, dimmed, and don't fire `onSelect` on click. */
  disabled?: boolean;
}

/**
 * A selectable menu item. Self-registers with the DropdownMenu context for
 * keyboard navigation and typeahead. Fires `onSelect` on activation.
 */
export const Item = forwardRef<HTMLDivElement, DropdownMenuItemProps>(function Item(
  { onSelect, tone = 'default', icon, shortcut, disabled = false, className, children, ...rest },
  forwardedRef,
) {
  const ctx = useDropdownMenuContext('Item');
  const itemRef = useRef<HTMLDivElement | null>(null);
  const id = useId();

  // String children become the typeahead label. Non-string fall back to '';
  // typeahead won't match those, which is acceptable.
  const label = typeof children === 'string' ? children : '';

  // useLayoutEffect (not useEffect) so item registration completes BEFORE
  // Content's parent useLayoutEffect runs to set activeIndex on open.
  useLayoutEffect(() => {
    return ctx.registerItem({ id, ref: itemRef, disabled, label });
  }, [ctx, id, disabled, label]);

  const index = ctx.itemsRef.current.findIndex((x) => x.id === id);
  const isActive = index !== -1 && index === ctx.activeIndex;

  const handleClick = (_e: MouseEvent) => {
    if (disabled) return;
    onSelect();
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus();
  };

  return (
    // {...rest} first so consumer-supplied props don't override the menuitem
    // ARIA contract (role/tabIndex/aria-disabled) or our event wiring.
    <div
      {...rest}
      ref={mergeRefs<HTMLDivElement>(itemRef, forwardedRef)}
      role="menuitem"
      tabIndex={isActive ? 0 : -1}
      aria-disabled={disabled || undefined}
      data-tone={tone}
      className={clsx(styles.item, className)}
      onClick={handleClick}
    >
      {icon !== undefined && <span className={styles.icon}>{icon}</span>}
      <span className={styles.itemLabel}>{children}</span>
      {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
    </div>
  );
});

/** Visual divider between groups of items. Decorative — `role="separator"`. */
export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}

/** Decorative visual divider between groups of items. `role="separator"`, not focusable. */
export const Separator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(function Separator(
  { className, ...rest },
  ref,
) {
  return (
    // {...rest} last; Separator is decorative and a consumer is free to
    // override role/className for their own grouping conventions.
    <div ref={ref} role="separator" className={clsx(styles.separator, className)} {...rest} />
  );
});
