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

/**
 * Dismissible "active filter" pill — the chip that shows which filters
 * are currently applied above a filter bar. Compound API: `<FilterChip>`
 * root with optional `<FilterChip.Label>` and `<FilterChip.Value>`
 * children. A dismiss button auto-renders at the end when `onDismiss`
 * is provided.
 *
 * Use it for filter UX (audit log filter strip, contacts owner filter,
 * deals stage filter). Not for tags or status pills — use `<Badge>`
 * for those.
 *
 * @example
 * // Canonical: label + tone-dotted value + dismiss
 * <FilterChip onDismiss={() => removeFilter('event')}>
 *   <FilterChip.Label>Event</FilterChip.Label>
 *   <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
 * </FilterChip>
 *
 * @example
 * // Value-only (no label slot, no tone)
 * <FilterChip onDismiss={() => removeFilter('tenant')}>
 *   <FilterChip.Value>beta</FilterChip.Value>
 * </FilterChip>
 *
 * @example
 * // Read-only (no dismiss button — onDismiss omitted)
 * <FilterChip>
 *   <FilterChip.Label>Status</FilterChip.Label>
 *   <FilterChip.Value>Active</FilterChip.Value>
 * </FilterChip>
 *
 * @remarks When NOT to use
 * - Status / category pills with no dismiss UX — use `<Badge>` instead.
 *   FilterChip's white pill + thin border + optional X is purpose-built
 *   for "currently applied filter", not "this contact is a VIP".
 * - Tags on an entity (e.g., deal labels) — `<Badge>` again. Tags don't
 *   carry a `Label: Value` shape.
 * - Clickable filter triggers — that's the role of a `<Button>` or
 *   `<OptionsPicker.Trigger>`. FilterChip's only interactive target
 *   is the dismiss button.
 *
 * @remarks Anti-patterns
 * - Putting interactive children inside `<FilterChip.Label>` or
 *   `<FilterChip.Value>`. The dismiss button is the only interactive
 *   target. Wrapping a Button inside the chip violates the
 *   `role="group"` composition and confuses screen readers.
 * - Calling `onDismiss` and expecting the chip to animate out. The
 *   chip doesn't animate — the consumer's state update unmounts it.
 *   Wrap the chip in your own transition if you need one.
 */
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
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

// ----------------------------------------------------------------------------
// Label
// ----------------------------------------------------------------------------

/**
 * Label slot for the chip's filter category (e.g., `Event`, `Tenant`,
 * `Stage`). Renders muted text — the visual lead-in to the Value.
 * Optional; omit for value-only chips.
 */
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

/**
 * Value slot for the chip's filter value. Set `tone` to prefix a
 * colored 6px dot — use the same `BadgeTone` palette as Badge for
 * cross-component consistency.
 */
const FilterChipValue = forwardRef<HTMLSpanElement, FilterChipValueProps>(function FilterChipValue(
  { tone, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(styles.value, className)} {...rest}>
      {tone && <span className={styles.dot} data-tone={tone} aria-hidden="true" />}
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
