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
 *   suspended"). With `live`, uses `role="alert"`.
 */
export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role' | 'title'> {
  /** Tone. Defaults to `'info'`. See `BannerTone`. */
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
   * Whether the Banner is a live region. Defaults to `false`: `role="note"` —
   * right for the common case of a banner that is present when the app loads
   * (a live region mounted together with its text isn't reliably announced
   * anyway).
   *
   * Pass `live` for a banner that APPEARS mid-session in response to
   * something (sending got suspended while the user works): `role="status"`
   * (polite), or `role="alert"` (assertive) for `tone="danger"`.
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
 * Full-width system / app message bar. Mount it in `<AppLayout>`'s `banner`
 * slot (system- or account-wide: maintenance, billing overdue) or its
 * `contextBanner` slot (scoped to a module or route: "Email sending suspended"
 * on the Email pages). Tinted background, a bottom rule in the tone colour, and
 * a single row — icon, title + text, action, × — that wraps on narrow widths.
 *
 * The tone is spoken: a visually hidden, localised prefix ("Warning: ") comes
 * before the text, because a banner in app chrome is read out of the page's
 * context.
 *
 * @example
 * // System-wide, above everything:
 * <AppLayout
 *   banner={
 *     <Banner tone="warning" title="Scheduled maintenance" action={<Link href="/status">Details</Link>}>
 *       Sat 4 Oct, 22:00–23:00 CET. CRM will be read-only.
 *     </Banner>
 *   }
 *   topBar={<TopBar />}
 *   sidebar={<Rail>{nav}</Rail>}
 * >
 *   {routes}
 * </AppLayout>
 *
 * @example
 * // Module-scoped, under the TopBar; appeared mid-session so it's live:
 * <AppLayout
 *   contextBanner={inEmail && suspended && (
 *     <Banner tone="danger" live title="Email sending suspended."
 *       action={<Button size="xs" variant="secondary">Review bounces</Button>}>
 *       Bounce rate 7.2% (limit 5%).
 *     </Banner>
 *   )}
 *   …
 * />
 *
 * @example
 * // Dismissible — the app persists the dismissal:
 * {!dismissed && (
 *   <Banner tone="success" onDismiss={() => setDismissed(true)}>
 *     Email sending restored.
 *   </Banner>
 * )}
 *
 * @remarks When NOT to use
 * - Content about the current page or a section of it → `<Alert>`.
 * - Transient confirmation ("Saved") → `toast.success(...)`.
 * - Anywhere other than `AppLayout`'s `banner` / `contextBanner` slots — inside
 *   page content it is just a borderless Alert.
 *
 * @remarks Anti-patterns
 * - ❌ `onDismiss` on a `danger` banner whose condition still holds (sending
 *   suspended). The user can't close their way out of the problem — remove the
 *   banner when the condition clears.
 * - ❌ Several banners per slot as routine. Show the most severe, first.
 * - ❌ System-wide messages in `contextBanner`, or route-specific ones in
 *   `banner`. The slot IS the scope signal.
 * - ❌ `live` on a banner that is present when the app loads.
 * - ❌ Multiple actions or a paragraph of text — link to a details page.
 */
export const Banner = forwardRef<HTMLDivElement, BannerProps>(function Banner(
  { tone = 'info', title, children, icon, action, live = false, onDismiss, className, ...props },
  ref,
) {
  const t = useTranslation();
  const role = !live ? 'note' : tone === 'danger' ? 'alert' : 'status';
  const renderedIcon = icon === null ? null : (icon ?? DEFAULT_ICONS[tone]);
  const hasTitle = title != null && title !== false && title !== '';
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
      {renderedIcon && <span className={styles.icon}>{renderedIcon}</span>}
      <div className={styles.text}>
        <VisuallyHidden>{`${t(`banner.tone.${tone}`)}: `}</VisuallyHidden>
        {hasTitle && <strong className={styles.title}>{title}</strong>}
        {hasTitle && hasChildren && ' '}
        {children}
      </div>
      {action && <div className={styles.action}>{action}</div>}
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
