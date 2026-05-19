import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

export interface DropdownMenuItemIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
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
