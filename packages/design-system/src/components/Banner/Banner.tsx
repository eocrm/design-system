import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../Button';
import { VisuallyHidden } from '../VisuallyHidden';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './Banner.module.scss';

/**
 * Tone — drives the tinted background, bottom rule, icon colour, default icon,
 * the visually hidden spoken prefix, and (with `live`) the ARIA role.
 *
 * - `'info'` — blue. Advance notice ("Maintenance on Saturday 22:00").
 * - `'success'` — green. A resolved system condition ("Email sending restored").
 * - `'warning'` — amber. Imminent or degrading ("Read-only in 30 minutes").
 * - `'danger'` — red. Something is broken or blocked now ("Email sending
 *   suspended"). With `live`, uses `role="alert"`. Note: this is `danger`, not
 *   Alert's `error`.
 */
export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'title'> {
  /**
   * Tone. Defaults to `'info'`. `info` — advance notice; `success` — condition
   * resolved; `warning` — imminent or degrading; `danger` — broken or blocked
   * now. See `BannerTone`.
   */
  tone?: BannerTone;

  /**
   * Optional bold lead-in, rendered INLINE before `children` in the same text
   * flow ("**Scheduled maintenance** Sat 22:00–23:00."). Keep it short — the
   * banner is one line on desktop.
   *
   * Collapses the native HTML `title` (tooltip) attribute.
   */
  title?: ReactNode;

  /** Message text. Wraps with the title. Keep to one sentence. */
  children?: ReactNode;

  /**
   * Override the tone's default icon (any ReactNode, typically a 16px lucide
   * icon with `aria-hidden`). `null` hides it.
   *
   * Defaults: `info` → `Info`, `success` → `CheckCircle2`,
   * `warning` → `AlertTriangle`, `danger` → `XCircle`.
   */
  icon?: ReactNode | null;

  /**
   * One action pinned to the end of the row — typically a `<Link>` ("Details")
   * or a `<Button size="xs">` ("Review bounces"). Banner doesn't lay out
   * multiple actions; pass one.
   */
  action?: ReactNode;

  /**
   * Whether the Banner is a live region. Defaults to `false`: `role="note"`,
   * right for a banner that is present when the app loads.
   *
   * Pass `live` for a banner that APPEARS mid-session. Caveat: a mid-session
   * Banner mounts together with its text, and a `role="status"` region that
   * mounts with its text is not reliably announced. Only `tone="danger"` +
   * `live` (`role="alert"`) is announced on insertion. For a must-hear
   * non-danger message, pair the banner with a `<LiveRegion>` or a toast.
   *
   * Decide it at mount — flipping it on a mounted Banner announces nothing.
   * @default false
   */
  live?: boolean;

  /**
   * Called when the × is clicked. When set, the × renders. **Controlled** —
   * Banner keeps no hidden state and persists nothing; the app decides what
   * "dismissed" means (per session, per incident, per user) and stops
   * rendering it.
   */
  onDismiss?: () => void;
}

const DEFAULT_ICONS: Record<BannerTone, ReactNode> = {
  info: <Info size={16} aria-hidden="true" />,
  success: <CheckCircle2 size={16} aria-hidden="true" />,
  warning: <AlertTriangle size={16} aria-hidden="true" />,
  danger: <XCircle size={16} aria-hidden="true" />,
};

/**
 * Full-width system / app message bar for `<AppLayout>`'s `banner` and `contextBanner` slots.
 * @see docs/components/Banner.md
 */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  { tone = 'info', title, children, icon, action, live = false, onDismiss, className, ...props },
  ref,
) {
  const t = useTranslation();
  const role = !live ? 'note' : tone === 'danger' ? 'alert' : 'status';
  const renderedIcon = icon === null ? null : (icon ?? DEFAULT_ICONS[tone]);
  const hasTitle = title != null && title !== false && title !== '';
  const hasAction = action != null && action !== false && action !== '';
  const hasChildren = children != null && children !== false && children !== '';

  return (
    <div
      ref={ref}
      {...props}
      // {...props} first so role / data-tone (the ARIA contract) win.
      role={role}
      data-tone={tone}
      className={clsx(styles.banner, className)}
    >
      {renderedIcon && (
        <span className={styles.icon} aria-hidden="true">
          {renderedIcon}
        </span>
      )}
      <div className={styles.text}>
        <VisuallyHidden>{`${t(`banner.tone.${tone}`)}: `}</VisuallyHidden>
        {hasTitle && <strong className={styles.title}>{title}</strong>}
        {hasTitle && hasChildren && ' '}
        {children}
      </div>
      {hasAction && <div className={styles.action}>{action}</div>}
      {onDismiss && (
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t('banner.dismiss')}
          onClick={onDismiss}
        >
          <X size={14} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
});
