import { forwardRef, type CSSProperties, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { type PaletteColor } from '../../palette';
import styles from './Badge.module.scss';

/** Semantic tone. Use consistently across pages — `success` should never mean "bad". */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

/**
 * Visual variant.
 * - `'filled'` (default) — solid tone-tinted pill. The standard "loud status" look.
 * - `'stripe'` — rectangular block with a tone-colored left stripe + soft tinted body.
 *   Use for category markers or sidebar labels where pill emphasis is too loud.
 */
export type BadgeVariant = 'filled' | 'stripe';

/**
 * Pill height. See BadgeProps#size for when to use each. Intentionally only
 * two heights — a 40px badge would be Button-shaped. If you need something
 * larger, use `<Button>` or rethink the layout.
 */
export type BadgeSize = 'sm' | 'md';

/** Position of the optional status dot relative to the badge content. */
export type BadgeDot = 'start' | 'end';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /**
   * Semantic tone.
   * - `neutral` (default) — generic tag, no semantic meaning.
   * - `info` — new / in-progress / informational states ("Lead", "Pipeline 2026").
   * - `success` — positive states ("Active", "Won", "Healthy").
   * - `warning` — at-risk / pending states ("Renewal due", "Pending review").
   * - `danger` — negative states ("Churned", "Lost", "Blocked").
   * - `purple` — special / highlighted categories ("Enterprise", "VIP").
   */
  tone?: BadgeTone;
  /**
   * Pill height and emphasis.
   * - `md` (20px, default) — the standard "loud label" pill. Uppercase, tracked,
   *   semibold. Reads as a deliberate status marker.
   * - `sm` (16px) — quieter inline tag for tight table cells, compact toolbars,
   *   or anywhere a 20px uppercase pill visually crowds adjacent text. Drops
   *   the uppercase transform and caps tracking so it sits next to body copy
   *   without shouting; case is preserved as-typed (write `Active`, get
   *   `Active`). Same 11px size and semibold weight as `md`.
   */
  size?: BadgeSize;
  /**
   * Render a small filled circle in the badge's text color alongside the
   * content. Useful when the dot is the primary status signal and the label
   * is supporting context ("● Active", "Failed ●").
   * - `start` — dot before the content.
   * - `end` — dot after the content.
   *
   * Omit for no dot. The dot is purely decorative (`aria-hidden`) — the badge
   * text remains the accessible label.
   */
  dot?: BadgeDot;
  /**
   * Visual variant.
   * - `'filled'` (default) — solid tone-tinted pill. The standard "loud status" look.
   * - `'stripe'` — rectangular block with a tone-colored left stripe + soft tinted body.
   *   Use for category markers or sidebar labels where pill emphasis is too loud.
   */
  variant?: BadgeVariant;
  /**
   * Optional categorical palette color. When set, takes precedence over
   * `tone`: the badge fills with the matching `--color-palette-<name>-bg/fg`
   * tokens. Use for non-semantic categorical labels (e.g., audit event
   * namespaces, tag colors) where the 6 semantic tones aren't enough.
   *
   * Both filled and stripe variants are supported; for stripe the
   * left-border picks up the palette `fg` token.
   */
  color?: PaletteColor;
}

const toneClass: Record<BadgeTone, string> = {
  neutral: styles.neutral,
  info: styles.info,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
  purple: styles.purple,
};

const sizeClass: Record<BadgeSize, string> = {
  sm: styles.sm,
  md: styles.md,
};

/**
 * Small inline pill for status, category, or count. Supports two variants:
 * the default `'filled'` pill and a `'stripe'` rectangular block with a
 * tone-colored left stripe and a softly tinted body — useful for category
 * markers or sidebar labels where the uppercase pill is too loud. Non-interactive
 * — wrap in a `<Button>` if you need it clickable.
 *
 * Badge does NOT auto-add `role="status"`. Tone is a visual signal only.
 * If a state change should be announced to screen readers, wrap the badge
 * (or a parent region) in `aria-live="polite"`.
 *
 * @example
 * <Badge tone="success">Active</Badge>
 *
 * @example
 * // Contact status:
 * <Badge tone={contact.status === 'churned' ? 'danger' : 'success'}>
 *   {contact.status}
 * </Badge>
 *
 * @example
 * // Tag list:
 * <Cluster gap="xs">
 *   <Badge tone="purple">Enterprise</Badge>
 *   <Badge tone="info">Pipeline 2026</Badge>
 * </Cluster>
 *
 * @example
 * // Stripe variant — rectangular category markers:
 * <Cluster gap="sm">
 *   <Badge variant="stripe" tone="info">Lead</Badge>
 *   <Badge variant="stripe" tone="warning">Renewal due</Badge>
 *   <Badge variant="stripe" tone="success">Active</Badge>
 * </Cluster>
 *
 * @remarks When NOT to use
 * - As a button. Badges are non-interactive labels. If it's clickable, use
 *   a `Button` or `Link`.
 * - For long-form text. Badges should be 1-2 words max.
 *
 * @example
 * // Categorical palette color (not a semantic tone) — for tag-like labels
 * <Badge color="amber">Marketing</Badge>
 * <Badge color="teal">Engineering</Badge>
 * <Badge variant="stripe" color="violet">Design</Badge>
 *
 * @remarks Anti-patterns
 * - ❌ Mixing tone meanings across pages. If `success` means "Won" on Deals
 *   and "Active" on Contacts, that's fine — but never use `success` for
 *   anything negative.
 * - ❌ Stacking 4+ badges on a single row. If you have that many tags, the
 *   design problem is information density, not the badge.
 * - ❌ Wrapping a Badge in a `<button>` to make it clickable. Use a `Button`
 *   with an appropriate variant instead.
 * - ❌ Using `color` (palette) for status. Use `tone` (semantic) for status;
 *   palette colors carry no built-in meaning and consumers might shift the
 *   mapping over time.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    tone = 'neutral',
    size = 'md',
    dot,
    variant = 'filled',
    color,
    className,
    children,
    style,
    ...props
  },
  ref,
) {
  // When a palette color is set, inject inline bg/fg/border-left-color
  // values that override the tone class's CSS rules (inline beats class
  // by specificity). When color is undefined, the tone class wins
  // unchanged — defaults are byte-identical to today.
  const colorStyle: CSSProperties | undefined = color
    ? variant === 'stripe'
      ? {
          background: `var(--color-palette-${color}-bg)`,
          color: `var(--color-palette-${color}-fg)`,
          borderLeftColor: `var(--color-palette-${color}-fg)`,
        }
      : {
          background: `var(--color-palette-${color}-bg)`,
          color: `var(--color-palette-${color}-fg)`,
        }
    : undefined;

  // Merge consumer-supplied style on top of the palette style so consumer
  // overrides still win.
  const mergedStyle = colorStyle || style ? { ...colorStyle, ...style } : undefined;

  // {...props} last so consumer overrides win (Pattern A).
  return (
    <span
      ref={ref}
      className={clsx(
        styles.badge,
        toneClass[tone],
        sizeClass[size],
        variant === 'stripe' && styles.stripe,
        className,
      )}
      style={mergedStyle}
      {...props}
    >
      {dot === 'start' && <span aria-hidden="true" className={styles.dot} />}
      {children}
      {dot === 'end' && <span aria-hidden="true" className={styles.dot} />}
    </span>
  );
});
