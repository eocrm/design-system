import {
  useEffect,
  forwardRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
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
   * Shows a spinner inside the thumb and suppresses changes while a toggle
   * persists to a server, keeping the native input focusable so keyboard users
   * retain their place in the form.
   *
   * Announced from a polite live region the Switch owns. `aria-busy` is set
   * too, but nothing reads it — no mainstream screen reader conveys `busy` on
   * a non-live element. The region sits OUTSIDE the `<label>` so it does not
   * join the input's accessible name: the name stays stable while loading, and
   * `getByRole('switch', { name })` keeps matching.
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
 * @remarks Hard rule (consumers)
 * A switch whose toggle triggers an **immediate action** — persisting to a
 * server or firing any side effect — MUST use the async optimistic-update flow:
 * flip the state optimistically, set `loading` while the request is in flight,
 * and roll back on failure (see the async `@example` above). Never fire-and-
 * forget a side-effecting toggle: the user needs the in-flight (`loading`) and
 * rollback feedback. A switch over pure local UI state (no side effect) may
 * toggle synchronously.
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
  const t = useTranslation();
  // One tick behind on purpose. Computing the text during render means a
  // component that MOUNTS already-loading mounts region and text together —
  // the case Hard rule 10 forbids, because most screen readers do not announce
  // content that was already there. Deferring to an effect makes the first
  // paint empty, so the word always arrives as a change. DataTable does the
  // same via its loadPhase effect; these two shipped without it.
  const [busyText, setBusyText] = useState('');
  useEffect(() => {
    setBusyText(loading ? t('switch.busy') : '');
  }, [loading, t]);
  const [internalChecked, setInternalChecked] = useState<boolean>(defaultChecked ?? false);
  const isControlled = checked !== undefined;
  const currentChecked = isControlled ? checked : internalChecked;

  const isVisuallyUnavailable = disabled || loading;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (loading) return;
    if (!isControlled) setInternalChecked(e.target.checked);
    onChange?.(e.target.checked, e);
  };

  return (
    <>
      <label
        className={clsx(styles.wrapper, className)}
        data-disabled={isVisuallyUnavailable || undefined}
      >
        {/* Pattern B — {...props} first so component-owned attrs (type, role, checked, disabled, aria-*, onChange, className) win. */}
        <input
          {...props}
          ref={ref}
          type="checkbox"
          role="switch"
          checked={currentChecked}
          disabled={disabled}
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
            {loading && (
              <Loader2 size={SPIN_SIZE[size]} className={styles.spin} aria-hidden="true" />
            )}
          </span>
        </span>
        {children && <span className={clsx(styles.label, LABEL_CLASS[size])}>{children}</span>}
      </label>
      {/* OUTSIDE the <label> on purpose. Inside it, this span joined the
          input's accessible name via name-from-content — `Mute` became
          `MuteSaving…` in dom-accessibility-api and Playwright, so
          `getByRole('switch', { name: 'Mute' })` stopped matching mid-flight.
          Chrome's own AX tree excluded it, but consumer tests do not run in
          Chrome's AX tree. Renaming a focused control is what Hard rule 10
          tells everyone else not to do. */}
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {busyText}
      </span>
    </>
  );
});
