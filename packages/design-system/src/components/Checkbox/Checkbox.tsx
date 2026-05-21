import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Check, Minus } from 'lucide-react';
import { mergeRefs } from '../_internal/refs';
import styles from './Checkbox.module.scss';

/** Box diameter + label type scale. */
export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'size' | 'type' | 'checked' | 'defaultChecked' | 'onChange'
  > {
  /**
   * Box diameter + label type scale. Defaults to `'md'`.
   * - `'sm'` — 14px box, font-size-sm label. Dense tables, inline filters.
   * - `'md'` — 16px box, font-size-md label. Default.
   * - `'lg'` — 20px box, font-size-lg label. Hero forms, mobile-friendly.
   *
   * Note: shadows the native HTML `<input size>` attribute (which on
   * checkboxes is meaningless anyway).
   */
  size?: CheckboxSize;

  /**
   * Controlled checked state. Pair with `onChange`. Omit (with optional
   * `defaultChecked`) for uncontrolled use.
   */
  checked?: boolean;

  /** Initial checked state for uncontrolled use. Defaults to `false`. */
  defaultChecked?: boolean;

  /**
   * Indeterminate (mixed) visual + a11y state. Independent of `checked` —
   * the box paints with a dash icon and `input.indeterminate = true` so AT
   * announces "mixed". Consumer drives this based on partial selection
   * (e.g., a "select all" header where some-but-not-all rows are selected).
   *
   * When the user clicks an indeterminate checkbox, the native change event
   * fires with the next `checked` value (`true` if it was `false`). The
   * consumer typically responds by clearing `indeterminate`.
   */
  indeterminate?: boolean;

  /**
   * Optional label rendered next to the box. The whole `<label>` is the
   * click target. Omit for icon-only checkboxes (e.g., a DataTable row
   * selector) — pass `aria-label` instead.
   */
  label?: ReactNode;

  /** Toggles the error visual + sets `aria-invalid="true"`. */
  invalid?: boolean;

  /**
   * Fires on every change. Receives the next checked state AND the native
   * event so consumers can do `event.preventDefault()`, read modifier keys,
   * etc.
   */
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
}

const iconSize: Record<CheckboxSize, number> = {
  sm: 10,
  md: 12,
  lg: 14,
};

/**
 * Checkbox — native `<input type="checkbox">` visually hidden + custom-painted
 * box. Supports checked / unchecked / indeterminate / disabled / invalid
 * states. The native input owns all a11y (keyboard, screen reader, form
 * submission, RHF/Zod integration); the custom paint owns the look.
 *
 * @example
 * <Checkbox label="I agree to the terms" />
 *
 * @example
 * // Controlled:
 * <Checkbox checked={agreed} onChange={(next) => setAgreed(next)} label="I agree" />
 *
 * @example
 * // Indeterminate ("select all" pattern):
 * <Checkbox
 *   checked={allSelected}
 *   indeterminate={someSelected && !allSelected}
 *   onChange={(next) => (next ? selectAll() : selectNone())}
 *   aria-label="Select all rows"
 * />
 *
 * @example
 * // Icon-only (no visible label):
 * <Checkbox aria-label="Select row" checked={isSelected} onChange={setIsSelected} />
 *
 * @remarks When NOT to use
 * - Single binary on/off setting that toggles immediately and visually
 *   communicates "on" vs "off" — use a `Switch` (not yet shipped).
 * - One-of-many choice from a fixed set — use `Radio` (not yet shipped).
 * - Multi-select from a long list — use `<Select multi>`.
 *
 * @remarks Anti-patterns
 * - Treating `indeterminate` as a third value. It's a display flag for
 *   "partial selection"; `checked` is still the underlying boolean. Clicking
 *   an indeterminate checkbox emits `onChange(nextChecked)` based on the
 *   current `checked` state, not on `indeterminate`.
 * - Wrapping the checkbox in your own `<label>`. We already wrap it; an
 *   outer `<label>` nests two and breaks the click contract.
 * - Omitting `label` AND `aria-label`. Screen readers will announce just
 *   "checkbox" with no context.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    size = 'md',
    checked,
    defaultChecked,
    indeterminate,
    label,
    invalid,
    onChange,
    className,
    disabled,
    ...props
  },
  ref,
) {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const currentChecked = isControlled ? checked : internalChecked;

  // Native `indeterminate` is a DOM property, not an attribute. React doesn't
  // surface it as a prop, so we set it via ref in an effect that fires after
  // each render — covers both initial mount and prop changes.
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = mergeRefs(ref, inputRef);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    if (!isControlled) setInternalChecked(next);
    onChange?.(next, event);
  };

  return (
    <label
      className={clsx(
        styles.checkbox,
        styles[`size-${size}`],
        disabled && styles.disabled,
        invalid && styles.invalid,
        className,
      )}
    >
      <input
        {...props}
        ref={mergedRef}
        type="checkbox"
        checked={currentChecked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={handleChange}
        className={styles.input}
      />
      <span aria-hidden="true" className={styles.box}>
        {indeterminate ? (
          <Minus size={iconSize[size]} strokeWidth={3} />
        ) : currentChecked ? (
          <Check size={iconSize[size]} strokeWidth={3} />
        ) : null}
      </span>
      {label != null && <span className={styles.labelText}>{label}</span>}
    </label>
  );
});
