import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Text } from '../Text';
import { type BadgeTone } from '../Badge';
import styles from './FilterChip.module.scss';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface FilterChipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  onDismiss?: () => void;
  dismissLabel?: string;
  children: ReactNode;
}

export interface FilterChipLabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export interface FilterChipValueProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

// ----------------------------------------------------------------------------
// Root
// ----------------------------------------------------------------------------

const FilterChipRoot = forwardRef<HTMLDivElement, FilterChipProps>(function FilterChipRoot(
  { onDismiss, dismissLabel = 'Remove filter', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(styles.chip, className)}
      // {...rest} first so role="group" wins — locked semantics per Hard rule 6 pattern B.
      {...rest}
      role="group"
    >
      {children}
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label={dismissLabel}
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </div>
  );
});

// ----------------------------------------------------------------------------
// Label
// ----------------------------------------------------------------------------

const FilterChipLabel = forwardRef<HTMLSpanElement, FilterChipLabelProps>(function FilterChipLabel(
  { className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(styles.label, className)} {...rest}>
      <Text size="sm" tone="muted">
        {children}
      </Text>
    </span>
  );
});

// ----------------------------------------------------------------------------
// Value
// ----------------------------------------------------------------------------

const FilterChipValue = forwardRef<HTMLSpanElement, FilterChipValueProps>(function FilterChipValue(
  { tone, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(styles.value, className)} {...rest}>
      {tone && <span className={styles.dot} data-tone={tone} aria-hidden />}
      <Text size="sm">{children}</Text>
    </span>
  );
});

// ----------------------------------------------------------------------------
// Compound export
// ----------------------------------------------------------------------------

export const FilterChip = Object.assign(FilterChipRoot, {
  Label: FilterChipLabel,
  Value: FilterChipValue,
});
