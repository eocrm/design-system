import { useTranslation } from '../../i18n/useTranslation';
import styles from './Select.module.scss';

/**
 * Default loading-state row, rendered inside the listbox while an async
 * `loadOptions` request is in flight and the previous result has not yet
 * arrived (i.e. there are no rows to show alongside it).
 *
 * Non-interactive `<li role="presentation">` — purely visual. The
 * announcement comes from ONE live region the Select root owns; carrying
 * `aria-live` here mounted the region together with its text, which most
 * screen readers do not announce. See #495, and `messages.ts` for why the
 * conflict-resolution half of the original explanation was dropped — it was
 * spec-arguable but is not what Chromium does inside a `role="listbox"`.
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
