import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import type { PaginationSize } from '../Pagination/Pagination';
import styles from './CursorPagination.module.scss';

export interface CursorPaginationProps extends HTMLAttributes<HTMLElement> {
  /**
   * Whether a previous page exists. When `false`, the previous button is
   * rendered as `disabled` (layout stays stable; consumer doesn't have to
   * conditionally hide it).
   */
  hasPrevious: boolean;

  /** Whether a next page exists. */
  hasNext: boolean;

  /** Called when the user clicks previous (not fired when disabled). */
  onPrevious: () => void;

  /** Called when the user clicks next (not fired when disabled). */
  onNext: () => void;

  /**
   * Label for the previous button. Defaults to the i18n value at
   * `pagination.previous` (`'Previous'` in English). Override for domain
   * phrasing (`'Newer'` in a reverse-chronological feed).
   */
  previousLabel?: ReactNode;

  /**
   * Label for the next button. Defaults to the i18n value at
   * `pagination.next` (`'Next'` in English).
   */
  nextLabel?: ReactNode;

  /**
   * Visual size — `'sm'` / `'md'` (default) / `'lg'`. Shares the
   * `<Pagination>` size scale so the two components match when used
   * alongside each other.
   */
  size?: PaginationSize;

  /** When `true`, both buttons are disabled regardless of has-prev/-next. */
  disabled?: boolean;

  /**
   * Accessible name for the wrapper `<nav>`. Defaults to the i18n value at
   * `pagination.ariaLabel` (`'Pagination'` in English).
   */
  'aria-label'?: string;
}

/**
 * Cursor pagination — prev / next pair for streams without a known total
 * page count (activity feeds, infinite scroll, keyset-paginated APIs).
 *
 * Controlled — consumer owns the cursor state. The component just renders
 * the two buttons and fires `onPrevious` / `onNext`.
 *
 * @example
 * <CursorPagination
 *   hasPrevious={hasPrev}
 *   hasNext={hasNext}
 *   onPrevious={loadPrevious}
 *   onNext={loadNext}
 * />
 *
 * @example
 * // Activity feed with reversed direction labels:
 * <CursorPagination
 *   hasPrevious={hasNewer}
 *   hasNext={hasOlder}
 *   onPrevious={loadNewer}
 *   onNext={loadOlder}
 *   previousLabel="Newer"
 *   nextLabel="Older"
 * />
 *
 * @remarks When NOT to use
 * - When you have a total page count → use `<Pagination>` (numbered, with
 *   jump-to-page and progress indication).
 *
 * @remarks A11y
 * - Wrapper is `<nav aria-label="Pagination">` (overridable for
 *   disambiguation).
 * - Buttons are native `<button disabled>` when `hasPrevious` /
 *   `hasNext` is false — screen readers announce "dimmed" and skip them
 *   during Tab navigation.
 */
export const CursorPagination = forwardRef<HTMLElement, CursorPaginationProps>(
  function CursorPagination(
    {
      hasPrevious,
      hasNext,
      onPrevious,
      onNext,
      previousLabel,
      nextLabel,
      size = 'md',
      disabled = false,
      className,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) {
    const t = useTranslation();
    // {...props} last so consumer overrides win (Pattern A).
    return (
      <nav
        ref={ref}
        aria-label={ariaLabel ?? t('pagination.ariaLabel')}
        className={clsx(styles.cursorPagination, styles[`size-${size}`], className)}
        {...props}
      >
        <button
          type="button"
          className={styles.button}
          onClick={onPrevious}
          disabled={disabled || !hasPrevious}
        >
          <ChevronLeft size={16} aria-hidden />
          <span>{previousLabel ?? t('pagination.previous')}</span>
        </button>

        <button
          type="button"
          className={styles.button}
          onClick={onNext}
          disabled={disabled || !hasNext}
        >
          <span>{nextLabel ?? t('pagination.next')}</span>
          <ChevronRight size={16} aria-hidden />
        </button>
      </nav>
    );
  },
);
