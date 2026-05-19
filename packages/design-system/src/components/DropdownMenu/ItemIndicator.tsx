import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Props for `<DropdownMenu.ItemIndicator>`.
 *
 * Extends standard `span` HTML attributes so consumers can apply
 * `className`, `style`, `data-*`, etc. to the indicator wrapper.
 */
export interface DropdownMenuItemIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  /** The indicator glyph or icon to display when the parent item is checked/selected. */
  children?: ReactNode;
}

/**
 * Marker component used inside `<DropdownMenu.CheckboxItem>` or
 * `<DropdownMenu.RadioItem>` to provide a custom indicator (✓, ●, an icon,
 * an animated check, etc.).
 *
 * Detection is shallow: only direct children of CheckboxItem/RadioItem are
 * inspected via `React.Children.toArray` + `c.type === ItemIndicator`. Nest
 * it deeper and the parent won't find it.
 *
 * The parent decides when to render this (based on its `checked` state) —
 * ItemIndicator itself is just a thin `<span>` wrapper.
 *
 * @example
 * <DropdownMenu.CheckboxItem checked={x} onCheckedChange={setX}>
 *   <DropdownMenu.ItemIndicator>
 *     <CheckIcon size={14} />
 *   </DropdownMenu.ItemIndicator>
 *   Show archived
 * </DropdownMenu.CheckboxItem>
 *
 * @example
 * <DropdownMenu.RadioItem value="compact">
 *   <DropdownMenu.ItemIndicator>
 *     <DotIcon size={10} />
 *   </DropdownMenu.ItemIndicator>
 *   Compact
 * </DropdownMenu.RadioItem>
 *
 * @remarks Anti-patterns
 * - ❌ Nesting ItemIndicator deeper than a direct child of CheckboxItem /
 *   RadioItem. Detection is shallow; deeper nesting falls through and the
 *   default glyph renders instead.
 * - ❌ Using ItemIndicator inside a regular `<Item>`. Item doesn't extract
 *   it — the indicator content just renders inline like any other child.
 */
export const ItemIndicator = forwardRef<HTMLSpanElement, DropdownMenuItemIndicatorProps>(
  function ItemIndicator({ children, ...rest }, ref) {
    return (
      <span ref={ref} {...rest}>
        {children}
      </span>
    );
  },
);
