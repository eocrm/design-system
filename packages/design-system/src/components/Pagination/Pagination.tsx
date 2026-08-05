import { forwardRef, type HTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { paginationRange } from './paginationRange';
import styles from './Pagination.module.scss';

/** Visual size. Tracks the Button / Input scale. */
export type PaginationSize = 'sm' | 'md' | 'lg';

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  /**
   * Current 1-indexed page. Values outside `[1, pageCount]` clamp at
   * render time (defensive — same precedent as `clampHeading` in
   * `<EmptyState>`).
   */
  currentPage: number;

  /**
   * Total number of pages. Values `< 1` clamp to `1`. The component still
   * renders when `pageCount === 1` (single enabled current-page button +
   * both prev/next disabled) so consumers don't have to conditionally hide
   * it. The `disabled` prop still disables all three controls.
   */
  pageCount: number;

  /**
   * Called with the new 1-indexed page when the user clicks prev, next,
   * or a page number. Not fired when the user clicks the current page.
   */
  onPageChange: (page: number) => void;

  /**
   * How many page-number buttons to show on each side of `currentPage`.
   * Default `1`. Set to `0` for the tightest possible display (sidebar /
   * narrow column) or `2` for wider footers. Boundary is fixed at 1 —
   * first and last pages are always shown.
   */
  siblingCount?: number;

  /**
   * Visual size — `'sm'` (24px), `'md'` (32px, default), `'lg'` (40px).
   * Tracks the Button / Input scale so Pagination sits cleanly inside
   * a `<Cluster>` next to those components.
   */
  size?: PaginationSize;

  /**
   * When `true`, all buttons (prev / next / numbers) are disabled. Use
   * during page transitions (loading, saving) to prevent double-clicks.
   */
  disabled?: boolean;

  /**
   * Accessible name for the `<nav>` wrapper. Defaults to `'Pagination'`.
   * Override when multiple paginations appear on the same page (e.g.,
   * `'Top pagination'` / `'Bottom pagination'`).
   */
  'aria-label'?: string;
}

function clampPageCount(pageCount: number): number {
  if (!Number.isFinite(pageCount) || pageCount < 1) return 1;
  return Math.floor(pageCount);
}

function clampCurrent(currentPage: number, pageCount: number): number {
  if (!Number.isFinite(currentPage) || currentPage < 1) return 1;
  if (currentPage > pageCount) return pageCount;
  return Math.floor(currentPage);
}

function clampSiblings(siblingCount: number): number {
  if (!Number.isFinite(siblingCount) || siblingCount < 0) return 0;
  return Math.floor(siblingCount);
}

/**
 * Numbered pagination — '◀ Previous   1 2 … 5 6 7 … 99 100   Next ▶'.
 * Controlled; consumer owns `currentPage`.
 *
 * @example
 * const [page, setPage] = useState(1);
 * <Pagination currentPage={page} pageCount={20} onPageChange={setPage} />
 *
 * @example
 * // Tight display for sidebar / narrow column:
 * <Pagination
 *   currentPage={5}
 *   pageCount={100}
 *   onPageChange={setPage}
 *   siblingCount={0}
 *   size="sm"
 * />
 *
 * @example
 * // Loading lock — disable while data refetches:
 * <Pagination
 *   currentPage={page}
 *   pageCount={pageCount}
 *   onPageChange={setPage}
 *   disabled={isFetching}
 * />
 *
 * @remarks When NOT to use
 * - Cursor / keyset pagination (no total page count) → use
 *   `<CursorPagination>`.
 * - "Load more" infinite scroll → just
 *   `<Button onClick={loadMore} loading={isLoading}>Load more</Button>`.
 *
 * @remarks A11y
 * - Wrapper is `<nav aria-label="Pagination">` (override via `aria-label`
 *   when multiple paginations sit on the same page).
 * - The current page stays focusable and is marked with
 *   `aria-current="page"`. Activating it is a no-op, so changing pages
 *   does not disable the focused control and discard keyboard focus.
 * - Prev/next chevron icons get `aria-hidden`; the buttons carry
 *   `aria-label="Previous page" / "Next page"` for screen readers.
 * - Ellipses are decorative `<span aria-hidden>` — not focusable.
 */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    currentPage,
    pageCount,
    onPageChange,
    siblingCount = 1,
    size = 'md',
    disabled = false,
    className,
    'aria-label': ariaLabel,
    ...props
  },
  ref,
) {
  const t = useTranslation();
  const clampedCount = clampPageCount(pageCount);
  const clampedCurrent = clampCurrent(currentPage, clampedCount);
  const items = paginationRange(clampedCurrent, clampedCount, clampSiblings(siblingCount));

  // {...props} last so consumer overrides win (Pattern A). className is
  // destructured above and re-injected into clsx() so consumer-supplied
  // class names compose, rather than replacing the component's.
  return (
    <nav
      ref={ref}
      aria-label={ariaLabel ?? t('pagination.ariaLabel')}
      className={clsx(styles.pagination, styles[`size-${size}`], className)}
      {...props}
    >
      <button
        type="button"
        className={clsx(styles.button, styles.navButton)}
        onClick={() => onPageChange(clampedCurrent - 1)}
        disabled={disabled || clampedCurrent === 1}
        aria-label={t('pagination.previousAriaLabel')}
      >
        <ChevronLeft size={16} aria-hidden />
        <span>{t('pagination.previous')}</span>
      </button>

      {items.map((item) => {
        if (item === 'ellipsis-start' || item === 'ellipsis-end') {
          return (
            <span key={item} className={styles.ellipsis} aria-hidden>
              …
            </span>
          );
        }
        const isCurrent = item === clampedCurrent;
        return (
          <button
            key={item}
            type="button"
            className={clsx(styles.button, styles.pageButton, isCurrent && styles.current)}
            onClick={() => {
              if (!isCurrent) onPageChange(item);
            }}
            disabled={disabled}
            aria-current={isCurrent ? 'page' : undefined}
            aria-label={
              isCurrent
                ? t('pagination.currentPageAriaLabel', { page: item })
                : t('pagination.pageAriaLabel', { page: item })
            }
          >
            {item}
          </button>
        );
      })}

      <button
        type="button"
        className={clsx(styles.button, styles.navButton)}
        onClick={() => onPageChange(clampedCurrent + 1)}
        disabled={disabled || clampedCurrent === clampedCount}
        aria-label={t('pagination.nextAriaLabel')}
      >
        <span>{t('pagination.next')}</span>
        <ChevronRight size={16} aria-hidden />
      </button>
    </nav>
  );
});
