import { forwardRef, useMemo, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';
import { mergeRefs } from '../_internal/refs';
import { useSuggestions } from './Suggestions';
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
   * Same scale as `<Select>`; fields have no `xs` (unlike `<Button>`).
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
  /**
   * Values to suggest while the value stays free text (e.g. the user's other
   * workspace slugs). Makes the input an ARIA combobox with a suggestion list:
   * it opens on focus, click or ↓ showing every suggestion, then filters by
   * case-insensitive substring once the user types. ↑/↓ + Enter or a click
   * fills the value and fires `onChange` exactly as typing would. Ignored when
   * empty or `readOnly`. Default: none (a plain textbox). For a fixed set of
   * allowed values use `<Select>` instead.
   */
  suggestions?: readonly string[];
}

const AUTOFILL_DISABLED_PROPS = {
  autoComplete: 'off' as const,
  'data-1p-ignore': '' as const,
  'data-lpignore': 'true' as const,
  'data-form-type': 'other' as const,
};

/**
 * Single-line text input that forwards all native `<input>` attributes.
 * @see docs/components/Input.md
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, size = 'md', disableAutofill, suggestions, className, ...props },
  ref,
) {
  const combobox = useSuggestions(suggestions, props.readOnly, props);
  const mergedRef = useMemo(() => mergeRefs(ref, combobox.inputRef), [ref, combobox.inputRef]);

  // Smart default: when `disableAutofill` is undefined, block autofill iff
  // the consumer hasn't set a meaningful `autoComplete`. Explicit `true` /
  // `false` always wins over the heuristic.
  const hasAutocompleteHint =
    typeof props.autoComplete === 'string' && props.autoComplete !== 'off';
  const blockAutofill = disableAutofill ?? !hasAutocompleteHint;

  return (
    <>
      <input
        // Plain consumer ref unless it's a combobox (no extra commit either way).
        ref={combobox.enabled ? mergedRef : ref}
        aria-invalid={invalid || undefined}
        {...(blockAutofill ? AUTOFILL_DISABLED_PROPS : {})}
        {...props}
        // After {...props} so the combobox ARIA contract wins; its handlers
        // already chain the consumer's.
        {...combobox.inputProps}
        className={clsx(styles.input, styles[`size-${size}`], invalid && styles.invalid, className)}
      />
      {combobox.popup}
    </>
  );
});
