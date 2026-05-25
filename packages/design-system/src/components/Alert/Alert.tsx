import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../Button';
import styles from './Alert.module.scss';

/**
 * Tone — drives icon, accent stripe color, tinted background, and ARIA role.
 *
 * - `'info'` — blue accent. Neutral updates ("Synced 5 minutes ago").
 * - `'success'` — green accent. Confirmations ("Changes saved").
 * - `'warning'` — orange accent. Non-blocking heads-up ("Storage at 85%").
 * - `'error'` — red accent. Failures. ALSO sets `role="alert"` (assertive); the
 *   other tones use `role="status"` (polite).
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
 * Persistent in-flow notification. Fills the gap between `<Toast>` (transient,
 * auto-dismissing, portal-rendered) and inline error text. Use Alert when the
 * message needs to stay visible while the user reads the page — subscription
 * warnings, save failures, "Update available" notices.
 *
 * Four tones (info / success / warning / error) with a subtle tinted background
 * + left accent stripe per tone. Optional title, description (children), icon,
 * action row, and dismiss button. No internal state, no animations, no
 * auto-dismiss.
 *
 * @example
 * // Basic
 * <Alert tone="info" title="Synced 5 minutes ago" />
 * <Alert tone="warning">Your storage is at 85% capacity.</Alert>
 *
 * @example
 * // With title + description + actions
 * <Alert tone="warning" title="Update available" actions={<Button size="sm">Reload</Button>}>
 *   A new version is ready. Reload to apply.
 * </Alert>
 *
 * @example
 * // Dismissible (controlled by consumer)
 * const [show, setShow] = useState(true);
 * {show && (
 *   <Alert tone="success" onDismiss={() => setShow(false)}>
 *     Changes saved.
 *   </Alert>
 * )}
 *
 * @example
 * // Custom icon / suppressed icon
 * <Alert tone="info" icon={<Bell size={16} />} title="New mention" />
 * <Alert tone="info" icon={null}>Quietly informative.</Alert>
 *
 * @remarks When NOT to use
 * - Transient confirmations → `toast.success(...)`.
 * - Empty-state placeholders ("No deals yet") → `<EmptyState>`.
 * - Form-field validation messages → inline error text + `aria-describedby`.
 * - Destructive confirmations needing yes/no → `<ConfirmationPopover>` or `<Modal>`.
 *
 * @remarks Anti-patterns
 * - ❌ Auto-dismissing the Alert with `setTimeout` — that's what Toast is for.
 * - ❌ `tone="error"` for non-critical warnings. Reserve `error` for genuine
 *   failures; `role="alert"` interrupts screen readers.
 * - ❌ Multiple stacked Alerts above a page — pick one (most urgent tone) or
 *   compose into the page layout with explicit hierarchy.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { tone = 'info', title, children, icon, actions, onDismiss, className, ...props },
  ref,
) {
  const role = tone === 'error' ? 'alert' : 'status';
  const renderedIcon = icon === null ? null : (icon ?? DEFAULT_ICONS[tone]);

  return (
    <div
      ref={ref}
      {...props}
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
        <Button variant="ghost" size="xs" iconOnly aria-label="Dismiss" onClick={onDismiss}>
          <X size={14} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
});
