import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Check, Minus } from 'lucide-react';
import { mergeRefs } from '../_internal/refs';
import { type PaletteColor } from '../../palette';
import styles from './Checkbox.module.scss';

/** Box diameter + label type scale. */
export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<
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
   * Optional palette color for the checked / indeterminate fill. When
   * set, the filled state uses the palette color's fg token instead
   * of `--color-accent`. Use to color-tag checkbox groups (per-team,
   * per-status, per-category). Default unchanged (accent blue).
   *
   * The focus ring, hover border, and unchecked state remain
   * accent-colored regardless of `color` — only the checked /
   * indeterminate fill is affected.
   */
  color?: PaletteColor;

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
 * Checkbox: a visually hidden native input plus a custom-painted box.
 * @see docs/components/Checkbox.md
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
    color,
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

  // When a palette color is set, expose it as a CSS variable scoped to
  // this checkbox. The SCSS reads `var(--checkbox-color, var(--color-accent))`
  // so undef = default accent.
  const colorStyle = color
    ? ({ '--checkbox-color': `var(--color-palette-${color}-fg)` } as CSSProperties)
    : undefined;

  return (
    <label
      className={clsx(
        styles.checkbox,
        styles[`size-${size}`],
        disabled && styles.disabled,
        invalid && styles.invalid,
        className,
      )}
      style={colorStyle}
    >
      {/* Pattern B — props first so the component-owned attrs below
          (type, checked, disabled, aria-invalid, onChange, className) win.
          The semantic contract is that a Checkbox is always type=checkbox,
          uses our checked/onChange machinery, and styles via styles.input. */}
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
