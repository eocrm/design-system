import styles from './Select.module.scss';

/**
 * Props for the default empty-state row. `query` shapes the message
 * ("No results for X." vs "No options.") so the user understands whether
 * the listbox is empty because their filter matched nothing or because
 * the source has no options at all.
 */
export interface EmptyProps {
  /**
   * Current search query, if any. Empty string / undefined renders the
   * "no options at all" copy; a non-empty value renders the "no results
   * for this query" copy.
   */
  query?: string;
}

/**
 * Default empty-state row rendered inside the listbox when there are no
 * options to show. Consumers can override via `renderEmpty` on `<Select>`.
 *
 * Rendered as a non-interactive `<li role="presentation">` so it occupies
 * a row visually but isn't reachable by keyboard or counted in the option
 * walk. Carries `aria-live="polite"` so screen readers announce the empty
 * state when it appears mid-session.
 */
export function Empty({ query }: EmptyProps) {
  return (
    <li className={styles.stateRow} role="presentation" aria-live="polite">
      {query && query.trim() !== '' ? `No results for "${query}".` : 'No options.'}
    </li>
  );
}
