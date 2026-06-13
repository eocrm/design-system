import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Text } from '../Text';
import { type BadgeTone } from '../Badge';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './FilterChip.module.scss';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export interface FilterChipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /**
   * Dismiss callback. When provided, the chip renders a trailing `×`
   * button wired to this handler; the chip itself does NOT animate or
   * unmount — the consumer's state update must remove the chip. Omit
   * the prop to render a read-only chip with no dismiss button.
   */
  onDismiss?: () => void;

  /**
   * Override the dismiss button's `aria-label`. Defaults to the i18n value
   * at `filterChip.dismiss` (`'Remove filter'` in English). Pass a
   * contextual label (e.g., `'Remove Event: auth.* filter'`) when the
   * chip's filter category isn't obvious from the surrounding
   * screen-reader context.
   */
  dismissLabel?: string;

  /**
   * Makes the chip BODY interactive: when provided, the Label/Value content is
   * wrapped in a `<button>` that fires `onActivate` on click and Enter/Space
   * (native button keyboard). Use for *editable* filters — e.g. a date-range
   * chip whose body re-opens its range-picker. Wire it to a controlled
   * `<Popover open onOpenChange>` to open an editor popover.
   *
   * The dismiss ✕ stays a separate button whose click stops propagation, so
   * removing the filter never fires `onActivate` (and never bubbles to an
   * ancestor click handler). Omit for a read-only chip (current behavior).
   */
  onActivate?: () => void;

  /**
   * Open state of the disclosure the body opens (e.g. the editor popover),
   * surfaced as `aria-expanded` on the body button. Only meaningful with
   * `onActivate`. Omit if the body doesn't toggle a disclosure.
   */
  expanded?: boolean;

  /**
   * One or two `FilterChip.Label` / `FilterChip.Value` subcomponents.
   * Use both for `Label: Value` chips; pass just a Value for chips
   * where the category is implicit (e.g., a tenant slug).
   */
  children: ReactNode;
}

export interface FilterChipLabelProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * The category text — typically a noun describing the filter
   * dimension (`Event`, `Tenant`, `Stage`, `Owner`). Rendered muted so
   * the Value is the visual anchor.
   */
  children: ReactNode;
}

export interface FilterChipValueProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Optional dot tone. When set, prefixes a 6px colored circle before
   * the value text — use to distinguish filter categories that share
   * a screen (e.g., event filters get a tone-matched dot, tenant
   * filters get no dot). Reuses Badge's tone palette: `neutral`,
   * `info`, `success`, `warning`, `danger`, `purple`. Omit for plain
   * text values.
   */
  tone?: BadgeTone;

  /**
   * The value text — what the filter is actually filtering by
   * (`auth.*`, `beta`, `Won`). Pair with an optional `tone` dot to
   * categorize.
   */
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
 * @example
 * // Editable chip — body re-opens an editor popover; ✕ removes the filter
 * const [open, setOpen] = useState(false);
 * <Popover open={open} onOpenChange={setOpen}>
 *   <Popover.Trigger>
 *     <FilterChip onActivate={() => setOpen((o) => !o)} expanded={open} onDismiss={remove}>
 *       <FilterChip.Label>Range</FilterChip.Label>
 *       <FilterChip.Value>Jun 1 – Jul 31</FilterChip.Value>
 *     </FilterChip>
 *   </Popover.Trigger>
 *   <Popover.Content maxWidth={520}>{rangePicker}</Popover.Content>
 * </Popover>
 *
 * @remarks When NOT to use
 * - Status / category pills with no dismiss UX — use `<Badge>` instead.
 *   FilterChip's white pill + thin border + optional X is purpose-built
 *   for "currently applied filter", not "this contact is a VIP".
 * - Tags on an entity (e.g., deal labels) — `<Badge>` again. Tags don't
 *   carry a `Label: Value` shape.
 * - Clickable filter triggers that navigate or run an action — that's the
 *   role of a `<Button>` or `<OptionsPicker.Trigger>`. A read-only chip's
 *   only interactive target is the dismiss ✕. An *editable* chip (one that
 *   re-opens its own editor) is the exception: pass `onActivate` to make
 *   the body a `<button>` wired to a controlled `<Popover>`.
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
  { onDismiss, dismissLabel, onActivate, expanded, className, children, ...rest },
  ref,
) {
  const t = useTranslation();
  return (
    <div
      ref={ref}
      className={clsx(styles.chip, className)}
      // {...rest} first so role="group" wins — locked semantics per Hard rule 6 pattern B.
      {...rest}
      role="group"
    >
      {onActivate ? (
        <button
          type="button"
          className={styles.body}
          onClick={onActivate}
          aria-haspopup="dialog"
          aria-expanded={expanded}
        >
          {children}
        </button>
      ) : (
        children
      )}
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          // stopPropagation: removing the filter must not fire the body activate
          // OR bubble to a wrapping Popover.Trigger / ancestor click handler.
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label={dismissLabel ?? t('filterChip.dismiss')}
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
 * Optional; omit for value-only chips where the category is implicit.
 *
 * @example
 * <FilterChip.Label>Event</FilterChip.Label>
 *
 * @example
 * <FilterChip onDismiss={remove}>
 *   <FilterChip.Label>Tenant</FilterChip.Label>
 *   <FilterChip.Value>beta</FilterChip.Value>
 * </FilterChip>
 */
const FilterChipLabel = forwardRef<HTMLSpanElement, FilterChipLabelProps>(function FilterChipLabel(
  { className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(styles.label, className)} {...rest}>
      <Text as="span" size="sm" tone="muted">
        {children}
      </Text>
    </span>
  );
});

// ----------------------------------------------------------------------------
// Value
// ----------------------------------------------------------------------------

/**
 * Value slot for the chip's filter value. Set `tone` to prefix a 6px
 * colored dot before the text — use the same `BadgeTone` palette as
 * `<Badge>` for cross-component consistency. Omit `tone` for plain
 * values (e.g., a tenant slug).
 *
 * @example
 * // Plain value, no dot
 * <FilterChip.Value>beta</FilterChip.Value>
 *
 * @example
 * // Tone-dotted value
 * <FilterChip.Value tone="info">auth.* (3)</FilterChip.Value>
 *
 * @example
 * // Mixed content — Value accepts any ReactNode
 * <FilterChip.Value tone="success">
 *   <Avatar size="2xs" name="Sarah" /> Sarah
 * </FilterChip.Value>
 */
const FilterChipValue = forwardRef<HTMLSpanElement, FilterChipValueProps>(function FilterChipValue(
  { tone, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(styles.value, className)} {...rest}>
      {tone && <span className={styles.dot} data-tone={tone} aria-hidden="true" />}
      <Text as="span" size="sm">
        {children}
      </Text>
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
