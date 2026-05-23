import {
  forwardRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import styles from './Switch.module.scss';

/**
 * Track + thumb scale + label font. Pairs with Checkbox/Radio sizes.
 */
export type SwitchSize = 'sm' | 'md' | 'lg';

/**
 * Color of the track when checked. Unchecked track is always
 * `--color-bg-muted` regardless of tone.
 */
export type SwitchTone = 'accent' | 'success' | 'danger';

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'checked' | 'defaultChecked' | 'onChange'
> {
  /**
   * Visual scale. Defaults to `'md'`.
   * - `'sm'` — 28×16 track, 12px thumb, `--font-size-sm` label.
   * - `'md'` — 36×20 track, 16px thumb, `--font-size-md` label (default).
   * - `'lg'` — 44×24 track, 20px thumb, `--font-size-lg` label.
   *
   * Note: shadows the native HTML `<input size>` attribute (meaningless on checkboxes).
   */
  size?: SwitchSize;

  /**
   * Track color when checked. Defaults to `'accent'`.
   * - `'accent'` — blue (default).
   * - `'success'` — green. Use for affirmative toggles ("Enable notifications").
   * - `'danger'` — red. Use for destructive toggles ("Allow root access").
   */
  tone?: SwitchTone;

  /**
   * Controlled checked state. Pair with `onChange`. Omit (with optional
   * `defaultChecked`) for uncontrolled use.
   */
  checked?: boolean;

  /** Initial checked state for uncontrolled use. Defaults to `false`. */
  defaultChecked?: boolean;

  /**
   * Fires when the user toggles the switch. The first arg is the next
   * boolean (convenience); the original change event is the second arg.
   * Matches `<Checkbox>`'s signature.
   */
  onChange?: (checked: boolean, e: ChangeEvent<HTMLInputElement>) => void;

  /**
   * Toggles `aria-invalid="true"` and adds a danger-tone border to the
   * track. Use when the switch's state has caused a validation error.
   */
  invalid?: boolean;

  /**
   * Disables interaction and shows a spinner inside the thumb. Use for
   * toggles that persist to a server. Sets `aria-busy="true"` and
   * `disabled` on the native input so neither click nor Space-key can
   * fire onChange while the async operation is in flight.
   *
   * The consumer is responsible for managing the optimistic-update flow:
   *
   * ```tsx
   * const [enabled, setEnabled] = useState(initial);
   * const [saving, setSaving] = useState(false);
   *
   * const handleToggle = async (next: boolean) => {
   *   setSaving(true);
   *   setEnabled(next);            // optimistic
   *   try { await api.save(next); }
   *   catch { setEnabled(!next); } // rollback
   *   finally { setSaving(false); }
   * };
   *
   * <Switch checked={enabled} loading={saving} onChange={handleToggle} />
   * ```
   */
  loading?: boolean;

  /**
   * Label rendered next to the track. The whole `<label>` is the click
   * target — clicking anywhere toggles. Omit for icon-only switches +
   * pair with `aria-label`.
   */
  children?: ReactNode;
}

const SIZE_CLASS: Record<SwitchSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

const LABEL_CLASS: Record<SwitchSize, string> = {
  sm: styles.labelSm,
  md: styles.labelMd,
  lg: styles.labelLg,
};

const SPIN_SIZE: Record<SwitchSize, number> = {
  sm: 8,
  md: 10,
  lg: 12,
};

/**
 * Binary on/off toggle. Hand-rolled track + sliding thumb on a native
 * `<input type="checkbox" role="switch">`. The dumb companion to
 * `<Checkbox>` and `<Radio>` for binary state (settings, feature flags,
 * server-persisted toggles).
 *
 * Forwards ref to the underlying `<input>`. Spread native attrs reach
 * the input (e.g., `name`, `value`, `disabled`, `aria-label`).
 *
 * @example
 * // Default — uncontrolled, accent tone.
 * <Switch>Enable notifications</Switch>
 *
 * @example
 * // Controlled, success tone.
 * <Switch tone="success" checked={enabled} onChange={(next) => setEnabled(next)}>
 *   Daily digest
 * </Switch>
 *
 * @example
 * // Async toggle with loading spinner.
 * <Switch
 *   checked={enabled}
 *   loading={saving}
 *   onChange={async (next) => {
 *     setSaving(true);
 *     setEnabled(next);
 *     try { await api.save(next); }
 *     catch { setEnabled(!next); }
 *     finally { setSaving(false); }
 *   }}
 * >
 *   Two-factor auth
 * </Switch>
 *
 * @example
 * // Icon-only.
 * <Switch aria-label="Mute notifications" />
 *
 * @remarks When NOT to use
 * - Mutually-exclusive choice → `<Radio>` / `<RadioGroup>`.
 * - Multi-select list → `<Checkbox>`.
 * - Mixed / indeterminate state → use Checkbox's `indeterminate`.
 * - Immediate action without state → `<Button>`.
 *
 * @remarks Anti-patterns
 * - ❌ Using "ON" / "OFF" labels inside the track. Use a real adjacent label.
 * - ❌ Setting `loading` without an external optimistic-update flow — the
 *   user clicks, the spinner appears, the visual state never updates,
 *   confusing.
 * - ❌ `tone="success"` for "Mark as failed". Tone communicates the
 *   meaning of the "on" state.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    size = 'md',
    tone = 'accent',
    checked,
    defaultChecked,
    onChange,
    invalid,
    loading,
    disabled,
    children,
    className,
    ...props
  },
  ref,
) {
  const [internalChecked, setInternalChecked] = useState<boolean>(defaultChecked ?? false);
  const isControlled = checked !== undefined;
  const currentChecked = isControlled ? checked : internalChecked;

  // Loading implies disabled — blocks both click and Space-key toggles.
  const isInteractionDisabled = disabled || loading;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalChecked(e.target.checked);
    onChange?.(e.target.checked, e);
  };

  return (
    <label
      className={clsx(styles.wrapper, className)}
      data-disabled={isInteractionDisabled || undefined}
    >
      {/* Pattern B — {...props} first so component-owned attrs (type, role, checked, disabled, aria-*, onChange, className) win. */}
      <input
        {...props}
        ref={ref}
        type="checkbox"
        role="switch"
        checked={currentChecked}
        disabled={isInteractionDisabled}
        aria-invalid={invalid || undefined}
        aria-busy={loading || undefined}
        onChange={handleChange}
        className={styles.input}
      />
      <span
        className={clsx(styles.track, SIZE_CLASS[size])}
        data-checked={currentChecked ? 'true' : 'false'}
        data-tone={tone}
        data-invalid={invalid ? 'true' : undefined}
        aria-hidden="true"
      >
        <span className={styles.thumb}>
          {loading && <Loader2 size={SPIN_SIZE[size]} className={styles.spin} aria-hidden="true" />}
        </span>
      </span>
      {children && <span className={clsx(styles.label, LABEL_CLASS[size])}>{children}</span>}
    </label>
  );
});
