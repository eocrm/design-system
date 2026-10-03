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
 * Marker for adding a custom indicator glyph alongside the tinted checked state of a `CheckboxItem` or `RadioItem`.
 * @see docs/components/DropdownMenu.md
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
