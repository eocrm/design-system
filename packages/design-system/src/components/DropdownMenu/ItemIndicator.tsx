import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Props for `<DropdownMenu.ItemIndicator>`.
 *
 * Extends standard `span` HTML attributes so consumers can apply
 * `className`, `style`, `data-*`, etc. to the indicator wrapper.
 */
export interface DropdownMenuItemIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Indicator content (icon, custom glyph, animated element) to render in the
   * parent item's indicator slot. The parent — CheckboxItem or RadioItem —
   * decides when this is rendered based on its own `checked` state.
   */
  children?: ReactNode;
}

/**
 * Marker component for adding a custom indicator glyph alongside the
 * tinted-row checked state of `<DropdownMenu.CheckboxItem>` or
 * `<DropdownMenu.RadioItem>`. Without it, checked items already convey
 * selection via the info-tinted row + 2px left accent — ItemIndicator is
 * purely additive, for cases where the consumer wants an extra icon (a
 * custom check, an animated dot, etc.) in addition to the row treatment.
 *
 * Detection is shallow: only direct children of CheckboxItem/RadioItem are
 * inspected via `React.Children.toArray` + `c.type === ItemIndicator`. Nest
 * it deeper and the parent won't find it (no glyph appears; the row tint
 * still indicates selection).
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
 *   RadioItem. Detection is shallow; deeper nesting won't render in the
 *   indicator slot. The tinted-row treatment still appears, so the item
 *   still looks selected, but the custom glyph is silently dropped.
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
