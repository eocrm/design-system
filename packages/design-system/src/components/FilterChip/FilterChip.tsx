import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Text } from '../Text';
import { type BadgeTone } from '../Badge';
import { Dot } from '../Dot';
import { type PaletteColor } from '../../palette';
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
   * at `filterChip.dismiss` (`'Remove filter'` in English) when omitted OR
   * empty — an empty string is not an explicit name, so it takes the default
   * too. Pass a
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
   *
   * Controlled-only: FilterChip does NOT consume `Popover.Trigger`'s injected
   * ref/ARIA, so wrapping it in `<Popover.Trigger>` won't auto-wire it — drive
   * the popover's `open` yourself from this callback (see the example above).
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
   * Optional full `PaletteColor` (one of the 30 named categorical colors)
   * for the leading dot. Use when the 6 semantic tones aren't enough to
   * distinguish filter categories (e.g., per-tenant or per-tag color
   * coding that matches an `OptionsPicker` group). Takes precedence over
   * `tone` when both are set. Renders a bare `<Dot>` in that color.
   */
  color?: PaletteColor;

  /**
   * Optional dot tone. When set, prefixes a 6px colored circle before
   * the value text — use to distinguish filter categories that share
   * a screen (e.g., event filters get a tone-matched dot, tenant
   * filters get no dot). Reuses Badge's tone palette: `neutral`,
   * `info`, `success`, `warning`, `danger`, `purple`. Omit for plain
   * text values. For a richer categorical color, use `color` instead.
   */
  tone?: BadgeTone;

  /**
   * The value text — what the filter is actually filtering by
   * (`auth.*`, `beta`, `Won`). Pair with an optional `tone` / `color`
   * dot to categorize.
   */
  children: ReactNode;
}

// ----------------------------------------------------------------------------
// Root
// ----------------------------------------------------------------------------

/**
 * Dismissible "active filter" pill with optional `Label` and `Value` children.
 * @see docs/components/FilterChip.md
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
          aria-label={dismissLabel || t('filterChip.dismiss')}
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
 * Label slot for the chip's filter category.
 * @see docs/components/FilterChip.md
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
 * Value slot for the chip's filter value, with an optional tone or palette-color dot.
 * @see docs/components/FilterChip.md
 */
const FilterChipValue = forwardRef<HTMLSpanElement, FilterChipValueProps>(function FilterChipValue(
  { color, tone, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={clsx(styles.value, className)} {...rest}>
      {(color || tone) && <Dot color={color} tone={tone} />}
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
