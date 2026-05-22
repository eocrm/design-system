/**
 * Discrete item in a pagination row — either a page number or one of the
 * two ellipsis markers. The two ellipsis tokens differ so React can give
 * each a stable key when both are present.
 */
export type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Compute the items to render in a numbered pagination row.
 *
 * Mirrors MUI's `usePagination` algorithm with `boundaryCount = 1` (the
 * first and last pages are always shown). Total slot count when an
 * ellipsis is rendered: `siblingCount * 2 + 5` — 2 boundaries + 1 current
 * + 2*siblings + 2 ellipses. For `siblingCount = 1`, that's 7 slots; the
 * row's width stays constant as the user clicks between pages.
 *
 * Special rules:
 * - When `pageCount <= totalSlots`, returns a contiguous `[1, 2, …, pageCount]`
 *   (no ellipsis needed).
 * - When the sibling window starts at exactly `boundary + 2`, the would-be
 *   ellipsis collapses to the single missing number (gap-of-1 rule) —
 *   showing the number is visually cleaner than showing "…" for one page.
 *
 * Assumes valid input: callers must clamp `currentPage` to `[1, pageCount]`
 * and ensure `pageCount >= 1` before invocation. The component layer
 * handles clamping; this pure function does not.
 */
export function paginationRange(
  currentPage: number,
  pageCount: number,
  siblingCount: number,
): PaginationItem[] {
  const boundaryCount = 1;
  const totalSlots = siblingCount * 2 + boundaryCount * 2 + 3;

  if (pageCount <= totalSlots) {
    return range(1, pageCount);
  }

  const startPages = range(1, boundaryCount);
  const endPages = range(pageCount - boundaryCount + 1, pageCount);

  const siblingsStart = Math.max(
    Math.min(currentPage - siblingCount, pageCount - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );

  const siblingsEnd = Math.min(
    Math.max(currentPage + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages[0] - 2,
  );

  return [
    ...startPages,
    ...(siblingsStart > boundaryCount + 2
      ? (['ellipsis-start'] as const)
      : boundaryCount + 1 < pageCount - boundaryCount
        ? [boundaryCount + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < pageCount - boundaryCount - 1
      ? (['ellipsis-end'] as const)
      : pageCount - boundaryCount > boundaryCount
        ? [pageCount - boundaryCount]
        : []),
    ...endPages,
  ];
}
