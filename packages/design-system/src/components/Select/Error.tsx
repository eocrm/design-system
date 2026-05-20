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
 * `loadOptions` request rejects. Carries `role="alert"` so screen readers
 * announce the failure as soon as it appears. The Retry button calls back
 * into the async hook's `retry()`, which bumps the retry token and
 * re-fires the current query with no debounce delay.
 */
export function ErrorRow({ error: _error, onRetry }: ErrorRowProps) {
  // `error` stays on the prop surface so the props match `renderError(err,
  // retry)`. The default body intentionally doesn't show the raw error.
  void _error;
  return (
    <li className={styles.stateRow} role="alert">
      <span>Failed to load options.</span>
      <button type="button" className={styles.retryButton} onClick={onRetry}>
        Retry
      </button>
    </li>
  );
}
