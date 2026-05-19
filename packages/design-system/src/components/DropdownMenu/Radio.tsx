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
import { RadioGroupContext, useDropdownMenuContext, useRadioGroupContext } from './context';
import { mergeRefs } from './utils';
import { ItemIndicator } from './ItemIndicator';

export interface DropdownMenuRadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** The currently-selected value. */
  value: string;
  /** Called with the new value when a RadioItem is activated. */
  onValueChange: (value: string) => void;
  children: ReactNode;
}

/**
 * Mutually exclusive selection group. Children should be `<DropdownMenu.RadioItem>`s.
 *
 * Renders `<div role="radiogroup">` and provides the current `value` and
 * `onValueChange` to all descendant `RadioItem`s via context.
 *
 * @example
 * <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
 *   <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
 *   <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
 * </DropdownMenu.RadioGroup>
 */
export const RadioGroup = forwardRef<HTMLDivElement, DropdownMenuRadioGroupProps>(
  function RadioGroup({ value, onValueChange, className, children, ...rest }, ref) {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange }}>
        {/* {...rest} first so consumer props don't override role="radiogroup" */}
        <div {...rest} ref={ref} role="radiogroup" className={clsx(styles.group, className)}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  },
);

export interface DropdownMenuRadioItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** The value this item represents. Activating sets the group's value to this. */
  value: string;
  /**
   * Whether activating closes the entire menu chain. Defaults to `true` —
   * radio selection IS the action; the menu's job is done once a value is chosen.
   */
  closeOnSelect?: boolean;
  /** Disabled items don't fire onValueChange, are skipped by keyboard nav, and render dimmed. */
  disabled?: boolean;
  /** Optional trailing shortcut hint (e.g. `'⌘N'`). */
  shortcut?: string;
  children: ReactNode;
}

/**
 * Single radio item inside a `<DropdownMenu.RadioGroup>`.
 *
 * `role="menuitemradio"`, `aria-checked` reflects whether this item's `value`
 * matches the group's current value. Defaults to `closeOnSelect=true`.
 *
 * Indicator: provide a `<DropdownMenu.ItemIndicator>` as a direct child to
 * customize the glyph. Without one, a default `●` renders when selected.
 * Detection is shallow — ItemIndicator must be a direct child.
 *
 * Must be used inside `<DropdownMenu.RadioGroup>` — throws otherwise.
 *
 * @example
 * <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
 *   <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
 *   <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
 * </DropdownMenu.RadioGroup>
 *
 * @example
 * // Keep menu open for preview-style radio (uncommon)
 * <DropdownMenu.RadioItem value="compact" closeOnSelect={false}>
 *   Compact
 * </DropdownMenu.RadioItem>
 */
export const RadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  function RadioItem(
    {
      value,
      closeOnSelect = true,
      disabled = false,
      shortcut,
      className,
      children,
      ...rest
    },
    forwardedRef,
  ) {
    const ctx = useDropdownMenuContext('RadioItem');
    const groupCtx = useRadioGroupContext('RadioItem');
    const itemRef = useRef<HTMLDivElement | null>(null);
    const id = useId();

    const checked = groupCtx.value === value;

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
      groupCtx.onValueChange(value);
      if (closeOnSelect) {
        ctx.closeAll();
      }
    };

    return (
      // {...rest} first so consumer props don't override the menuitemradio ARIA contract.
      <div
        {...rest}
        ref={mergeRefs<HTMLDivElement>(itemRef, forwardedRef)}
        role="menuitemradio"
        tabIndex={isActive ? 0 : -1}
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        className={clsx(styles.item, className)}
        onClick={handleClick}
      >
        {/* aria-hidden: the indicator is purely visual; aria-checked already conveys selection state. */}
        <span aria-hidden="true" className={styles.indicatorSlot}>
          {checked && (indicator ?? <span className={styles.defaultIndicator}>●</span>)}
        </span>
        <span className={styles.itemLabel}>{labelContent}</span>
        {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
      </div>
    );
  },
);
