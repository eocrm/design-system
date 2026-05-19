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

/**
 * Props for `<DropdownMenu.CheckboxItem>`.
 *
 * Extends standard `div` HTML attributes, omitting `onSelect` (use
 * `onCheckedChange` instead). The ARIA contract attributes (`role`,
 * `aria-checked`, `aria-disabled`) are always set by the component.
 */
export interface DropdownMenuCheckboxItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  /** Whether the item is checked. */
  checked: boolean;
  /** Called with the new checked state when activated (click or Enter/Space). */
  onCheckedChange: (checked: boolean) => void;
  /**
   * Whether activating closes the entire menu chain. Defaults to `false` —
   * checkbox items typically toggle in place inside a multi-select menu.
   * Set to `true` for single-toggle "apply and close" patterns.
   */
  closeOnSelect?: boolean;
  /** Disabled items don't fire `onCheckedChange`, are skipped by keyboard nav, and render dimmed. */
  disabled?: boolean;
  /** Optional trailing shortcut hint (e.g. `'⌘D'`). Visual cue only — does NOT register a global key handler. */
  shortcut?: string;
  /**
   * Item content. May include a `<DropdownMenu.ItemIndicator>` as a direct
   * child to provide a custom indicator glyph.
   */
  children: ReactNode;
}

/**
 * Toggleable menu item with `role="menuitemcheckbox"` and `aria-checked`.
 * Defaults to `closeOnSelect=false` — multi-select menus stay open after each
 * toggle, which matches the typical filter-menu interaction. Override to
 * `true` for single-toggle menus.
 *
 * Indicator: provide a `<DropdownMenu.ItemIndicator>` as a direct child to
 * customize the glyph. Without one, a default `✓` renders when `checked`.
 * Detection is shallow — ItemIndicator must be a direct child of CheckboxItem
 * (not nested deeper in a wrapper).
 *
 * @example
 * <DropdownMenu.CheckboxItem checked={isOn} onCheckedChange={setOn}>
 *   Show archived
 * </DropdownMenu.CheckboxItem>
 *
 * @example
 * <DropdownMenu.CheckboxItem checked={isOn} onCheckedChange={setOn}>
 *   <DropdownMenu.ItemIndicator>
 *     <CheckIcon size={14} />
 *   </DropdownMenu.ItemIndicator>
 *   Show archived
 * </DropdownMenu.CheckboxItem>
 *
 * @example
 * // Apply-then-close pattern:
 * <DropdownMenu.CheckboxItem checked={isOn} onCheckedChange={setOn} closeOnSelect>
 *   Apply and close
 * </DropdownMenu.CheckboxItem>
 *
 * @remarks When NOT to use
 * - For a one-off action that fires a function. Use `<DropdownMenu.Item>` —
 *   CheckboxItem implies persistent boolean state.
 * - For mutually exclusive selections. Use `<DropdownMenu.RadioGroup>` instead.
 *
 * @remarks Anti-patterns
 * - ❌ Nesting an `<ItemIndicator>` deeper than a direct child. Detection is
 *   shallow; deeper nesting renders the default glyph instead.
 * - ❌ Multiple checked CheckboxItems in a "pick one" context. Switch to RadioGroup.
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
    const indicator = childrenArray.find((c) => isValidElement(c) && c.type === ItemIndicator);
    const labelContent = childrenArray.filter((c) => c !== indicator);
    const labelText = labelContent.find((c): c is string => typeof c === 'string') ?? '';

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
        <span className={styles.indicatorSlot} aria-hidden="true">
          {checked && (indicator ?? <span className={styles.defaultIndicator}>✓</span>)}
        </span>
        <span className={styles.itemLabel}>{labelContent}</span>
        {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
      </div>
    );
  },
);
