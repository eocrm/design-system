import type { useTranslation } from '../../i18n/useTranslation';

/**
 * The empty-state sentence, built in ONE place.
 *
 * The visible row renders it and the Listbox's status region announces it, and
 * the row's copy is `aria-hidden` so a reader meets it once. That means
 * nothing compares the two: the reachable-count assertion is satisfied by the
 * region alone, so if the two constructions drifted, what is shown and what is
 * spoken would differ with every test still green.
 */
export function emptyStateText(
  t: ReturnType<typeof useTranslation>,
  query: string | undefined,
): string {
  return query && query.trim() !== ''
    ? t('select.noResultsFor', { query })
    : `${t('select.noOptions')}.`;
}
