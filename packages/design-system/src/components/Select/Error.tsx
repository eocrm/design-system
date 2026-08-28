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
 * it used to carry `role="alert"`, which is an `aria-required-children`
 * deviation inside a `role="listbox"` and was a third mechanism for one
 * concern (#495). The Retry button calls back
 * into the async hook's `retry()`, which bumps the retry token and
 * re-fires the current query with no debounce delay.
 */
export function ErrorRow({ error: _error, onRetry }: ErrorRowProps) {
  // `error` stays on the prop surface so the props match `renderError(err,
  // retry)`. The default body intentionally doesn't show the raw error.
  void _error;
  const t = useTranslation();
  return (
    <li className={styles.stateRow} role="presentation">
      {/* aria-hidden because the Listbox status region announces this same
          sentence — `select.statusError` is byte-for-byte `select.loadFailed`
          — and both sit in the tree at once, so a reader heard it twice in a
          row. Exactly the defect removed from Image's error tile, recreated
          here by the fix for Select's silence. Hiding the text alone would
          leave browse mode a bare "Retry" with no reason for it, so the button
          states the failure in its accessible name instead. */}
      <span aria-hidden="true">{t('select.loadFailed')}</span>
      <button
        type="button"
        className={styles.retryButton}
        aria-label={t('select.retryAfterError')}
        onClick={onRetry}
      >
        {t('select.retry')}
      </button>
    </li>
  );
}
