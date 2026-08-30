import { useTranslation } from '../../i18n/useTranslation';
import styles from './Select.module.scss';

/**
 * Props for the default error-state row.
 *
 * `error` mirrors the consumer-facing `renderError(err, retry)` signature
 * so a custom override can drop in without prop-name churn. It's not used
 * in the default body, which prints a generic "Failed to load options."
 * message — exposing the raw error message in the listbox would surface
 * stack traces or HTTP detail strings to end users.
 */
export interface ErrorRowProps {
  /** Original error, kept on the prop surface to match `renderError`. */
  error: Error;
  /** Re-fires `loadOptions` with the current query. */
  onRetry: () => void;
}

/**
 * Default error-state row, rendered inside the listbox when an async
 * `loadOptions` request rejects. `role="presentation"` like its siblings —
 * it used to carry `role="alert"`, a third mechanism for one concern (#495).
 * The `aria-required-children` framing that used to be here is dropped: see
 * `messages.ts` — Chromium ignores these rows inside a `role="listbox"`
 * regardless, so the argument rests on the region-and-text mounting together,
 * which is enough on its own. The Retry button calls back
 * into the async hook's `retry()`, which bumps the retry token and
 * re-enters the debounced effect, so the refetch waits `debounceMs` like any
 * other query — the branch's own test has to advance timers after clicking it.
 */
export function ErrorRow({ error: _error, onRetry }: ErrorRowProps) {
  // `error` stays on the prop surface so the props match `renderError(err,
  // retry)`. The default body intentionally doesn't show the raw error.
  void _error;
  const t = useTranslation();
  return (
    <li className={styles.stateRow} role="presentation">
      {/* aria-hidden because the Listbox status region renders this same key,
          and both sit in the tree at once, so a reader met the sentence twice.
          Naming the Retry button with it instead only MOVED that duplicate —
          the region still said it and the button then said it again. The
          region's text sits immediately before this list, so browse mode reads
          "Failed to load options." and then "Retry, button": once each. */}
      <span aria-hidden="true">{t('select.loadFailed')}</span>
      <button type="button" className={styles.retryButton} onClick={onRetry}>
        {t('select.retry')}
      </button>
    </li>
  );
}
