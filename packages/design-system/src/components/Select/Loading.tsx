import styles from './Select.module.scss';

/**
 * Default loading-state row, rendered inside the listbox while an async
 * `loadOptions` request is in flight and the previous result has not yet
 * arrived (i.e. there are no rows to show alongside it).
 *
 * Non-interactive `<li role="presentation">` with an `aria-live="polite"`
 * announcement so screen reader users hear the state change. The spinner
 * is `aria-hidden` — the textual "Loading…" carries the message.
 */
export function Loading() {
  return (
    <li className={styles.stateRow} role="presentation" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>Loading…</span>
    </li>
  );
}
