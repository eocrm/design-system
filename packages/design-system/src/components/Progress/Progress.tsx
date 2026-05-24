import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Progress.module.scss';

/** Visual size — controls the track height. */
export type ProgressSize = 'sm' | 'md' | 'lg';

/** Color tone for the fill. Default `'default'` uses the accent color. */
export type ProgressTone = 'default' | 'success' | 'warning' | 'danger';

/** Label render mode. */
export type ProgressLabel = boolean | ReactNode;

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /**
   * Current progress value. Omit (or pass `undefined`) to render the
   * indeterminate animation.
   *
   * Two-channel behavior for out-of-range and degenerate values:
   * - **Visual fill** is clamped to [0%, 100%]. Values outside [0, max]
   *   render at the nearest valid bound.
   * - **ARIA `aria-valuenow`** reports the raw number — this is the right
   *   screen-reader behavior so consumer bugs (a value drifting past max)
   *   surface in audits and SR announcements.
   *
   * Degenerate inputs fall back to the indeterminate animation: `NaN`,
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
   * Track height.
   * - `sm` — 4px (compact / inside form rows)
   * - `md` — 8px (default)
   * - `lg` — 12px (page-level emphasis)
   */
  size?: ProgressSize;
  /**
   * Fill color tone. Defaults to `'default'` (accent blue). Tone applies
   * ONLY to determinate mode; indeterminate always uses the accent tone
   * because state-color semantics don't apply to an unknown total.
   * - `default` — `--color-accent`
   * - `success` — `--color-success`
   * - `warning` — `--color-warning`
   * - `danger` — `--color-danger`
   */
  tone?: ProgressTone;
  /**
   * Optional label rendered to the RIGHT of the bar.
   * - `false` (default) — no label
   * - `true` — render `{Math.round((value / max) * 100)}%` when determinate.
   *   Auto-suppressed when indeterminate (there's no percentage to show).
   * - `ReactNode` — render the node as-is, in BOTH determinate and
   *   indeterminate modes. Consumers wanting "Loading…" text next to an
   *   indeterminate bar pass `label="Loading…"`.
   */
  label?: ProgressLabel;
}

const SIZE_CLASS: Record<ProgressSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

const TONE_CLASS: Record<ProgressTone, string> = {
  default: styles.toneDefault,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
};

/**
 * Linear progress primitive. Renders a horizontal bar with an optional
 * right-aligned label. Tracks known progress against a `max` (default 100),
 * OR renders an indeterminate sliding animation when `value` is omitted.
 *
 * Use for: per-file upload bars, multi-step wizard step indicators, form
 * completion meters, disk-usage gauges, anything with a known total.
 *
 * `role="progressbar"` is locked (can't be overridden via the `role` prop) —
 * the component contract IS the progressbar semantics.
 *
 * @example
 * // Determinate, default size and tone:
 * <Progress value={45} />
 *
 * @example
 * // With percentage label:
 * <Progress value={67} label />
 *
 * @example
 * // Tone-coded for state (e.g. disk usage above 80%):
 * <Progress value={85} tone="warning" label />
 *
 * @example
 * // Indeterminate — value omitted. Use when total is unknown
 * // (e.g. waiting for server-side processing to finish).
 * <Progress />
 *
 * @example
 * // Custom label slot for "N of M" patterns or non-percentage text:
 * <Progress value={3} max={10} label={`3 of 10`} />
 *
 * @example
 * // Composed in a Stack — the canonical "storage usage" panel:
 * <Stack gap="xs">
 *   <Title order={3} size="md">Storage</Title>
 *   <Progress value={85} max={100} tone="warning" label />
 *   <Text size="sm" tone="muted">85 GB of 100 GB used</Text>
 * </Stack>
 *
 * @remarks When NOT to use
 * - For inline loading affordances next to a button. Use `<CircularProgress>`
 *   indeterminate instead — it's the right shape for that pattern.
 * - To "celebrate" task completion. A done bar is a done bar — leave it the
 *   default tone. `tone` communicates STATE during progress (warning when
 *   approaching a threshold, danger when over), not success-on-finish.
 * - For arbitrary horizontal lines. Use `<Divider>` for visual rules.
 *
 * @remarks Anti-patterns
 * - ❌ `<div style={{ width: '${n}%', background: '#xxx', height: 8 }}>` —
 *   the whole reason `<Progress>` exists. Use the primitive.
 * - ❌ `<Progress role="something">` — `role` is locked to `'progressbar'`.
 *   TypeScript will reject the override.
 * - ❌ `<Progress tone="success" value={100}>` to "celebrate" completion.
 *   Tones are for in-flight state-coding, not success-on-done.
 * - ❌ Combining `<Progress>` with a separate label element rendered by the
 *   consumer. The component already exposes a `label` slot that handles
 *   spacing, font-size, and tabular-nums for stable digit widths.
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  {
    value,
    max = 100,
    size = 'md',
    tone = 'default',
    label = false,
    className,
    ...rest
  },
  ref,
) {
  // Determinate requires a finite numeric value AND a positive max. NaN /
  // Infinity / max<=0 are silent consumer-bug paths (esp. file-upload divides
  // bytes_uploaded / total_bytes before total_bytes is known → NaN). Fall
  // back to the indeterminate animation rather than rendering a vanished bar
  // or announcing "NaN percent" to screen readers.
  const determinate = typeof value === 'number' && Number.isFinite(value) && max > 0;
  const indeterminate = !determinate;
  // VISUAL clamp only — ARIA reports the raw `value` via aria-valuenow below.
  const percent = determinate ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  // For indeterminate mode, fall back to consumer-passed aria-label (or "Loading…")
  // so screen readers have something to announce in place of the missing valuenow.
  const ariaLabel = rest['aria-label'];
  const valuetext = indeterminate ? (ariaLabel ?? 'Loading…') : undefined;

  // {...rest} last so consumer overrides win (Pattern A).
  return (
    <div
      ref={ref}
      role="progressbar"
      className={clsx(styles.progress, SIZE_CLASS[size], TONE_CLASS[tone], className)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={determinate ? value : undefined}
      aria-valuetext={valuetext}
      {...rest}
    >
      <div className={styles.track}>
        <div
          className={clsx(styles.fill, indeterminate && styles.indeterminate)}
          style={determinate ? { width: `${percent}%` } : undefined}
        />
      </div>
      {label !== false && !(label === true && indeterminate) && (
        <span className={styles.label}>
          {label === true ? `${Math.round(percent)}%` : label}
        </span>
      )}
    </div>
  );
});
