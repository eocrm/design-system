import {
  forwardRef,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useRadioGroup } from './RadioGroupContext';
import styles from './Radio.module.scss';

/** Ring diameter + label type scale. Same scale as `<Checkbox>` / `<Input>`. */
export type RadioSize = 'sm' | 'md' | 'lg';

export interface RadioProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'size' | 'type' | 'checked' | 'defaultChecked' | 'onChange'
  > {
  /** The value submitted when this radio is selected. */
  value: string;

  /**
   * Ring diameter + label type scale. Defaults to `'md'`.
   * - `'sm'` — 14px ring, font-size-sm label.
   * - `'md'` — 16px ring, font-size-md label.
   * - `'lg'` — 20px ring, font-size-lg label.
   *
   * Inside `<RadioGroup>`, the group's `size` becomes the default; explicit
   * per-radio `size` still wins.
   */
  size?: RadioSize;

  /**
   * Controlled checked state. Inside `<RadioGroup>`, leave this unset —
   * the group computes `checked` from its `value`. If you explicitly set
   * `checked` on a Radio inside a group, your prop wins and the group's
   * controlled invariant breaks (don't do this).
   */
  checked?: boolean;

  /** Initial checked state for uncontrolled standalone use. */
  defaultChecked?: boolean;

  /**
   * Label rendered next to the ring. The whole `<label>` is the click
   * target. Omit for icon-only radios + pass `aria-label`.
   */
  label?: ReactNode;

  /** Toggles the error visual + `aria-invalid='true'`. Group's `invalid` overrides. */
  invalid?: boolean;

  /**
   * Fires when the radio is selected. Receives the radio's `value` AND
   * the native event. Inside a group, this runs FIRST, then the group's
   * `onChange` fires.
   */
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Single radio button — native `<input type='radio'>` visually hidden +
 * custom-painted ring + inner dot. Standalone or inside `<RadioGroup>`.
 *
 * @example
 * // Inside a group (preferred):
 * <RadioGroup name="size" defaultValue="md" label="T-shirt size">
 *   <Radio value="sm" label="Small" />
 *   <Radio value="md" label="Medium" />
 *   <Radio value="lg" label="Large" />
 * </RadioGroup>
 *
 * @example
 * // Standalone — consumer manages `name` + state across siblings.
 * <Radio name="plan" value="free" checked={plan === 'free'} onChange={setPlan} label="Free" />
 * <Radio name="plan" value="pro" checked={plan === 'pro'} onChange={setPlan} label="Pro" />
 *
 * @remarks When NOT to use
 * - 10+ options → use `<Select>`.
 * - Multi-select → use a set of `<Checkbox>`es.
 * - Single binary on/off → use a `Switch` (not yet shipped).
 *
 * @remarks Anti-patterns
 * - ❌ Standalone radios without a wrapping `<fieldset>` — fails AT grouping.
 *   Use `<RadioGroup>` for proper a11y semantics.
 * - ❌ Setting `checked` on a Radio inside a `<RadioGroup>` — the group's
 *   `value` already controls each child's checked state.
 * - ❌ Omitting `label` AND `aria-label` — the radio is unlabelled to AT.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  {
    value,
    size,
    checked,
    defaultChecked,
    label,
    invalid,
    onChange,
    className,
    disabled,
    name,
    required,
    ...props
  },
  ref,
) {
  const group = useRadioGroup();

  // Group props win as defaults; per-radio explicit props win over group.
  const resolvedSize: RadioSize = size ?? group?.size ?? 'md';
  const resolvedDisabled = disabled ?? group?.disabled ?? false;
  const resolvedInvalid = invalid ?? group?.invalid ?? false;
  const resolvedRequired = required ?? group?.required ?? false;
  const resolvedName = name ?? group?.name;
  const resolvedChecked =
    checked ?? (group != null ? group.value === value : undefined);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(value, event);
    group?.onChange(value, event);
  };

  return (
    <label
      className={clsx(
        styles.radio,
        styles[`size-${resolvedSize}`],
        resolvedDisabled && styles.disabled,
        resolvedInvalid && styles.invalid,
        className,
      )}
    >
      {/* Pattern B — props first so component-owned attrs (type, value, name,
          checked, disabled, required, onChange, className) win. */}
      <input
        {...props}
        ref={ref}
        type="radio"
        name={resolvedName}
        value={value}
        checked={resolvedChecked}
        defaultChecked={resolvedChecked === undefined ? defaultChecked : undefined}
        disabled={resolvedDisabled}
        required={resolvedRequired}
        aria-invalid={resolvedInvalid || undefined}
        onChange={handleChange}
        className={styles.input}
      />
      <span aria-hidden="true" className={styles.ring}>
        <span className={styles.dot} />
      </span>
      {label != null && <span className={styles.labelText}>{label}</span>}
    </label>
  );
});
