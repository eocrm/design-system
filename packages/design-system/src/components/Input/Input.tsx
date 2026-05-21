import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Input.module.scss';

/**
 * Field height + type scale. Pairs with `<Button>` and `<Select>` sizes.
 */
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Toggles the error visual (red border + focus ring) and sets `aria-invalid="true"`.
   * Pair with a visible error message and `aria-describedby` pointing at the message id.
   */
  invalid?: boolean;
  /**
   * Visual size. Defaults to `'md'`.
   * - `'sm'` — 24px tall; toolbars, secondary forms.
   * - `'md'` — 32px tall (default); most form contexts.
   * - `'lg'` — 40px tall; hero search, mobile-friendly forms.
   *
   * Note: this shadows the native HTML `<input size>` attribute (visible
   * character count). If you need that legacy attribute, set width via
   * `style` or a parent container.
   */
  size?: InputSize;
  /**
   * Block browser autofill AND password managers from offering to fill
   * this input. Applies the standard set of opt-out hints:
   * - `autoComplete="off"`
   * - `data-1p-ignore` (1Password)
   * - `data-lpignore="true"` (LastPass)
   * - `data-form-type="other"` (generic "not a login field")
   *
   * **Smart default**: when omitted, the input blocks autofill iff `autoComplete`
   * is also omitted (or `'off'`). Explicit autocomplete hints
   * (`autoComplete="email"`, `"current-password"`, `"username"`, etc.) opt back
   * IN to autofill — the assumption is that a consumer specifying autoComplete
   * actually wants password-manager interaction. Pass `disableAutofill={true}`
   * to force-block even with an autocomplete hint, or `false` to force-allow.
   */
  disableAutofill?: boolean;
}

const AUTOFILL_DISABLED_PROPS = {
  autoComplete: 'off' as const,
  'data-1p-ignore': '' as const,
  'data-lpignore': 'true' as const,
  'data-form-type': 'other' as const,
};

/**
 * Single-line text input. Forwards all native `<input>` attributes — `type`,
 * `placeholder`, `value`/`onChange`, `disabled`, `readOnly`, `pattern`,
 * `autoComplete`, `inputMode`, etc. (The native HTML `size` attribute is
 * shadowed by the component-level `size` prop — see `InputProps.size`.)
 *
 * The component is intentionally dumb. Validation logic lives in your form
 * layer (React Hook Form + Zod recommended); pass the result down via `invalid`.
 *
 * @example
 * // Controlled, with a real label:
 * <label>
 *   Email
 *   <Input
 *     type="email"
 *     autoComplete="email"
 *     value={email}
 *     onChange={(e) => setEmail(e.target.value)}
 *   />
 * </label>
 *
 * @example
 * // Sized:
 * <Input size="sm" placeholder="Filter…" />
 * <Input size="lg" type="search" placeholder="Search the workspace" />
 *
 * @example
 * // Error state:
 * <Input invalid value={value} aria-describedby="email-error" />
 * <p id="email-error">Enter a valid email.</p>
 *
 * @remarks When NOT to use
 * - Multi-line → use `Textarea` (not yet shipped).
 * - Choosing from a fixed list → use `Select`.
 * - Date/time → use `DatePicker` / `DateRangePicker`.
 * - Password reveal/toggle → use `PasswordInput` (not yet shipped).
 *
 * @remarks Anti-patterns
 * - ❌ Putting validation logic *inside* the component. The Input is dumb on
 *   purpose — validation lives in your form layer.
 * - ❌ Using `placeholder` as a label. Placeholders disappear on focus. Use a
 *   real `<label>` and pair the Input with it.
 * - ❌ `type="number"` for things like phone numbers or zip codes — strips
 *   leading zeros and breaks formatting. Use `inputMode="numeric"` instead.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, size = 'md', disableAutofill, className, ...props },
  ref,
) {
  // Smart default: when `disableAutofill` is undefined, block autofill iff
  // the consumer hasn't set a meaningful `autoComplete`. Explicit `true` /
  // `false` always wins over the heuristic.
  const hasAutocompleteHint =
    typeof props.autoComplete === 'string' && props.autoComplete !== 'off';
  const blockAutofill = disableAutofill ?? !hasAutocompleteHint;

  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      {...(blockAutofill ? AUTOFILL_DISABLED_PROPS : {})}
      {...props}
      className={clsx(styles.input, styles[`size-${size}`], invalid && styles.invalid, className)}
    />
  );
});
