import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { store, type ToastEntry } from './store';
import { useToastTimer } from './useToastTimer';
import styles from './Toast.module.scss';

interface ToastProps {
  entry: ToastEntry;
  /** Whether this toast is rendered as a peek-collapsed card (beyond maxVisible). */
  isPeek: boolean;
  /** Default fallback duration when entry.duration is 'persistent' but rendered;
   *  forwarded by the viewport for completeness, unused here today. */
  // viewportDuration: number;  // (reserved for future use; not in v1)
}

const DEFAULT_ICONS: Record<ToastEntry['tone'], typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  loading: Loader2,
};

/**
 * Single toast card. NOT exported from the package — internal to ToastViewport.
 *
 * Spread order: Pattern B (component owns ARIA contract — role, aria-live,
 * data-* cannot be overridden by consumer props).
 */
export function Toast({ entry, isPeek }: ToastProps) {
  // Local "should the timer run" — flips when the user hovers OR a child has focus.
  const [paused, setPaused] = useState(false);

  useToastTimer({
    id: entry.id,
    duration: entry.duration,
    paused,
    onExpire: () => store.dismiss(entry.id),
  });

  const role = entry.tone === 'error' ? 'alert' : 'status';
  const ariaLive = entry.tone === 'error' ? 'assertive' : 'polite';

  const IconComponent = DEFAULT_ICONS[entry.tone];
  const renderedIcon =
    entry.icon === null
      ? null
      : (entry.icon ?? (
          <IconComponent
            size={16}
            aria-hidden="true"
            className={entry.tone === 'loading' ? styles.spin : undefined}
          />
        ));

  const toneClass = {
    info: styles.toneInfo,
    success: styles.toneSuccess,
    warning: styles.toneWarning,
    error: styles.toneError,
    loading: styles.toneLoading,
  }[entry.tone];

  return (
    <li
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      data-status={entry.status}
      data-peek={isPeek ? 'true' : undefined}
      data-tone={entry.tone}
      className={clsx(styles.toast, toneClass)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        // Only un-pause when focus leaves the toast entirely, not when moving
        // from action button to close button.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      {renderedIcon && <div className={styles.icon}>{renderedIcon}</div>}

      <div className={styles.body}>
        <div className={styles.message}>{entry.message}</div>
        {entry.description && <div className={styles.description}>{entry.description}</div>}
      </div>

      <div className={styles.tail}>
        {entry.action && (
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              entry.action!.onClick();
              store.dismiss(entry.id);
            }}
          >
            {entry.action.label}
          </button>
        )}
        {entry.dismissible && (
          <button
            type="button"
            className={styles.close}
            aria-label="Dismiss"
            onClick={() => store.dismiss(entry.id)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}
