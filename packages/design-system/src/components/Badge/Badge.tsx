import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Badge.module.scss';

/** Semantic tone. Use consistently across pages — `success` should never mean "bad". */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

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
}

const toneClass: Record<BadgeTone, string> = {
  neutral: styles.neutral,
  info: styles.info,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
  purple: styles.purple,
};

/**
 * Small inline pill for status, category, or count. Non-interactive — wrap
 * in a `<Button>` if you need it clickable.
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
 * @remarks When NOT to use
 * - As a button. Badges are non-interactive labels. If it's clickable, use
 *   a `Button` or `Link`.
 * - For long-form text. Badges should be 1-2 words max.
 *
 * @remarks Anti-patterns
 * - ❌ Mixing tone meanings across pages. If `success` means "Won" on Deals
 *   and "Active" on Contacts, that's fine — but never use `success` for
 *   anything negative.
 * - ❌ Stacking 4+ badges on a single row. If you have that many tags, the
 *   design problem is information density, not the badge.
 * - ❌ Wrapping a Badge in a `<button>` to make it clickable. Use a `Button`
 *   with an appropriate variant instead.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = 'neutral', className, ...props },
  ref,
) {
  return <span ref={ref} className={clsx(styles.badge, toneClass[tone], className)} {...props} />;
});
