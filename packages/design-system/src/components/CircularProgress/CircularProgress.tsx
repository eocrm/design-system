import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './CircularProgress.module.scss';

/** Diameter + stroke pairing. */
export type CircularProgressSize = 'sm' | 'md' | 'lg';

/** Color tone for the fill stroke. Default `'default'` uses the accent color. */
export type CircularProgressTone = 'default' | 'success' | 'warning' | 'danger';

/** Label render mode. */
export type CircularProgressLabel = boolean | ReactNode;

export interface CircularProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /**
   * Current progress value. Omit (or pass `undefined`) to render the
   * indeterminate spinning animation.
   *
   * Two-channel behavior for out-of-range and degenerate values:
   * - **Visual arc** is clamped to [0%, 100%]. Values outside [0, max]
   *   render at the nearest valid bound.
   * - **ARIA `aria-valuenow`** reports the raw number so consumer bugs
   *   (a value drifting past max) surface in audits and SR announcements.
   *
   * Degenerate inputs fall back to the indeterminate spinner: `NaN`,
   * `Infinity`, `-Infinity`, and the case where `max <= 0`. This is the
   * common file-upload race condition (`bytes_uploaded / total_bytes`
   * before `total_bytes` is known produces NaN).
   */
  value?: number;
  /**
   * Upper bound. Defaults to `100`. Consumers using fraction values
   * (0.0–1.0) pass `max={1}`. Consumers tracking a count ("3 of 10")
   * pass `max={10}`.
   */
  max?: number;
  /**
   * Diameter + stroke pairing.
   * - `sm` — 16px diameter, 2px stroke (inline next to a button — also the
   *   shape to use for "Saving…" loading affordances; pass no `value` for
   *   the indeterminate spinner.)
   * - `md` — 32px diameter, 3px stroke (default — near a heading)
   * - `lg` — 56px diameter, 4px stroke (page-level loader)
   */
  size?: CircularProgressSize;
  /**
   * Stroke color tone. Defaults to `'default'` (accent blue). Same vocab
   * as `<Progress>`. Indeterminate ignores tone — always accent.
   */
  tone?: CircularProgressTone;
  /**
   * Optional centered label.
   * - `false` (default) — no label
   * - `true` — render `{Math.round(percent)}%` centered. Auto-suppressed
   *   at `size='sm'` (16px circle has no room for text) AND when
   *   indeterminate.
   * - `ReactNode` — render the node centered in BOTH modes. Still
   *   auto-suppressed at `size='sm'` regardless — the geometry doesn't
   *   change.
   */
  label?: CircularProgressLabel;
}

const SIZE_CLASS: Record<CircularProgressSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

const TONE_CLASS: Record<CircularProgressTone, string> = {
  default: styles.toneDefault,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
};

// SVG geometry constants:
// - viewBox is 36x36, the circle is centered at (18, 18) with radius 16.
// - circumference = 2 * π * 16 ≈ 100.531. The SVG fits the conventional
//   "use 100 as the magic circumference" pattern that makes percentages
//   trivial: strokeDashoffset = (1 - value/max) * circumference.
// - The outer SVG carries `transform: rotate(-90deg)` (in SCSS) so the
//   0% mark sits at 12 o'clock instead of 3 o'clock.
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Circular progress primitive (donut shape). Tracks known progress like
 * `<Progress>`, but in a circular geometry — better for inline loading
 * indicators ("Saving…" next to a button) and tight spaces where a horizontal
 * bar wouldn't fit. Indeterminate mode is a spinning arc (the canonical
 * "Loader" / "Spinner" use case).
 *
 * `role="progressbar"` is locked (can't be overridden via the `role` prop).
 *
 * @example
 * // Determinate donut, default size:
 * <CircularProgress value={45} />
 *
 * @example
 * // Centered percentage label:
 * <CircularProgress value={75} label />
 *
 * @example
 * // Indeterminate spinner inline next to a button (the canonical loader):
 * <Cluster gap="sm">
 *   <Button>Save</Button>
 *   <CircularProgress size="sm" aria-label="Saving" />
 * </Cluster>
 *
 * @example
 * // Large stat-card-style donut:
 * <CircularProgress size="lg" value={80} tone="success" label />
 *
 * @example
 * // Custom label (e.g. for "n of N" or a status word):
 * <CircularProgress value={3} max={10} label={`3 / 10`} />
 *
 * @remarks When NOT to use
 * - For horizontal progress next to row content. Use `<Progress>` linear.
 * - To replace `<Skeleton>` for loading placeholders. Skeleton implies
 *   "structure on its way"; CircularProgress implies "I'm working on it."
 * - As a decorative icon. The `role="progressbar"` is announced to SR.
 *
 * @remarks Anti-patterns
 * - ❌ Hand-rolled spinning `<svg>` per page. Use `<CircularProgress />`
 *   indeterminate — same visual, accessible, reduced-motion-aware.
 * - ❌ `<CircularProgress value={0}>` to render an empty circle.
 *   `value={0}` is determinate (0% done) and renders an empty arc; the
 *   intent is usually "indeterminate" — omit `value` entirely instead.
 * - ❌ `<CircularProgress size="sm" label>` expecting centered text in a
 *   16px circle. The label is auto-suppressed at `sm` — by design. Use
 *   `md` or `lg` if you need the label.
 */
export const CircularProgress = forwardRef<HTMLDivElement, CircularProgressProps>(
  function CircularProgress(
    { value, max = 100, size = 'md', tone = 'default', label = false, className, ...rest },
    ref,
  ) {
    // Determinate requires a finite numeric value AND a positive max — same
    // defensive guard as <Progress>. NaN / Infinity / max<=0 fall back to the
    // indeterminate spinner (file-upload race: bytes_uploaded / total_bytes
    // before total_bytes is known → NaN).
    const determinate = typeof value === 'number' && Number.isFinite(value) && max > 0;
    const indeterminate = !determinate;
    // VISUAL clamp only — ARIA reports the raw `value`.
    const percent = determinate ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    const strokeDashoffset = determinate ? CIRCUMFERENCE * (1 - percent / 100) : undefined;
    const ariaLabel = rest['aria-label'];
    const valuetext = indeterminate ? (ariaLabel ?? 'Loading…') : undefined;

    // {...rest} last so consumer overrides win (Pattern A).
    return (
      <div
        ref={ref}
        role="progressbar"
        className={clsx(styles.circular, SIZE_CLASS[size], TONE_CLASS[tone], className)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={determinate ? value : undefined}
        aria-valuetext={valuetext}
        {...rest}
      >
        <svg viewBox="0 0 36 36" className={styles.svg}>
          <circle className={styles.track} cx="18" cy="18" r={RADIUS} />
          <circle
            className={clsx(styles.fill, indeterminate && styles.indeterminate)}
            cx="18"
            cy="18"
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        {label !== false && size !== 'sm' && !(label === true && indeterminate) && (
          <span className={styles.label}>{label === true ? `${Math.round(percent)}%` : label}</span>
        )}
      </div>
    );
  },
);
