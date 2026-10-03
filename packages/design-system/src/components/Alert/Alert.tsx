import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../Button';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './Alert.module.scss';

/**
 * Tone — drives icon, accent stripe color, tinted background, and ARIA role.
 *
 * - `'info'` — blue accent. Neutral updates ("Synced 5 minutes ago").
 * - `'success'` — green accent. Confirmations ("Changes saved").
 * - `'warning'` — dark amber accent. Non-blocking heads-up ("Storage at 85%").
 * - `'error'` — red accent. Failures. ALSO sets `role="alert"` (assertive); the
 *   other tones use `role="status"` (polite). With `live={false}` every tone
 *   is a static `role="note"` instead.
 */
export type AlertTone = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends Omit<HTMLAttributes<HTMLElement>, 'role' | 'title'> {
  /** Tone. Defaults to `'info'`. See `AlertTone` for full descriptions. */
  tone?: AlertTone;

  /**
   * Optional bold heading. Renders above the description. ReactNode so you
   * can embed inline emphasis (`<>Update <strong>1.2.3</strong> available</>`).
   *
   * The native HTML `title` attribute (tooltip-on-hover) is collapsed by this
   * prop. Use `aria-label` if you need that.
   */
  title?: ReactNode;

  /** Description body. Rendered below the title in muted color. */
  children?: ReactNode;

  /**
   * Override the tone's default icon. Pass any ReactNode (typically a
   * lucide-react icon). Pass `null` to hide the icon entirely.
   *
   * Defaults: `info` → `Info`, `success` → `CheckCircle2`,
   * `warning` → `AlertTriangle`, `error` → `XCircle`.
   */
  icon?: ReactNode | null;

  /**
   * Optional action row rendered below the description. Typically a single
   * Button or a Cluster of two ("Retry", "Dismiss"). The component doesn't
   * manage the action row's layout — pass a pre-laid-out node.
   */
  actions?: ReactNode;

  /**
   * Whether the Alert is a live region. Defaults to `true`: `role="status"`
   * (polite), or `role="alert"` (assertive) for `tone="error"` — right for a
   * message that APPEARS in response to something (a save failed, an update
   * arrived).
   *
   * Pass `false` for a callout that is simply part of the page when it opens —
   * a "Needs action" note in each card of a list, a standing warning in a
   * form. It renders `role="note"` with the same visuals and no live
   * semantics, so screen readers read it in place instead of announcing it.
   * N live Alerts mounting together can queue N announcements (#547).
   *
   * The tone is shown by the icon's shape and the colour only; it is not
   * exposed to assistive tech in either mode (the icon is decorative). With
   * `live={false}`, `tone="error"` also loses the "alert" role that browse-mode
   * readers speak. So put the urgency in `title` ("Needs action").
   *
   * Decide it at mount: flipping `false` → `true` on a mounted Alert turns
   * content that is already there into a live region, which announces nothing.
   * @default true
   */
  live?: boolean;

  /**
   * Called when the user clicks the close (×) button. When set, the close
   * button renders; when omitted, no close button. Alert is **controlled** —
   * the component does NOT manage internal hidden state. Hide via
   * conditional render in the consumer:
   *
   * ```tsx
   * const [show, setShow] = useState(true);
   * {show && <Alert tone="success" onDismiss={() => setShow(false)}>Saved</Alert>}
   * ```
   */
  onDismiss?: () => void;
}

const DEFAULT_ICONS: Record<AlertTone, ReactNode> = {
  info: <Info size={16} aria-hidden="true" />,
  success: <CheckCircle2 size={16} aria-hidden="true" />,
  warning: <AlertTriangle size={16} aria-hidden="true" />,
  error: <XCircle size={16} aria-hidden="true" />,
};

/**
 * Persistent in-flow notification.
 * @see docs/components/Alert.md
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { tone = 'info', title, children, icon, actions, live = true, onDismiss, className, ...props },
  ref,
) {
  const t = useTranslation();
  const role = !live ? 'note' : tone === 'error' ? 'alert' : 'status';
  const renderedIcon = icon === null ? null : (icon ?? DEFAULT_ICONS[tone]);

  return (
    <div
      ref={ref}
      {...props}
      // {...props} first so role / data-tone (the ARIA contract) win.
      role={role}
      data-tone={tone}
      className={clsx(styles.alert, className)}
    >
      {renderedIcon && <div className={styles.icon}>{renderedIcon}</div>}
      <div className={styles.body}>
        {title && <strong className={styles.title}>{title}</strong>}
        {children && <div className={styles.description}>{children}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          aria-label={t('alert.dismiss')}
          onClick={onDismiss}
        >
          <X size={14} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
});
