import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './PasswordStrengthMeter.module.scss';

/** Numeric strength score, 0 (empty) – 4 (strong). */
export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrengthLabels {
  /** Label when value is empty / score is 0. Default: '' (no label). */
  empty?: string;
  /** Default: 'Weak'. */
  weak?: string;
  /** Default: 'Fair'. */
  fair?: string;
  /** Default: 'Good'. */
  good?: string;
  /** Default: 'Strong'. */
  strong?: string;
}

const DEFAULT_LABELS: Required<PasswordStrengthLabels> = {
  empty: '',
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

export interface PasswordStrengthMeterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The password to evaluate. Required UNLESS `score` is provided. Evaluated
   * via the default scoring heuristic or a consumer-supplied `scoreFn`.
   */
  value?: string;
  /**
   * Pre-computed score (0–4). Wins over `value` + `scoreFn` when both are
   * present. Use this when scoring is done by zxcvbn or server-side.
   */
  score?: PasswordStrengthScore;
  /**
   * Custom scoring fn. Receives the password, returns 0–4. Defaults to a
   * length + character-class heuristic — fine for prototypes, NOT a
   * security control. Production should pass a real scorer via `score`.
   */
  scoreFn?: (value: string) => PasswordStrengthScore;
  /** Render the textual label next to the segments. Defaults to `true`. */
  showLabel?: boolean;
  /** Localized labels. */
  labels?: PasswordStrengthLabels;
}

/**
 * Default heuristic — DO NOT TREAT AS A SECURITY CONTROL.
 *
 * Length gates everything: passwords under 8 characters always score 1
 * ("Weak") regardless of character variety, because a 4-char "Ab1!"
 * with mixed case + digit + special is still trivially brute-forced.
 * Bonuses kick in only once the password reaches the 8-char floor.
 */
function defaultScoreFn(pw: string): PasswordStrengthScore {
  if (!pw) return 0;
  // Length floor — anything shorter than 8 chars caps at 1.
  if (pw.length < 8) return 1;
  let score = 1; // starts at 1 since length >= 8
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as PasswordStrengthScore;
}

const LABEL_KEY: Record<PasswordStrengthScore, keyof Required<PasswordStrengthLabels>> = {
  0: 'empty',
  1: 'weak',
  2: 'fair',
  3: 'good',
  4: 'strong',
};

/**
 * Visual 4-segment password-strength meter. Pluggable scoring; default
 * heuristic is intentionally crude — pass `score` from zxcvbn or a
 * server-side scorer for production. Use `aria-describedby` on a
 * `<PasswordInput>` to associate the meter with the field for AT.
 *
 * @example
 * <PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} />
 * <PasswordStrengthMeter value={pw} />
 *
 * @example
 * // Consumer-driven score (zxcvbn etc.):
 * <PasswordStrengthMeter score={zxcvbnScore(pw)} />
 *
 * @remarks When NOT to use
 * - As a security control. The default heuristic flags long+mixed
 *   passwords as "Strong" even when they're in a breach corpus.
 *   Production: server-side scoring + breach-list check.
 *
 * @remarks Anti-patterns
 * - ❌ `<PasswordStrengthMeter value={pw} score={4} />` — `score` wins,
 *   `value` is ignored. Pass one OR the other.
 */
export const PasswordStrengthMeter = forwardRef<HTMLDivElement, PasswordStrengthMeterProps>(
  function PasswordStrengthMeter(
    { value, score, scoreFn = defaultScoreFn, showLabel = true, labels, className, ...props },
    ref,
  ) {
    const resolved: PasswordStrengthScore = score ?? (value !== undefined ? scoreFn(value) : 0);
    const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
    const labelText = resolvedLabels[LABEL_KEY[resolved]];

    return (
      <div
        ref={ref}
        className={clsx(styles.meter, styles[`score-${resolved}`], className)}
        {...props}
      >
        <div className={styles.segments} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={clsx(styles.segment, i < resolved && styles.filled)} />
          ))}
        </div>
        {showLabel && <span className={styles.label}>{labelText}</span>}
        {/* Polite live region — announces label changes ("Weak" → "Fair") so
            screen-reader users hear progress as they type. */}
        <span role="status" aria-live="polite" className={styles.srOnly}>
          {labelText}
        </span>
      </div>
    );
  },
);
