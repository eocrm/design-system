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
import { mergeRefs } from '../_internal/refs';
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
  /**
   * Leading icon, rendered in a fixed-size slot before the label (parity with
   * `<DropdownMenu.Item icon>`). Prefer this over inlining an icon into
   * `children`: typeahead derives its match string from the string children, so
   * an inlined leading icon leaves the JSX whitespace `" "` as the first string
   * child and breaks first-letter type-to-select. Passing the icon here keeps
   * the typeahead label the pure label string. Mark the glyph `aria-hidden`.
   */
  icon?: ReactNode;
  /** Optional trailing shortcut hint (e.g. `'⌘D'`). Visual cue only — does NOT register a global key handler. */
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
 * Toggleable menu item with `role="menuitemcheckbox"` and `aria-checked`.
 * Defaults to `closeOnSelect=false` — multi-select menus stay open after each
 * toggle, which matches the typical filter-menu interaction. Override to
 * `true` for single-toggle menus.
 *
 * **Checked-state visual**: when checked, the row is tinted with the info
 * surface color (`--badge-bg-info` / `--badge-fg-info`) and gets
 * a 2px left accent (`--color-info`). No default glyph is rendered. Provide a
 * `<DropdownMenu.ItemIndicator>` as a direct child if you want an additional
 * indicator glyph alongside the tinted row.
 *
 * @example
 * <DropdownMenu.CheckboxItem checked={isOn} onCheckedChange={setOn}>
 *   Show archived
 * </DropdownMenu.CheckboxItem>
 *
 * @example
 * // Augment the tinted-row indicator with a custom glyph:
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
 *   shallow; deeper nesting won't render in the indicator slot.
 * - ❌ Multiple checked CheckboxItems in a "pick one" context. Switch to RadioGroup.
 */
export const CheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  function CheckboxItem(
    {
      checked,
      onCheckedChange,
      closeOnSelect = false,
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
        {indicator && (
          <span className={styles.indicatorSlot} aria-hidden="true">
            {checked && indicator}
          </span>
        )}
        {icon !== undefined && <span className={styles.icon}>{icon}</span>}
        <span className={styles.itemLabel}>{labelContent}</span>
        {meta !== undefined && <span className={styles.meta}>{meta}</span>}
        {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
      </div>
    );
  },
);
