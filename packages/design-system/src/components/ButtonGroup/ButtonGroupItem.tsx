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
 * Segmented-mode item. Renders `<button role="radio">` with roving tabindex
 * and `aria-checked` driven by the parent's `value`. The parent walks items
 * in DOM order via a `querySelectorAll` on keydown — no registration needed.
 *
 * Must be used inside a `<ButtonGroup>` in segmented mode (where `value` +
 * `onValueChange` are set). Using `<ButtonGroup.Item>` in visual mode
 * (no `value` on the parent) throws at render time because there's no
 * `ButtonGroupContext` to register against — that's the intended guardrail.
 */
export function ButtonGroupItem({ value, disabled = false, className, children }: ButtonGroupItemProps) {
  const ctx = useButtonGroupContext('Item');

  const isSelected = ctx.value === value;
  const effectiveDisabled = disabled || ctx.disabled;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={effectiveDisabled || undefined}
      tabIndex={isSelected ? 0 : -1}
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
