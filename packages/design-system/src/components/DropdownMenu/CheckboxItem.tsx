import {
  Children,
  forwardRef,
  isValidElement,
  useId,
  useLayoutEffect,
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './DropdownMenu.module.scss';
import { useDropdownMenuContext } from './context';
import { mergeRefs } from './utils';
import { ItemIndicator } from './ItemIndicator';

export interface DropdownMenuCheckboxItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Whether the item is checked. */
  checked: boolean;
  /** Called with the new checked state when activated. */
  onCheckedChange: (checked: boolean) => void;
  /**
   * Whether activating closes the entire menu chain. Defaults to `false` —
   * checkbox items typically toggle in place inside a multi-select menu.
   */
  closeOnSelect?: boolean;
  /** Disabled items don't fire onCheckedChange, are skipped by keyboard nav, render dimmed. */
  disabled?: boolean;
  /** Optional trailing shortcut hint (e.g. `'⌘D'`). */
  shortcut?: string;
  children: ReactNode;
}

/**
 * Toggleable menu item with `role="menuitemcheckbox"` and `aria-checked`.
 * Defaults to `closeOnSelect=false` — multi-select menus stay open after
 * each toggle.
 *
 * Indicator: provide a `<DropdownMenu.ItemIndicator>` as a direct child to
 * customize the glyph. Without one, a default `✓` renders when `checked`.
 * Detection is shallow — ItemIndicator must be a direct child.
 *
 * @example
 * <DropdownMenu.CheckboxItem checked={isOn} onCheckedChange={setOn}>
 *   Show archived
 * </DropdownMenu.CheckboxItem>
 *
 * @example
 * <DropdownMenu.CheckboxItem checked={isOn} onCheckedChange={setOn} closeOnSelect>
 *   Apply and close
 * </DropdownMenu.CheckboxItem>
 */
export const CheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  function CheckboxItem(
    {
      checked,
      onCheckedChange,
      closeOnSelect = false,
      disabled = false,
      shortcut,
      className,
      children,
      ...rest
    },
    forwardedRef,
  ) {
    const ctx = useDropdownMenuContext('CheckboxItem');
    const itemRef = useRef<HTMLDivElement | null>(null);
    const id = useId();

    // Extract any ItemIndicator from direct children.
    const childrenArray = Children.toArray(children);
    const indicator = childrenArray.find(
      (c) => isValidElement(c) && c.type === ItemIndicator,
    );
    const labelContent = childrenArray.filter((c) => c !== indicator);
    const labelText =
      labelContent.find((c): c is string => typeof c === 'string') ?? '';

    useLayoutEffect(() => {
      return ctx.registerItem({ id, ref: itemRef, disabled, label: labelText });
    }, [ctx, id, disabled, labelText]);

    const index = ctx.itemsRef.current.findIndex((x) => x.id === id);
    const isActive = index !== -1 && index === ctx.activeIndex;

    const handleClick = (_e: MouseEvent) => {
      if (disabled) return;
      onCheckedChange(!checked);
      if (closeOnSelect) {
        ctx.closeAll();
      }
    };

    return (
      // {...rest} first so consumer-supplied props don't override the menuitemcheckbox
      // ARIA contract (role/tabIndex/aria-checked/aria-disabled) or our event wiring.
      <div
        {...rest}
        ref={mergeRefs<HTMLDivElement>(itemRef, forwardedRef)}
        role="menuitemcheckbox"
        tabIndex={isActive ? 0 : -1}
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        className={clsx(styles.item, className)}
        onClick={handleClick}
      >
        <span className={styles.indicatorSlot}>
          {checked && (indicator ?? <span className={styles.defaultIndicator}>✓</span>)}
        </span>
        <span className={styles.itemLabel}>{labelContent}</span>
        {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
      </div>
    );
  },
);
