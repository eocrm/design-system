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
import { mergeRefs } from '../_internal/refs';
import { ItemIndicator } from './ItemIndicator';

/**
 * Props for `<DropdownMenu.RadioGroup>`.
 *
 * Extends standard `div` HTML attributes. `value` and `onValueChange` drive
 * the controlled selection; they are also distributed to child `RadioItem`s
 * via context, so no prop-drilling is required.
 */
export interface DropdownMenuRadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** The currently-selected value. Must match the `value` prop of one of the child RadioItems. */
  value: string;
  /** Called with the new value when a `<DropdownMenu.RadioItem>` is activated. */
  onValueChange: (value: string) => void;
  /** `<DropdownMenu.RadioItem>` children (and optionally `<DropdownMenu.Label>`). */
  children: ReactNode;
}

/**
 * Mutually exclusive selection group of `RadioItem`s, rendered as `role="radiogroup"`.
 * @see docs/components/DropdownMenu.md
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

/**
 * Props for `<DropdownMenu.RadioItem>`.
 *
 * Extends standard `div` HTML attributes, omitting `onSelect` (selection is
 * communicated via the parent `RadioGroup`'s `onValueChange`). The ARIA
 * contract attributes (`role`, `aria-checked`, `aria-disabled`) are always
 * set by the component.
 */
export interface DropdownMenuRadioItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  /** The value this item represents. Activating sets the parent RadioGroup's value to this. */
  value: string;
  /**
   * Whether activating closes the entire menu chain. Defaults to `true` —
   * radio selection IS the action; the menu's job is done once a value is chosen.
   * Set to `false` for preview-style selection where the menu stays open.
   */
  closeOnSelect?: boolean;
  /** Disabled items don't fire `onValueChange`, are skipped by keyboard nav, and render dimmed. */
  disabled?: boolean;
  /**
   * Leading icon, rendered in a fixed-size slot before the label (parity with
   * `<DropdownMenu.Item icon>`). Prefer this over inlining an icon into
   * `children`: typeahead derives its match string from the string children, so
   * an inlined leading icon leaves the JSX whitespace `" "` as the first string
   * child and breaks first-letter type-to-select. Passing the icon here keeps
   * the typeahead label the pure label string. Mark the glyph `aria-hidden`.
   */
  icon?: ReactNode;
  /** Optional trailing shortcut hint (e.g. `'⌘N'`). Visual cue only — does NOT register a global key handler. */
  shortcut?: string;
  /**
   * Trailing secondary content *about the item itself* — a region code, a
   * count, a `<Badge>`. Distinct from `shortcut`, which is a keyboard hint
   * and is styled (and free to evolve) as one.
   *
   * `ReactNode`, so a Badge or Dot can go here. It is NOT `aria-hidden`, so
   * it joins the item's accessible name ("demo RU" rather than a second
   * identical "demo") — which is the point when the label alone is
   * ambiguous. It is a prop, not a child, so it stays out of the typeahead
   * label; type-to-select still matches the pure label text.
   *
   * Renders before `shortcut` when both are present, keeping the keyboard
   * hint rightmost.
   */
  meta?: ReactNode;
  /**
   * Item content. May include a `<DropdownMenu.ItemIndicator>` as a direct
   * child to provide a custom indicator glyph.
   */
  children: ReactNode;
}

/**
 * Single radio item (`role="menuitemradio"`) inside a `RadioGroup`; closes the menu on select by default.
 * @see docs/components/DropdownMenu.md
 */
export const RadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(function RadioItem(
  {
    value,
    closeOnSelect = true,
    disabled = false,
    icon,
    shortcut,
    meta,
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
      {/* Indicator slot only rendered when a custom ItemIndicator is provided.
          Default checked state is conveyed via the row's tinted background +
          left accent (.item[aria-checked='true'] in SCSS). */}
      {indicator && (
        <span aria-hidden="true" className={styles.indicatorSlot}>
          {checked && indicator}
        </span>
      )}
      {icon !== undefined && <span className={styles.icon}>{icon}</span>}
      <span className={styles.itemLabel}>{labelContent}</span>
      {meta !== undefined && <span className={styles.meta}>{meta}</span>}
      {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
    </div>
  );
});
