import {
  forwardRef,
  useMemo,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { RadioGroupContext, type RadioGroupContextValue } from './RadioGroupContext';
import type { RadioSize } from './Radio';
import styles from './RadioGroup.module.scss';

export type RadioGroupOrientation = 'vertical' | 'horizontal';

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLFieldSetElement>, 'onChange'> {
  /** Form `name` shared by all radio children. Required. */
  name: string;

  /** Controlled selected value. Pair with `onChange`. */
  value?: string;

  /** Initial selected value for uncontrolled use. */
  defaultValue?: string;

  /**
   * Fires when the user selects a different radio. Receives the new value
   * AND the native event so consumers can read modifier keys, etc.
   */
  onChange?: (value: string, event: ChangeEvent<HTMLInputElement>) => void;

  /** Optional group label, rendered as `<legend>`. */
  label?: ReactNode;

  /** Default size for child radios. Per-child explicit `size` wins. Defaults to `'md'`. */
  size?: RadioSize;

  /** Layout direction. `'vertical'` (default) / `'horizontal'`. */
  orientation?: RadioGroupOrientation;

  /** Disable every child. Per-child explicit `disabled` wins. */
  disabled?: boolean;

  /** Apply the invalid visual to every child + set `aria-invalid` on the fieldset. */
  invalid?: boolean;

  /** Mark every child as required (HTML form validation). */
  required?: boolean;

  children: ReactNode;
}

/**
 * Group wrapper for `<Radio>` children. Renders as `<fieldset>` + optional
 * `<legend>` for proper a11y grouping. Propagates `name`, selected `value`,
 * `onChange`, `size`, `disabled`, `invalid`, `required` to child radios via
 * context. Per-child explicit props still win.
 *
 * @example
 * <RadioGroup name="size" defaultValue="md" label="T-shirt size">
 *   <Radio value="sm" label="Small" />
 *   <Radio value="md" label="Medium" />
 *   <Radio value="lg" label="Large" />
 * </RadioGroup>
 *
 * @example
 * // Controlled:
 * const [plan, setPlan] = useState('free');
 * <RadioGroup name="plan" value={plan} onChange={setPlan} label="Plan">
 *   <Radio value="free" label="Free" />
 *   <Radio value="pro" label="Pro" />
 * </RadioGroup>
 *
 * @example
 * // Horizontal layout:
 * <RadioGroup name="orientation" defaultValue="left" orientation="horizontal">
 *   <Radio value="left" label="Left" />
 *   <Radio value="center" label="Center" />
 *   <Radio value="right" label="Right" />
 * </RadioGroup>
 *
 * @remarks When NOT to use
 * - For 10+ options → `<Select>`.
 * - For multi-select → a list of `<Checkbox>`es (no group component yet).
 *
 * @remarks Anti-patterns
 * - ❌ Setting `checked` on the child `<Radio>`s — the group handles that.
 * - ❌ Setting per-radio `name` inside a group — overridden by the group's `name`.
 */
export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroup(
  {
    name,
    value,
    defaultValue,
    onChange,
    label,
    size = 'md',
    orientation = 'vertical',
    disabled = false,
    invalid = false,
    required = false,
    className,
    children,
    ...props
  },
  ref,
) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue ?? null);
  const currentValue = isControlled ? (value ?? null) : internalValue;

  const handleChange = (next: string, event: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalValue(next);
    onChange?.(next, event);
  };

  const ctx: RadioGroupContextValue = useMemo(
    () => ({
      name,
      value: currentValue,
      onChange: handleChange,
      size,
      disabled,
      invalid,
      required,
    }),
    // handleChange is stable enough — it reads isControlled / onChange via
    // closure, which both update only when the parent re-renders. The Radio
    // children read context on every render anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, currentValue, size, disabled, invalid, required, onChange],
  );

  return (
    // Pattern A — props last so consumer overrides win.
    <fieldset
      ref={ref}
      aria-invalid={invalid || undefined}
      className={clsx(
        styles.group,
        styles[`orientation-${orientation}`],
        invalid && styles.invalid,
        className,
      )}
      {...props}
    >
      {label != null && <legend className={styles.legend}>{label}</legend>}
      <RadioGroupContext.Provider value={ctx}>
        <div className={styles.items}>{children}</div>
      </RadioGroupContext.Provider>
    </fieldset>
  );
});
