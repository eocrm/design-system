import { type ReactNode } from 'react';
import clsx from 'clsx';
import { useButtonGroupContext, type ButtonGroupSize } from './context';
import styles from './ButtonGroup.module.scss';

export interface ButtonGroupItemProps {
  /** Value emitted to `onValueChange` when this item is selected. */
  value: string;
  /** Per-item disabled. Group-level disabled is OR-merged. */
  disabled?: boolean;
  /** className merges onto the rendered <button>. */
  className?: string;
  children: ReactNode;
}

const sizeClass: Record<ButtonGroupSize, string> = {
  xs: styles.sizeXs,
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

/**
 * Segmented-mode item. Renders `<button role="radio">` with roving tabindex.
 * @see docs/components/ButtonGroup.md
 */
export function ButtonGroupItem({
  value,
  disabled = false,
  className,
  children,
}: ButtonGroupItemProps) {
  const ctx = useButtonGroupContext('Item');

  const isSelected = ctx.value === value;
  const effectiveDisabled = disabled || ctx.disabled;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={effectiveDisabled || undefined}
      // Selected item holds the tab stop; when NOTHING is selected the group
      // would otherwise have no tab stop at all and be unreachable by keyboard
      // (#499). APG: the first radio takes focus when none is checked.
      tabIndex={isSelected || ctx.rovingFallbackValue === value ? 0 : -1}
      data-selected={isSelected ? '' : undefined}
      data-value={value}
      onClick={() => {
        if (effectiveDisabled) return;
        if (isSelected) return;
        ctx.onValueChange(value);
      }}
      onKeyDown={(e) => ctx.handleItemKeyDown(e, value)}
      className={clsx(styles.item, sizeClass[ctx.size], className)}
    >
      {children}
    </button>
  );
}
