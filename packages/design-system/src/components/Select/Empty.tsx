import { useTranslation } from '../../i18n/useTranslation';
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
 * walk. No `aria-live` of its own — the Listbox's single status region
 * announces this state, and the visible copy is hidden from AT so a reader
 * does not meet the sentence twice.
 */
export function Empty({ query }: EmptyProps) {
  const t = useTranslation();
  return (
    <li className={styles.stateRow} role="presentation">
      {/* aria-hidden for the same reason as the error row: the Listbox status
          region renders this same text, and both are in the tree at once. */}
      <span aria-hidden="true">
        {query && query.trim() !== ''
          ? t('select.noResultsFor', { query })
          : `${t('select.noOptions')}.`}
      </span>
    </li>
  );
}
