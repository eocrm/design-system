import { useTranslation } from '../../i18n/useTranslation';
import styles from './Select.module.scss';

/**
 * Default loading-state row, rendered inside the listbox while an async
 * `loadOptions` request is in flight and the previous result has not yet
 * arrived (i.e. there are no rows to show alongside it).
 *
 * Non-interactive `<li role="presentation">` — purely visual. The
 * announcement comes from ONE live region the Select root owns; carrying
 * `aria-live` here discarded the `presentation` role (it is a global
 * attribute, so ARIA's conflict resolution wins) and exposed the row as a
 * list item inside a `role="listbox"`. See #495.
 */
export function Loading() {
  const t = useTranslation();
  return (
    <li className={styles.stateRow} role="presentation">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{t('select.loading')}</span>
    </li>
  );
}
