import {
  forwardRef,
  useCallback,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import clsx from 'clsx';
import { ArrowBigUpDash, Eye, EyeOff, Languages } from 'lucide-react';
import { Button } from '../Button';
import { Tooltip } from '../Tooltip';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './PasswordInput.module.scss';

/** Field height + type scale. Same scale as `<Input>`. */
export type PasswordInputSize = 'sm' | 'md' | 'lg';

const ICON_SIZE_FOR: Record<PasswordInputSize, number> = {
  sm: 14,
  md: 14,
  lg: 16,
};

export interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type'
> {
  /** Field height + type scale. Same scale as `<Input>`. Defaults to `'md'`. */
  size?: PasswordInputSize;
  /** Toggles the error visual + sets `aria-invalid="true"`. */
  invalid?: boolean;
  /** Controlled revealed state. Pair with `onRevealChange`. */
  revealed?: boolean;
  /** Initial revealed state for uncontrolled use. Defaults to `false`. */
  defaultRevealed?: boolean;
  /** Called when the user clicks the eye toggle. Receives the next revealed state. */
  onRevealChange?: (revealed: boolean) => void;
  /**
   * Whether to render the eye toggle button. Defaults to `true`. Set
   * `revealable={false}` for compliance / kiosk screens where revealing
   * is forbidden — the input then behaves like a plain locked-down
   * `<input type='password'>`.
   */
  revealable?: boolean;
  /**
   * Opt-in caps-lock detection. When `true`, on every keypress the
   * input reads `event.getModifierState('CapsLock')`; when active, a
   * warning icon + polite `aria-live` announce it. Cleared on blur.
   *
   * Defaults to `false`. Opt in on screens where caps-lock matters
   * (login, password creation, password confirmation).
   */
  capsLockWarning?: boolean;
  /**
   * Opt-in wrong-keyboard-layout detection. When `true`, detects
   * keystrokes that produce non-ASCII single characters (e.g., Cyrillic
   * `ф` from a Russian layout). Shows a warning icon + polite live
   * region. Cleared on blur.
   *
   * Heuristic, not deterministic — any non-ASCII keystroke triggers.
   * Only enable when the system expects Latin-only password input.
   * Defaults to `false`.
   */
  wrongLayoutWarning?: boolean;
}

/**
 * Password text field with a trailing eye toggle that flips the input
 * `type` between `'password'` and `'text'`. Optional opt-in caps-lock and
 * wrong-keyboard-layout warnings. Pair with `<PasswordStrengthMeter>` for
 * the canonical signup-form pattern.
 *
 * @example
 * <PasswordInput placeholder="Password" />
 *
 * @example
 * // Controlled reveal:
 * const [revealed, setRevealed] = useState(false);
 * <PasswordInput revealed={revealed} onRevealChange={setRevealed} />
 *
 * @example
 * // Login form with both warnings:
 * <PasswordInput
 *   name="password"
 *   capsLockWarning
 *   wrongLayoutWarning
 *   aria-describedby="pw-strength"
 * />
 * <PasswordStrengthMeter id="pw-strength" value={password} />
 *
 * @remarks When NOT to use
 * - Non-secret single-line text → use `<Input>`.
 * - Multi-line secrets (paste-only API tokens) → use `<Textarea>` (not shipped).
 * - Systems that allow non-Latin passwords → do NOT set `wrongLayoutWarning`.
 *
 * @remarks Anti-patterns
 * - ❌ `revealable={false}` + a non-password `<Input>` next to it for "Show in plaintext" UX. Just use `<Input>` directly.
 * - ❌ Wrapping in another `<label>` outside the component — we already render the input; an outer label nests poorly.
 * - ❌ Treating the default `<PasswordStrengthMeter>` scoring as a security control. It's a UX hint; pass `score` from zxcvbn or server-side validation for production.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      size = 'md',
      invalid,
      revealed,
      defaultRevealed,
      onRevealChange,
      revealable = true,
      capsLockWarning = false,
      wrongLayoutWarning = false,
      className,
      disabled,
      onKeyDown,
      onBlur,
      ...props
    },
    ref,
  ) {
    const t = useTranslation();
    const iconSize = ICON_SIZE_FOR[size];

    const isControlled = revealed !== undefined;
    const [internalRevealed, setInternalRevealed] = useState(defaultRevealed ?? false);
    const currentRevealed = isControlled ? revealed : internalRevealed;

    const [capsOn, setCapsOn] = useState(false);
    const [wrongLayout, setWrongLayout] = useState(false);

    const handleToggle = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault(); // avoid focus jump on click
        const next = !currentRevealed;
        if (!isControlled) setInternalRevealed(next);
        onRevealChange?.(next);
      },
      [currentRevealed, isControlled, onRevealChange],
    );

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        if (capsLockWarning) {
          setCapsOn(e.getModifierState('CapsLock'));
        }
        if (wrongLayoutWarning) {
          // Heuristic: any single non-ASCII printable character → wrong layout.
          const isSingleChar = e.key.length === 1;
          const isAscii = /^[\x20-\x7E]$/.test(e.key);
          setWrongLayout(isSingleChar && !isAscii);
        }
        onKeyDown?.(e);
      },
      [capsLockWarning, wrongLayoutWarning, onKeyDown],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setCapsOn(false);
        setWrongLayout(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    const ToggleIcon = currentRevealed ? EyeOff : Eye;

    return (
      <div
        className={clsx(
          styles.wrapper,
          styles[`size-${size}`],
          invalid && styles.invalid,
          disabled && styles.disabled,
          className,
        )}
      >
        <input
          {...props}
          ref={ref}
          type={currentRevealed ? 'text' : 'password'}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className={styles.input}
        />

        {/* Warning icons. While active, each icon is wrapped in a Tooltip
            that's force-`open` so sighted users see the warning text
            float above without needing to hover. AT users still get the
            announcement via the separate aria-live regions below — the
            icons themselves are aria-hidden, so the tooltip's
            aria-describedby is intentionally inert for screen readers
            (no double-announcement). */}
        {capsLockWarning && capsOn && (
          <Tooltip content={t('passwordInput.capsLockOn')} open>
            <span aria-hidden="true" className={styles.warningIcon}>
              <ArrowBigUpDash size={iconSize} />
            </span>
          </Tooltip>
        )}
        {wrongLayoutWarning && wrongLayout && (
          <Tooltip content={t('passwordInput.wrongLayoutOn')} open>
            <span aria-hidden="true" className={styles.warningIcon}>
              <Languages size={iconSize} />
            </span>
          </Tooltip>
        )}

        {revealable && (
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            aria-pressed={currentRevealed}
            aria-label={currentRevealed ? t('passwordInput.hide') : t('passwordInput.show')}
            onClick={handleToggle}
            disabled={disabled}
          >
            <ToggleIcon size={iconSize} aria-hidden="true" />
          </Button>
        )}

        {/* Polite live regions for AT. Render unconditionally so the
            announce fires only when the textContent changes. */}
        {capsLockWarning && (
          <span role="status" aria-live="polite" className={styles.srOnly}>
            {capsOn ? t('passwordInput.capsLockOn') : ''}
          </span>
        )}
        {wrongLayoutWarning && (
          <span role="status" aria-live="polite" className={styles.srOnly}>
            {wrongLayout ? t('passwordInput.wrongLayoutOn') : ''}
          </span>
        )}
      </div>
    );
  },
);
